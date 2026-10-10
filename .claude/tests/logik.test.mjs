// Logik-Tests für Level, XP, Serie, Tages-Quest, Belohnungen, Seltenheit und Profil.
// Aufruf: node .claude/tests/logik.test.mjs
import assert from 'node:assert/strict';

const W = new URL('../../www/js/', import.meta.url).href;
const {
  levelInfo, xpAt, weekStreak, questGoal, questTarget, weekXp, derive, nextQuest, RANKS, baseXp, liftXp, xpForSet, LIFT_XP, LIFT_CAP,
} = await import(W + 'stats.js');
const { today, addDays, weekStart } = await import(W + 'util.js');
const { STATIONS, ITEMS, TYPE_ORDER, equipped, readyStations, owned, DEFAULT_LOOK, rarityOf, itemRank, topRarity } = await import(W + 'look.js');
const { scaleOf, typicalSet, BODY } = await import(W + 'scale.js');
const { migrate } = await import(W + 'ops.js');
const seed = JSON.parse((await import('node:fs')).readFileSync(new URL('../../www/data/seed.json', import.meta.url), 'utf8'));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('Level-Grenzen', () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(0).rank, 'E');
  assert.equal(levelInfo(xpAt(20)).level, 20);
  assert.equal(levelInfo(xpAt(20)).rank, 'B');
  assert.equal(levelInfo(xpAt(20) - 1).level, 19);
  assert.equal(levelInfo(xpAt(20) - 1).toRank, 1);
  assert.equal(levelInfo(xpAt(70)).rank, 'SS');
  assert.equal(levelInfo(xpAt(70)).nextRank, null);
  assert.equal(levelInfo(xpAt(70)).rankProgress, 1);
  const mid = levelInfo((xpAt(12) + xpAt(20)) / 2);
  assert.ok(mid.rankProgress > 0.49 && mid.rankProgress < 0.51);
});

// Testdaten: Wochen relativ zur aktuellen Woche (Index 0 = aktuelle Woche, 1 = letzte ...)
function fakeD(weeks) {
  const cur = weekStart(today());
  const dates = [];
  weeks.forEach((cnt, i) => {
    const w = addDays(cur, -7 * i);
    for (let k = 0; k < cnt; k++) {
      const d = addDays(w, k);
      if (d <= today()) dates.push(d);
    }
  });
  dates.sort();
  return { dates, days: new Map(dates.map((x) => [x, { d: x, sets: [], ex: [], cats: new Map() }])) };
}
// weeks: von alt nach neu, letzte Zahl = aktuelle Woche
const streakOf = (oldToNew) => weekStreak(fakeD([...oldToNew].reverse()));

t('Serie ohne Lücke', () => {
  const r = streakOf([3, 3, 3, 0]);
  assert.equal(r.streak, 3);
  assert.equal(r.shields, 0);
  assert.equal(r.nextShieldIn, 1);
});
t('Schutz nach 4 Wochen rettet eine verpasste Woche', () => {
  const r = streakOf([3, 3, 3, 3, 1, 3, 3, 0]);
  assert.equal(r.streak, 6);
  assert.equal(r.shields, 0);
  assert.equal(r.protectedWeeks.length, 1);
  assert.equal(r.nextShieldIn, 2);
});
t('Ohne Schutz endet die Serie', () => {
  const r = streakOf([3, 3, 3, 3, 0, 0, 3, 0]);
  assert.equal(r.streak, 1);
  assert.equal(r.protectedWeeks.length, 0);
});
t('Höchstens 2 Schutz', () => {
  const r = streakOf([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0]);
  assert.equal(r.streak, 12);
  assert.equal(r.shields, 2);
  assert.equal(r.nextShieldIn, null);
});
t('Zwei Schutz retten zwei Wochen', () => {
  const r = streakOf([3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 3, 0]);
  assert.equal(r.streak, 9);
  assert.equal(r.shields, 0);
  assert.equal(r.protectedWeeks.length, 2);
});
t('Laufende Woche zählt erst ab 3', () => {
  assert.equal(streakOf([3, 3, 2]).streak, 2);
  // aktuelle Woche mit 3 Tagen nur prüfen, wenn heute mindestens Mittwoch ist
  const dow = (new Date().getDay() + 6) % 7;
  if (dow >= 2) assert.equal(streakOf([3, 3, 3]).streak, 3);
});
t('Leere Daten', () => {
  const r = weekStreak({ dates: [], days: new Map() });
  assert.equal(r.streak, 0);
  assert.equal(r.shields, 0);
});

t('Wochenbonus', () => {
  assert.equal(weekXp(1), 100);
  assert.equal(weekXp(2), 125);
  assert.equal(weekXp(9), 300);
  assert.equal(weekXp(30), 300);
});
t('Quest-Ziel', () => {
  assert.equal(questTarget(null), 10);
  assert.equal(questTarget({ ex: [1, 2, 3] }), 8);
  assert.equal(questTarget({ ex: [1, 2, 3, 4, 5] }), 10);
  assert.equal(questTarget({ ex: [1, 2, 3, 4, 5, 6, 7] }), 12);
});

const baseState = () => ({ exercises: [{ id: 1, name: 'Bench Press', cat: 'brust' }], sets: [], body: [], templates: [{ id: 'pull', name: 'Pull', ex: [1, 1, 1, 1, 1, 1] }], rotation: ['pull', 'off'], sessions: {}, bonus: [], rewards: { claimed: [], equip: { ...DEFAULT_LOOK } }, settings: {} });

t('Bonus-XP zählt zum Level', () => {
  const s = baseState();
  s.bonus = [{ d: '2026-01-01', k: 'quest', xp: 300 }];
  const d = derive(s);
  assert.equal(d.level.xp, 300);
  assert.equal(d.level.level, 2);
});
t('Quest am Trainingstag', () => {
  const s = baseState();
  for (let i = 0; i < 5; i++) s.sets.push({ id: i + 1, ex: 1, d: today(), w: 50, r: 8 });
  const d = derive(s);
  const g = questGoal(s, d, { kind: 'go', tpl: s.templates[0] });
  assert.equal(g.kind, 'sets');
  assert.equal(g.count, 5);
  assert.equal(g.target, 12);
  assert.equal(g.done, false);
});
t('Quest am Ruhetag', () => {
  const s = baseState();
  s.sets.push({ id: 1, ex: 1, d: addDays(today(), -1), w: 50, r: 8 });
  const d = derive(s);
  const q = nextQuest(s, d);
  assert.equal(q.kind, 'rest');
  let g = questGoal(s, d, q);
  assert.equal(g.kind, 'body');
  assert.equal(g.count, 0);
  s.body.push({ d: today(), kg: 80 });
  g = questGoal(s, d, q);
  assert.equal(g.count, 1);
  s.bonus.push({ d: today(), k: 'rest', xp: 50 });
  assert.equal(questGoal(s, d, q).done, true);
});

t('Stationen', () => {
  const lvls = STATIONS.map((s) => s.lv);
  assert.deepEqual(lvls, [...lvls].sort((a, b) => a - b));
  for (const r of RANKS) assert.ok(STATIONS.find((s) => s.lv === r.min), 'Rang-Station fehlt ' + r.id);
  for (const s of STATIONS) if (s.lv > 1) assert.ok(s.items.length, 'leere Station ' + s.lv);
  const ids = ITEMS.map((i) => i.type + ':' + i.id);
  assert.equal(new Set(ids).size, ids.length);
});
t('Abholen und Anlegen', () => {
  const s = baseState();
  // 9 Stationen aus Version 2.5 plus 5 neue mit Bannern und Effekten (Level 3, 5, 9, 13, 17)
  assert.equal(readyStations(s, 19).length, 14);
  assert.equal(readyStations(s, 1).length, 0);
  s.rewards.claimed = [4];
  s.rewards.equip.color = 'eis';
  assert.equal(equipped(s, 19).color.id, 'eis');
  // Level gesunken: zurück auf Standard
  assert.equal(equipped(s, 3).color.id, 'pink');
  // nicht abgeholt: Standard
  s.rewards.equip.title = 'grinder';
  assert.equal(equipped(s, 19).title.id, 'rookie');
  assert.equal(owned(s, 19, ITEMS.find((i) => i.id === 'grinder')), false);
  // unbekannte ID
  s.rewards.equip.frame = 'gibtsnicht';
  assert.equal(equipped(s, 19).frame.id, 'hex');
});
// ---------- XP nach Gewicht ----------
const ex = (name, extra = {}) => seed.exercises.find((e) => e.name === name) || { name, cat: 'sonstige', ...extra };

t('Jede Übung aus der Startliste hat einen Maßstab', () => {
  for (const e of seed.exercises) {
    const sc = scaleOf(e);
    assert.ok(sc && sc.ref > 0, 'kein Maßstab für ' + e.name);
    if (e.bw) assert.ok(sc.bw, 'Körpergewicht fehlt bei ' + e.name);
  }
});
t('Typischer Satz bringt bei jeder Übung gleich viel', () => {
  for (const e of seed.exercises) {
    const sc = scaleOf(e);
    const ts = typicalSet(sc);
    const xp = liftXp(sc, ts.w, ts.r);
    assert.ok(xp >= LIFT_XP - 3 && xp <= LIFT_XP + 3, `${e.name}: ${xp} XP für ${ts.w} kg x ${ts.r}`);
  }
});
t('Beinpresse und Curls gleich fair', () => {
  const lp = scaleOf(ex('Leg Press'));
  const curl = scaleOf(ex('Dumbbell Curl'));
  // gleich stark im Verhältnis zum Maßstab: gleiche XP
  assert.equal(liftXp(lp, lp.ref * 0.75, 10), liftXp(curl, curl.ref * 0.75, 10));
  // absolut viel mehr Gewicht an der Beinpresse bringt nicht automatisch mehr
  assert.ok(liftXp(lp, 100, 10) < liftXp(curl, 16, 10));
});
t('Mehr Gewicht und mehr Wiederholungen bringen mehr XP', () => {
  const sc = scaleOf(ex('Flat Barbell Bench Press'));
  assert.ok(liftXp(sc, 80, 8) > liftXp(sc, 60, 8));
  assert.ok(liftXp(sc, 60, 10) > liftXp(sc, 60, 6));
  assert.ok(xpForSet({ w: 60, r: 10 }, sc) > xpForSet({ w: 60, r: 6 }, sc));
  // Obergrenze
  assert.equal(liftXp(sc, 400, 10), LIFT_XP * LIFT_CAP);
  assert.equal(liftXp(sc, 50, 0), 0);
  assert.equal(xpForSet({ w: 50, r: 0 }, sc), 0);
});
t('Körpergewicht-Übungen mit festem Körper', () => {
  const pu = scaleOf(ex('Pull Up'));
  assert.ok(pu.bw);
  const plain = liftXp(pu, 0, 10);
  assert.ok(plain >= 13 && plain <= 17, 'Klimmzüge 10 Wdh.: ' + plain);
  assert.ok(liftXp(pu, 20, 6) > plain);
});
t('Eigene Übungen und deutsche Namen', () => {
  assert.equal(scaleOf({ name: 'Bankdrücken', cat: 'brust' }).ref, 90);
  assert.ok(scaleOf({ name: 'Klimmzüge', cat: 'ruecken', bw: true }).bw);
  assert.equal(scaleOf({ name: 'Kurzhantel Schrägbankdrücken', cat: 'brust' }).ref, 30);
  assert.ok(scaleOf({ name: 'Irgendwas', cat: 'beine', compound: true }).ref > 0);
  assert.equal(scaleOf({ name: 'Laufband', cat: 'cardio' }), null);
  assert.equal(liftXp(null, 50, 10), 0);
});
t('Neue Rechnung nimmt niemandem XP weg', () => {
  const s = { ...structuredClone(seed), bonus: [], rewards: { claimed: [], equip: {} }, settings: {} };
  let id = 1;
  for (const e of seed.exercises) for (const w of [0, 5, 40, 120]) s.sets.push({ id: id++, ex: e.id, d: '2026-01-0' + (1 + (id % 9)), w, r: 1 + (id % 14) });
  const d = derive(s);
  assert.ok(d.level.xp >= d.legacyXp);
  assert.ok(d.level.level >= levelInfo(d.legacyXp).level);
  for (const x of s.sets) assert.ok(xpForSet(x, d.scales.get(x.ex)) >= baseXp(x));
});

// ---------- Seltenheit ----------
t('Seltenheit nach Rang', () => {
  const rar = (lv) => rarityOf({ lv }).name;
  assert.equal(rar(1), 'Normal');
  assert.equal(rar(11), 'Normal');
  assert.equal(rar(12), 'Selten');
  assert.equal(rar(34), 'Selten');
  assert.equal(rar(35), 'Episch');
  assert.equal(rar(49), 'Episch');
  assert.equal(rar(50), 'Legendär');
  assert.equal(rar(70), 'Legendär');
  assert.equal(itemRank({ lv: 23 }), 'B');
  assert.equal(topRarity([{ lv: 2 }, { lv: 52 }, { lv: 20 }]).name, 'Legendär');
  for (const r of ['Normal', 'Selten', 'Episch', 'Legendär']) assert.ok(ITEMS.some((it) => it.lv > 1 && rarityOf(it).name === r), 'keine Belohnung ' + r);
  for (const type of TYPE_ORDER) assert.ok(ITEMS.some((it) => it.type === type && it.id === DEFAULT_LOOK[type] && it.lv === 1), 'Standard fehlt ' + type);
});

// ---------- Daten aus älteren Versionen ----------
t('Alte Daten bleiben beim Update erhalten', () => {
  const old = {
    exercises: [{ id: 1, name: 'Bench Press', cat: 'brust' }, { id: 2, name: 'Pull Up', cat: 'ruecken' }],
    sets: [{ id: 1, ex: 1, d: '2026-09-01', w: 60, r: 8 }, { id: 2, ex: 2, d: '2026-09-02', w: 10, r: 6 }],
    body: [{ d: '2026-09-01', kg: 77.5 }],
    bonus: [{ d: '2026-09-01', k: 'quest', xp: 100, n: 10 }, { d: '2026-09-01', k: 'week', w: '2026-08-31', xp: 125, n: 2 }],
    rewards: { claimed: [2, 4, 6, 20], equip: { color: 'eis', title: 'stammgast', frame: 'double', sign: 'kintore' } },
  };
  const s = migrate(structuredClone(old));
  assert.equal(s.sets.length, 2);
  assert.deepEqual(s.body, old.body);
  assert.deepEqual(s.bonus, old.bonus);
  assert.deepEqual(s.rewards.claimed, [2, 4, 6, 20]);
  assert.equal(s.rewards.equip.color, 'eis');
  assert.equal(s.rewards.equip.frame, 'double');
  assert.equal(s.rewards.equip.banner, 'nacht');
  assert.equal(s.rewards.equip.effect, 'none');
  assert.equal(s.profile.name, '');
  assert.deepEqual(s.profile.lifts, []);
  assert.ok(Object.values(s.profile.show).every((v) => v === true));
  // Zweimal migrieren ändert nichts mehr
  assert.deepEqual(migrate(structuredClone(s)), s);
});
t('Profil wird aufgeräumt', () => {
  const s = migrate({
    exercises: [{ id: 1, name: 'Bench Press', cat: 'brust' }], sets: [],
    profile: { name: '  Alex   der   Große  ', motto: 'x'.repeat(200), lifts: [1, 1, 99, '1'], show: { stats: false, gibtsnicht: true } },
    rewards: { equip: { banner: 'gibtsnicht', effect: 'flammen' } },
  });
  assert.equal(s.profile.name, 'Alex der Große');
  assert.equal(s.profile.motto.length, 80);
  assert.deepEqual(s.profile.lifts, [1]);
  assert.equal(s.profile.show.stats, false);
  assert.equal(s.profile.show.gibtsnicht, undefined);
  assert.equal(s.rewards.equip.banner, 'nacht');
  // Neon-Flammen gibt es erst ab Level 52 und nach dem Abholen
  assert.equal(equipped(s, 60).effect.id, 'none');
  s.rewards.claimed = [52];
  assert.equal(equipped(s, 60).effect.id, 'flammen');
  assert.equal(equipped(s, 40).effect.id, 'none');
});

console.log(n, 'Tests bestanden');
