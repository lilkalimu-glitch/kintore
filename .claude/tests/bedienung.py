"""Prüft die App nach den Regeln in docs/bedienung.md.

Vorher den Server starten: python3 -m http.server 8080 --directory www
Aufruf: python3 .claude/tests/bedienung.py <state.json|leer> [--port 8080] [--schrift 1.3]
Prüft auf allen Seiten und in den wichtigsten Fenstern:
  - Tippflächen mindestens 44 x 44 px (unsichtbare Vergrößerung über ::after oder ::before zählt mit)
  - jeder Knopf hat einen Namen (Text oder aria-label), den TalkBack vorlesen kann
  - keine Schrift unter 11 px
  - mit größerer System-Schrift (Standard 130 %, wie in der Android-App) wird nichts abgeschnitten
    und nichts ragt über den Rand
Meldet jeden Fund und endet dann mit Exit-Code 1.
"""
import json
import sys

from playwright.sync_api import sync_playwright

ROUTES = ['start', 'training', 'uebungen', 'uebung/55', 'verlauf', 'koerper', 'einstellungen', 'rang', 'profil']
SHEETS = [
    ('profil', "document.querySelector('[data-act=look-open][data-type=banner]').click()"),
    ('profil', "document.querySelector('[data-act=profile-edit]').click()"),
    ('training', "document.querySelector('[data-act=edit-templates]').click(); document.querySelector('.sheet [data-t]').click()"),
    ('uebungen', "document.querySelector('[data-act=new-ex]').click()"),
    ('einstellungen', "document.querySelector('[data-act=set-goal]').click()"),
]

AUDIT = r"""(root) => {
  const out = [];
  const box = document.querySelector(root);
  if (!box) return out;
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[hidden],[aria-hidden="true"]');
  };
  const nameOf = (el) => (el.getAttribute('aria-label') || el.textContent || '').trim();
  const label = (el) => (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : el.tagName) + ' "' + nameOf(el).slice(0, 28).replace(/\s+/g, ' ') + '"';
  const sel = 'button, a[href], [role="button"], select, textarea, input:not([type=hidden]):not([type=checkbox]):not([type=file]), label.sw-row';
  for (const el of box.querySelectorAll(sel)) {
    if (!vis(el) || el.matches('.visually-hidden')) continue;
    const r = el.getBoundingClientRect();
    let ex = { t: 0, r: 0, b: 0, l: 0 };
    for (const ps of ['::after', '::before']) {
      const c = getComputedStyle(el, ps);
      if (c.content === 'none' || c.position !== 'absolute') continue;
      const v = (k) => Math.max(0, -parseFloat(c[k]) || 0);
      ex = { t: Math.max(ex.t, v('top')), r: Math.max(ex.r, v('right')), b: Math.max(ex.b, v('bottom')), l: Math.max(ex.l, v('left')) };
    }
    const w = r.width + ex.l + ex.r;
    const h = r.height + ex.t + ex.b;
    if (w < 43.5 || h < 43.5) out.push(`Tippfläche zu klein: ${label(el)} ${Math.round(w)} x ${Math.round(h)}`);
    if (!nameOf(el) && !el.matches('input, textarea, select')) out.push(`Knopf ohne Namen: ${label(el)}`);
  }
  const tw = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (tw.nextNode()) {
    const el = tw.currentNode.parentElement;
    if (!tw.currentNode.textContent.trim() || !el || seen.has(el) || el.closest('svg') || !vis(el)) continue;
    seen.add(el);
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 10.95) out.push(`Schrift unter 11 px: ${label(el)} ${fs} px`);
  }
  return [...new Set(out)];
}"""

ZOOM = r"""(z) => {
  const all = [...document.querySelectorAll('#view *, #tabs *')].filter((el) => !el.dataset.zoomed);
  const sizes = all.map((el) => parseFloat(getComputedStyle(el).fontSize));
  all.forEach((el, i) => { el.dataset.zoomed = '1'; el.style.fontSize = (sizes[i] * z) + 'px'; });
}"""

CUT = r"""() => {
  const out = [];
  for (const el of document.querySelectorAll('#view *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || el.closest('svg, .visually-hidden, [aria-hidden="true"]') || el.children.length || !el.textContent.trim()) continue;
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    // Gewollt mit "..." gekürzte Namen zählen nicht, nur hart abgeschnittener Text.
    const hidden = cs.overflow === 'hidden' || cs.overflowX === 'hidden';
    if (hidden && cs.textOverflow !== 'ellipsis' && cs.webkitLineClamp === 'none' && el.scrollWidth > el.clientWidth + 2) out.push('abgeschnitten: ' + el.textContent.trim().slice(0, 30));
    if (r.right > innerWidth + 1 && !el.closest('.cat-row, .road-scroll, .jp-mark')) out.push('ragt über den Rand: ' + el.textContent.trim().slice(0, 30));
  }
  return [...new Set(out)];
}"""


def load(page, port, state):
    page.goto(f'http://localhost:{port}/#/start')
    page.wait_for_timeout(300)
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
    page.wait_for_timeout(700)


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    port = args[args.index('--port') + 1] if '--port' in args else '8080'
    zoom = float(args[args.index('--schrift') + 1]) if '--schrift' in args else 1.3
    state = None if args[0] == 'leer' else json.load(open(args[0], encoding='utf-8'))
    if state:
        state.setdefault('meta', {})['intro'] = {'profil': True, 'rang': True}
    found = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 393, 'height': 852}, reduced_motion='reduce')
        load(page, port, state)
        for r in ROUTES:
            page.evaluate(f"location.hash = '#/{r}'")
            page.wait_for_timeout(800)
            page.set_viewport_size({'width': 393, 'height': 6000})
            page.wait_for_timeout(200)
            found += [f'{r}: {x}' for x in page.evaluate(AUDIT, '#view') + page.evaluate(AUDIT, '#tabs')]
            page.set_viewport_size({'width': 393, 'height': 852})
        for r, js in SHEETS:
            page.evaluate(f"location.hash = '#/{r}'")
            page.wait_for_timeout(700)
            page.evaluate(js)
            page.wait_for_timeout(400)
            page.set_viewport_size({'width': 393, 'height': 3000})
            page.wait_for_timeout(200)
            found += [f'Fenster auf {r}: {x}' for x in page.evaluate(AUDIT, '#sheet-root')]
            page.set_viewport_size({'width': 393, 'height': 852})
            page.keyboard.press('Escape')
            page.evaluate("document.querySelector('[data-act=sheet-close]')?.click()")
            page.wait_for_timeout(500)
        for r in ROUTES:
            load(page, port, state)
            page.evaluate(f"location.hash = '#/{r}'")
            page.wait_for_timeout(800)
            page.evaluate(ZOOM, zoom)
            page.wait_for_timeout(200)
            found += [f'{r} mit {round(zoom * 100)} % Schrift: {x}' for x in page.evaluate(CUT)]
        browser.close()
    print('\n'.join(found) if found else f'OK: alle Regeln erfüllt ({len(ROUTES)} Seiten, {len(SHEETS)} Fenster, Schrift {round(zoom * 100)} %)')
    sys.exit(1 if found else 0)


if __name__ == '__main__':
    main()
