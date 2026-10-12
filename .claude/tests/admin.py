"""Prüft den Admin-Modus (seit 2.12) und das Tippen auf die Version.

Vorher den Server starten: python3 -m http.server 8080 --directory www
Aufruf: python3 .claude/tests/admin.py <state.json> [bilder-ordner] [--port 8080]

Ablauf: 7-mal tippen öffnet die Tempo-Messung erst, wenn man aufhört. 15-mal tippen öffnet den Admin-Modus,
beim ersten Mal mit Passwort festlegen. Danach sind alle Looks frei, Level, XP und abgeholte Belohnungen bleiben.
Admin aus, falsches Passwort, richtiges Passwort und Neuladen werden geprüft. Endet mit Exit-Code 1 bei Fehlern.
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

PUT = """(st) => new Promise((res) => {
  const req = indexedDB.open('kintore', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('kv');
  req.onsuccess = () => { const tx = req.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(st, 'state'); tx.oncomplete = () => res(true); };
})"""
PW = 'testpass9'


def main():
    args = [a for a in sys.argv[1:]]
    if not args:
        print(__doc__)
        sys.exit(2)
    port = '8080'
    if '--port' in args:
        i = args.index('--port')
        port = args[i + 1]
        del args[i:i + 2]
    state = json.load(open(args[0], encoding='utf-8'))
    state.setdefault('meta', {})['intro'] = {'profil': True, 'rang': True}
    state['meta'].pop('admin', None)
    shots = args[1] if len(args) > 1 else None
    if shots:
        os.makedirs(shots, exist_ok=True)
    problems = []

    def check(name, ok, info=''):
        print(f"{'ok ' if ok else 'FEHLER'} {name}{('  ' + str(info)) if info and not ok else ''}")
        if not ok:
            problems.append(name)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 393, 'height': 852}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.goto(f'http://localhost:{port}/#/start')
        page.wait_for_timeout(500)
        page.evaluate(PUT, state)
        page.reload()
        page.wait_for_timeout(900)

        def shot(name):
            if shots:
                page.wait_for_timeout(400)
                page.screenshot(path=os.path.join(shots, name + '.png'))

        def settings():
            page.evaluate("location.hash = '#/einstellungen'")
            page.wait_for_timeout(700)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(200)

        def tap(n):
            for _ in range(n):
                page.click('.about')
                page.wait_for_timeout(60)

        sheet_title = lambda: page.evaluate("document.querySelector('#sheet-root .sheet-body h2')?.textContent?.trim() ?? null")
        close = lambda: (page.evaluate("document.querySelector('[data-act=sheet-close]')?.click()"), page.wait_for_timeout(500))
        snapshot = lambda: page.evaluate("""(async () => {
          const { app } = await import('/js/core.js');
          const st = app.state;
          return { admin: st.meta.admin || null, claimed: st.rewards.claimed, bonus: st.bonus.length };
        })()""")
        locked = lambda: page.evaluate("document.querySelectorAll('#sheet-root .look-opt.is-locked').length")

        before = snapshot()
        settings()
        # 7-mal: Tempo kommt erst nach der Pause
        tap(7)
        check('7-mal tippen: noch nichts offen', sheet_title() is None, sheet_title())
        page.wait_for_timeout(1500)
        check('7-mal tippen und aufhören: Tempo-Messung', sheet_title() == 'Tempo testen', sheet_title())
        close()

        # 15-mal: Admin, Passwort festlegen
        tap(15)
        page.wait_for_timeout(500)
        check('15-mal tippen: Admin-Modus statt Tempo', sheet_title() == 'Admin-Modus', sheet_title())
        page.wait_for_timeout(1500)
        check('Danach kommt keine Tempo-Messung', sheet_title() == 'Admin-Modus', sheet_title())
        shot('1-festlegen')
        page.fill('[data-pw]', 'ab')
        page.fill('[data-pw2]', 'ab')
        page.click('.admin-form button[type=submit]')
        page.wait_for_timeout(300)
        check('Zu kurzes Passwort abgelehnt', 'Mindestens' in (page.text_content('[data-err]') or ''))
        page.fill('[data-pw]', PW)
        page.fill('[data-pw2]', PW + 'x')
        page.click('.admin-form button[type=submit]')
        page.wait_for_timeout(300)
        check('Ungleiche Passwörter abgelehnt', 'nicht gleich' in (page.text_content('[data-err]') or ''))
        shot('2-fehler')
        page.fill('[data-pw2]', PW)
        page.click('.admin-form button[type=submit]')
        page.wait_for_timeout(1500)
        check('Passwort festgelegt: Admin ist an', sheet_title() == 'Admin ist an', sheet_title())
        shot('3-an')
        snap = snapshot()
        check('Passwort steht nicht in den Daten', PW not in json.dumps(snap))
        check('Admin gespeichert', bool(snap['admin'] and snap['admin']['on']))
        check('Abgeholte Belohnungen und Bonus-XP gleich', snap['claimed'] == before['claimed'] and snap['bonus'] == before['bonus'])
        check('Einstellungen zeigen Admin an', page.evaluate("!!document.querySelector('.about-admin')"))

        # Look: nichts gesperrt
        page.click('#sheet-root [data-look]')
        page.wait_for_timeout(700)
        tabs = page.evaluate("[...document.querySelectorAll('#sheet-root [data-tab]')].map((b) => b.dataset.tab)")
        bad = []
        for t in tabs:
            page.click(f'#sheet-root [data-tab="{t}"]')
            page.wait_for_timeout(250)
            if locked():
                bad.append(t)
        check('Mit Admin ist kein Look gesperrt', not bad, bad)
        page.click(f'#sheet-root [data-tab="{tabs[0]}"]')
        page.wait_for_timeout(250)
        page.evaluate("[...document.querySelectorAll('#sheet-root .look-opt')].at(-1).click()")
        page.wait_for_timeout(400)
        shot('4-look')
        close()

        # Neu laden: bleibt an
        page.reload()
        page.wait_for_timeout(900)
        settings()
        check('Nach Neuladen weiter an', page.evaluate("!!document.querySelector('.about-admin')"))

        # Admin aus
        tap(15)
        page.wait_for_timeout(500)
        page.click('#sheet-root [data-off]')
        page.wait_for_timeout(700)
        check('Admin aus', snapshot()['admin']['on'] is False and not page.evaluate("!!document.querySelector('.about-admin')"))
        page.evaluate("document.querySelector('[data-act=look-open]')?.click()")
        page.wait_for_timeout(700)
        check('Ohne Admin wieder gesperrte Looks', locked() > 0 or len(before['claimed']) > 80, locked())
        close()

        # Wieder anmelden
        tap(15)
        page.wait_for_timeout(500)
        check('Mit Passwort: Anmelden', sheet_title() == 'Admin-Modus' and page.evaluate("!document.querySelector('[data-pw2]')"))
        page.fill('[data-pw]', 'falsch123')
        page.click('.admin-form button[type=submit]')
        page.wait_for_timeout(1200)
        check('Falsches Passwort abgelehnt', 'Falsches' in (page.text_content('[data-err]') or '') and not snapshot()['admin']['on'])
        shot('5-falsch')
        page.fill('[data-pw]', PW)
        page.keyboard.press('Enter')
        page.wait_for_timeout(1500)
        check('Richtiges Passwort mit Enter: Admin an', sheet_title() == 'Admin ist an' and snapshot()['admin']['on'])
        close()

        check('Keine Konsolenfehler', not errors, errors[:3])
        browser.close()

    if problems:
        print(len(problems), 'Fehler')
        sys.exit(1)
    print('Admin-Modus: alles ok')


if __name__ == '__main__':
    main()
