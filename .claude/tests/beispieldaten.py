"""Erzeugt Beispieldaten (keine echten Trainingsdaten) für Tests der App.

Aufruf: python3 .claude/tests/beispieldaten.py <tage> <ausgabe.json> [luecke|max]
  tage    Wie viele Tage zurück trainiert wird. 0 ergibt eine leere App mit Startdaten.
  luecke  Lässt vor gut einer Woche Trainings aus, damit der Serien-Schutz greift.
  max     Gibt so viel Bonus-XP, dass der höchste Rang erreicht ist und alle Belohnungen bereitliegen.
Richtwerte (XP mit Gewichts-Bonus): 85 Tage ergeben etwa Level 25 (Rang B), 120 Tage etwa Level 27.
"""
import datetime
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 85
    out = sys.argv[2] if len(sys.argv) > 2 else 'beispiel.json'
    gap = len(sys.argv) > 3 and sys.argv[3] == 'luecke'
    top = len(sys.argv) > 3 and sys.argv[3] == 'max'
    random.seed(7)
    seed = json.loads((ROOT / 'www' / 'data' / 'seed.json').read_text(encoding='utf-8'))
    tpls = {t['id']: t for t in seed['templates']}
    rot = ['pull', 'push', 'beine', 'off']
    today = datetime.date.today()
    start = today - datetime.timedelta(days=days)
    sets, body, base = [], [], {}
    sid, i, d = 1, 0, start
    while d < today:
        step = rot[i % 4]
        i += 1
        if step == 'off' or (gap and (today - d).days in range(9, 20)):
            d += datetime.timedelta(days=1)
            continue
        for ex in tpls[step]['ex'][:6]:
            w0 = base.setdefault(ex, random.choice([20, 30, 40, 50, 60]))
            w = round((w0 * (1 + 0.35 * (d - start).days / max(days, 1))) / 2.5) * 2.5
            for _ in range(3):
                sets.append({'id': sid, 'ex': ex, 'd': d.isoformat(), 'w': w, 'r': random.randint(6, 11), 't': 0})
                sid += 1
        if random.random() < 0.5:
            body.append({'d': d.isoformat(), 'kg': round(74 + 4 * (d - start).days / days + random.uniform(-0.6, 0.6), 1)})
        d += datetime.timedelta(days=random.choice([1, 1, 2]))
    state = dict(seed)
    state['sets'] = sets
    state['body'] = body
    state['meta'] = {'welcomeDone': bool(sets), 'lastBackup': today.isoformat(), 'xpRule': 2}
    if top:
        state['bonus'] = [{'d': (today - datetime.timedelta(days=400 + i)).isoformat(), 'k': 'quest', 'xp': 1000, 'n': 10} for i in range(300)]
    Path(out).write_text(json.dumps(state), encoding='utf-8')
    print(f'{out}: {len(sets)} Sätze an {len({s["d"] for s in sets})} Tagen')


if __name__ == '__main__':
    main()
