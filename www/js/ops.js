// Alle Änderungen an den Daten laufen über diese Funktionen.
import { app, D, commit, render, replaceState } from './core.js';
import { today, round2, kg } from './util.js';
import { e1rmOf, daySummary, nextQuest, questGoal, weekStreak, weekXp, levelInfo, QUEST_XP, REST_XP, deriveAppend, deriveBonus, bodyRef } from './stats.js';
import { completeExercise } from './model.js';
import { fixName } from './fitnotes.js';
import { prBurst, levelUp, rankUp, missionComplete, toast, banner } from './fx.js';
import { startTimer, stopTimer } from './timer.js';
import { haptic, vibrate } from './native.js';
import { STATIONS, DEFAULT_LOOK, TYPE_ORDER, itemOf, equipped } from './look.js';

export const DEFAULT_SETTINGS = {
  restDefault: 120,
  restAuto: true,
  restVibrate: true,
  restNotify: true,
  useExerciseRest: true,
  bwManual: null,
  goalWeight: null,
  bgDim: 0.4,
  bgBlur: 2,
  barWeight: 20,
  plates: [20, 15, 10, 5, 2.5, 1.25],
  // Design (seit 2.10): dunkel (Standard), hell oder neon. Japanische Zeichen nur im Design Neon, wenn jp an ist.
  theme: 'dunkel',
  jp: false,
};

// Profil: was dort zu sehen ist, lässt sich einzeln ausblenden.
export const PROFILE_PARTS = ['motto', 'level', 'calendar', 'lifts', 'stats', 'collection'];
export const NAME_MAX = 24;
export const MOTTO_MAX = 80;

function cleanProfile(raw, exIds) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const text = (v, max) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const show = {};
  for (const k of PROFILE_PARTS) show[k] = typeof p.show?.[k] === 'boolean' ? p.show[k] : true;
  const lifts = Array.isArray(p.lifts) ? [...new Set(p.lifts.map(Number).filter((id) => exIds.has(id)))].slice(0, 3) : [];
  return { name: text(p.name, NAME_MAX), motto: text(p.motto, MOTTO_MAX), lifts, show };
}

const HEX = /^[0-9a-f]{32,128}$/;
function cleanAdmin(a) {
  if (!a || typeof a !== 'object' || !HEX.test(a.salt || '') || !HEX.test(a.hash || '')) return null;
  return { on: a.on === true, salt: a.salt, hash: a.hash };
}

export function migrate(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  s.v = 1;
  s.exercises = Array.isArray(s.exercises) ? s.exercises : [];
  s.sets = Array.isArray(s.sets) ? s.sets.filter((x) => x && x.d && Number.isFinite(x.w) && Number.isFinite(x.r)) : [];
  s.body = Array.isArray(s.body) ? s.body.filter((x) => x && x.d && x.kg > 0).sort((a, b) => a.d.localeCompare(b.d)) : [];
  s.templates = Array.isArray(s.templates) ? s.templates : [];
  s.rotation = Array.isArray(s.rotation) && s.rotation.length ? s.rotation : ['pull', 'push', 'beine', 'off'];
  s.sessions = s.sessions && typeof s.sessions === 'object' ? s.sessions : {};
  s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
  // Alte Standardwerte für das Hintergrundbild waren zu dunkel: einmalig auf die neuen setzen.
  if (s.settings.bgDim === 0.55 && s.settings.bgBlur === 6) {
    s.settings.bgDim = DEFAULT_SETTINGS.bgDim;
    s.settings.bgBlur = DEFAULT_SETTINGS.bgBlur;
  }
  if (!['dunkel', 'hell', 'auto', 'neon'].includes(s.settings.theme)) s.settings.theme = DEFAULT_SETTINGS.theme;
  s.settings.jp = s.settings.jp === true;
  s.meta = s.meta && typeof s.meta === 'object' ? s.meta : {};
  // Gesehene Einführungen (seit 2.7), zum Beispiel { profil: true, rang: true }.
  if (s.meta.intro != null && (typeof s.meta.intro !== 'object' || Array.isArray(s.meta.intro))) delete s.meta.intro;
  // Admin-Modus (seit 2.12): { on, salt, hash }. Ohne gültigen Prüfwert gibt es keinen Admin.
  s.meta.admin = cleanAdmin(s.meta.admin);
  if (!s.meta.admin) delete s.meta.admin;
  // Bonus-XP (Tages-Quest, Ruhetag-Quest, Wochen-Serie) und Belohnungen aus dem Rang-Pfad.
  s.bonus = Array.isArray(s.bonus)
    ? s.bonus.filter((b) => b && typeof b.d === 'string' && typeof b.k === 'string' && Number.isFinite(b.xp) && b.xp > 0 && b.xp <= 1000)
    : [];
  const rw = s.rewards && typeof s.rewards === 'object' ? s.rewards : {};
  const valid = new Set(STATIONS.filter((st) => st.lv > 1).map((st) => st.lv));
  const claimed = Array.isArray(rw.claimed) ? [...new Set(rw.claimed.map(Number).filter((n) => valid.has(n)))].sort((a, b) => a - b) : [];
  const equip = { ...DEFAULT_LOOK };
  for (const type of TYPE_ORDER) if (itemOf(type, rw.equip?.[type])) equip[type] = rw.equip[type];
  // Seit 2.10 ist das Start-Schild ein Wort (KRAFT) statt 筋トレ. Einmalig umstellen, wer noch das alte trägt.
  // Das japanische Schild bleibt in der Sammlung und lässt sich jederzeit wieder anlegen.
  if (!s.meta.signWord) {
    if (equip.sign === 'kintore') equip.sign = 'kraft';
    s.meta.signWord = 1;
  }
  s.rewards = { claimed, equip };
  const setsByEx = new Map();
  for (const x of s.sets) {
    if (!setsByEx.has(x.ex)) setsByEx.set(x.ex, []);
    setsByEx.get(x.ex).push(x);
  }
  s.exercises = s.exercises.map((e) => completeExercise(e, setsByEx.get(e.id) || []));
  const exIds = new Set(s.exercises.map((e) => e.id));
  s.sets = s.sets.filter((x) => exIds.has(x.ex));
  s.templates = s.templates.map((t) => ({ ...t, ex: (t.ex || []).filter((id) => exIds.has(id)) }));
  if (s.active && (s.active.d !== today() && !s.active.backfill)) s.active = null;
  if (s.active) s.active.ex = (s.active.ex || []).filter((id) => exIds.has(id));
  s.profile = cleanProfile(s.profile, exIds);
  return s;
}

// Einmal nach dem Update auf die neue XP-Rechnung: altes und neues Level merken,
// damit die Startseite erklärt, warum das Level gestiegen ist.
export function noteXpRule() {
  const s = app.state;
  if ((s.meta.xpRule || 1) >= 2) return;
  const d = D();
  const from = levelInfo(d.legacyXp).level;
  const to = d.level.level;
  commit((st) => {
    st.meta.xpRule = 2;
    if (st.sets.length && to > from) st.meta.xpNote = { from, to };
  }, { render: false, derive: 'keep' });
}

// ---------- Profil ----------
export function saveProfile(patch) {
  commit((s) => {
    const next = { ...s.profile, ...patch, show: { ...s.profile.show, ...(patch.show || {}) } };
    s.profile = cleanProfile(next, new Set(s.exercises.map((e) => e.id)));
  }, { derive: 'keep' });
}

// ---------- Admin-Modus ----------
// Ändert nur, welche Looks nutzbar sind. Level, XP und abgeholte Belohnungen bleiben, wie sie sind.
export function setAdminPassword(salt, hash) {
  commit((s) => { s.meta.admin = { on: true, salt, hash }; }, { derive: 'keep' });
}

export function setAdmin(on) {
  commit((s) => { if (s.meta.admin) s.meta.admin.on = on === true; }, { derive: 'keep' });
}

const nextId = (list) => list.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;

// ---------- Bonus-XP und Level-Aufstieg ----------
// Prüft Tages-Quest, Ruhetag-Quest und Wochen-Serie und speichert neue Boni (ohne neu zu zeichnen).
function grantBonuses({ rest = false, week = true } = {}) {
  const s = app.state;
  const d = D();
  const t = today();
  const add = [];
  const goal = questGoal(s, d, nextQuest(s, d));
  if (goal.kind === 'sets' && !goal.done && goal.count >= goal.target) add.push({ d: t, k: 'quest', xp: QUEST_XP, n: goal.target });
  if (rest && goal.kind === 'body' && !goal.done && goal.count > 0) add.push({ d: t, k: 'rest', xp: REST_XP });
  const ws = week ? weekStreak(d) : null;
  if (ws && ws.thisWeek >= 3 && !s.bonus.some((b) => b.k === 'week' && b.w === ws.week)) {
    add.push({ d: t, k: 'week', w: ws.week, xp: weekXp(ws.streak), n: ws.streak });
  }
  if (add.length) commit((st) => { st.bonus.push(...add); }, { render: false, derive: (dd) => deriveBonus(dd, add) });
  return add;
}

function bonusBanners(list) {
  for (const b of list) {
    if (b.k === 'quest') banner({ jp: '達成', text: 'Tages-Quest geschafft', xp: b.xp, ic: 'target' });
    else if (b.k === 'rest') banner({ jp: '休息日', text: 'Ruhetag-Quest geschafft', xp: b.xp, ic: 'scale' });
    else if (b.k === 'week') banner({ jp: '連続', text: b.n > 1 ? `Serie: ${b.n} Wochen` : 'Woche geschafft', xp: b.xp, ic: 'flame' });
  }
  if (list.length) vibrate([40, 60, 40]);
}

// Nach einer Änderung: Level-Up oder Rang-Aufstieg feiern, neue Belohnungen nennen.
function celebrate(before) {
  const after = D().level;
  if (after.level <= before.level) return;
  const rewards = STATIONS.filter((st) => st.lv > Math.max(1, before.level) && st.lv <= after.level).flatMap((st) => st.items);
  if (after.rank !== before.rank) {
    vibrate([60, 60, 120, 60, 240]);
    rankUp({ from: before.rank, to: after.rank, level: after.level, frame: equipped(app.state, after.level).frame.id, rewards });
  } else {
    levelUp({ level: after.level, rank: after.rank, rewards });
  }
}

// ---------- Rang-Pfad ----------
export function claimStations(levels) {
  commit((s) => {
    const set = new Set(s.rewards.claimed);
    for (const lv of levels) set.add(lv);
    s.rewards.claimed = [...set].sort((a, b) => a - b);
  }, { derive: 'keep' });
}

export function equipItems(items) {
  commit((s) => { for (const it of items) s.rewards.equip[it.type] = it.id; }, { derive: 'keep' });
}

// ---------- Training ----------
export function startSession(tplId = null, date = today()) {
  const d0 = D();
  commit((s) => {
    const tpl = s.templates.find((t) => t.id === tplId) || null;
    const ex = [...(d0.days.get(date)?.ex || [])];
    for (const id of tpl?.ex || []) if (!ex.includes(id)) ex.push(id);
    s.active = { d: date, tpl: tpl?.id || s.sessions[date]?.tpl || null, ex, backfill: date !== today() };
    if (date === today()) {
      s.sessions[date] = { ...(s.sessions[date] || {}), tpl: s.active.tpl };
      s.sessions[date].start ||= Date.now();
      delete s.sessions[date].end;
    } else if (tpl) {
      s.sessions[date] = { ...(s.sessions[date] || {}), tpl: tpl.id };
    }
  }, { derive: 'keep' });
}

export function addToSession(exId) {
  commit((s) => {
    if (!s.active) s.active = { d: today(), tpl: null, ex: [], backfill: false };
    if (!s.active.ex.includes(exId)) s.active.ex.push(exId);
  }, { derive: 'keep' });
}

export function removeFromSession(exId) {
  commit((s) => { if (s.active) s.active.ex = s.active.ex.filter((id) => id !== exId); }, { derive: 'keep' });
}

export function moveInSession(exId, dir) {
  commit((s) => {
    const list = s.active?.ex;
    if (!list) return;
    const i = list.indexOf(exId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
  }, { derive: 'keep' });
}

export function swapInSession(oldId, newId) {
  commit((s) => {
    const list = s.active?.ex;
    if (!list) return;
    const i = list.indexOf(oldId);
    if (i < 0) return;
    if (list.includes(newId)) list.splice(i, 1);
    else list[i] = newId;
  }, { derive: 'keep' });
}

export function addSet(exId, w, r) {
  const d0 = D();
  const ex = d0.exById.get(exId);
  if (!ex) return;
  const date = app.state.active?.d || today();
  const e1 = e1rmOf(d0.loadOf(ex, w), r);
  const prevBest = d0.bestE1.get(exId) || 0;
  const hadHistory = (d0.sessionsByEx.get(exId) || []).some((x) => x.d < date);
  const laterExists = (d0.sessionsByEx.get(exId) || []).some((x) => x.d > date);
  const isPR = r > 0 && hadHistory && !laterExists && prevBest > 0 && e1 > prevBest + 1e-6;
  const before = d0.level;
  let id = 0;
  let added = null;
  commit((s) => {
    id = nextId(s.sets);
    added = { id, ex: exId, d: date, w: round2(w), r, t: Date.now() };
    s.sets.push(added);
    if (!s.active) s.active = { d: date, tpl: null, ex: [], backfill: date !== today() };
    if (!s.active.ex.includes(exId)) s.active.ex.push(exId);
    if (date === today()) {
      s.sessions[date] = s.sessions[date] || { tpl: s.active.tpl };
      s.sessions[date].start ||= Date.now();
    }
  }, { render: false, derive: (dd) => deriveAppend(dd, added) });
  const bonuses = r > 0 ? grantBonuses() : [];
  app.ui.newSetId = id;
  render();
  haptic('MEDIUM');
  if (isPR) {
    vibrate([70, 70, 160]);
    prBurst({ name: ex.name, w, r, bw: ex.bw, e1, gain: e1 - prevBest });
  }
  bonusBanners(bonuses);
  celebrate(before);
  const st = app.state.settings;
  if (st.restAuto && date === today()) {
    const secs = st.useExerciseRest ? ex.rest || st.restDefault : st.restDefault;
    startTimer(secs, ex.name);
  }
}

// Ein geänderter Satz ist ein neues Objekt. So erkennt das Sichern (store.js), welcher Monat neu ist.
export function updateSet(id, patch) {
  commit((s) => {
    const i = s.sets.findIndex((x) => x.id === id);
    if (i < 0) return;
    const set = { ...s.sets[i] };
    if (patch.w != null) set.w = round2(patch.w);
    if (patch.r != null) set.r = patch.r;
    if (patch.note !== undefined) {
      if (patch.note) set.note = patch.note;
      else delete set.note;
    }
    s.sets[i] = set;
  });
}

export function deleteSet(id) {
  const idx = app.state.sets.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const removed = app.state.sets[idx];
  commit((s) => { s.sets = s.sets.filter((x) => x.id !== id); });
  toast(`Satz gelöscht (${kg(removed.w)} kg × ${removed.r})`, {
    label: 'Rückgängig',
    run: () => commit((s) => { s.sets.push(removed); }),
  });
}

export function finishSession() {
  const a = app.state.active;
  if (!a) return;
  stopTimer();
  commit((s) => {
    if (a.d === today() && s.sessions[a.d]) s.sessions[a.d].end = Date.now();
    s.active = null;
  }, { derive: 'keep' });
  const sum = daySummary(app.state, D(), a.d);
  const tpl = app.state.templates.find((t) => t.id === a.tpl);
  if (sum.sets > 0) missionComplete({ title: tpl ? tpl.name : 'Freies Training', ...sum });
}

// ---------- Übungen ----------
export function createExercise({ name, cat, bw, bar }) {
  const clean = fixName(name);
  if (!clean) return null;
  const existing = app.state.exercises.find((e) => e.name.toLowerCase() === clean.toLowerCase());
  if (existing) {
    if (existing.hidden) commit((s) => { s.exercises.find((e) => e.id === existing.id).hidden = false; }, { derive: 'keep' });
    return existing.id;
  }
  let id = 0;
  commit((s) => {
    id = nextId(s.exercises);
    s.exercises.push(completeExercise({ id, name: clean, cat, bw: bw ?? undefined, bar: bar ?? undefined }, []));
  }, { render: false });
  return id;
}

// Diese Angaben einer Übung ändern nichts an Level, Rekorden und Verlauf.
const PLAIN_EX = new Set(['repMin', 'repMax', 'inc', 'rest', 'notes', 'hidden', 'bar']);

export function updateExercise(id, patch) {
  commit((s) => {
    const ex = s.exercises.find((e) => e.id === id);
    if (ex) Object.assign(ex, patch);
  }, Object.keys(patch).every((k) => PLAIN_EX.has(k)) ? { derive: 'keep' } : {});
}

export function deleteExercise(id) {
  commit((s) => {
    s.sets = s.sets.filter((x) => x.ex !== id);
    s.exercises = s.exercises.filter((e) => e.id !== id);
    s.templates.forEach((t) => { t.ex = t.ex.filter((x) => x !== id); });
    if (s.active) s.active.ex = s.active.ex.filter((x) => x !== id);
  });
}

// ---------- Vorlagen ----------
export function saveTemplate(tpl) {
  commit((s) => {
    const i = s.templates.findIndex((t) => t.id === tpl.id);
    if (i >= 0) s.templates[i] = tpl;
    else s.templates.push(tpl);
  }, { derive: 'keep' });
}

export function deleteTemplate(id) {
  commit((s) => {
    s.templates = s.templates.filter((t) => t.id !== id);
    s.rotation = s.rotation.filter((r) => r !== id);
  }, { derive: 'keep' });
}

// ---------- Körpergewicht ----------
// Das Körpergewicht zählt nur über den Wert für Klimmzüge und Dips (letzter Eintrag oder fester Wert).
// Bleibt der gleich, stimmt alles Berechnete weiter.
const sameBody = (dd) => dd.bw === bodyRef(app.state);

export function setBody(d, value) {
  const before = D().level;
  commit((s) => {
    s.body = s.body.filter((b) => b.d !== d);
    s.body.push({ d, kg: round2(value) });
    s.body.sort((a, b) => a.d.localeCompare(b.d));
  }, { render: false, derive: sameBody });
  const bonuses = d === today() ? grantBonuses({ rest: true, week: false }) : [];
  render();
  bonusBanners(bonuses);
  celebrate(before);
}

export function deleteBody(d) {
  const old = app.state.body.find((b) => b.d === d);
  commit((s) => { s.body = s.body.filter((b) => b.d !== d); }, { derive: sameBody });
  if (old) toast('Eintrag gelöscht', { label: 'Rückgängig', run: () => setBody(old.d, old.kg) });
}

// ---------- Import & Backup ----------
export function exportJson() {
  const { active, ...rest } = app.state;
  return JSON.stringify({ app: 'KINTORE', exportedAt: new Date().toISOString(), data: { ...rest, active } }, null, 1);
}

export function importBackupText(text) {
  const parsed = JSON.parse(text);
  const data = parsed?.data && parsed.app === 'KINTORE' ? parsed.data : parsed;
  if (!data || !Array.isArray(data.sets) || !Array.isArray(data.exercises)) throw new Error('Diese Datei ist kein KINTORE-Backup.');
  replaceState(migrate(data));
}

// FitNotes-Daten übernehmen: "add" ergänzt fehlende Tage, "replace" ersetzt alle Trainingsdaten.
export function importFitNotes(fit, mode) {
  const s = app.state;
  const byName = new Map(s.exercises.map((e) => [e.name.toLowerCase(), e]));
  let added = 0;
  let days = 0;
  let bodyAdded = 0;

  if (mode === 'replace') {
    const keep = new Map(s.exercises.map((e) => [e.name.toLowerCase(), e]));
    const exercises = fit.exercises.map((e) => {
      const old = keep.get(e.name.toLowerCase());
      return old ? { ...e, cat: old.cat, bw: old.bw, bar: old.bar, repMin: old.repMin, repMax: old.repMax, inc: old.inc, rest: old.rest, notes: old.notes || e.notes, hidden: false } : e;
    });
    const idByName = new Map(exercises.map((e) => [e.name.toLowerCase(), e.id]));
    const oldNameById = new Map(s.exercises.map((e) => [e.id, e.name.toLowerCase()]));
    const templates = s.templates.map((t) => ({ ...t, ex: t.ex.map((id) => idByName.get(oldNameById.get(id))).filter((x) => x != null) }));
    replaceState(migrate({ ...s, exercises, sets: fit.sets, body: fit.body, templates, active: null }));
    return { sets: fit.sets.length, days: fit.summary.days, body: fit.body.length };
  }

  commit((st) => {
    const have = new Set(st.sets.map((x) => x.d));
    const idMap = new Map();
    let exId = nextId(st.exercises);
    for (const fe of fit.exercises) {
      const match = byName.get(fe.name.toLowerCase());
      if (match) idMap.set(fe.id, match.id);
      else if (fit.sets.some((x) => x.ex === fe.id && !have.has(x.d))) {
        const ne = { ...fe, id: exId++ };
        st.exercises.push(ne);
        byName.set(ne.name.toLowerCase(), ne);
        idMap.set(fe.id, ne.id);
      }
    }
    let setId = nextId(st.sets);
    const newDays = new Set();
    for (const fs of fit.sets) {
      if (have.has(fs.d) || !idMap.has(fs.ex)) continue;
      st.sets.push({ ...fs, id: setId++, ex: idMap.get(fs.ex) });
      newDays.add(fs.d);
      added++;
    }
    days = newDays.size;
    const bodyHave = new Set(st.body.map((b) => b.d));
    for (const b of fit.body) {
      if (!bodyHave.has(b.d)) { st.body.push(b); bodyAdded++; }
    }
    st.body.sort((a, b) => a.d.localeCompare(b.d));
  });
  return { sets: added, days, body: bodyAdded };
}
