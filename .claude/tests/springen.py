"""Prüft, ob Ansichten nach dem Antippen zurückspringen oder sich sichtbar neu aufbauen.

Vorher den Server starten: python3 -m http.server 8080 --directory www
Aufruf: python3 .claude/tests/springen.py <state.json> [--port 8080]
Jede Prüfung merkt sich die Position (Seite, Leiste oder Fenster), tippt etwas an und misst danach erneut.
Meldet jede Stelle, die springt, und endet dann mit Exit-Code 1. Neue Stellen unten in CHECKS ergänzen.
"""
import json
import sys

from playwright.sync_api import sync_playwright

# (Name, Seite, Vorbereitung, Messung, Antippen)
# Vorbereitung bringt die Ansicht in Position, Messung liefert eine Zahl (Scroll-Position) oder 'neu',
# wenn ein Fenster neu entstanden ist.
CHECKS = [
    (
        'Übungen: Muskelgruppen-Leiste',
        'uebungen',
        "document.querySelector('.cat-row').scrollLeft = 400",
        "document.querySelector('.cat-row').scrollLeft",
        "[...document.querySelectorAll('.cat-row .cat-chip')].pop().click()",
    ),
    (
        'Übungen: Weitere Übungen aufklappen',
        'uebungen',
        "window.scrollTo(0, 600)",
        "scrollY",
        "document.querySelector('[data-act=toggle-unused]')?.click()",
    ),
    (
        'Vorlage bearbeiten: Übung verschieben',
        'training',
        """(() => {
          document.querySelector('[data-act=edit-templates]').click();
          document.querySelector('.sheet [data-t]').click();
          document.querySelector('.sheet-body').__alt = true;
        })()""",
        "document.querySelector('.sheet-body')?.__alt ? document.querySelector('.sheet').scrollTop : 'neu'",
        "document.querySelectorAll('.sheet [data-down]')[1].click()",
    ),
    (
        'Übung im Detail: Schalter',
        'uebung/55',
        "window.scrollTo(0, 1100)",
        "scrollY",
        "document.querySelector('[data-ex-flag=bar]').click()",
    ),
    (
        'Körper: Zeitraum',
        'koerper',
        "window.scrollTo(0, 120)",
        "scrollY",
        "document.querySelector('[data-act=body-range][data-v=\"1j\"]')?.click()",
    ),
    # Seit 2.7: Der angetippte Knopf bleibt an seiner Stelle auf dem Bildschirm, auch wenn darüber etwas dazukommt.
    (
        'Training: Satz speichern',
        'training',
        """(() => {
          document.querySelector('[data-act=start-session]').click();
          setTimeout(() => window.scrollTo(0, 420), 50);
        })()""",
        "Math.round(document.querySelectorAll('[data-act=save-set]')[1].getBoundingClientRect().top)",
        "document.querySelectorAll('[data-act=save-set]')[1].click()",
    ),
    (
        'Körper: Gewicht speichern',
        'koerper',
        "window.scrollTo(0, 300)",
        "Math.round(document.querySelector('[data-act=body-save]').getBoundingClientRect().top)",
        "document.querySelector('[data-act=body-save]').click()",
    ),
    (
        'Rang-Pfad: Belohnung abholen',
        'rang',
        "document.querySelector('[data-road-scroll]').scrollLeft = 600",
        "document.querySelector('[data-road-scroll]').scrollLeft",
        "document.querySelector('.node.st-ready [data-act=claim]').click()",
    ),
    (
        'Übung im Detail: Diagramm umschalten',
        'uebung/55',
        "window.scrollTo(0, 200)",
        "scrollY",
        "document.querySelector('[data-act=metric][data-v=top]').click()",
    ),
    (
        'Einstellungen: Pause ändern',
        'einstellungen',
        "window.scrollTo(0, 150)",
        "scrollY",
        "document.querySelector('[data-act=set-rest][data-dir=\"1\"]').click()",
    ),
    (
        'Look-Fenster: Reiter wechseln',
        'profil',
        """(() => {
          document.querySelector('[data-act=look-open][data-type=banner]').click();
          const b = document.querySelector('.sheet');
          b.scrollTop = 200;
          document.querySelector('.sheet-body').__alt = true;
        })()""",
        "document.querySelector('.sheet-body')?.__alt ? document.querySelector('.sheet').scrollTop : 'neu'",
        "document.querySelector('.sheet [data-tab=effect]').click()",
    ),
    (
        'Look-Fenster: Teil anlegen',
        'profil',
        """(() => {
          document.querySelector('[data-act=look-open][data-type=color]').click();
          const b = document.querySelector('.sheet');
          b.scrollTop = 120;
          document.querySelector('.sheet-body').__alt = true;
        })()""",
        "document.querySelector('.sheet-body')?.__alt ? document.querySelector('.sheet').scrollTop : 'neu'",
        "document.querySelector('.sheet .look-opt[data-id=pink]').click()",
    ),
    # Seit 2.7: Beim Neuzeichnen laufen Animationen weiter (Abholen im Pfad). Gemessen: neu gestartete Stationen x 100.
    (
        'Rang-Pfad: Animationen laufen weiter',
        'rang',
        """(() => {
          const t = {};
          document.querySelectorAll('#view .node').forEach((n) => {
            const a = n.getAnimations({ subtree: true });
            if (a.length) t[n.dataset.lv] = a.map((x) => x.currentTime || 0);
          });
          window.__nodeAnim = t;
          window.__claimLv = document.querySelector('.node.st-ready')?.dataset.lv;
        })()""",
        """(() => {
          const t = window.__nodeAnim || {};
          let restarted = 0;
          document.querySelectorAll('#view .node').forEach((n) => {
            const lv = n.dataset.lv;
            if (!(lv in t) || lv === window.__claimLv) return;
            const a = n.getAnimations({ subtree: true }).map((x) => x.currentTime || 0);
            if (a.some((x, i) => i < t[lv].length && x < t[lv][i] - 50)) restarted++;
          });
          return restarted * 100;
        })()""",
        "document.querySelector('.node.st-ready [data-act=claim]').click()",
    ),
    (
        'Profil: Bestwerte auswählen',
        'profil@700',
        """(() => {
          document.querySelector('[data-act=profile-lifts]').click();
          document.querySelector('.sheet-body').__alt = true;
        })()""",
        "document.querySelector('.sheet-body')?.__alt ? document.querySelector('.pick-list').scrollTop : 'neu'",
        "document.querySelectorAll('.sheet [data-lift]')[1].click()",
    ),
]


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    port = args[args.index('--port') + 1] if '--port' in args else '8080'
    state = json.load(open(args[0], encoding='utf-8'))
    jumps = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 393, 'height': 852}, reduced_motion='reduce')
        page.goto(f'http://localhost:{port}/#/start')
        page.wait_for_timeout(500)
        page.evaluate("""(st) => new Promise((res) => {
          const req = indexedDB.open('kintore', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('kv');
          req.onsuccess = () => {
            const tx = req.result.transaction('kv', 'readwrite');
            tx.objectStore('kv').put(st, 'state');
            tx.oncomplete = () => res(true);
          };
        })""", state)
        for name, route, prepare, measure, tap in CHECKS:
            # Prüfungen zu Animationen brauchen Bewegung, alle anderen laufen wie "weniger Bewegung".
            page.emulate_media(reduced_motion='no-preference' if 'Animationen' in name else 'reduce')
            page.goto(f'http://localhost:{port}/#/start')
            page.reload()
            page.wait_for_timeout(700)
            page_name, _, scroll = route.partition('@')
            page.evaluate(f"location.hash = '#/{page_name}'")
            page.wait_for_timeout(600)
            if scroll:
                page.evaluate(f'window.scrollTo(0, {int(scroll)})')
                page.wait_for_timeout(200)
            page.evaluate(prepare)
            page.wait_for_timeout(300)
            before = page.evaluate(measure)
            page.evaluate(tap)
            page.wait_for_timeout(400)
            after = page.evaluate(measure)
            moved = after == 'neu' or (isinstance(before, (int, float)) and abs(after - before) > 30)
            print(f"{name}: vorher {before}, nachher {after}{'  <- springt' if moved else ''}")
            if moved:
                jumps.append(name)
        browser.close()
    print(f'{len(jumps)} Stellen springen oder bauen sich neu auf' if jumps else 'OK: nichts springt')
    sys.exit(1 if jumps else 0)


if __name__ == '__main__':
    main()
