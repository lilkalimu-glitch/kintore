"""Klickt die wichtigsten Abläufe der App durch und prüft, ob das Ergebnis stimmt.

Vorher den Server starten: python3 -m http.server 8080 --directory www
Aufruf: python3 .claude/tests/ablauf.py <state.json> [--port 8080]

Seit 2.9 zeichnet die App nach einer Änderung nur noch neu, was sich ändert (morph in core.js). Dieser Test stellt
sicher, dass dabei nichts stehen bleibt, was sich hätte ändern müssen: Diagramme, Listen, Zähler, Fenster.
Endet mit Exit-Code 1, wenn etwas nicht stimmt.
"""
import json
import sys

from playwright.sync_api import sync_playwright

PUT = """(st) => new Promise((res) => {
  const req = indexedDB.open('kintore', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('kv');
  req.onsuccess = () => { const tx = req.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(st, 'state'); tx.oncomplete = () => res(true); };
})"""


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    port = args[args.index('--port') + 1] if '--port' in args else '8080'
    state = json.load(open(args[0], encoding='utf-8'))
    state.setdefault('meta', {})['intro'] = {'profil': True, 'rang': True}
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
        go = lambda h: (page.evaluate(f"location.hash = '#/{h}'"), page.wait_for_timeout(700))
        # Effekte wie ein Nutzer schließen (antippen), damit die Warteschlange der Effekte weiterläuft.
        def close_fx():
            for _ in range(6):
                if not page.evaluate("!!document.querySelector('#fx-root .fx:not(.fx-out), #fx-root .fx-banner:not(.fb-out)')"):
                    break
                page.evaluate("document.querySelectorAll('#fx-root .fx:not(.fx-out), #fx-root .fx-banner:not(.fb-out)').forEach((x) => x.click())")
                page.wait_for_timeout(350)
        text = lambda sel: page.evaluate(f"document.querySelector({json.dumps(sel)})?.textContent?.trim() ?? null")

        # Übung im Detail: Diagramm wechselt mit der Auswahl.
        go('uebung/55')
        d1 = page.evaluate("document.querySelector('.chart path.line')?.getAttribute('d')")
        page.click('[data-act=metric][data-v=vol]')
        page.wait_for_timeout(300)
        d2 = page.evaluate("document.querySelector('.chart path.line')?.getAttribute('d')")
        on = page.evaluate("document.querySelector('[data-act=metric].is-on')?.dataset.v")
        check('Diagramm wechselt auf Volumen', d1 and d2 and d1 != d2 and on == 'vol')
        # Antippen zeigt einen Wert aus dem neuen Diagramm.
        box = page.evaluate("(() => { const r = document.querySelector('.chart svg').getBoundingClientRect(); return [r.x + r.width * 0.9, r.y + r.height / 2]; })()")
        page.mouse.click(box[0], box[1])
        page.wait_for_timeout(200)
        tip = text('.chart-tip')
        check('Wert im Diagramm passt zum Volumen', tip is not None and 'Sätze' in tip, tip)
        page.click('[data-act=range][data-v="3m"]')
        page.wait_for_timeout(300)
        check('Zeitraum umschalten', page.evaluate("document.querySelector('[data-act=range].is-on')?.dataset.v") == '3m')

        # Übungen: Suche und Muskelgruppen.
        go('uebungen')
        page.fill('[data-ex-search]', 'curl')
        page.wait_for_timeout(300)
        names = page.evaluate("[...document.querySelectorAll('.ex-row .name')].map((x) => x.textContent)")
        check('Suche filtert die Liste', len(names) > 0 and all('curl' in n.lower() for n in names), names[:5])
        page.fill('[data-ex-search]', '')
        page.wait_for_timeout(300)
        page.click('[data-act=ex-cat][data-cat=beine]')
        page.wait_for_timeout(300)
        bars = page.evaluate("[...new Set([...document.querySelectorAll('.ex-row')].map((x) => x.style.getPropertyValue('--c')))]")
        check('Muskelgruppe filtert die Liste', len(bars) == 1, bars)
        page.click('[data-act=ex-cat][data-cat=alle]')
        page.wait_for_timeout(300)

        # Training: Satz eintragen, ändern, löschen, beenden.
        go('training')
        page.click('#view [data-act=start-session]')
        page.wait_for_timeout(700)
        first = page.evaluate("document.querySelector('.exb')?.dataset.ex")
        n0 = page.evaluate(f"document.querySelectorAll('.exb[data-ex=\"{first}\"] .set').length")
        page.click(f'.exb[data-ex="{first}"] [data-step][data-f=w][data-dir="1"]')
        w = page.evaluate(f"document.querySelector('.exb[data-ex=\"{first}\"] input[data-f=w]').value")
        page.click(f'.exb[data-ex="{first}"] [data-act=save-set]')
        page.wait_for_timeout(500)
        close_fx()
        n1 = page.evaluate(f"document.querySelectorAll('.exb[data-ex=\"{first}\"] .set').length")
        v = page.evaluate(f"document.querySelector('.exb[data-ex=\"{first}\"] .set:last-of-type .v, .exb[data-ex=\"{first}\"] li:last-child .set .v')?.textContent")
        check('Satz eingetragen', n1 == n0 + 1 and v is not None and v.startswith(w.replace('.', ',')), (n0, n1, w, v))
        quest = text('.q-chip')
        check('Quest zählt mit', quest is not None and '1/' in quest, quest)
        page.click(f'.exb[data-ex="{first}"] li:last-child .set')
        page.wait_for_timeout(400)
        page.fill('.sheet [data-r]', '4')
        page.click('.sheet [data-save]')
        page.wait_for_timeout(600)
        v2 = page.evaluate(f"document.querySelector('.exb[data-ex=\"{first}\"] li:last-child .set .v')?.textContent")
        check('Satz geändert', v2 is not None and v2.endswith('4'), v2)
        page.click(f'.exb[data-ex="{first}"] li:last-child .set')
        page.wait_for_timeout(400)
        page.click('.sheet [data-del]')
        page.wait_for_timeout(600)
        n2 = page.evaluate(f"document.querySelectorAll('.exb[data-ex=\"{first}\"] .set').length")
        check('Satz gelöscht', n2 == n0, (n0, n2))
        page.click('.toast-btn')
        page.wait_for_timeout(500)
        n3 = page.evaluate(f"document.querySelectorAll('.exb[data-ex=\"{first}\"] .set').length")
        check('Löschen rückgängig', n3 == n0 + 1, (n0, n3))
        # Übung im Training verschieben
        order0 = page.evaluate("[...document.querySelectorAll('.exb')].map((x) => x.dataset.ex)")
        page.click(f'.exb[data-ex="{order0[0]}"] [data-act=ex-menu]')
        page.wait_for_timeout(400)
        page.click('.sheet [data-m=down]')
        page.wait_for_timeout(600)
        order1 = page.evaluate("[...document.querySelectorAll('.exb')].map((x) => x.dataset.ex)")
        check('Übung im Training verschoben', order1[:2] == [order0[1], order0[0]], (order0[:3], order1[:3]))
        page.click('#view .btn-neon[data-act=finish]')
        page.wait_for_timeout(800)
        check('Training beendet, Zusammenfassung da', page.evaluate("!!document.querySelector('#fx-root .fx-mc')"))
        close_fx()
        page.wait_for_timeout(300)
        check('Nach dem Beenden auf der Startseite', page.evaluate("location.hash") == '#/start')

        # Verlauf: Tag antippen zeigt den Tag.
        go('verlauf')
        day = page.evaluate("document.querySelectorAll('.cal-day.has')[1]?.dataset.d")
        page.click(f'.cal-day[data-d="{day}"]')
        page.wait_for_timeout(400)
        check('Verlauf: Tag wird gezeigt', page.evaluate("document.querySelectorAll('.stack > .card').length") == 2 and page.evaluate(f"document.querySelector('.cal-day.sel')?.dataset.d") == day)
        page.click('[data-act=cal-shift][data-n="-1"]')
        page.wait_for_timeout(400)
        check('Verlauf: Monat zurück', page.evaluate("document.querySelectorAll('.stack > .card').length") == 1)

        # Körper: Gewicht speichern.
        go('koerper')
        page.fill('[data-body-kg]', '81,4')
        page.click('[data-act=body-save]')
        page.wait_for_timeout(600)
        close_fx()
        done = text('.done-row b')
        first_row = text('.bw-list li:first-child b')
        check('Körper: heute eingetragen', done == '81,4 kg' and first_row == '81,4 kg', (done, first_row))

        # Einstellungen: Pause ändern.
        go('einstellungen')
        before = text('[data-act=set-rest] + output')
        page.click('[data-act=set-rest][data-dir="1"]')
        page.wait_for_timeout(300)
        after = text('[data-act=set-rest] + output')
        check('Einstellungen: Pause geändert', before != after, (before, after))

        # Rang-Pfad: abholen, alle abholen, Look anlegen.
        go('rang')
        page.wait_for_timeout(1500)
        r0 = page.evaluate("document.querySelectorAll('.node.st-ready').length")
        lvl = page.evaluate("document.querySelector('.node.st-ready')?.dataset.lv")
        close_fx()
        page.click(f'.node[data-lv="{lvl}"] [data-act=claim]')
        page.wait_for_selector('#fx-root [data-fx-act=equip]', timeout=5000)
        check('Belohnung abgeholt', page.evaluate(f"document.querySelector('.node[data-lv=\"{lvl}\"]').classList.contains('st-done')"))
        page.click('#fx-root [data-fx-act=equip]')
        page.wait_for_timeout(600)
        r1 = page.evaluate("document.querySelectorAll('.node.st-ready').length")
        check('Zähler im Pfad stimmt', r1 == r0 - 1, (r0, r1))
        hint = text('.road-card .hint')
        check('Hinweis im Pfad stimmt', hint == (f'{r1} Belohnungen bereit' if r1 != 1 else '1 Belohnung bereit'), hint)
        page.click('[data-act=claim-all]')
        page.wait_for_timeout(800)
        close_fx()
        page.wait_for_timeout(300)
        check('Alle abgeholt', page.evaluate("document.querySelectorAll('.node.st-ready').length") == 0 and page.evaluate("!document.querySelector('.rp-ready')"))
        # Weit wischen und zurück: Stationen werden nachgezeichnet, nichts fehlt.
        page.evaluate("document.querySelector('[data-road-scroll]').scrollLeft = 99999")
        page.wait_for_timeout(1500)
        visible_empty = page.evaluate("""(() => {
          const sc = document.querySelector('[data-road-scroll]');
          const r = sc.getBoundingClientRect();
          return [...sc.querySelectorAll('.node.is-empty')].filter((n) => { const b = n.getBoundingClientRect(); return b.right > r.left && b.left < r.right; }).length;
        })()""")
        check('Pfad: nach dem Wischen alles im Bild gezeichnet', visible_empty == 0, visible_empty)
        full = page.evaluate("document.querySelectorAll('.road .node:not(.is-empty)').length")
        check('Pfad: weit entfernte Stationen wieder leer', full < 25, full)
        page.click('[data-act=road-to][data-lv="1"]')
        page.wait_for_timeout(1500)
        check('Pfad: Sprung zu Rang E', page.evaluate("document.querySelector('[data-road-scroll]').scrollLeft") < 5 and page.evaluate("!document.querySelector('.node[data-lv=\"1\"]').classList.contains('is-empty')"))
        page.click('.look-tile[data-type=color]')
        page.wait_for_timeout(500)
        page.click('.sheet .look-opt[data-id=eis]')
        page.wait_for_timeout(400)
        check('Look: Neon-Farbe angelegt', page.evaluate("document.documentElement.dataset.accent") == 'eis')
        page.click('.sheet [data-tab=banner]')
        page.wait_for_timeout(600)
        drawn = page.evaluate("document.querySelectorAll('.sheet .lo-bn .bn').length")
        check('Look: Banner-Vorschauen gezeichnet', drawn >= 4, drawn)
        page.evaluate("document.querySelector('.sheet').scrollTop = 9999")
        page.wait_for_timeout(600)
        drawn2 = page.evaluate("document.querySelectorAll('.sheet .lo-bn .bn').length")
        check('Look: weitere Banner beim Scrollen', drawn2 > drawn, (drawn, drawn2))
        page.evaluate("document.querySelector('[data-act=sheet-close]').click()")
        page.wait_for_timeout(500)

        # Profil: Name ändern, Teil ausblenden.
        go('profil')
        page.click('[data-act=profile-edit]')
        page.wait_for_timeout(400)
        page.fill('.sheet [data-name]', 'Testname')
        page.click('.sheet [data-show=stats]')
        page.click('.sheet [data-save]')
        page.wait_for_timeout(700)
        check('Profil: Name gezeigt', text('.pf-name') == 'Testname', text('.pf-name'))
        check('Profil: Statistik ausgeblendet', page.evaluate("![...document.querySelectorAll('.pf-sec h2')].some((h) => h.textContent === 'Statistik')"))
        check('Profilbild zeigt den Anfangsbuchstaben', text('.pf-av .av-ini') == 'T', text('.pf-av .av-ini'))

        # Startseite nach allem: Level und Zahlen passen zum Stand.
        go('start')
        lv_dom = text('.lv b')
        lv_state = page.evaluate("(async () => { const { D } = await import('./js/core.js'); return String(D().level.level); })()")
        check('Startseite zeigt das richtige Level', lv_dom == lv_state, (lv_dom, lv_state))
        sets_dom = text('.stats3 div:nth-child(2) b')
        sets_state = page.evaluate("(async () => { const { D } = await import('./js/core.js'); const n = D().totals.sets; return new Intl.NumberFormat('de-DE').format(n); })()")
        check('Startseite zeigt die richtige Satzzahl', sets_dom == sets_state, (sets_dom, sets_state))
        if errors:
            print('Fehler in der Seite:', errors)
            problems += errors
        browser.close()
    print('OK: alle Abläufe stimmen' if not problems else f'{len(problems)} Probleme')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
