"""Misst, wie schnell KINTORE auf Antippen reagiert, wie auf einem Mittelklasse-Handy.

Vorher den Server starten: python3 -m http.server 8080 --directory www
Aufruf: python3 .claude/tests/tempo.py <state.json> [--drossel 4] [--port 8080]

Der Prozessor wird gedrosselt (Standard 4-fach, das entspricht ungefähr einem Mittelklasse-Handy).
Gemessen wird die Zeit vom Antippen bis das nächste Bild fertig ist: JavaScript, Stil, Layout und Malen.
Die Grafikkarte (Unschärfe hinter Karten, Leuchtschatten) misst der Test nicht, die kostet auf dem Handy extra.
Zu jeder Seite zählt er Elemente, Unschärfe, Schatten, Leuchtschrift und laufende Animationen.

Ziele aus dem Plan: jede Reaktion bis 100 ms, Rang-Pfad öffnen bis 300 ms, nach dem Speichern kein Stocken über 50 ms.
Was darüber liegt, ist mit "zu langsam" markiert, dann endet der Test mit Exit-Code 1.
Die Werte schwanken je nach Rechner um etwa ein Drittel. Bei knappen Ergebnissen zweimal messen.
"""
import json
import sys

from playwright.sync_api import sync_playwright

MEASURE = r"""async ([sel, hash]) => {
  const next = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  await next();
  const t0 = performance.now();
  if (hash) {
    const done = new Promise((r) => addEventListener('hashchange', r, { once: true }));
    location.hash = hash;
    await done;
  } else {
    const el = document.querySelector(sel);
    if (!el) return { err: 'nicht gefunden: ' + sel };
    el.click();
  }
  await next();
  return { ms: Math.round(performance.now() - t0) };
}"""

# Längste Blockade nach dem Speichern (zum Beispiel beim Sichern der Daten).
STALL = r"""async (sel) => {
  const long = [];
  const obs = new PerformanceObserver((l) => long.push(...l.getEntries().map((e) => e.duration)));
  obs.observe({ type: 'longtask' });
  const next = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  await next();
  const t0 = performance.now();
  document.querySelector(sel).click();
  await next();
  const ms = Math.round(performance.now() - t0);
  long.length = 0;
  await new Promise((r) => setTimeout(r, 2500));
  obs.disconnect();
  return { ms, stall: Math.round(Math.max(0, ...long)) };
}"""

COUNT = r"""() => {
  const all = [...document.querySelectorAll('body *')];
  let bf = 0, sh = 0, ts = 0;
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.backdropFilter && cs.backdropFilter !== 'none') bf++;
    if (cs.boxShadow !== 'none') sh++;
    if (cs.textShadow !== 'none') ts++;
  }
  return `${all.length} Elemente, ${bf} Unschärfe, ${sh} Schatten, ${ts} Leuchtschrift, ${document.getAnimations().length} Animationen`;
}"""

PAGES = [
    ('Tab Training', '#tabs [data-tab=training]', None),
    ('Tab Übungen', '#tabs [data-tab=uebungen]', None),
    ('Übungen: Muskelgruppe antippen', '#view [data-act=ex-cat]:nth-of-type(3)', None),
    ('Tab Verlauf', '#tabs [data-tab=verlauf]', None),
    ('Tab Körper', '#tabs [data-tab=koerper]', None),
    ('Tab Start', '#tabs [data-tab=start]', None),
    ('Rang-Pfad öffnen', None, '#/rang'),
    ('Profil öffnen', None, '#/profil'),
    ('Profil: Look-Fenster öffnen', '[data-act=look-open][data-type=banner]', None),
]
LIMIT = {'Rang-Pfad öffnen': 300}


def load(page, port, state):
    page.goto(f'http://localhost:{port}/#/start')
    page.wait_for_timeout(300)
    page.evaluate("""(st) => new Promise((res) => {
      const req = indexedDB.open('kintore', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => {
        const tx = req.result.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(st, 'state');
        tx.oncomplete = () => res(true);
      };
    })""", state)


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    port = args[args.index('--port') + 1] if '--port' in args else '8080'
    rate = float(args[args.index('--drossel') + 1]) if '--drossel' in args else 4
    state = json.load(open(args[0], encoding='utf-8'))
    state.setdefault('meta', {})['intro'] = {'profil': True, 'rang': True}
    sets = len(state.get('sets', []))
    slow = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 393, 'height': 852}, device_scale_factor=2.75)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        load(page, port, state)
        page.context.new_cdp_session(page).send('Emulation.setCPUThrottlingRate', {'rate': rate})
        page.reload()
        page.wait_for_selector('#view .card')
        start = round(page.evaluate('performance.now()'))
        print(f'Prozessor {rate:g}-fach gedrosselt, Daten: {args[0]} ({sets} Sätze)')
        print(f'{"Start bis die Seite steht":36s} {start:5d} ms')
        page.wait_for_timeout(600)

        def row(name, ms, limit=100, extra=''):
            mark = '  zu langsam' if ms > limit else ''
            if mark:
                slow.append(name)
            print(f'{name:36s} {ms:5d} ms{mark}{extra}')

        for name, sel, h in PAGES:
            r = page.evaluate(MEASURE, [sel, h])
            if 'err' in r:
                print(f'{name:36s} {r["err"]}')
                continue
            page.wait_for_timeout(500)
            info = '  | ' + page.evaluate(COUNT) if (h or sel.startswith('#tabs')) else ''
            row(name, r['ms'], LIMIT.get(name, 100), info)
        page.keyboard.press('Escape')
        page.evaluate("document.querySelector('[data-act=sheet-close]')?.click()")
        page.wait_for_timeout(500)

        page.evaluate("location.hash = '#/training'")
        page.wait_for_timeout(600)
        if page.query_selector('#view [data-act=start-session]'):
            row('Training starten (Vorlage)', page.evaluate(MEASURE, ['#view [data-act=start-session]', None])['ms'])
            page.wait_for_timeout(800)
        row('Satz: Gewicht plus', page.evaluate(MEASURE, ['#view [data-step][data-f=w][data-dir="1"]', None])['ms'])
        for name in ('Satz speichern', 'Noch einen Satz speichern'):
            r = page.evaluate(STALL, '#view [data-act=save-set]')
            row(name, r['ms'])
            row('  Stocken danach (längste Blockade)', r['stall'], 50)
        if errors:
            print('Fehler in der Seite:', errors)
        browser.close()
    print('OK: alles im Ziel' if not slow else f'Zu langsam: {len(slow)} von den Zielen verfehlt')
    sys.exit(1 if slow or errors else 0)


if __name__ == '__main__':
    main()
