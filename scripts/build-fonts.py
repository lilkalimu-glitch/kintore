"""Erzeugt kleine Schrift-Dateien (WOFF) für die App.

Lateinische Schriften werden auf die benötigten Zeichen reduziert,
die japanischen auf genau die Zeichen, die im Code vorkommen.
Aufruf: python3 scripts/build-fonts.py
"""
import glob
import os
import re

from fontTools import subset
from fontTools.ttLib import TTCollection, TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "www", "fonts")
os.makedirs(OUT, exist_ok=True)

LATIN = (
    "U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+2013-2014,U+2018-201E,"
    "U+2022,U+2026,U+20AC,U+2190-2193,U+2212,U+2009,U+202F"
)

LATIN_FONTS = {
    "adventor-700i": "/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreadventor-bolditalic.otf",
    "adventor-700": "/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreadventor-bold.otf",
    "inter-400": "/usr/share/fonts/opentype/inter/Inter-Regular.otf",
    "inter-500": "/usr/share/fonts/opentype/inter/Inter-Medium.otf",
    "inter-600": "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf",
    "inter-700": "/usr/share/fonts/opentype/inter/Inter-Bold.otf",
}

JP_FONTS = {
    "jp-300": "/usr/share/fonts/opentype/noto/NotoSansCJK-Light.ttc",
    "jp-900": "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc",
}


def cjk_chars():
    chars = set()
    files = glob.glob(os.path.join(ROOT, "www", "js", "**", "*.js"), recursive=True)
    files += glob.glob(os.path.join(ROOT, "www", "*.html"))
    files += glob.glob(os.path.join(ROOT, "www", "css", "*.css"))
    for f in files:
        with open(f, encoding="utf-8") as fh:
            for ch in fh.read():
                cp = ord(ch)
                if 0x3000 <= cp <= 0x30FF or 0x4E00 <= cp <= 0x9FFF or 0xFF00 <= cp <= 0xFFEF:
                    chars.add(ch)
    return "".join(sorted(chars))


def save_subset(font, unicodes, out_path):
    opts = subset.Options()
    opts.flavor = "woff"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.hinting = False
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    font.flavor = "woff"
    font.save(out_path)
    return os.path.getsize(out_path)


def main():
    latin = subset.parse_unicodes(LATIN)
    for name, path in LATIN_FONTS.items():
        size = save_subset(TTFont(path), latin, os.path.join(OUT, name + ".woff"))
        print(f"{name}.woff  {size // 1024} KB")

    chars = cjk_chars()
    print("Japanische Zeichen:", chars)
    for name, path in JP_FONTS.items():
        coll = TTCollection(path)
        font = None
        for f in coll.fonts:
            fam = f["name"].getDebugName(1) or ""
            if "JP" in fam and "Mono" not in fam:
                font = f
                break
        if font is None:
            raise SystemExit("JP-Schrift nicht gefunden in " + path)
        size = save_subset(font, [ord(c) for c in chars], os.path.join(OUT, name + ".woff"))
        print(f"{name}.woff  {size // 1024} KB")


if __name__ == "__main__":
    main()
