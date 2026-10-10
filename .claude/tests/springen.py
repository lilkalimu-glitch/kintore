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
          document.querySelector('.sheet').__alt = true;
        })()""",
        "document.querySelector('.sheet')?.__alt ? document.querySelector('.sheet').scrollTop : 'neu'",
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
            page.goto(f'http://localhost:{port}/#/start')
            page.reload()
            page.wait_for_timeout(700)
            page.evaluate(f"location.hash = '#/{route}'")
            page.wait_for_timeout(600)
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
    print(f'{len(jumps)} Stellen springen' if jumps else 'OK: nichts springt')
    sys.exit(1 if jumps else 0)


if __name__ == '__main__':
    main()
