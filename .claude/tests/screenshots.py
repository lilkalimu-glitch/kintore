"""Screenshots der App im Handy-Format (393 x 852) mit Testdaten.

Vorher den Server starten: python3 -m http.server 8080 --directory www
Aufruf: python3 .claude/tests/screenshots.py <state.json|leer> <ordner> [--port 8080] [--bewegung] [seite[@scroll] ...]
  leer        Ohne gespeicherte Daten starten (wie eine frisch installierte App).
  --bewegung  Animationen an lassen (sonst wie "weniger Bewegung", damit Bilder vergleichbar sind).
  seite@700   Seite öffnen und 700 px nach unten scrollen.
Ohne Seiten: start, start@700, rang, rang@600, training, uebungen, verlauf, koerper, einstellungen, einstellungen@500.
Meldet Konsolenfehler und horizontales Scrollen und endet dann mit Exit-Code 1.
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

DEFAULT = ['start', 'start@700', 'rang', 'rang@600', 'training', 'uebungen', 'verlauf', 'koerper', 'einstellungen', 'einstellungen@500']


def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        sys.exit(2)
    state_file, out = args[0], args[1]
    rest = args[2:]
    port = '8080'
    motion = 'reduce'
    routes = []
    i = 0
    while i < len(rest):
        if rest[i] == '--port':
            port = rest[i + 1]
            i += 2
            continue
        if rest[i] == '--bewegung':
            motion = 'no-preference'
        else:
            routes.append(rest[i])
        i += 1
    routes = routes or DEFAULT
    state = None if state_file == 'leer' else json.load(open(state_file, encoding='utf-8'))
    os.makedirs(out, exist_ok=True)
    problems = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=1, reduced_motion=motion)
        page = ctx.new_page()
        page.on('console', lambda m: problems.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
        page.on('pageerror', lambda e: problems.append(f'Fehler: {e}'))
        page.goto(f'http://localhost:{port}/#/start')
        page.wait_for_timeout(600)
        page.evaluate("""(st) => new Promise((res) => {
          const req = indexedDB.open('kintore', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('kv');
          req.onsuccess = () => {
            const tx = req.result.transaction('kv', 'readwrite');
            if (st) tx.objectStore('kv').put(st, 'state'); else tx.objectStore('kv').delete('state');
            tx.oncomplete = () => res(true);
          };
        })""", state)
        page.reload()
        page.wait_for_timeout(900)
        for r in routes:
            name, _, scroll = r.partition('@')
            page.evaluate(f"location.hash = '#/{name}'")
            page.wait_for_timeout(1800 if name == 'rang' else 700)
            if scroll:
                page.evaluate(f'window.scrollTo(0, {int(scroll)})')
                page.wait_for_timeout(300)
            width = page.evaluate('document.documentElement.scrollWidth')
            if width > 393:
                problems.append(f'horizontales Scrollen auf {r}: {width} px')
            page.screenshot(path=os.path.join(out, f"{name}{'_' + scroll if scroll else ''}.png"))
        browser.close()
    print('\n'.join(problems) if problems else f'OK: {len(routes)} Bilder in {out}, keine Konsolenfehler')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
