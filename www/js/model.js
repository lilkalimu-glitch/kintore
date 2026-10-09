// Grundbegriffe der App: Muskelgruppen, Übungs-Eigenschaften, Standardwerte.

export const CATEGORIES = [
  { id: 'brust', name: 'Brust', jp: '胸', color: '#FF4FA3' },
  { id: 'ruecken', name: 'Rücken', jp: '背中', color: '#3CF0FF' },
  { id: 'schultern', name: 'Schultern', jp: '肩', color: '#9B6BFF' },
  { id: 'bizeps', name: 'Bizeps', jp: '二頭', color: '#FFA586' },
  { id: 'trizeps', name: 'Trizeps', jp: '三頭', color: '#FF5E62' },
  { id: 'beine', name: 'Beine', jp: '脚', color: '#5BFFB0' },
  { id: 'bauch', name: 'Bauch', jp: '腹', color: '#FFE45C' },
  { id: 'cardio', name: 'Cardio', jp: '有酸素', color: '#6E8BFF' },
  { id: 'sonstige', name: 'Sonstiges', jp: '他', color: '#B8C2DC' },
];

export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

// Muskelgruppen, die im Wochen-Radar erscheinen (ohne Cardio/Sonstiges).
export const RADAR_CATS = ['brust', 'schultern', 'trizeps', 'bauch', 'beine', 'bizeps', 'ruecken'];

const BODYWEIGHT = /^(pull ?ups?|chin ?ups?|neutral chin ?up|dips|ring dips?|weighted push ?ups?|push ?ups?|parallel bar triceps dip|box jumps?|hanging (knee|leg) raise|dragon flag|muscle ?ups?)$/i;
const BARBELL = /(barbell|deadlift|zercher|front squats?|hip thrust|good morning|rack pull|pendlay row|log press|push press)/i;
const COMPOUND = /(press|row|pulldown|squat|deadlift|lunge|dip|pull ?up|chin ?up|thrust|zercher|good morning|rack pull)/i;
const ISOLATION = /(raise|curl|fly|flys|extension|push ?down|kickback|crunch|shrug|face pull|adduction|abduction|calf)/i;

export function guessFlags(name) {
  const n = String(name || '');
  const bw = BODYWEIGHT.test(n.trim());
  const bar = !bw && BARBELL.test(n) && !/smith|ez-bar|calf/i.test(n);
  const compound = bw || (COMPOUND.test(n) && !ISOLATION.test(n));
  return { bw, bar, compound };
}

export const defaultRest = (compound) => (compound ? 150 : 90);

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function groupByDate(sets) {
  const map = new Map();
  for (const s of sets) {
    if (!map.has(s.d)) map.set(s.d, []);
    map.get(s.d).push(s);
  }
  return map;
}

// Wiederholungsbereich aus den letzten drei Einheiten schätzen.
export function inferRange(exSets) {
  const byDate = groupByDate(exSets);
  const dates = [...byDate.keys()].sort().reverse().slice(0, 3);
  const reps = [];
  for (const d of dates) {
    const list = byDate.get(d);
    const top = Math.max(...list.map((s) => s.w));
    for (const s of list) if (s.w === top && s.r > 0) reps.push(s.r);
  }
  if (!reps.length) return [8, 12];
  const m = median(reps);
  if (m <= 5) return [4, 6];
  if (m <= 7) return [6, 8];
  if (m <= 9) return [8, 10];
  if (m <= 11) return [10, 12];
  return [12, 15];
}

// Typische Gewichtssteigerung aus dem bisherigen Verlauf ableiten.
export function inferIncrement(exSets, flags, name) {
  if (flags.bar) return 2.5;
  if (/dumbbell/i.test(name)) return 2;
  const byDate = groupByDate(exSets);
  const tops = [...new Set([...byDate.values()].map((l) => Math.max(...l.map((s) => s.w))).filter((w) => w > 0))].sort((a, b) => a - b);
  const counts = new Map();
  for (let i = 1; i < tops.length; i++) {
    const diff = Math.round((tops[i] - tops[i - 1]) * 4) / 4;
    if (diff >= 0.5 && diff <= 10) counts.set(diff, (counts.get(diff) || 0) + 1);
  }
  if (!counts.size) return 2.5;
  let best = null;
  for (const [diff, n] of counts) {
    if (!best || n > best[1] || (n === best[1] && diff < best[0])) best = [diff, n];
  }
  return Math.min(5, Math.max(1, best[0]));
}

// Fehlende Felder einer Übung mit sinnvollen Werten auffüllen.
export function completeExercise(ex, exSets = []) {
  const flags = guessFlags(ex.name);
  const out = { ...ex };
  if (out.bw == null) out.bw = flags.bw;
  if (out.bar == null) out.bar = flags.bar;
  if (out.compound == null) out.compound = flags.compound;
  if (out.repMin == null || out.repMax == null) {
    const [lo, hi] = inferRange(exSets);
    out.repMin = lo;
    out.repMax = hi;
  }
  if (out.inc == null) out.inc = inferIncrement(exSets, { bar: out.bar }, out.name);
  if (out.rest == null) out.rest = defaultRest(out.compound);
  if (!out.cat || !CAT[out.cat]) out.cat = 'sonstige';
  if (out.notes == null) out.notes = '';
  return out;
}
