"""Prüft, ob die App in Ruhe wirklich ruht: Laufen Animationen nur auf der Grafikkarte, muss der Hauptthread
nichts tun. Rechnet er trotzdem jedes Bild neu, kostet das Akku und macht jedes Antippen langsamer.

Vorher den Server starten: python3 -m http.server 8080 --directory www
Aufruf: python3 .claude/tests/leerlauf.py <state.json> [seite ...] [--port 8080]
Ohne Seiten: start, rang, profil, training, uebungen, verlauf, koerper, einstellungen.

Jede Seite wird geöffnet, dann wartet der Test, bis Einstiegs-Animationen und die Kamerafahrt im Rang-Pfad vorbei
sind, und zählt 2 Sekunden lang, wie oft der Browser Stile neu berechnet. In Ruhe sollte das 0 sein.
Mehr als 10 gilt als Fehler (Exit-Code 1), dazu stehen die Elemente da, die jedes Bild neu berechnet werden.

Bekannt: Mit epischen und legendären Teilen im Look (Glanz auf Rahmen, schimmernde Titel, Funken am Neon-Schild)
rechnet der Hauptthread mit. Das betrifft das Design Neon und ist für später notiert.
"""
import collections
import json
import sys

from playwright.sync_api import sync_playwright

PAGES = ['start', 'rang', 'profil', 'training', 'uebungen', 'verlauf', 'koerper', 'einstellungen']


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    port = args[args.index('--port') + 1] if '--port' in args else '8080'
    rest = args[1:]
    if '--port' in rest:
        i = rest.index('--port')
        rest = rest[:i] + rest[i + 2:]
    pages = rest or PAGES
    state = json.load(open(args[0], encoding='utf-8'))
    state.setdefault('meta', {})['intro'] = {'profil': True, 'rang': True}
    busy = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 393, 'height': 852})
        page.goto(f'http://localhost:{port}/#/start')
        page.wait_for_timeout(300)
        page.evaluate("""(st) => new Promise((res) => {
          const req = indexedDB.open('kintore', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('kv');
          req.onsuccess = () => { const tx = req.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(st, 'state'); tx.oncomplete = () => res(true); };
        })""", state)
        page.reload()
        page.wait_for_timeout(1000)
        cdp = page.context.new_cdp_session(page)
        events = []
        done = []
        cdp.on('Tracing.dataCollected', lambda e: events.extend(e['value']))
        cdp.on('Tracing.tracingComplete', lambda e: done.append(1))
        for name in pages:
            page.evaluate(f"location.hash = '#/{name}'")
            page.wait_for_timeout(4500)
            events.clear()
            done.clear()
            cdp.send('Tracing.start', {
                'categories': 'devtools.timeline,disabled-by-default-devtools.timeline.invalidationTracking',
                'transferMode': 'ReportEvents',
            })
            page.wait_for_timeout(2000)
            cdp.send('Tracing.end')
            while not done:
                page.wait_for_timeout(30)
            tids = collections.Counter(e.get('tid') for e in events if e.get('name') == 'UpdateLayoutTree')
            main_tid = tids.most_common(1)[0][0] if tids else None
            n = sum(1 for e in events if e.get('tid') == main_tid and e.get('name') == 'UpdateLayoutTree' and e.get('ph') == 'X')
            who = collections.Counter()
            for e in events:
                if e.get('name') == 'StyleRecalcInvalidationTracking':
                    d = (e.get('args') or {}).get('data') or {}
                    if d.get('reason') == 'Animation':
                        who[(d.get('nodeName') or '')[:50]] += 1
            mark = '  rechnet in Ruhe' if n > 10 else ''
            print(f'{name:14s} {n:4d} Stil-Berechnungen in 2 s{mark}')
            if mark:
                busy.append(name)
                for k, v in who.most_common(5):
                    print(f'                 {v:5d}x {k}')
        browser.close()
    print('OK: in Ruhe nichts zu tun' if not busy else f'{len(busy)} Seiten rechnen in Ruhe ({", ".join(busy)})')
    sys.exit(1 if busy else 0)


if __name__ == '__main__':
    main()
