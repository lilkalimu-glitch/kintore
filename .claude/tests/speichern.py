"""Prüft das Speichern (www/js/store.js): Nichts geht verloren, auch nicht beim Umstieg von Version 2.8.

Vorher den Server starten: python3 -m http.server 8080 --directory www
Aufruf: python3 .claude/tests/speichern.py <state.json> [--port 8080]

Seit 2.9 liegen die Sätze in IndexedDB je Monat in einem eigenen Eintrag, beim Sichern werden nur geänderte
Monate geschrieben. Der Test startet mit dem alten Format (alles in einem Eintrag), ändert Daten auf viele Arten,
lädt die App neu und vergleicht. Endet mit Exit-Code 1, wenn etwas nicht stimmt.
"""
import json
import sys

from playwright.sync_api import sync_playwright

PUT = """(st) => new Promise((res) => {
  const req = indexedDB.open('kintore', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('kv');
  req.onsuccess = () => { const tx = req.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(st, 'state'); tx.oncomplete = () => res(true); };
})"""

KEYS = """() => new Promise((res) => {
  const req = indexedDB.open('kintore', 1);
  req.onsuccess = () => {
    const st = req.result.transaction('kv', 'readonly').objectStore('kv');
    const k = st.getAllKeys();
    const h = st.get('state');
    k.onsuccess = () => { h.onsuccess = () => res({ keys: k.result, head: h.result }); };
  };
})"""

# Vergleichbarer Stand: Sätze nach Nummer sortiert, Felder in fester Reihenfolge.
NORM = """() => {
  const s = structuredClone(window.KINTORE.app.state);
  s.sets.sort((a, b) => a.id - b.id);
  return JSON.stringify(Object.fromEntries(Object.keys(s).sort().map((k) => [k, s[k]])));
}"""


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    port = args[args.index('--port') + 1] if '--port' in args else '8080'
    state = json.load(open(args[0], encoding='utf-8'))
    problems = []

    def check(name, ok, info=''):
        print(f"{'ok ' if ok else 'FEHLER'} {name}{('  ' + info) if info else ''}")
        if not ok:
            problems.append(name)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 393, 'height': 852}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'http://localhost:{port}/#/start')
        page.wait_for_timeout(600)
        page.evaluate(PUT, state)
        page.reload()
        page.wait_for_timeout(900)

        before = page.evaluate(NORM)
        check('Altes Format (bis 2.8) wird gelesen', json.loads(before)['sets'].__len__() == len(state['sets']))

        # Änderungen auf viele Arten, dann warten, bis gesichert ist.
        page.evaluate("""async () => {
          const ops = await import('./js/ops.js');
          const { app } = await import('./js/core.js');
          const s = app.state;
          const ex = s.exercises.find((e) => s.sets.some((x) => x.ex === e.id)).id;
          ops.startSession(null);
          ops.addSet(ex, 62.5, 8);
          ops.addSet(ex, 65, 6);
          const old = s.sets.find((x) => x.d < s.sets[s.sets.length - 1].d);
          ops.updateSet(old.id, { w: 99.5, r: 3, note: 'geändert' });
          ops.deleteSet(s.sets[5].id);
          ops.setBody('2026-01-15', 81.3);
          ops.finishSession();
          document.querySelectorAll('#fx-root .fx').forEach((x) => x.remove());
        }""")
        page.wait_for_timeout(1800)
        expected = page.evaluate(NORM)
        info = page.evaluate(KEYS)
        months = sorted({x['d'][:7] for x in json.loads(expected)['sets']})
        check('Haupteintrag ohne Sätze, mit Liste der Monate', 'sets' not in info['head'] and info['head'].get('setMonths') == months)
        check('Ein Eintrag pro Monat', sorted(k for k in info['keys'] if k.startswith('sets:')) == ['sets:' + m for m in months])
        page.reload()
        page.wait_for_timeout(900)
        check('Nach dem Neuladen ist alles da (neues Format)', page.evaluate(NORM) == expected)

        # Nur geänderte Monate werden geschrieben: Ein neuer Satz heute schreibt einen Monat.
        written = page.evaluate("""async () => {
          const ops = await import('./js/ops.js');
          const { app } = await import('./js/core.js');
          const proto = IDBObjectStore.prototype;
          const orig = proto.put;
          const keys = [];
          proto.put = function (v, k) { keys.push(k); return orig.call(this, v, k); };
          const ex = app.state.sets[app.state.sets.length - 1].ex;
          ops.startSession(null);
          ops.addSet(ex, 70, 5);
          document.querySelectorAll('#fx-root .fx').forEach((x) => x.remove());
          await new Promise((r) => setTimeout(r, 1500));
          proto.put = orig;
          return keys;
        }""")
        check('Beim Sichern nur der geänderte Monat', sorted(written) == sorted(['state', 'sets:' + __import__('datetime').date.today().isoformat()[:7]]), str(written))

        # Satz direkt geändert statt ersetzt: Der Fingerabdruck fängt es ab.
        page.evaluate("""async () => {
          const { app, commit } = await import('./js/core.js');
          commit((s) => { s.sets[3].w = 123.25; s.sets[3].r = 2; });
        }""")
        page.wait_for_timeout(1500)
        expected = page.evaluate(NORM)
        page.reload()
        page.wait_for_timeout(900)
        check('Auch direkt geänderte Sätze werden gesichert', page.evaluate(NORM) == expected)

        # Backup laden ersetzt alles, alte Monate verschwinden.
        page.evaluate("""async () => {
          const ops = await import('./js/ops.js');
          const { app } = await import('./js/core.js');
          const data = structuredClone(app.state);
          data.sets = data.sets.filter((x) => x.d >= '2026-09-01');
          ops.importBackupText(JSON.stringify({ app: 'KINTORE', data }));
        }""")
        page.wait_for_timeout(1500)
        expected = page.evaluate(NORM)
        info = page.evaluate(KEYS)
        months = sorted({x['d'][:7] for x in json.loads(expected)['sets']})
        check('Backup laden: nur noch die Monate aus dem Backup', sorted(k for k in info['keys'] if k.startswith('sets:')) == ['sets:' + m for m in months])
        page.reload()
        page.wait_for_timeout(900)
        check('Backup laden: nach dem Neuladen alles da', page.evaluate(NORM) == expected)

        # Ein Monat fehlt (Speicher teilweise geleert): Es geht trotzdem weiter, die anderen Monate bleiben.
        page.evaluate("""() => new Promise((res) => {
          const req = indexedDB.open('kintore', 1);
          req.onsuccess = () => { const tx = req.result.transaction('kv', 'readwrite'); tx.objectStore('kv').delete('sets:2026-09'); tx.oncomplete = () => res(true); };
        })""")
        page.reload()
        page.wait_for_timeout(900)
        left = json.loads(page.evaluate(NORM))['sets']
        check('Fehlender Monat: App startet mit den übrigen Sätzen', len(left) > 0 and all(x['d'] >= '2026-10-01' for x in left))

        # Datei-Kopie: gleicher Inhalt wie der Stand, als gültiges JSON.
        same = page.evaluate("""async () => {
          const { mirrorJson } = await import('./js/store.js');
          const { app } = await import('./js/core.js');
          const a = JSON.parse(mirrorJson(app.state));
          const b = JSON.parse(mirrorJson(app.state));
          const norm = (x) => { x.sets.sort((p, q) => p.id - q.id); return JSON.stringify(Object.keys(x).sort().map((k) => [k, x[k]])); };
          const live = structuredClone(app.state);
          return norm(a) === norm(live) && norm(b) === norm(live);
        }""")
        check('Datei-Kopie enthält genau den Stand', same)
        if errors:
            print('Fehler in der Seite:', errors)
            problems += errors
        browser.close()
    print('OK: Speichern verliert nichts' if not problems else f'{len(problems)} Probleme')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
