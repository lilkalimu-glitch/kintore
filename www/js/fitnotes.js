// Liest ein FitNotes-Backup (.fitnotes) und wandelt es in KINTORE-Daten um.
import { openSqlite } from './sqlite.js';
import { completeExercise } from './model.js';

const CAT_BY_EN = {
  shoulders: 'schultern', triceps: 'trizeps', biceps: 'bizeps', chest: 'brust',
  back: 'ruecken', legs: 'beine', abs: 'bauch', cardio: 'cardio',
};

// Tippfehler und Kleinschreibung in Übungsnamen korrigieren.
export const NAME_FIXES = {
  'Split Squad': 'Split Squat',
  'Smith Maschine Split Squad': 'Smith Machine Split Squat',
  'Bayesan Curl': 'Bayesian Curl',
  'Hip Trust': 'Hip Thrust',
  'High Machjne Row': 'High Machine Row',
  'BHD LAT PULLDWON': 'BHD Lat Pulldown',
  'Incline Smith Maschine': 'Incline Smith Machine',
  'Halokan Planm': 'Halokan Plank',
  'shrugs': 'Shrugs',
  'close grip cable row': 'Close Grip Cable Row',
  'cable low flys': 'Cable Low Flys',
  'zercher squats': 'Zercher Squats',
  'Back extension': 'Back Extension',
};

export const fixName = (name) => {
  const n = String(name ?? '').trim().replace(/\s+/g, ' ');
  return NAME_FIXES[n] || n;
};

const round2 = (x) => Math.round(x * 100) / 100;

export function readFitNotes(buffer) {
  const db = openSqlite(buffer);
  if (!db.has('training_log') || !db.has('exercise')) {
    throw new Error('Diese Datei ist kein FitNotes-Backup.');
  }

  const catOf = new Map(
    db.rows('Category').map((c) => [c._id, CAT_BY_EN[String(c.name).trim().toLowerCase()] || 'sonstige']),
  );

  const notes = new Map();
  if (db.has('Comment')) {
    for (const c of db.rows('Comment')) {
      if (c.owner_type_id === 1 && c.comment) notes.set(c.owner_id, String(c.comment).trim());
    }
  }

  const exRows = db.rows('exercise');
  const known = new Set(exRows.map((e) => e._id));
  const sets = db
    .rows('training_log')
    .filter((r) => known.has(r.exercise_id) && r.date)
    .sort((a, b) => a._id - b._id)
    .map((r) => {
      const s = { id: r._id, ex: r.exercise_id, d: String(r.date).slice(0, 10), w: round2(Number(r.metric_weight) || 0), r: Number(r.reps) || 0 };
      if (notes.has(r._id)) s.note = notes.get(r._id);
      return s;
    });

  const setsByEx = new Map();
  for (const s of sets) {
    if (!setsByEx.has(s.ex)) setsByEx.set(s.ex, []);
    setsByEx.get(s.ex).push(s);
  }

  const exercises = exRows.map((e) =>
    completeExercise(
      {
        id: e._id,
        name: fixName(e.name),
        cat: catOf.get(e.category_id) || 'sonstige',
        fav: !!e.is_favourite,
        notes: e.notes ? String(e.notes) : '',
        hidden: e.exercise_type_id !== 0 && !setsByEx.has(e._id),
      },
      setsByEx.get(e._id) || [],
    ),
  );

  const bodyMap = new Map();
  if (db.has('BodyWeight')) {
    for (const b of db.rows('BodyWeight')) {
      if (b.date && b.body_weight_metric > 0) bodyMap.set(String(b.date).slice(0, 10), round2(b.body_weight_metric));
    }
  }
  if (db.has('Measurement') && db.has('MeasurementRecord')) {
    const bwIds = new Set(db.rows('Measurement').filter((m) => /body\s*weight|k(ö|oe)rpergewicht/i.test(m.name)).map((m) => m._id));
    for (const r of db.rows('MeasurementRecord')) {
      if (bwIds.has(r.measurement_id) && r.date && r.value > 0) bodyMap.set(String(r.date).slice(0, 10), round2(r.value));
    }
  }
  const body = [...bodyMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, kg]) => ({ d, kg }));

  const dates = sets.map((s) => s.d).sort();
  return {
    exercises,
    sets,
    body,
    summary: {
      sets: sets.length,
      days: new Set(dates).size,
      exercises: setsByEx.size,
      first: dates[0] || null,
      last: dates[dates.length - 1] || null,
      notes: notes.size,
      body: body.length,
    },
  };
}
