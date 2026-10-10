"""Vergleicht zwei Screenshot-Ordner Bild für Bild (vorher/nachher).

Aufruf: python3 .claude/tests/vergleich.py <vorher> <nachher>
Zeigt für jedes Bild, ob es gleich ist oder wo es sich ändert.
"""
import os
import sys

from PIL import Image, ImageChops


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    before, after = sys.argv[1], sys.argv[2]
    for name in sorted(f for f in os.listdir(before) if f.endswith('.png')):
        other = os.path.join(after, name)
        if not os.path.exists(other):
            print(f'{name}: fehlt in {after}')
            continue
        a = Image.open(os.path.join(before, name)).convert('RGB')
        b = Image.open(other).convert('RGB')
        if a.size != b.size:
            print(f'{name}: andere Größe {a.size} / {b.size}')
            continue
        diff = ImageChops.difference(a, b)
        box = diff.getbbox()
        if not box:
            print(f'{name}: gleich')
            continue
        strong = sum(diff.convert('L').histogram()[25:])
        if not strong:
            print(f'{name}: gleich (nur winzige Kanten-Unterschiede)')
        else:
            print(f'{name}: anders im Bereich {box}, {strong} Pixel deutlich')


if __name__ == '__main__':
    main()
