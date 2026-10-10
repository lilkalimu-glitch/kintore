// Berechnungen: Bestleistungen, Level, Wochen-Radar, Rotation, Steigerungs-Tipps.
import { CAT, RADAR_CATS } from './model.js';
import { today, addDays, daysBetween, weekStart, round2 } from './util.js';

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
  { min: 70, id: 'SS', color: '#FFE45C' },
];
export const rankOf = (level) => [...RANKS].reverse().find((r) => level >= r.min).id;
export const rankById = (id) => RANKS.find((r) => r.id === id) || RANKS[0];
export const xpForSet = (s) => (s.r > 0 ? 10 + Math.min(s.r, 30) : 0);
export const PR_XP = 50;
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

// ---------- Abgeleitete Daten (einmal pro Änderung berechnet) ----------
export function derive(state) {
  const exById = new Map(state.exercises.map((e) => [e.id, e]));
  const bw = bodyRef(state);
  const loadOf = (ex, w) => (ex?.bw ? w + bw : w);

  const sorted = [...state.sets].sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.id - b.id));
  const setsByEx = new Map();
  const days = new Map();
  for (const s of sorted) {
    if (!setsByEx.has(s.ex)) setsByEx.set(s.ex, []);
    setsByEx.get(s.ex).push(s);
    if (!days.has(s.d)) days.set(s.d, { d: s.d, sets: [], ex: [], cats: new Map() });
    const day = days.get(s.d);
    day.sets.push(s);
    if (!day.ex.includes(s.ex)) day.ex.push(s.ex);
    const cat = exById.get(s.ex)?.cat || 'sonstige';
    if (s.r > 0) day.cats.set(cat, (day.cats.get(cat) || 0) + 1);
  }
  const dates = [...days.keys()].sort();

  const sessionsByEx = new Map();
  const lastUsed = new Map();
  for (const [exId, list] of setsByEx) {
    const ex = exById.get(exId);
    const sessions = [];
    let cur = null;
    for (const s of list) {
      if (!cur || cur.d !== s.d) {
        cur = { d: s.d, sets: [], best: 0, top: null, vol: 0 };
        sessions.push(cur);
      }
      cur.sets.push(s);
      const load = loadOf(ex, s.w);
      const e1 = e1rmOf(load, s.r);
      if (e1 > cur.best) cur.best = e1;
      if (s.r > 0 && (!cur.top || s.w > cur.top.w || (s.w === cur.top.w && s.r > cur.top.r))) cur.top = s;
      cur.vol += load * s.r;
    }
    sessionsByEx.set(exId, sessions);
    lastUsed.set(exId, list[list.length - 1].d);
  }

  // Bestleistungen in zeitlicher Reihenfolge erkennen.
  const prIds = new Set();
  const prEvents = [];
  const bestE1 = new Map();
  const firstDate = new Map();
  for (const s of sorted) {
    const ex = exById.get(s.ex);
    const e1 = e1rmOf(loadOf(ex, s.w), s.r);
    if (!firstDate.has(s.ex)) firstDate.set(s.ex, s.d);
    const prev = bestE1.get(s.ex) || 0;
    if (e1 > prev + 1e-6) {
      if (prev > 0 && firstDate.get(s.ex) < s.d) {
        prIds.add(s.id);
        prEvents.push({ ...s, e1 });
      }
      bestE1.set(s.ex, e1);
    }
  }

  let xp = 0;
  let tonnage = 0;
  let setCount = 0;
  for (const s of sorted) {
    if (s.r > 0) setCount++;
    xp += xpForSet(s);
    tonnage += loadOf(exById.get(s.ex), s.w) * Math.min(s.r, 100);
  }
  xp += prIds.size * PR_XP;

  // Bonus-XP aus Tages-Quest, Ruhetag-Quest und Wochen-Serie (werden beim Erreichen gespeichert).
  const bonusByDay = new Map();
  for (const b of state.bonus || []) {
    xp += b.xp;
    bonusByDay.set(b.d, (bonusByDay.get(b.d) || 0) + b.xp);
  }

  return {
    exById, bw, loadOf, sorted, setsByEx, sessionsByEx, days, dates, lastUsed,
    prIds, prEvents, bestE1, bonusByDay,
    level: levelInfo(xp),
    totals: { sets: setCount, days: dates.length, tonnage },
  };
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

export function weekStreak(d) {
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
    xp += xpForSet(s);
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
