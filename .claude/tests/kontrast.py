"""Prüft den Kontrast nach Regel 2 in docs/bedienung.md.

Vorher den Server starten: python3 -m http.server 8080 --directory www
Aufruf: python3 .claude/tests/kontrast.py <state.json|leer> [--design dunkel|hell|neon] [--port 8080]
Misst auf allen Seiten (auch mitten im Training), in den wichtigsten Fenstern, bei den Effekten und in der
Einführung die echte Farbe hinter jedem Text. Dafür wird die Schrift kurz unsichtbar gemacht und ein Bildschirmfoto
genommen, so zählen auch Verläufe, Bilder und halb durchsichtige Flächen. Verglichen wird mit der Schriftfarbe:
  - Text mindestens 4,5 : 1, große Schrift (ab 24 px oder fett ab 19 px) mindestens 3 : 1
  - Symbole in Knöpfen ohne Text mindestens 3 : 1
Nicht geprüft werden Deko (aria-hidden), gesperrte Knöpfe (disabled) und verdeckte Stellen.
Gleiche Funde werden zusammengefasst. Endet bei Funden mit Exit-Code 1.
"""
import io
import json
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

ROUTES = ['start', 'training', 'uebungen', 'uebung/55', 'verlauf', 'koerper', 'einstellungen', 'rang', 'profil']
SHEETS = [
    ('profil', "document.querySelector('[data-act=look-open][data-type=banner]').click()"),
    ('profil', "document.querySelector('[data-act=look-open][data-type=frame]').click()"),
    ('profil', "document.querySelector('[data-act=profile-edit]').click()"),
    ('training', "document.querySelector('[data-act=edit-templates]').click(); document.querySelector('.sheet [data-t]').click()"),
    ('uebungen', "document.querySelector('[data-act=new-ex]').click()"),
    ('einstellungen', "document.querySelector('[data-act=set-goal]').click()"),
]
# Mitten im Training: Seite, Satz-Fenster, Übungs-Menü und Übung hinzufügen.
ACTIVE = """async () => { const ops = await import('./js/ops.js'); const { app } = await import('./js/core.js');
  if (!app.state.active) ops.startSession(app.state.templates[0]?.id ?? null);
  const ex = app.state.active.ex; if (ex[0]) { ops.addSet(ex[0], 52.5, 10); ops.addSet(ex[0], 52.5, 9); } }"""
ACTIVE_SHEETS = [
    "document.querySelector('.set')?.click()",
    "document.querySelector('.exb-head .icon-btn')?.click()",
    "document.querySelector('[data-act=add-ex]')?.click()",
]
FX = {
    'Rekord': "fx.prBurst({ name: 'Flat Barbell Bench Press', w: 82.5, r: 8, bw: false, e1: 104.5, gain: 2.5 })",
    'Level': "fx.levelUp({ level: 26, rank: 'B', rewards: [look.ITEMS.find((i) => i.lv === 11)] })",
    'Rang': "fx.rankUp({ from: 'B', to: 'A', level: 35, frame: 'hex', rewards: [] })",
    'Belohnung': "fx.rewardReveal({ items: [look.ITEMS.find((i) => i.lv === 27)], rankId: 'B' })",
    'Belohnungen': "fx.rewardSummary({ items: look.ITEMS.filter((i) => i.lv > 1 && i.lv < 30) })",
    'Training fertig': "fx.missionComplete({ title: 'Pull', dur: 3720000, sets: 18, vol: 9450, prs: 2, xp: 640 })",
    'Banner': "fx.banner({ jp: '達成', text: 'Tages-Quest geschafft', xp: 100, ic: 'target' })",
    'Hinweis': "fx.toast('Satz gelöscht', { label: 'Rückgängig', run() {} })",
}

# Schrift, Werte in Feldern und Symbole unsichtbar machen, damit nur der Hintergrund bleibt.
HIDE = """*, *::before, *::after { -webkit-text-fill-color: transparent !important; text-shadow: none !important;
  text-decoration-color: transparent !important; caret-color: transparent !important; }
svg text, svg tspan { fill: transparent !important; stroke: transparent !important; }
svg.ic { visibility: hidden !important; }"""

COLLECT = r"""(roots) => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0,0,0,0)'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const W = innerWidth, H = innerHeight;
  const opacityOf = (el) => { let o = 1; for (let x = el; x && x.nodeType === 1; x = x.parentElement) o *= parseFloat(getComputedStyle(x).opacity); return o; };
  const hiddenOf = (el) => !!el.closest('[aria-hidden="true"], .visually-hidden, [hidden], button:disabled, input:disabled, select:disabled, fieldset:disabled, [aria-disabled="true"]');
  // Sichtbarer Ausschnitt: Fenster und alle Eltern mit overflow (Leisten zum Wischen).
  const clipOf = (el) => { let c = [0, 0, W, H];
    for (let x = el.parentElement; x && x !== document.body; x = x.parentElement) {
      const cs = getComputedStyle(x);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const r = x.getBoundingClientRect();
        c = [Math.max(c[0], r.left), Math.max(c[1], r.top), Math.min(c[2], r.right), Math.min(c[3], r.bottom)]; }
    }
    return c; };
  const cut = (r, c) => { const x0 = Math.max(r.left, c[0]), y0 = Math.max(r.top, c[1]), x1 = Math.min(r.right, c[2]), y1 = Math.min(r.bottom, c[3]);
    return x1 - x0 >= 2 && y1 - y0 >= 2 ? [x0, y0, x1, y1] : null; };
  // Liegt etwas anderes darüber (Fenster, Leiste), zählt die Stelle nicht.
  const onTop = (el, b) => { const t = document.elementFromPoint((b[0] + b[2]) / 2, (b[1] + b[3]) / 2);
    return !t || el.contains(t) || t.contains(el) || t === el; };
  const name = (el) => { const c = typeof el.className === 'string' ? el.className.trim() : (el.className?.baseVal || '');
    return (c ? '.' + c.split(/\s+/).slice(0, 2).join('.') : el.tagName.toLowerCase()); };
  const out = [];
  for (const sel of roots) {
    const box = document.querySelector(sel);
    if (!box) continue;
    const tw = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    while (tw.nextNode()) {
      const node = tw.currentNode;
      const text = node.textContent.trim();
      const el = node.parentElement;
      if (!text || !el || el.closest('style, script')) continue;
      if (hiddenOf(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const op = opacityOf(el);
      if (op < 0.02) continue;
      if (cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text') continue;
      const fill = el.closest('svg') ? cs.fill : (cs.webkitTextFillColor || cs.color);
      const fg = rgba(fill && fill !== 'currentcolor' ? fill : cs.color);
      fg[3] *= op;
      if (fg[3] < 0.02) continue;
      range.selectNodeContents(node);
      const clip = clipOf(el);
      let list = [...range.getClientRects()];
      if (!list.length && el.closest('svg')) list = [el.getBoundingClientRect()];
      const rects = list.map((r) => cut(r, clip)).filter(Boolean).filter((b) => onTop(el, b));
      if (!rects.length) continue;
      const fs = parseFloat(cs.fontSize);
      const fw = parseInt(cs.fontWeight, 10) || 400;
      const large = fs >= 23.95 || (fs >= 18.65 && fw >= 700);
      out.push({ kind: 'Text', label: `${name(el)} "${text.slice(0, 26).replace(/\s+/g, ' ')}"`, rects, fg, need: large ? 3 : 4.5, fs });
    }
    // Werte in Eingabefeldern sind kein Text im DOM, zählen aber genauso.
    for (const el of box.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=hidden]), textarea, select')) {
      const val = el.tagName === 'SELECT' ? el.selectedOptions[0]?.textContent : el.value;
      if (!val || !String(val).trim() || hiddenOf(el)) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const pl = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth), pr = parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth);
      const fs = parseFloat(cs.fontSize);
      const cy = r.top + r.height / 2;
      const b = cut({ left: r.left + pl, right: r.right - pr, top: cy - fs * 0.6, bottom: cy + fs * 0.6 }, clipOf(el));
      if (!b || !onTop(el, b)) continue;
      const fg = rgba(cs.webkitTextFillColor || cs.color); fg[3] *= opacityOf(el);
      const fw = parseInt(cs.fontWeight, 10) || 400;
      out.push({ kind: 'Feld', label: `${name(el)} "${String(val).slice(0, 20)}"`, rects: [b], fg, need: fs >= 23.95 || (fs >= 18.65 && fw >= 700) ? 3 : 4.5, fs });
    }
    // Symbole in Knöpfen ohne sichtbaren Text: Das Symbol ist das einzige Erkennungszeichen.
    for (const svg of box.querySelectorAll('svg.ic')) {
      const ctl = svg.closest('button, a[href], [role=button], [role=radio], [role=tab], [role=switch]');
      if (!ctl || ctl.textContent.trim() || svg.parentElement.closest('[aria-hidden="true"]:not(svg)') || hiddenOf(ctl)) continue;
      const cs = getComputedStyle(svg);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const r = svg.getBoundingClientRect();
      const b = cut(r, clipOf(svg));
      if (!b || !onTop(ctl, b)) continue;
      const stroke = cs.stroke && cs.stroke !== 'none' ? cs.stroke : '';
      const fg = rgba(stroke && !stroke.startsWith('url') ? stroke : cs.color); fg[3] *= opacityOf(svg);
      out.push({ kind: 'Symbol', label: `${name(ctl)} "${(ctl.getAttribute('aria-label') || '').slice(0, 26)}"`, rects: [b], fg, need: 3, icon: true });
    }
  }
  return out;
}"""


def lum(c):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2])


def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def hexc(c):
    return '#%02X%02X%02X' % tuple(int(round(v)) for v in c[:3])


def measure(img, item):
    """Kontrast an der Stelle mit dem schwächsten Viertel der Fläche (Text) bzw. dem schwächsten Zehntel (Symbol)."""
    px = img.load()
    w, h = img.size
    fg = item['fg']
    samples = []
    for x0, y0, x1, y1 in item['rects']:
        # Bei Text nur die Mitte der Zeile (dort liegen die Buchstaben), nicht den Zeilenabstand darüber und darunter.
        if not item.get('icon'):
            fs = item.get('fs', 14)
            cy = (y0 + y1) / 2
            y0, y1 = max(y0, cy - fs * 0.42), min(y1, cy + fs * 0.42)
        step = max(1, int(min(x1 - x0, y1 - y0) / 6))
        for y in range(int(y0) + 1, int(y1), step):
            for x in range(int(x0) + 1, int(x1), max(1, step)):
                if 0 <= x < w and 0 <= y < h:
                    samples.append(px[x, y][:3])
    if not samples:
        return None
    res = []
    for bg in samples:
        a = fg[3]
        col = [fg[i] * a + bg[i] * (1 - a) for i in range(3)]
        res.append((ratio(col, bg), bg, col))
    res.sort(key=lambda t: t[0])
    q = res[int(len(res) * (0.1 if item.get('icon') else 0.25))]
    return q


def check(page, where, roots, found):
    items = page.evaluate(COLLECT, roots)
    page.add_style_tag(content=HIDE)
    page.wait_for_timeout(60)
    img = Image.open(io.BytesIO(page.screenshot())).convert('RGB')
    page.evaluate("document.querySelectorAll('style').forEach((s) => { if (s.textContent.includes('caret-color: transparent !important')) s.remove(); })")
    for it in items:
        m = measure(img, it)
        if not m:
            continue
        r, bg, col = m
        if r + 0.005 < it['need']:
            found.append((where, it['kind'], it['label'], r, it['need'], hexc(col), hexc(bg)))
    return len(items)


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
    page.wait_for_timeout(800)


def go(page, route, tall=6000):
    page.set_viewport_size({'width': 393, 'height': 852})
    page.evaluate(f"location.hash = '#/{route}'")
    page.wait_for_timeout(800)
    page.set_viewport_size({'width': 393, 'height': tall})
    page.wait_for_timeout(250)


def close(page):
    page.keyboard.press('Escape')
    page.evaluate("document.querySelector('[data-act=sheet-close]')?.click()")
    page.evaluate("import('./js/core.js').then((c) => c.closeSheet?.())")
    page.wait_for_timeout(450)


def set_design(page, design):
    """Ohne gespeicherte Daten das Design wie ein Nutzer in den Einstellungen wählen."""
    page.evaluate("location.hash = '#/einstellungen'")
    page.wait_for_timeout(700)
    page.evaluate(f"document.querySelector('.dp[data-v=\"{design}\"]')?.click()")
    page.wait_for_timeout(500)


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    port = args[args.index('--port') + 1] if '--port' in args else '8080'
    design = args[args.index('--design') + 1] if '--design' in args else None
    state = None if args[0] == 'leer' else json.load(open(args[0], encoding='utf-8'))
    if state:
        state.setdefault('meta', {})['intro'] = {'profil': True, 'rang': True}
        if design:
            state.setdefault('settings', {})['theme'] = design
    found = []
    count = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 393, 'height': 852}, reduced_motion='reduce')
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        load(page, port, state)
        if design and not state:
            set_design(page, design)
        shown = page.evaluate("document.documentElement.dataset.theme")
        for r in ROUTES:
            go(page, r)
            count += check(page, r, ['#view', '#tabs', '#timer'], found)
        for r, js in SHEETS:
            go(page, r, 852)
            try:
                page.evaluate(js)
            except Exception:
                continue
            page.wait_for_timeout(450)
            page.set_viewport_size({'width': 393, 'height': 3000})
            page.wait_for_timeout(250)
            count += check(page, f'Fenster auf {r}', ['#sheet-root'], found)
            page.set_viewport_size({'width': 393, 'height': 852})
            close(page)
        # Mitten im Training
        page.evaluate(ACTIVE)
        page.evaluate("document.querySelectorAll('#fx-root > *').forEach((x) => x.remove())")
        for r in ['training', 'start']:
            go(page, r)
            page.evaluate("document.querySelectorAll('#fx-root > *').forEach((x) => x.remove())")
            page.wait_for_timeout(200)
            count += check(page, f'{r} im Training', ['#view', '#tabs', '#timer'], found)
        for js in ACTIVE_SHEETS:
            go(page, 'training', 852)
            page.evaluate("document.querySelectorAll('#fx-root > *').forEach((x) => x.remove())")
            page.evaluate(js)
            page.wait_for_timeout(450)
            page.set_viewport_size({'width': 393, 'height': 3000})
            page.wait_for_timeout(250)
            count += check(page, 'Fenster im Training', ['#sheet-root'], found)
            page.set_viewport_size({'width': 393, 'height': 852})
            close(page)
        # Effekte und Hinweis unten
        page.set_viewport_size({'width': 393, 'height': 852})
        for name, code in FX.items():
            page.evaluate("document.querySelectorAll('#fx-root > *, #toast-root > *').forEach((x) => x.remove())")
            page.evaluate(f"(async () => {{ const fx = await import('./js/fx.js'); const look = await import('./js/look.js'); {code}; }})()")
            page.wait_for_timeout(1400)
            count += check(page, f'Effekt {name}', ['#fx-root', '#toast-root'], found)
        page.evaluate("document.querySelectorAll('#fx-root > *, #toast-root > *').forEach((x) => x.remove())")
        # Einführung
        if state:
            intro = json.loads(json.dumps(state))
            intro['meta']['intro'] = {}
            load(page, port, intro)
            page.evaluate("location.hash = '#/profil'")
            page.wait_for_timeout(1300)
            count += check(page, 'Einführung', ['#fx-root'], found)
        browser.close()
    groups = {}
    for f in found:
        key = (f[0].split(' ')[0] if f[0].startswith('Effekt') else f[0], f[1], f[2].split(' "')[0], round(f[3], 2), f[5], f[6])
        groups.setdefault(key, []).append(f)
    lines = []
    for key, fs in groups.items():
        where, kind, label, r, need, fg, bg = fs[0]
        more = f' ({len(fs)} x)' if len(fs) > 1 else ''
        lines.append(f'{where}: {kind} {label} {r:.2f} : 1, braucht {need:g} ({fg} auf {bg}){more}')
    if errs:
        lines += ['Fehler auf der Seite: ' + e for e in errs]
    print('\n'.join(lines) if lines else f'OK: Kontrast überall ausreichend (Design {shown}, {count} Stellen geprüft)')
    sys.exit(1 if lines else 0)


if __name__ == '__main__':
    main()
