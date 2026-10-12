"""Zeichnet App-Symbol, Benachrichtigungs-Symbol und Startbild (seit 2.10: ein K statt Kanji, ohne Glitzer-Stern).

Aufruf: python3 scripts/build-icons.py [--vorschau <bild.png>]
Braucht fontTools, Pillow und Playwright mit Chromium. Läuft nur beim Ändern der Bilder, nicht im GitHub-Build:
die fertigen PNG-Dateien liegen in android-res/ und scripts/patch-android.py kopiert sie ins Android-Projekt.
Das K kommt als Umriss aus www/fonts/barlow-600.woff, der Schriftzug KINTORE aus derselben Schrift.
Die Farbe hinter dem adaptiven Symbol steht als ICON_BG in scripts/patch-android.py und muss zu PINK passen.
"""
import io
import os
import sys
import tempfile

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, 'android-res')
FONT = os.path.join(ROOT, 'www', 'fonts', 'barlow-600.woff')
PINK = '#F571A6'   # Akzentfarbe im Design Dunkel
DARK = '#0E0F13'   # Grund im Design Dunkel
LIGHT = '#F2F3F5'  # Schrift im Design Dunkel
INK = '#15171C'    # Schrift im Design Hell (Startbild Hell, seit 2.11)

DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def k_path():
    """Umriss des K aus Barlow SemiBold, Grundlinie bei y = 700, Oberkante bei y = 0 (Schrift-Einheiten)."""
    font = TTFont(FONT)
    glyphs = font.getGlyphSet()
    pen = SVGPathPen(glyphs)
    glyphs[font.getBestCmap()[ord('K')]].draw(TransformPen(pen, (1, 0, 0, -1, 0, 700)))
    return pen.getCommands()


# Das K ist in Schrift-Einheiten 526 breit (x 73-599) und 700 hoch. Mitte: x 336, y 350.
def k_svg(d, size, k_height, color, cx=None, cy=None):
    s = k_height / 700
    cx = size / 2 if cx is None else cx
    cy = size / 2 if cy is None else cy
    # Etwas kräftiger als die Schrift, damit das K auch klein gut sichtbar ist (Kontur in derselben Farbe).
    return (f'<g transform="translate({cx:.2f} {cy:.2f}) scale({s:.5f}) translate(-336 -350)">'
            f'<path d="{d}" fill="{color}" stroke="{color}" stroke-width="22" stroke-linejoin="round"/></g>')


def page_html(d):
    fonts = 'file://' + os.path.join(ROOT, 'www', 'css', 'fonts.css')
    k = lambda *a, **kw: k_svg(d, *a, **kw)  # noqa: E731
    return f"""<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="{fonts}">
<style>
  html, body {{ margin: 0; background: transparent; }}
  .st {{ display: block; margin: 0 0 20px; }}
  #splash {{ position: relative; width: 600px; height: 780px; }}
  #splash svg, #splash-light svg {{ position: absolute; left: 168px; top: 214px; }}
  #splash-light {{ position: relative; width: 600px; height: 780px; }}
  #splash-light .name {{ position: absolute; left: 0; right: 0; top: 520px; text-align: center; color: {INK};
    font: 600 60px/1 'KBarlow'; letter-spacing: 0.14em; text-indent: 0.14em; }}
  #splash .name {{ position: absolute; left: 0; right: 0; top: 520px; text-align: center; color: {LIGHT};
    font: 600 60px/1 'KBarlow'; letter-spacing: 0.14em; text-indent: 0.14em; }}
</style></head><body>
<!-- Vordergrund vom adaptiven Symbol: 108 dp, sichtbar sicher ist ein Kreis mit 66 dp in der Mitte -->
<svg id="fg" class="st" width="432" height="432" viewBox="0 0 432 432">{k(432, 150, DARK)}</svg>
<!-- Einfarbig für Android-Themen-Symbole (Android 13) -->
<svg id="mono" class="st" width="432" height="432" viewBox="0 0 432 432">{k(432, 150, '#FFFFFF')}</svg>
<!-- Altes Symbol (vor Android 8): Quadrat mit runden Ecken und rund -->
<svg id="legacy" class="st" width="192" height="192" viewBox="0 0 192 192"><rect x="10" y="10" width="172" height="172" rx="40" fill="{PINK}"/>{k(192, 80, DARK)}</svg>
<svg id="round" class="st" width="192" height="192" viewBox="0 0 192 192"><circle cx="96" cy="96" r="86" fill="{PINK}"/>{k(192, 80, DARK)}</svg>
<!-- Benachrichtigung: nur weiß, Android färbt es selbst -->
<svg id="stat" class="st" width="96" height="96" viewBox="0 0 96 96">{k(96, 74, '#FFFFFF')}</svg>
<!-- Startbild (xxhdpi): Symbol und Schriftzug auf dem dunklen Grund -->
<div id="splash" class="st"><svg width="264" height="264" viewBox="0 0 264 264"><rect width="264" height="264" rx="60" fill="{PINK}"/>{k(264, 112, DARK)}</svg><div class="name">KINTORE</div></div>
<!-- Startbild für Hell und Automatisch (seit 2.11): dunkle Schrift auf hellem Grund -->
<div id="splash-light" class="st"><svg width="264" height="264" viewBox="0 0 264 264"><rect width="264" height="264" rx="60" fill="{PINK}"/>{k(264, 112, DARK)}</svg><div class="name">KINTORE</div></div>
</body></html>"""


def shot(page, sel):
    png = page.locator(sel).screenshot(omit_background=True)
    return Image.open(io.BytesIO(png)).convert('RGBA')


def save(img, folder, name, size):
    out = img.resize(size, Image.LANCZOS)
    path = os.path.join(RES, folder, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out.save(path, optimize=True)
    return out


def main():
    args = sys.argv[1:]
    preview = args[args.index('--vorschau') + 1] if '--vorschau' in args else None
    html = page_html(k_path())
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, 'icons.html')
        with open(src, 'w', encoding='utf-8') as fh:
            fh.write(html)
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(device_scale_factor=2, viewport={'width': 700, 'height': 900})
            page.goto('file://' + src)
            page.evaluate('document.fonts.ready.then(() => document.fonts.check("600 60px KBarlow"))')
            page.wait_for_timeout(300)
            big = {name: shot(page, '#' + name) for name in ('fg', 'mono', 'legacy', 'round', 'stat', 'splash', 'splash-light')}
            browser.close()
    made = []
    for dens, f in DENSITIES.items():
        s = lambda dp: (round(dp * f), round(dp * f))  # noqa: E731
        made.append(save(big['fg'], f'mipmap-{dens}', 'kintore_icon_fg.png', s(108)))
        save(big['mono'], f'mipmap-{dens}', 'kintore_icon_mono.png', s(108))
        save(big['legacy'], f'mipmap-{dens}', 'ic_launcher.png', s(48))
        save(big['round'], f'mipmap-{dens}', 'ic_launcher_round.png', s(48))
        save(big['stat'], f'drawable-{dens}', 'ic_stat_kintore.png', s(24))
    save(big['splash'], 'drawable-xhdpi', 'kintore_splash_logo.png', (400, 520))
    save(big['splash'], 'drawable-xxhdpi', 'kintore_splash_logo.png', (600, 780))
    save(big['splash-light'], 'drawable-xhdpi', 'kintore_splash_logo_light.png', (400, 520))
    save(big['splash-light'], 'drawable-xxhdpi', 'kintore_splash_logo_light.png', (600, 780))
    print('Bilder in android-res/ geschrieben')
    if preview:
        make_preview(big, preview)


def make_preview(big, path):
    """Übersicht zum Anschauen: Symbol in drei Masken, einfarbig, klein, Benachrichtigung und Startbild."""
    fg = big['fg'].resize((432, 432), Image.LANCZOS)
    sheet = Image.new('RGBA', (432 * 3 + 600 + 100, 900), (30, 32, 38, 255))
    x = 20
    for mask in ('circle', 'squircle', 'rounded'):
        tile = Image.new('RGBA', (432, 432), (0, 0, 0, 0))
        bg = Image.new('RGBA', (432, 432), PINK)
        bg.alpha_composite(fg)
        m = Image.new('L', (432, 432), 0)
        from PIL import ImageDraw
        dr = ImageDraw.Draw(m)
        inset = 432 * (18 / 108)
        box = (inset, inset, 432 - inset, 432 - inset)
        if mask == 'circle':
            dr.ellipse(box, fill=255)
        elif mask == 'squircle':
            dr.rounded_rectangle(box, radius=110, fill=255)
        else:
            dr.rounded_rectangle(box, radius=50, fill=255)
        tile.paste(bg, (0, 0), m)
        sheet.alpha_composite(tile, (x, 20))
        x += 432
    mono = big['mono'].resize((216, 216), Image.LANCZOS)
    mb = Image.new('RGBA', (216, 216), (70, 74, 84, 255))
    mb.alpha_composite(mono)
    sheet.alpha_composite(mb, (20, 480))
    for i, sz in enumerate((192, 96, 48)):
        sheet.alpha_composite(big['legacy'].resize((sz, sz), Image.LANCZOS), (260 + i * 210, 480))
        sheet.alpha_composite(big['round'].resize((sz, sz), Image.LANCZOS), (260 + i * 210, 690))
    st = big['stat'].resize((48, 48), Image.LANCZOS)
    sb = Image.new('RGBA', (64, 64), (70, 74, 84, 255))
    sb.alpha_composite(st, (8, 8))
    sheet.alpha_composite(sb, (900, 480))
    sp = Image.new('RGBA', (600, 780), DARK)
    sp.alpha_composite(big['splash'].resize((600, 780), Image.LANCZOS))
    sheet.alpha_composite(sp, (432 * 3 + 60, 60))
    sheet.convert('RGB').save(path)


if __name__ == '__main__':
    main()
