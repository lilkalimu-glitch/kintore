"""Misst, wie schnell KINTORE auf Antippen reagiert, wie auf einem Mittelklasse-Handy.

Vorher den Server starten: python3 -m http.server 8080 --directory www
Aufruf: python3 .claude/tests/tempo.py <state.json> [--drossel 4] [--runden 3] [--port 8080]

Der Prozessor wird gedrosselt (Standard 4-fach, das entspricht ungefähr einem Mittelklasse-Handy).
Gemessen wird die Zeit vom Antippen bis das nächste Bild fertig ist: JavaScript, Stil, Layout und Malen.
Die Grafikkarte misst der Test nicht. Zu jeder Seite zählt er Elemente, Schatten, Leuchtschrift und wie viele
Animationen gerade laufen (angehaltene, weil nicht zu sehen, zählen nicht).

Alles läuft mehrere Runden in einem frischen Browser (Standard 3), angezeigt wird der Median. Die Werte schwanken
je nach Rechner trotzdem um etwa ein Drittel.

Ziele aus dem Plan: jede Reaktion bis 100 ms, Rang-Pfad öffnen bis 300 ms, nach dem Speichern kein Stocken über
50 ms, beim Wischen im Rang-Pfad kein Bild über 50 ms. Was darüber liegt, ist mit "zu langsam" markiert, dann endet
der Test mit Exit-Code 1.
"""
import json
import statistics
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

# Wischen im Rang-Pfad: erst zum Ende, dann zurück zum Anfang, etwa wie mit dem Finger.
# Gemessen wird der Abstand zwischen zwei Bildern, das längste Bild zählt.
SWIPE = r"""async () => {
  const sc = document.querySelector('[data-road-scroll]');
  if (!sc) return { err: 'kein Pfad' };
  const end = sc.scrollWidth - sc.clientWidth;
  const frames = [];
  let last = performance.now();
  const run = (to, speed) => new Promise((res) => {
    const step = (now) => {
      frames.push(now - last);
      last = now;
      const left = sc.scrollLeft;
      const next = left < to ? Math.min(to, left + speed) : Math.max(to, left - speed);
      sc.scrollLeft = next;
      if (Math.abs(next - to) < 1) res();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  await run(end, 45);
  await run(0, 45);
  frames.shift();
  return { worst: Math.round(Math.max(...frames)), slow: frames.filter((f) => f > 34).length, frames: frames.length };
}"""

COUNT = r"""() => {
  const all = [...document.querySelectorAll('body *')];
  let sh = 0, ts = 0;
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.boxShadow !== 'none') sh++;
    if (cs.textShadow !== 'none') ts++;
  }
  const anim = document.getAnimations();
  const running = anim.filter((a) => a.playState === 'running').length;
  return `${all.length} Elemente, ${sh} Schatten, ${ts} Leuchtschrift, ${running} von ${anim.length} Animationen laufen`;
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
    ('Look-Fenster: Reiter wechseln', '.sheet [data-tab=effect]', None),
]
LIMIT = {'Rang-Pfad öffnen': 300, 'Rang-Pfad nochmal öffnen': 300}


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


def close_fx(page):
    # Wie ein Nutzer antippen, damit die Warteschlange der Effekte weiterläuft.
    for _ in range(6):
        if not page.evaluate("!!document.querySelector('#fx-root .fx:not(.fx-out), #fx-root .fx-banner:not(.fb-out)')"):
            break
        page.evaluate("document.querySelectorAll('#fx-root .fx:not(.fx-out), #fx-root .fx-banner:not(.fb-out)').forEach((x) => x.click())")
        page.wait_for_timeout(350)


def one_round(p, port, state, rate):
    """Eine Runde in einem frischen Browser. Gibt (Werte, Infos, Startzeit, Fehler) zurück."""
    rows = {}
    info = {}
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 393, 'height': 852}, device_scale_factor=2.75)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    load(page, port, state)
    page.context.new_cdp_session(page).send('Emulation.setCPUThrottlingRate', {'rate': rate})
    page.reload()
    page.wait_for_selector('#view .card')
    start = round(page.evaluate('performance.now()'))
    page.wait_for_timeout(600)

    def measure(name, sel=None, h=None, wait=500, count=False):
        r = page.evaluate(MEASURE, [sel, h])
        if 'err' in r:
            rows[name] = None
            info[name] = r['err']
            return
        page.wait_for_timeout(wait)
        rows[name] = r['ms']
        if count:
            info[name] = page.evaluate(COUNT)

    for name, sel, h in PAGES:
        measure(name, sel, h, count=bool(h or (sel and sel.startswith('#tabs'))))
    page.keyboard.press('Escape')
    page.evaluate("document.querySelector('[data-act=sheet-close]')?.click()")
    page.wait_for_timeout(500)

    # Rang-Pfad: zweites Öffnen (ohne Kamerafahrt), Wischen, Abholen.
    page.evaluate("location.hash = '#/start'")
    page.wait_for_timeout(600)
    measure('Rang-Pfad nochmal öffnen', h='#/rang', wait=900)
    sw = page.evaluate(SWIPE)
    if 'err' not in sw:
        rows['Rang-Pfad wischen (längstes Bild)'] = sw['worst']
        info['Rang-Pfad wischen (längstes Bild)'] = f"{sw['slow']} von {sw['frames']} Bildern über 34 ms"
    page.wait_for_timeout(600)
    if page.query_selector('.node.st-ready [data-act=claim]'):
        page.evaluate("document.querySelector('[data-road-scroll]').scrollLeft = 0")
        page.wait_for_timeout(300)
        measure('Rang-Pfad: Belohnung abholen', sel='.node.st-ready [data-act=claim]', wait=400)
        close_fx(page)
        page.wait_for_timeout(300)

    page.evaluate("location.hash = '#/training'")
    page.wait_for_timeout(600)
    if page.query_selector('#view [data-act=start-session]'):
        measure('Training starten (Vorlage)', sel='#view [data-act=start-session]', wait=800)
    measure('Satz: Gewicht plus', sel='#view [data-step][data-f=w][data-dir="1"]')
    for name in ('Satz speichern', 'Noch einen Satz speichern'):
        r = page.evaluate(STALL, '#view [data-act=save-set]')
        rows[name] = r['ms']
        rows[f'  Stocken nach "{name}"'] = r['stall']
        close_fx(page)
    measure('Satz antippen (Fenster)', sel='#view [data-act=edit-set]', wait=500)
    measure('Satz ändern: Speichern', sel='.sheet [data-save]', wait=600)
    close_fx(page)

    page.evaluate("location.hash = '#/koerper'")
    page.wait_for_timeout(700)
    measure('Körper: Gewicht speichern', sel='#view [data-act=body-save]', wait=600)
    close_fx(page)
    browser.close()
    return rows, info, start, errors


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    port = args[args.index('--port') + 1] if '--port' in args else '8080'
    rate = float(args[args.index('--drossel') + 1]) if '--drossel' in args else 4
    rounds = int(args[args.index('--runden') + 1]) if '--runden' in args else 3
    state = json.load(open(args[0], encoding='utf-8'))
    state.setdefault('meta', {})['intro'] = {'profil': True, 'rang': True}
    sets = len(state.get('sets', []))
    results = []
    with sync_playwright() as p:
        for _ in range(rounds):
            results.append(one_round(p, port, state, rate))
    print(f'Prozessor {rate:g}-fach gedrosselt, Daten: {args[0]} ({sets} Sätze), Median aus {rounds} Runden')
    print(f'{"Start bis die Seite steht":40s} {round(statistics.median(r[2] for r in results)):5d} ms')
    slow = []
    errors = [e for r in results for e in r[3]]
    for name in results[0][0]:
        vals = [r[0].get(name) for r in results if r[0].get(name) is not None]
        if not vals:
            print(f'{name:40s} {results[0][1].get(name, "nicht gemessen")}')
            continue
        ms = round(statistics.median(vals))
        if name.startswith('  Stocken') or 'wischen' in name:
            limit = 50
        else:
            limit = LIMIT.get(name, 100)
        mark = '  zu langsam' if ms > limit else ''
        if mark:
            slow.append(name.strip())
        extra = results[-1][1].get(name)
        print(f'{name:40s} {ms:5d} ms{mark}  ({"/".join(str(v) for v in vals)}){"  | " + extra if extra else ""}')
    if errors:
        print('Fehler in der Seite:', errors)
    print('OK: alles im Ziel' if not slow else f'Zu langsam: {len(slow)} von den Zielen verfehlt ({", ".join(slow)})')
    sys.exit(1 if slow or errors else 0)


if __name__ == '__main__':
    main()
