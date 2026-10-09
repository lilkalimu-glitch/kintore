// Speichern der Daten auf dem Gerät.
// Haupt-Speicher: IndexedDB. Zusätzlich eine Kopie als Datei im App-Ordner (nur in der Android-App),
// damit nichts verloren geht, falls der Browser-Speicher geleert wird.
import { mirrorRead, mirrorWrite } from './native.js';

const DB = 'kintore';
const STORE = 'kv';
const KEY = 'state';
const BG_KEY = 'bg';

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

// Lädt den gespeicherten Stand. Reihenfolge: IndexedDB → Datei-Kopie → Startdaten.
export async function loadState() {
  const fromDb = await idbGet(KEY);
  if (fromDb && Array.isArray(fromDb.sets)) return { state: fromDb, origin: 'db' };
  const mirror = await mirrorRead();
  if (mirror) {
    try {
      const parsed = JSON.parse(mirror);
      if (parsed && Array.isArray(parsed.sets)) return { state: parsed, origin: 'mirror' };
    } catch {}
  }
  const res = await fetch('data/seed.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Startdaten fehlen');
  return { state: await res.json(), origin: 'seed' };
}

let pending = null;
let timer = null;
let mirrorTimer = null;

function flushNow() {
  if (!pending) return;
  const snapshot = pending;
  pending = null;
  idbSet(KEY, snapshot);
  clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => mirrorWrite(JSON.stringify(snapshot)), 1500);
}

export function persist(state) {
  pending = state;
  clearTimeout(timer);
  timer = setTimeout(flushNow, 250);
}

export function flushPersist() {
  clearTimeout(timer);
  if (pending) {
    const snapshot = pending;
    flushNow();
    clearTimeout(mirrorTimer);
    mirrorWrite(JSON.stringify(snapshot));
  }
}

export const loadBg = () => idbGet(BG_KEY);
export const saveBg = (dataUrl) => (dataUrl ? idbSet(BG_KEY, dataUrl) : idbDel(BG_KEY));
export const clearAll = async () => { await idbDel(KEY); await idbDel(BG_KEY); };
