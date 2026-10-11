"""Prüft das Neuzeichnen (morph in www/js/core.js): Nach einer Änderung wird nur geändert, was anders ist.

Vorher den Server starten: python3 -m http.server 8080 --directory www
Aufruf: python3 .claude/tests/neuzeichnen.py <state.json> [--port 8080]

1. Zufallstest: Viele zufällige Seiten werden ineinander umgebaut. Danach muss das Ergebnis genau dem neuen HTML
   entsprechen, und Elemente mit gleichem data-persist oder data-key müssen dieselben Elemente geblieben sein.
2. Echte Seiten: Zählt nach typischen Aktionen, wie viele Elemente neu gebaut wurden. Vorher (bis 2.8) war das
   immer die ganze Seite.
Endet mit Exit-Code 1, wenn etwas nicht stimmt.
"""
import json
import sys

from playwright.sync_api import sync_playwright

FUZZ = r"""async () => {
  const { morph } = await import('./js/core.js');
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  // Ein Baum als Daten, daraus HTML. Varianten entstehen durch kleine Änderungen am Baum.
  // Nur Elemente, die der Browser beim Einlesen nicht umbaut (li, p, b oder button ineinander würde er umstellen).
  const TAGS = ['div', 'span', 'section', 'article', 'aside'];
  let keyN = 0;
  function tree(depth) {
    const kids = [];
    const n = depth > 2 ? 0 : Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) kids.push(rnd() < 0.25 ? { text: 'T' + Math.floor(rnd() * 5) } : tree(depth + 1));
    const node = { tag: pick(TAGS), cls: 'c' + Math.floor(rnd() * 4), kids };
    const r = rnd();
    if (r < 0.15) node.key = 'k' + keyN++;
    else if (r < 0.25) node.persist = 'p' + keyN++;
    if (rnd() < 0.1) node.input = Math.floor(rnd() * 9);
    return node;
  }
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function html(node) {
    if (node.text != null) return node.text;
    if (node.input != null) return `<input value="${node.input}" class="${node.cls}"${node.key ? ` data-key="${node.key}"` : ''}>`;
    const attrs = `class="${node.cls}"${node.key ? ` data-key="${node.key}"` : ''}${node.persist ? ` data-persist="${node.persist}"` : ''}`;
    const el = `<${node.tag} ${attrs}>${node.kids.map(html).join('')}</${node.tag}>`;
    // Wie persistHtml (util.js): Stücke mit data-persist sind mit Kommentaren markiert.
    return node.persist ? `<!--p:${node.persist}-->${el}<!--/p:${node.persist}-->` : el;
  }
  // Zufällige Änderung: Kind dazu, weg, tauschen, Klasse oder Text ändern.
  function mutate(node) {
    if (node.text != null) { if (rnd() < 0.3) node.text = 'T' + Math.floor(rnd() * 5); return; }
    if (node.persist) return; // gleicher Schlüssel heißt gleicher Inhalt
    if (rnd() < 0.2) node.cls = 'c' + Math.floor(rnd() * 4);
    const k = node.kids;
    const r = rnd();
    if (r < 0.15) k.splice(Math.floor(rnd() * (k.length + 1)), 0, tree(2));
    else if (r < 0.3 && k.length) k.splice(Math.floor(rnd() * k.length), 1);
    else if (r < 0.45 && k.length > 1) { const i = Math.floor(rnd() * k.length); const j = Math.floor(rnd() * k.length); [k[i], k[j]] = [k[j], k[i]]; }
    else if (r < 0.5 && k.length) k.reverse();
    for (const c of k) if (c.kids || c.text != null) mutate(c);
  }
  const box = document.createElement('div');
  document.body.appendChild(box);
  const norm = (h) => { const t = document.createElement('template'); t.innerHTML = h.replace(/<!--\/?p:[\w-]+-->/g, ''); return t.innerHTML; };
  let errors = [];
  for (let trial = 0; trial < 400; trial++) {
    const a = { tag: 'div', cls: 'root', kids: [tree(0), tree(0), tree(0), tree(1)] };
    const b = clone(a);
    mutate(b);
    if (rnd() < 0.3) mutate(b);
    box.innerHTML = html(a).replace(/^<div class="root">|<\/div>$/g, '').replace(/<!--\/?p:[\w-]+-->/g, '');
    const before = new Map();
    box.querySelectorAll('[data-key],[data-persist]').forEach((el) => before.set(el.getAttribute('data-key') || el.getAttribute('data-persist'), el));
    const want = html(b).replace(/^<div class="root">|<\/div>$/g, '');
    morph(box, want);
    if (box.innerHTML !== norm(want)) { errors.push(`Versuch ${trial}: Ergebnis weicht ab`); continue; }
    // Elemente mit Schlüssel bleiben dieselben Elemente, auch wenn sie den Platz wechseln.
    box.querySelectorAll('[data-key],[data-persist]').forEach((el) => {
      const old = before.get(el.getAttribute('data-key') || el.getAttribute('data-persist'));
      if (old && old !== el) errors.push(`Versuch ${trial}: Element mit Schlüssel neu gebaut`);
    });
    // Inhalte von Eingabefeldern
    const vals = [...box.querySelectorAll('input')].map((i) => i.value).join(',');
    const t = document.createElement('div'); t.innerHTML = want;
    const exp = [...t.querySelectorAll('input')].map((i) => i.getAttribute('value')).join(',');
    if (vals !== exp) errors.push(`Versuch ${trial}: Eingabefelder ${vals} statt ${exp}`);
  }
  // Gleiche Schlüssel bleiben dieselben Elemente, auch wenn sie den Platz tauschen.
  box.innerHTML = '<ul><li data-key="a">A</li><li data-key="b">B</li><li data-key="c">C</li></ul><i data-persist="x"><b>X</b></i>';
  const a = box.querySelector('[data-key=a]');
  const c = box.querySelector('[data-key=c]');
  const x = box.querySelector('[data-persist=x]');
  morph(box, '<ul><li data-key="c">C2</li><li data-key="a">A</li></ul><p>neu</p><i data-persist="x"><b>X</b></i>');
  if (box.querySelector('[data-key=a]') !== a || box.querySelector('[data-key=c]') !== c) errors.push('data-key: Elemente wurden neu gebaut statt verschoben');
  if (box.querySelector('[data-persist=x]') !== x) errors.push('data-persist: Element wurde neu gebaut');
  if (box.querySelector('[data-key=c]').textContent !== 'C2') errors.push('data-key: Inhalt nicht abgeglichen');
  if (box.querySelector('[data-key=b]')) errors.push('Entferntes Element ist noch da');
  // Klassen, die Skripte setzen (zum Beispiel is-intro im Rang-Pfad), bleiben stehen.
  box.innerHTML = '<div class="card">1</div>';
  box.firstChild.classList.add('is-intro');
  morph(box, '<div class="card pad">2</div>');
  if (box.firstChild.className !== 'card pad is-intro') errors.push('is-intro ging verloren: ' + box.firstChild.className);
  box.remove();
  return errors;
}"""

# Zählt neu eingefügte Elemente während einer Aktion.
COUNT = r"""async (act) => {
  const added = { n: 0 };
  const mo = new MutationObserver((list) => {
    for (const m of list) for (const node of m.addedNodes) if (node.nodeType === 1) added.n += 1 + node.querySelectorAll('*').length;
  });
  const view = document.getElementById('view');
  mo.observe(view, { childList: true, subtree: true });
  eval(act);
  await new Promise((r) => setTimeout(r, 120));
  mo.disconnect();
  return { added: added.n, total: view.querySelectorAll('*').length };
}"""

ACTIONS = [
    ('Training: Satz speichern', 'training', "document.querySelector('[data-act=start-session]')?.click()",
     "document.querySelector('#view [data-act=save-set]').click()"),
    ('Training: noch ein Satz', 'training', None, "document.querySelector('#view [data-act=save-set]').click()"),
    ('Übung im Detail: Diagramm umschalten', 'uebung/55', None, "document.querySelector('[data-act=metric][data-v=top]').click()"),
    ('Verlauf: anderen Tag antippen', 'verlauf', "document.querySelectorAll('.cal-day.has')[0].click()",
     "document.querySelectorAll('.cal-day.has')[1].click()"),
    ('Einstellungen: Pause ändern', 'einstellungen', None, "document.querySelector('[data-act=set-rest][data-dir=\"1\"]').click()"),
    ('Rang-Pfad: Belohnung abholen', 'rang', None, "document.querySelector('.node.st-ready [data-act=claim]').click()"),
]


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    port = args[args.index('--port') + 1] if '--port' in args else '8080'
    state = json.load(open(args[0], encoding='utf-8'))
    problems = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 393, 'height': 852}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f'http://localhost:{port}/#/start')
        page.wait_for_timeout(500)
        page.evaluate("""(st) => new Promise((res) => {
          const req = indexedDB.open('kintore', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('kv');
          req.onsuccess = () => { const tx = req.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(st, 'state'); tx.oncomplete = () => res(true); };
        })""", state)
        page.reload()
        page.wait_for_timeout(700)
        fuzz = page.evaluate(FUZZ)
        print('Zufallstest: ' + ('400 Umbauten stimmen' if not fuzz else f'{len(fuzz)} Fehler'))
        for e in fuzz[:10]:
            print('  ' + e)
        problems += fuzz
        for name, route, prepare, act in ACTIONS:
            page.evaluate(f"location.hash = '#/{route}'")
            page.wait_for_timeout(600)
            if prepare:
                page.evaluate(prepare)
                page.wait_for_timeout(500)
            page.evaluate("document.querySelector('[data-act=sheet-close]')?.click(); document.querySelectorAll('#fx-root .fx').forEach((x) => x.remove())")
            r = page.evaluate(COUNT, act)
            share = r['added'] / max(1, r['total'])
            mark = '  zu viel' if share > 0.35 else ''
            print(f"{name:40s} {r['added']:5d} von {r['total']:5d} Elementen neu{mark}")
            if mark:
                problems.append(name)
            page.evaluate("document.querySelectorAll('#fx-root .fx').forEach((x) => x.remove())")
        if errors:
            print('Fehler in der Seite:', errors)
            problems += errors
        browser.close()
    print('OK: Neuzeichnen ändert nur, was anders ist' if not problems else f'{len(problems)} Probleme')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
