// Speichern der Daten auf dem Gerät.
// Haupt-Speicher: IndexedDB. Zusätzlich eine Kopie als Datei im App-Ordner (nur in der Android-App),
// damit nichts verloren geht, falls der Browser-Speicher geleert wird.
//
// Seit Version 2.9 liegen die Sätze in IndexedDB in Teilen, ein Eintrag pro Monat (sets:2026-10), dazu der
// Haupteintrag mit allem anderen und der Liste der Monate (setMonths). Beim Sichern werden nur die Monate
// geschrieben, die sich geändert haben, alles in einem Schritt (eine Transaktion). So stockt die App auch
// mit Jahren an Verlauf nicht. Der alte Haupteintrag mit allen Sätzen (bis 2.8) wird weiter gelesen.
import { mirrorRead, mirrorWrite, isNative } from './native.js';

const DB = 'kintore';
const STORE = 'kv';
const KEY = 'state';
const BG_KEY = 'bg';
const CHUNK = 'sets:';

let dbPromise = null;
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function idbGet(key) {
  const db = await openDb();
  if (!db) {
    try { const v = localStorage.getItem('kintore:' + key); return v ? JSON.parse(v) : null; } catch { return null; }
  }
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// Mehrere Einträge in einem Schritt lesen.
async function idbGetMany(keys) {
  const db = await openDb();
  if (!db || !keys.length) return keys.map(() => null);
  return new Promise((resolve) => {
    try {
      const st = db.transaction(STORE, 'readonly').objectStore(STORE);
      const out = new Array(keys.length).fill(null);
      let left = keys.length;
      keys.forEach((k, i) => {
        const req = st.get(k);
        req.onsuccess = () => { out[i] = req.result ?? null; if (--left === 0) resolve(out); };
        req.onerror = () => { if (--left === 0) resolve(out); };
      });
    } catch {
      resolve(keys.map(() => null));
    }
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  if (!db) {
    try { localStorage.setItem('kintore:' + key, JSON.stringify(value)); return true; } catch { return false; }
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbDel(key) {
  const db = await openDb();
  if (!db) { try { localStorage.removeItem('kintore:' + key); } catch {} return; }
  await new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = tx.onerror = tx.onabort = () => resolve();
    } catch { resolve(); }
  });
}

// ---------- Sätze nach Monat ----------
const monthOf = (s) => (typeof s.d === 'string' ? s.d.slice(0, 7) : '0000-00');

function byMonth(sets) {
  const out = new Map();
  for (const s of sets) {
    const m = monthOf(s);
    let list = out.get(m);
    if (!list) out.set(m, (list = []));
    list.push(s);
  }
  return out;
}

// Kurzer Fingerabdruck der Werte. Er fängt Änderungen an einem Satz ab, falls doch einmal ein Satz
// direkt geändert statt ersetzt wird. Neue oder entfernte Sätze erkennt schon der Vergleich der Objekte.
function stamp(list) {
  let f = list.length;
  for (const s of list) f = (f * 31 + s.id * 7 + (s.ex | 0) * 3 + s.w * 101 + s.r * 13 + (s.t || 0) % 100003 + (s.note ? s.note.length * 17 : 0)) % 2147483647;
  return f;
}

// Monat -> { list, stamp }: was zuletzt in IndexedDB steht.
let written = new Map();
const sameList = (a, b) => !!a && a.length === b.length && a.every((x, i) => x === b[i]);

// Nach dem Laden aus den Monats-Einträgen: Diese Sätze stehen schon so in IndexedDB.
export function markStored(state) {
  written = new Map();
  for (const [m, list] of byMonth(state.sets)) written.set(m, { list, stamp: stamp(list) });
}

// Lädt den gespeicherten Stand. Reihenfolge: IndexedDB, dann Datei-Kopie, dann Startdaten.
export async function loadState() {
  const head = await idbGet(KEY);
  if (head && Array.isArray(head.sets)) return { state: head, origin: 'db' };
  if (head && Array.isArray(head.setMonths)) {
    const parts = await idbGetMany(head.setMonths.map((m) => CHUNK + m));
    const { setMonths, ...rest } = head;
    if (parts.every(Array.isArray)) return { state: { ...rest, sets: parts.flat() }, origin: 'db', parts: true };
    // Ein Monat fehlt: lieber die vollständige Datei-Kopie nehmen, falls es sie gibt.
    const fromMirror = await readMirror();
    if (fromMirror) return { state: fromMirror, origin: 'mirror' };
    return { state: { ...rest, sets: parts.filter(Array.isArray).flat() }, origin: 'db-teilweise' };
  }
  const fromMirror = await readMirror();
  if (fromMirror) return { state: fromMirror, origin: 'mirror' };
  const res = await fetch('data/seed.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Startdaten fehlen');
  return { state: await res.json(), origin: 'seed' };
}

async function readMirror() {
  const text = await mirrorRead();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && Array.isArray(parsed.sets) ? parsed : null;
  } catch {
    return null;
  }
}

// Schreibt geänderte Monate und den Haupteintrag in einem Schritt. Beim ersten Schreiben nach dem Start
// fliegen Monats-Einträge raus, die es nicht mehr gibt. Ohne IndexedDB alles in einem Eintrag wie bisher.
async function writeParts(head, put, gone, tidy, state) {
  const db = await openDb();
  if (!db) {
    try { localStorage.setItem('kintore:' + KEY, JSON.stringify(state)); return true; } catch { return false; }
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const st = tx.objectStore(STORE);
      for (const [m, list] of put) st.put(list, CHUNK + m);
      for (const m of gone) st.delete(CHUNK + m);
      st.put(head, KEY);
      if (tidy) {
        const keep = new Set(head.setMonths.map((m) => CHUNK + m));
        const req = st.getAllKeys();
        req.onsuccess = () => {
          for (const k of req.result) if (typeof k === 'string' && k.startsWith(CHUNK) && !keep.has(k)) st.delete(k);
        };
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

let pending = null;
let latest = null;
let timer = null;
let tidied = false;

function flushNow() {
  if (!pending) return;
  const s = pending;
  pending = null;
  const groups = byMonth(s.sets);
  const next = new Map();
  const put = [];
  for (const [m, list] of groups) {
    const prev = written.get(m);
    const st = stamp(list);
    if (!prev || prev.stamp !== st || !sameList(prev.list, list)) put.push([m, list]);
    next.set(m, { list, stamp: st });
  }
  const gone = [...written.keys()].filter((m) => !groups.has(m));
  const { sets, ...rest } = s;
  const head = { ...rest, setMonths: [...groups.keys()].sort() };
  written = next;
  const tidy = !tidied;
  tidied = true;
  writeParts(head, put, gone, tidy, s).then((ok) => {
    if (ok) return;
    // Hat es nicht geklappt: gleich noch einmal, dann alles.
    written = new Map();
    tidied = false;
    if (latest) persist(latest);
  });
  mirrorDirty = true;
  scheduleMirror();
}

// Wartet kurz, damit mehrere Änderungen zusammen gespeichert werden, und dann auf einen ruhigen Moment.
const idle = (fn) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 600 }) : setTimeout(fn, 0));

export function persist(state) {
  pending = state;
  latest = state;
  clearTimeout(timer);
  timer = setTimeout(() => idle(flushNow), 250);
}

// ---------- Datei-Kopie (nur in der Android-App) ----------
// Die Kopie ist nur für den Notfall da. Sie wird höchstens alle 30 Sekunden in einem ruhigen Moment
// geschrieben und sofort, wenn die App in den Hintergrund geht. Unveränderte Monate werden dabei nicht
// jedes Mal neu in Text umgewandelt.
const MIRROR_EVERY = 30000;
let mirrorDirty = false;
let mirrorTimer = null;
let lastMirror = 0;
const jsonCache = new Map();

function scheduleMirror() {
  if (!isNative() || mirrorTimer) return;
  const wait = Math.max(1500, MIRROR_EVERY - (Date.now() - lastMirror));
  mirrorTimer = setTimeout(() => { mirrorTimer = null; idle(() => writeMirror(false)); }, wait);
}

export function mirrorJson(s, fresh = false) {
  if (fresh) jsonCache.clear();
  const groups = byMonth(s.sets);
  const parts = [];
  for (const m of [...groups.keys()].sort()) {
    const list = groups.get(m);
    const st = stamp(list);
    let c = jsonCache.get(m);
    if (!c || c.stamp !== st || !sameList(c.list, list)) jsonCache.set(m, (c = { list, stamp: st, json: JSON.stringify(list).slice(1, -1) }));
    if (c.json) parts.push(c.json);
  }
  for (const m of [...jsonCache.keys()]) if (!groups.has(m)) jsonCache.delete(m);
  const { sets, ...rest } = s;
  const head = JSON.stringify(rest);
  return `${head.slice(0, -1)}${head.length > 2 ? ',' : ''}"sets":[${parts.join(',')}]}`;
}

function writeMirror(fresh) {
  if (!mirrorDirty || !latest || !isNative()) return;
  mirrorDirty = false;
  lastMirror = Date.now();
  mirrorWrite(mirrorJson(latest, fresh));
}

// App geht in den Hintergrund oder wird geschlossen: alles sofort sichern.
export function flushPersist() {
  clearTimeout(timer);
  if (pending) flushNow();
  clearTimeout(mirrorTimer);
  mirrorTimer = null;
  writeMirror(true);
}

export const loadBg = () => idbGet(BG_KEY);
export const saveBg = (dataUrl) => (dataUrl ? idbSet(BG_KEY, dataUrl) : idbDel(BG_KEY));

// Profilbild: wie das Hintergrundbild getrennt von den Trainingsdaten gespeichert.
const AVATAR_KEY = 'avatar';
export const loadAvatar = () => idbGet(AVATAR_KEY);
export const saveAvatar = (dataUrl) => (dataUrl ? idbSet(AVATAR_KEY, dataUrl) : idbDel(AVATAR_KEY));
export const clearAll = async () => {
  const head = await idbGet(KEY);
  for (const m of head?.setMonths || []) await idbDel(CHUNK + m);
  await idbDel(KEY);
  await idbDel(BG_KEY);
  written = new Map();
};
