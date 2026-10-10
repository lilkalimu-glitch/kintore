// Logik-Tests für Level, XP, Serie, Tages-Quest und Belohnungen.
// Aufruf: node .claude/tests/logik.test.mjs
import assert from 'node:assert/strict';

const W = new URL('../../www/js/', import.meta.url).href;
const { levelInfo, xpAt, weekStreak, questGoal, questTarget, weekXp, derive, nextQuest, RANKS } = await import(W + 'stats.js');
const { today, addDays, weekStart } = await import(W + 'util.js');
const { STATIONS, ITEMS, equipped, readyStations, owned, DEFAULT_LOOK } = await import(W + 'look.js');

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
  assert.equal(readyStations(s, 19).length, 9);
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
console.log(n, 'Tests bestanden');
