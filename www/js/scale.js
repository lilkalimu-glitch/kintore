// Maßstab pro Übung für den Gewichts-Bonus: typisches 1RM eines geübten Freizeitsportlers.
// So bringen Beinpresse und Curls gleich viel, wenn man auf demselben Niveau trainiert.
// Kurzhanteln zählen pro Hantel, Maschinen so, wie das Gewicht angezeigt wird.
// Körpergewicht-Übungen rechnen mit einem festen Körper von 75 kg plus Zusatzgewicht,
// damit die XP nicht davon abhängen, was die Waage gerade sagt.

export const BODY = 75;

// Typisches 1RM in kg.
const KG = {
  // Bauch
  'cable crunch': 60, 'crunch machine': 60,
  // Beine
  'barbell calf raise': 100, 'barbell front squat': 100, 'barbell glute bridge': 120, 'barbell squat': 125,
  'donkey calf raise': 120, 'hack squat': 150, 'hip adduction': 80, 'hip abduction': 80, 'hip thrust': 140,
  'leg extension machine': 85, 'leg extension': 85, 'leg press': 220, 'lying leg curl machine': 60, 'lying leg curl': 60,
  'pendulum squat': 130, 'romanian deadlift': 120, 'seated calf raise machine': 80, 'seated leg curl machine': 70,
  'seated leg curl': 70, 'smith machine split squat': 80, 'split squat': 30, 'standing calf raise machine': 120,
  'sumo deadlift': 150, 'walking lunge': 30, 'zercher squat': 100, 'bulgarian split squat': 30, 'goblet squat': 40,
  // Bizeps
  'barbell curl': 45, 'bayesian curl': 14, 'cable curl': 40, 'cable hammer curl': 40, 'dumbbell concentration curl': 16,
  'dumbbell curl': 18, 'dumbbell hammer curl': 20, 'dumbbell preacher curl': 15, 'ez bar curl': 42,
  'ez bar preacher curl': 38, 'preacher machine curl': 40, 'seated incline dumbbell curl': 15, 'seated machine curl': 45,
  // Brust
  'cable crossover': 25, 'cable low fly': 20, 'decline barbell bench press': 95, 'decline hammer strength chest press': 120,
  'flat barbell bench press': 90, 'flat dumbbell bench press': 34, 'flat dumbbell fly': 18, 'incline barbell bench press': 75,
  'incline dumbbell bench press': 30, 'incline dumbbell fly': 16, 'incline hammer strength chest press': 100,
  'incline smith machine press': 75, 'iso lateral bench press': 110, 'seated machine fly': 70, 'chest press machine': 80,
  // Rücken
  'barbell row': 85, 'barbell shrug': 130, 'close grip cable row': 80, 'deadlift': 150, 'dumbbell row': 42,
  'good morning': 80, 'hammer strength row': 100, 'high machine row': 90, 'lat pulldown': 80, 'machine shrug': 120,
  'mid back shrug': 60, 'pendlay row': 80, 'pull over': 35, 'rack pull': 180, 'seated cable row': 80,
  'straight arm cable pushdown': 35, 't bar row': 85,
  // Schultern
  'arnold dumbbell press': 22, 'behind the neck barbell press': 50, 'cable face pull': 35, 'face pull': 35,
  'cable rear delt fly': 12, 'dumbbell shrug': 40, 'front dumbbell raise': 15, 'hammer strength shoulder press': 90,
  'lateral cable raise': 10, 'lateral dumbbell raise': 14, 'lateral machine raise': 45, 'log press': 65,
  'one arm standing dumbbell press': 22, 'overhead press': 60, 'push press': 75, 'rear delt dumbbell raise': 12,
  'rear delt machine fly': 55, 'seated dumbbell lateral raise': 12, 'seated dumbbell press': 26,
  'smith machine overhead press': 60,
  // Trizeps
  'cable overhead triceps extension': 40, 'close grip barbell bench press': 80, 'dumbbell overhead triceps extension': 30,
  'ez bar skullcrusher': 40, 'lying triceps extension': 40, 'rope push down': 40, 'single arm cable overhead extension': 18,
  'single arm cable push down': 20, 'smith machine close grip bench press': 75, 'v bar push down': 50, 'z bar push down': 45,
};

// Körpergewicht-Übungen: typisches 1RM als Vielfaches von BODY.
// 1,4 entspricht 12 sauberen Wiederholungen ohne Zusatzgewicht.
const BW = {
  'pull up': 1.33, 'chin up': 1.36, 'neutral chin up': 1.35, 'muscle up': 1.2,
  'dips': 1.45, 'dip': 1.45, 'ring dip': 1.35, 'ring dips': 1.35, 'parallel bar triceps dip': 1.45,
  'push up': 1.4, 'push ups': 1.4, 'weighted push up': 1.45, 'box jump': 1.3,
  'hanging knee raise': 1.4, 'hanging leg raise': 1.33, 'dragon flag': 1.2,
  'ab wheel rollout': 1.35, 'crunch': 1.4, 'decline crunch': 1.4, 'back extension': 1.4, 'glute ham raise': 1.25,
};

// Für eigene Übungen: Bewegung am Namen erkennen (auch deutsche Namen). [Muster, Stange/Maschine, Kurzhantel]
const FAMILIES = [
  [/klimmz|pull ?up|chin ?up/, 'bw', 1.33],
  [/\bdips?\b/, 'bw', 1.45],
  [/liegest|push ?up/, 'bw', 1.4],
  [/close grip.*bench|enges bank/, 80, 30],
  [/incline.*(bench|press)|schr(a|ä)gbank/, 75, 30],
  [/bench|bankdr/, 90, 34],
  [/leg press|beinpresse/, 220, 220],
  [/front squat|frontkniebeuge/, 100, 30],
  [/hack|pendulum|squat|kniebeuge/, 125, 30],
  [/romanian|rdl|rum(a|ä)nisch/, 120, 45],
  [/deadlift|kreuzheben/, 150, 50],
  [/hip thrust|glute bridge|h(u|ü)ftheben/, 135, 50],
  [/leg extension|beinstreck/, 85, 85],
  [/leg curl|beinbeug/, 65, 65],
  [/calf|waden/, 110, 40],
  [/lunge|ausfallschritt|split squat/, 80, 30],
  [/adduct|abduct|adduktor|abduktor/, 80, 80],
  [/overhead press|shoulder press|military|schulterdr|ohp/, 60, 26],
  [/pulldown|latzug/, 80, 80],
  [/face pull/, 35, 35],
  [/shrug/, 130, 40],
  [/row|rudern/, 80, 42],
  [/lateral|seitheb/, 45, 14],
  [/rear delt|reverse fly|hintere schulter/, 55, 12],
  [/curl/, 42, 18],
  [/push ?down|skull|triceps|trizeps|extension/, 45, 25],
  [/fly|flys|crossover|butterfly|fliegende/, 60, 18],
  [/raise|heben/, 35, 15],
  [/press|dr(u|ü)ck/, 80, 30],
];

// Wenn nichts passt: nach Muskelgruppe. [Grundübung, Isolation], Kurzhantel ca. 40 Prozent davon.
const CAT_DEFAULT = {
  brust: [85, 50], ruecken: [80, 40], schultern: [55, 35], bizeps: [40, 40], trizeps: [60, 40],
  beine: [140, 75], bauch: [60, 60], sonstige: [70, 40],
};
const BW_DEFAULT = { ruecken: 1.33, brust: 1.42, trizeps: 1.42, bauch: 1.4, beine: 1.3 };

// Kleinbuchstaben, Umlaute ohne Punkte, Bindestriche und Klammern als Leerzeichen.
export const normName = (name) => String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9ß]+/g, ' ').trim();

const isDumbbell = (n) => /dumbbell|kurzhantel|\bdb\b|\bkh\b/.test(n);
const bwScale = (k) => ({ ref: Math.round(BODY * k * 10) / 10, bw: true });

// Maßstab einer Übung: { ref: typisches 1RM in kg, bw: rechnet mit 75 kg Körper plus Zusatzgewicht } oder null.
export function scaleOf(ex) {
  if (!ex || ex.cat === 'cardio') return null;
  const n = normName(ex.name);
  if (ex.bw) {
    if (BW[n]) return bwScale(BW[n]);
    for (const [re, a, b] of FAMILIES) if (a === 'bw' && re.test(n)) return bwScale(b);
    return bwScale(BW_DEFAULT[ex.cat] || 1.35);
  }
  if (BW[n]) return bwScale(BW[n]);
  if (KG[n]) return { ref: KG[n], bw: false };
  const db = isDumbbell(n);
  for (const [re, a, b] of FAMILIES) {
    if (!re.test(n)) continue;
    if (a === 'bw') return bwScale(b);
    return { ref: db ? b : a, bw: false };
  }
  const def = CAT_DEFAULT[ex.cat] || CAT_DEFAULT.sonstige;
  const base = ex.compound ? def[0] : def[1];
  return { ref: db ? Math.round(base * 0.4) : base, bw: false };
}

// Typischer Arbeitssatz zum Anzeigen, z. B. { w: 70, r: 8 } oder bei Körpergewicht { w: 0, r: 10 }.
export function typicalSet(scale) {
  if (!scale) return null;
  if (scale.bw) {
    const k = scale.ref / BODY;
    if (k <= 1.4 + 1e-9) return { w: 0, r: Math.max(1, Math.round(30 * (k - 1))), bw: true };
    const w = scale.ref / (1 + 8 / 30) - BODY;
    return { w: Math.max(2.5, Math.round(w / 2.5) * 2.5), r: 8, bw: true };
  }
  const w = scale.ref / (1 + 8 / 30);
  const step = scale.ref >= 60 ? 2.5 : 1;
  return { w: Math.max(step, Math.round(w / step) * step), r: 8, bw: false };
}
