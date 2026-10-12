// Berechnungen: Bestleistungen, Level, Wochen-Radar, Rotation, Steigerungs-Tipps.
import { CAT, RADAR_CATS } from './model.js';
import { today, addDays, daysBetween, weekStart, round2 } from './util.js';
import { scaleOf, BODY } from './scale.js';

// Geschätztes Maximum für 1 Wiederholung (Epley, ab 12 Wdh. gedeckelt).
export const e1rmOf = (load, reps) => {
  if (!(reps > 0) || !(load > 0)) return 0;
  if (reps === 1) return load;
  return load * (1 + Math.min(reps, 12) / 30);
};

// Gewicht, das man für n Wiederholungen schaffen sollte.
export const weightFor = (e1, reps) => (reps <= 1 ? e1 : e1 / (1 + Math.min(reps, 12) / 30));

export function bodyRef(state) {
  const manual = Number(state.settings?.bwManual);
  if (manual > 0) return manual;
  const last = state.body?.length ? state.body[state.body.length - 1] : null;
  return last?.kg || 75;
}

// ---------- Level & Rang ----------
const XP_K = 55;
export const RANKS = [
  { min: 1, id: 'E', color: '#8591B0' }, { min: 6, id: 'D', color: '#5BFFB0' }, { min: 12, id: 'C', color: '#3CF0FF' },
  { min: 20, id: 'B', color: '#9B6BFF' }, { min: 35, id: 'A', color: '#FF4FA3' }, { min: 50, id: 'S', color: '#FFA586' },
  { min: 70, id: 'SS', color: '#FFE45C' }, { min: 90, id: 'SSS', color: '#FF4255' },
];
export const rankOf = (level) => [...RANKS].reverse().find((r) => level >= r.min).id;
export const rankById = (id) => RANKS.find((r) => r.id === id) || RANKS[0];
export const PR_XP = 50;

// ---------- XP pro Satz ----------
// Grundwert: 10 XP plus 1 pro Wiederholung (höchstens 30), wie bisher.
// Dazu der Gewichts-Bonus: geschätztes 1RM des Satzes im Verhältnis zum Maßstab der Übung (scale.js).
// Ein Satz auf typischem Niveau bringt LIFT_XP, doppelt so stark das Doppelte, mehr zählt nicht.
// Weil der Bonus nur dazukommt, hat niemand durch die neue Rechnung weniger XP als vorher.
export const LIFT_XP = 15;
export const LIFT_CAP = 2;
export const baseXp = (s) => (s.r > 0 ? 10 + Math.min(s.r, 30) : 0);
export function liftRatio(scale, w, r) {
  if (!scale || !(r > 0)) return 0;
  const load = scale.bw ? BODY + Math.max(0, w || 0) : w;
  return load > 0 ? e1rmOf(load, r) / scale.ref : 0;
}
export const liftXp = (scale, w, r) => Math.round(LIFT_XP * Math.min(LIFT_CAP, liftRatio(scale, w, r)));
export const xpForSet = (s, scale = null) => baseXp(s) + liftXp(scale, s.w, s.r);
// XP, ab der ein Level erreicht ist.
export const xpAt = (level) => (level <= 1 ? 0 : XP_K * level * level);

export function levelInfo(xp) {
  const level = Math.max(1, Math.floor(Math.sqrt(xp / XP_K)));
  const base = xpAt(level);
  const next = xpAt(level + 1);
  const rank = rankOf(level);
  const cur = rankById(rank);
  const nextRank = RANKS.find((r) => r.min > level);
  const rankBase = xpAt(cur.min);
  const rankNext = nextRank ? xpAt(nextRank.min) : null;
  return {
    xp, level, rank, base, next, toNext: next - xp, progress: (xp - base) / (next - base),
    nextRank: nextRank ? { id: nextRank.id, level: nextRank.min, xp: rankNext } : null,
    rankProgress: nextRank ? (xp - rankBase) / (rankNext - rankBase) : 1,
    toRank: nextRank ? rankNext - xp : 0,
  };
}

// ---------- Bonus-XP ----------
export const QUEST_XP = 100;
export const REST_XP = 50;
// Wochenbonus wächst mit der Serie: 100 XP, je Woche 25 mehr, höchstens 300.
export const weekXp = (streak) => 100 + 25 * Math.min(Math.max(streak - 1, 0), 8);
// Sätze für die Tages-Quest: zwei pro Übung der Vorlage, 8-12.
export const questTarget = (tpl) => (tpl?.ex?.length ? Math.min(12, Math.max(8, tpl.ex.length * 2)) : 10);

// ---------- Abgeleitete Daten ----------
// derive rechnet alles einmal aus dem Verlauf. Danach kommen neue Sätze und Bonus-XP einzeln dazu
// (deriveAppend, deriveBonus), statt jedes Mal Jahre an Verlauf neu durchzugehen. Beide Wege nutzen
// dieselben Schritte (addSet, addBonus), deshalb kommt immer dasselbe heraus.
export const bySetOrder = (a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.id - b.id);

// Meist liegen die Sätze schon in der richtigen Reihenfolge, dann spart das Prüfen das Sortieren.
function sortedSets(list) {
  for (let i = 1; i < list.length; i++) if (bySetOrder(list[i - 1], list[i]) > 0) return [...list].sort(bySetOrder);
  return list;
}

// Einen Satz hinten anfügen. Er muss in der Reihenfolge (Datum, dann Nummer) der letzte sein.
function addSet(d, s) {
  const ex = d.exById.get(s.ex);
  const load = d.loadOf(ex, s.w);
  const e1 = e1rmOf(load, s.r);
  d.sorted.push(s);

  let list = d.setsByEx.get(s.ex);
  if (!list) d.setsByEx.set(s.ex, (list = []));
  list.push(s);

  let day = d.days.get(s.d);
  if (!day) {
    d.days.set(s.d, (day = { d: s.d, sets: [], ex: [], cats: new Map() }));
    d.dates.push(s.d);
  }
  day.sets.push(s);
  if (!day.ex.includes(s.ex)) day.ex.push(s.ex);
  if (s.r > 0) {
    const cat = ex?.cat || 'sonstige';
    day.cats.set(cat, (day.cats.get(cat) || 0) + 1);
  }

  let sessions = d.sessionsByEx.get(s.ex);
  if (!sessions) d.sessionsByEx.set(s.ex, (sessions = []));
  let cur = sessions[sessions.length - 1];
  if (!cur || cur.d !== s.d) sessions.push((cur = { d: s.d, sets: [], best: 0, top: null, vol: 0 }));
  cur.sets.push(s);
  if (e1 > cur.best) cur.best = e1;
  if (s.r > 0 && (!cur.top || s.w > cur.top.w || (s.w === cur.top.w && s.r > cur.top.r))) cur.top = s;
  cur.vol += load * s.r;
  d.lastUsed.set(s.ex, s.d);

  // Bestleistung: besser als alles davor und nicht am ersten Tag der Übung.
  if (!d.firstDate.has(s.ex)) d.firstDate.set(s.ex, s.d);
  const prev = d.bestE1.get(s.ex) || 0;
  let pr = false;
  if (e1 > prev + 1e-6) {
    if (prev > 0 && d.firstDate.get(s.ex) < s.d) {
      d.prIds.add(s.id);
      d.prEvents.push({ ...s, e1 });
      pr = true;
    }
    d.bestE1.set(s.ex, e1);
  }

  const acc = d.acc;
  if (s.r > 0) acc.sets++;
  const lift = liftXp(d.scales.get(s.ex), s.w, s.r);
  acc.xp += baseXp(s) + lift + (pr ? PR_XP : 0);
  acc.lift += lift;
  acc.tonnage += load * Math.min(s.r, 100);
}

// Bonus-XP aus Tages-Quest, Ruhetag-Quest und Wochen-Serie (werden beim Erreichen gespeichert).
function addBonus(d, b) {
  d.acc.xp += b.xp;
  d.bonusByDay.set(b.d, (d.bonusByDay.get(b.d) || 0) + b.xp);
}

function finish(d) {
  d.level = levelInfo(d.acc.xp);
  // XP nach der alten Rechnung (ohne Gewichts-Bonus), für den Hinweis nach dem Update.
  d.legacyXp = d.acc.xp - d.acc.lift;
  d.totals = { sets: d.acc.sets, days: d.dates.length, tonnage: d.acc.tonnage };
  return d;
}

export function derive(state) {
  const exById = new Map(state.exercises.map((e) => [e.id, e]));
  const bw = bodyRef(state);
  const d = {
    exById, bw,
    loadOf: (ex, w) => (ex?.bw ? w + bw : w),
    // Maßstab einmal pro Übung bestimmen.
    scales: new Map(state.exercises.map((e) => [e.id, scaleOf(e)])),
    sorted: [], setsByEx: new Map(), sessionsByEx: new Map(), days: new Map(), dates: [], lastUsed: new Map(),
    prIds: new Set(), prEvents: [], bestE1: new Map(), firstDate: new Map(), bonusByDay: new Map(),
    acc: { xp: 0, lift: 0, tonnage: 0, sets: 0 },
  };
  for (const s of sortedSets(state.sets)) addSet(d, s);
  for (const b of state.bonus || []) addBonus(d, b);
  return finish(d);
}

// Neuer Satz: nur nachtragen, wenn er ans Ende gehört (der normale Fall beim Training heute).
// Sonst false, dann rechnet die App alles neu.
export function deriveAppend(d, s) {
  const last = d.sorted[d.sorted.length - 1];
  if ((last && bySetOrder(last, s) >= 0) || !d.exById.has(s.ex)) return false;
  addSet(d, s);
  finish(d);
  return true;
}

export function deriveBonus(d, list) {
  for (const b of list) addBonus(d, b);
  finish(d);
  return true;
}

// ---------- Vorlagen & Rotation ----------
const GROUPS = { pull: ['ruecken', 'bizeps'], push: ['brust', 'schultern', 'trizeps'], beine: ['beine'] };

export function dayTemplate(state, d, date) {
  const day = d.days.get(date);
  if (!day) return null;
  const sessionTpl = state.sessions?.[date]?.tpl;
  if (sessionTpl) {
    const t = state.templates.find((x) => x.id === sessionTpl);
    if (t) return t;
  }
  let best = null;
  let bestScore = 0;
  for (const t of state.templates) {
    const overlap = t.ex.filter((id) => day.ex.includes(id)).length;
    const score = overlap / Math.max(1, Math.min(t.ex.length, day.ex.length));
    if (overlap >= 2 && score > bestScore) { best = t; bestScore = score; }
  }
  if (best) return best;
  const total = [...day.cats.values()].reduce((a, b) => a + b, 0) || 1;
  let group = null;
  let share = 0;
  for (const [g, cats] of Object.entries(GROUPS)) {
    const n = cats.reduce((a, c) => a + (day.cats.get(c) || 0), 0) / total;
    if (n > share) { share = n; group = g; }
  }
  if (share >= 0.5) return state.templates.find((t) => t.id === group) || null;
  return null;
}

export function nextQuest(state, d) {
  const t = today();
  const rot = state.rotation?.length ? state.rotation : ['pull', 'push', 'beine', 'off'];
  const tplById = (id) => state.templates.find((x) => x.id === id) || null;
  if (state.active && state.active.d === t) return { kind: 'active', tpl: tplById(state.active.tpl) };
  if (d.days.has(t)) return { kind: 'done', tpl: dayTemplate(state, d, t) };
  const last = [...d.dates].reverse().find((x) => x < t) || null;
  if (!last) return { kind: 'go', tpl: state.templates[0] || null, last: null };
  const lastTpl = dayTemplate(state, d, last);
  if (!lastTpl || !rot.includes(lastTpl.id)) return { kind: 'go', tpl: state.templates[0] || null, last, lastTpl };
  const i = rot.indexOf(lastTpl.id);
  const next = rot[(i + 1) % rot.length];
  if (next === 'off') {
    const after = tplById(rot[(i + 2) % rot.length]);
    if (daysBetween(last, t) >= 2) return { kind: 'go', tpl: after, last, lastTpl };
    return { kind: 'rest', tpl: after, last, lastTpl };
  }
  return { kind: 'go', tpl: tplById(next), last, lastTpl };
}

// ---------- Doppelprogression ----------
export function progressionTip(ex, sessions, beforeDate) {
  if (!ex || !sessions?.length) return null;
  let prev = null;
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].d < beforeDate) { prev = sessions[i]; break; }
  }
  if (!prev) return null;
  const valid = prev.sets.filter((s) => s.r > 0);
  if (!valid.length) return null;
  const top = Math.max(...valid.map((s) => s.w));
  const work = valid.filter((s) => s.w === top);
  const minR = Math.min(...work.map((s) => s.r));
  const lo = ex.repMin || 6;
  const hi = ex.repMax || 10;
  if (minR >= hi) return { up: true, w: round2(top + (ex.inc || 2.5)), r: lo, prev, top };
  return { up: false, w: top, r: Math.min(hi, Math.max(minR + 1, lo)), prev, top };
}

// ---------- Scheibenrechner ----------
export function plateLoad(total, bar = 20, avail = [20, 15, 10, 5, 2.5, 1.25]) {
  let side = (total - bar) / 2;
  if (side < -1e-9) return null;
  const plates = [];
  for (const p of [...avail].sort((a, b) => b - a)) {
    while (side >= p - 1e-9) { plates.push(p); side -= p; }
  }
  return { plates, rest: round2(side) };
}

// ---------- Woche ----------
export function weekCats(d, end = today()) {
  const start = addDays(end, -6);
  const counts = Object.fromEntries(RADAR_CATS.map((c) => [c, 0]));
  for (const date of d.dates) {
    if (date < start || date > end) continue;
    for (const [cat, n] of d.days.get(date).cats) if (cat in counts) counts[cat] += n;
  }
  return counts;
}

// Serie: Wochen mit mindestens 3 Trainings in Folge.
// Alle 4 Serien-Wochen gibt es einen Schutz (höchstens 2). Eine verpasste Woche verbraucht dann
// einen Schutz, statt die Serie zu beenden. Die laufende Woche zählt erst, wenn sie geschafft ist.
export const SHIELD_EVERY = 4;
export const SHIELD_MAX = 2;

// Wird pro Seite mehrmals gebraucht: einmal rechnen, solange sich die Trainingstage und der Tag nicht ändern.
export function weekStreak(d) {
  const key = `${d.dates.length}|${d.dates[d.dates.length - 1] || ''}|${today()}`;
  if (d.weekMemo?.key === key) return d.weekMemo.value;
  const value = weekStreakOf(d);
  d.weekMemo = { key, value };
  return value;
}

function weekStreakOf(d) {
  const perWeek = new Map();
  for (const date of d.dates) {
    const w = weekStart(date);
    perWeek.set(w, (perWeek.get(w) || 0) + 1);
  }
  const current = weekStart(today());
  let streak = 0;
  let shields = 0;
  const protectedWeeks = [];
  const success = () => {
    streak++;
    if (streak % SHIELD_EVERY === 0) shields = Math.min(SHIELD_MAX, shields + 1);
  };
  if (d.dates.length) {
    let w = weekStart(d.dates[0]);
    for (let guard = 0; w < current && guard < 5000; guard++) {
      if ((perWeek.get(w) || 0) >= 3) success();
      else if (streak > 0 && shields > 0) { shields--; protectedWeeks.push(w); }
      else { streak = 0; protectedWeeks.length = 0; }
      w = addDays(w, 7);
    }
  }
  const thisWeek = perWeek.get(current) || 0;
  if (thisWeek >= 3) success();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(current, i);
    days.push({ d: date, trained: d.days.has(date), future: date > today() });
  }
  return {
    streak, thisWeek, days, shields, protectedWeeks, week: current,
    nextShieldIn: shields >= SHIELD_MAX ? null : SHIELD_EVERY - (streak % SHIELD_EVERY),
  };
}

// ---------- Tages-Quest ----------
// Trainingstag: genug Arbeitssätze schaffen. Ruhetag: Körpergewicht eintragen.
export function questGoal(state, d, q = nextQuest(state, d)) {
  const t = today();
  const event = (k) => (state.bonus || []).find((b) => b.k === k && b.d === t) || null;
  if (q.kind === 'rest') {
    const ev = event('rest');
    return { kind: 'body', target: 1, count: state.body.some((b) => b.d === t) ? 1 : 0, xp: REST_XP, done: !!ev };
  }
  const ev = event('quest');
  const count = (d.days.get(t)?.sets || []).filter((s) => s.r > 0).length;
  return { kind: 'sets', target: ev?.n || questTarget(q.tpl), count, xp: QUEST_XP, done: !!ev };
}

// ---------- Übung im Detail ----------
export function exerciseRecords(d, ex) {
  const list = d.setsByEx.get(ex.id) || [];
  const byReps = new Map();
  for (const s of list) {
    if (!(s.r > 0) || s.r > 15) continue;
    const cur = byReps.get(s.r);
    if (!cur || s.w > cur.w) byReps.set(s.r, s);
  }
  return [...byReps.entries()].sort((a, b) => a[0] - b[0]).map(([r, s]) => ({ r, w: s.w, d: s.d }));
}

export function trend30(sessions) {
  if (!sessions?.length) return null;
  const t = today();
  const a = addDays(t, -30);
  const b = addDays(t, -60);
  const recent = sessions.filter((s) => s.d > a).map((s) => s.best);
  const before = sessions.filter((s) => s.d > b && s.d <= a).map((s) => s.best);
  if (!recent.length || !before.length) return null;
  return Math.max(...recent) - Math.max(...before);
}

// ---------- Zusammenfassung eines Trainingstags ----------
export function daySummary(state, d, date) {
  const day = d.days.get(date);
  if (!day) return { sets: 0, vol: 0, prs: 0, xp: 0, dur: null };
  let vol = 0;
  let xp = 0;
  let prs = 0;
  let sets = 0;
  for (const s of day.sets) {
    vol += d.loadOf(d.exById.get(s.ex), s.w) * s.r;
    xp += xpForSet(s, d.scales?.get(s.ex));
    if (s.r > 0) sets++;
    if (d.prIds.has(s.id)) { prs++; xp += PR_XP; }
  }
  xp += d.bonusByDay?.get(date) || 0;
  const sess = state.sessions?.[date];
  const times = day.sets.map((s) => s.t).filter(Boolean);
  let dur = null;
  if (sess?.start) dur = (sess.end || Math.max(...times, sess.start)) - sess.start;
  else if (times.length > 1) dur = Math.max(...times) - Math.min(...times);
  return { sets, vol, prs, xp, dur };
}

export const catColor = (cat) => (CAT[cat] || CAT.sonstige).color;
