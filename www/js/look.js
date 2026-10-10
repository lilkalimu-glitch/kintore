// Belohnungen im Rang-Pfad: Neon-Farben, Titel, Rahmen und Neon-Schilder.
// Jede Station im Pfad hat ein Level. Ist es erreicht, kann man die Belohnung abholen und anlegen.
import { esc, icon } from './util.js';
import { RANKS, rankById } from './stats.js';

export const TYPES = {
  color: { name: 'Neon-Farbe', plural: 'Neon-Farben' },
  title: { name: 'Titel', plural: 'Titel' },
  frame: { name: 'Rahmen', plural: 'Rahmen' },
  sign: { name: 'Neon-Schild', plural: 'Neon-Schilder' },
};
export const TYPE_ORDER = ['color', 'title', 'frame', 'sign'];

// lv 1 = von Anfang an da. Ränge schalten immer einen neuen Rahmen frei.
export const ITEMS = [
  { type: 'color', id: 'pink', name: 'Neon Pink', hex: '#FF4FA3', lv: 1 },
  { type: 'title', id: 'rookie', name: 'Rookie', lv: 1 },
  { type: 'frame', id: 'hex', name: 'Hexagon', lv: 1 },
  { type: 'sign', id: 'kintore', name: '筋トレ', de: 'Krafttraining', lv: 1 },
  { type: 'title', id: 'stammgast', name: 'Stammgast', lv: 2 },
  { type: 'color', id: 'eis', name: 'Eisblau', hex: '#58B8FF', lv: 4 },
  { type: 'frame', id: 'double', name: 'Doppelt', lv: 6 },
  { type: 'title', id: 'grinder', name: 'Grinder', lv: 8 },
  { type: 'sign', id: 'konjo', name: '根性', de: 'Biss', lv: 10 },
  { type: 'frame', id: 'star', name: 'Stern', lv: 12 },
  { type: 'color', id: 'toxic', name: 'Toxic', hex: '#3DFF8F', lv: 14 },
  { type: 'title', id: 'eisenfresser', name: 'Eisenfresser', lv: 16 },
  { type: 'color', id: 'uv', name: 'Ultraviolett', hex: '#A974FF', lv: 18 },
  { type: 'frame', id: 'crystal', name: 'Kristall', lv: 20 },
  { type: 'title', id: 'prjaeger', name: 'PR-Jäger', lv: 23 },
  { type: 'sign', id: 'tanren', name: '鍛錬', de: 'Disziplin', lv: 26 },
  { type: 'color', id: 'sunset', name: 'Sunset', hex: '#FF7A45', lv: 29 },
  { type: 'title', id: 'stahlwille', name: 'Stahlwille', lv: 32 },
  { type: 'frame', id: 'crest', name: 'Wappen', lv: 35 },
  { type: 'title', id: 'ronin', name: 'Gym-Ronin', lv: 39 },
  { type: 'sign', id: 'fukutsu', name: '不屈', de: 'Unbeugsam', lv: 43 },
  { type: 'color', id: 'crimson', name: 'Crimson', hex: '#FF3358', lv: 47 },
  { type: 'frame', id: 'wings', name: 'Flügel', lv: 50 },
  { type: 'title', id: 'sensei', name: 'Sensei', lv: 54 },
  { type: 'sign', id: 'kakusei', name: '覚醒', de: 'Erwachen', lv: 58 },
  { type: 'title', id: 'titan', name: 'Titan', lv: 62 },
  { type: 'color', id: 'gold', name: 'Gold', hex: '#FFC93D', lv: 66 },
  { type: 'frame', id: 'crown', name: 'Krone', lv: 70 },
  { type: 'title', id: 'endgegner', name: 'Endgegner', lv: 70 },
  { type: 'sign', id: 'genkai', name: '限界突破', de: 'Grenzen sprengen', lv: 70 },
];

export const DEFAULT_LOOK = { color: 'pink', title: 'rookie', frame: 'hex', sign: 'kintore' };
export const itemOf = (type, id) => ITEMS.find((x) => x.type === type && x.id === id) || null;

// Stationen im Pfad, aufsteigend. Station 1 ist der Start mit Rang E.
export const STATIONS = (() => {
  const byLv = new Map();
  for (const it of ITEMS) {
    if (!byLv.has(it.lv)) byLv.set(it.lv, []);
    byLv.get(it.lv).push(it);
  }
  for (const r of RANKS) if (!byLv.has(r.min)) byLv.set(r.min, []);
  return [...byLv.entries()].sort((a, b) => a[0] - b[0]).map(([lv, items]) => ({ lv, items, rank: RANKS.find((r) => r.min === lv) || null }));
})();
export const stationAt = (lv) => STATIONS.find((s) => s.lv === lv) || null;

const claimedSet = (state) => new Set(state.rewards?.claimed || []);

// Erreicht, aber noch nicht abgeholt.
export function readyStations(state, level) {
  const claimed = claimedSet(state);
  return STATIONS.filter((s) => s.lv > 1 && s.lv <= level && !claimed.has(s.lv));
}

export function owned(state, level, item) {
  if (!item) return false;
  if (item.lv <= 1) return true;
  return item.lv <= level && claimedSet(state).has(item.lv);
}

export function equipped(state, level) {
  const want = state.rewards?.equip || {};
  const out = {};
  for (const type of TYPE_ORDER) {
    const it = itemOf(type, want[type]);
    out[type] = owned(state, level, it) ? it : itemOf(type, DEFAULT_LOOK[type]);
  }
  return out;
}

// Neon-Farbe auf die ganze App anwenden (Standard Pink braucht kein Attribut).
export function applyLook(look) {
  const root = document.documentElement;
  const id = look?.color?.id || 'pink';
  if (id === 'pink') delete root.dataset.accent;
  else if (root.dataset.accent !== id) root.dataset.accent = id;
}

// ---------- Rang-Abzeichen mit Rahmen ----------
const pts = (list) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
function hexPts(cx, cy, r) {
  const out = [];
  for (let i = 0; i < 6; i++) {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts(out);
}
function starPts(cx, cy, r1, r2, n) {
  const out = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((-90 + (i * 180) / n) * Math.PI) / 180;
    const r = i % 2 ? r2 : r1;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts(out);
}

const WING = 'M28 40C17 36 9 28 4 16C13 23 21 26 29 29ZM26 52C14 50 6 44 1 34C11 39 18 41 27 42ZM28 64C17 65 9 61 4 54C12 56 19 56 28 55Z';

// cy: Mitte der Hauptform in Prozent (für den Buchstaben), fs: Schriftgröße relativ.
const FRAMES = {
  hex: { cy: 50, fs: 1, svg: () => `<polygon class="f-main" points="${hexPts(50, 50, 45)}"/>` },
  double: {
    cy: 50, fs: 0.92,
    svg: () => `<polygon class="f-line" points="${hexPts(50, 50, 49)}"/><polygon class="f-main" points="${hexPts(50, 50, 40)}"/>`,
  },
  star: {
    cy: 50, fs: 0.88,
    svg: () => `<polygon class="f-soft" points="${starPts(50, 50, 50, 40, 12)}"/><polygon class="f-main" points="${hexPts(50, 50, 37)}"/>`,
  },
  crystal: {
    cy: 50, fs: 0.88,
    svg: () => `<polygon class="f-soft" points="50,0 86,17 99,50 86,83 50,100 14,83 1,50 14,17"/>
      <path class="f-line" d="M50 0 50 13M99 50 82 50M50 100 50 87M1 50 18 50M86 17 75 28M86 83 75 72M14 83 25 72M14 17 25 28"/>
      <polygon class="f-main" points="${hexPts(50, 50, 37)}"/>`,
  },
  crest: {
    cy: 47, fs: 0.92,
    svg: () => `<path class="f-main" d="M14 8H86V46C86 71 69 86 50 96C31 86 14 71 14 46Z"/><path class="f-line" d="M23 17H77V46C77 64 65 77 50 86C35 77 23 64 23 46Z"/>`,
  },
  wings: {
    cy: 52, fs: 0.78,
    svg: () => `<path class="f-fill" d="${WING}"/><path class="f-fill" transform="matrix(-1 0 0 1 100 0)" d="${WING}"/><polygon class="f-main" points="${hexPts(50, 52, 31)}"/>`,
  },
  crown: {
    cy: 59, fs: 0.78,
    svg: () => `<path class="f-fill" d="M29 31 26 10 38 20 50 4 62 20 74 10 71 31Z"/><circle class="f-fill" cx="26" cy="10" r="3.4"/><circle class="f-fill" cx="50" cy="4" r="3.4"/><circle class="f-fill" cx="74" cy="10" r="3.4"/><polygon class="f-main" points="${hexPts(50, 60, 31)}"/>`,
  },
};

export function emblem(rankId, frameId = 'hex', size = 60, cls = '') {
  const f = FRAMES[frameId] || FRAMES.hex;
  const r = rankById(rankId);
  return `<span class="emb rank-${esc(r.id)} ${r.id.length > 1 ? 'emb-wide' : ''} ${cls}" style="--es:${size}px;--cy:${f.cy};--fs:${f.fs}" aria-hidden="true"><svg viewBox="0 0 100 100">${f.svg()}</svg><b>${esc(r.id)}</b></span>`;
}

// Nur der Rahmen, ohne Buchstaben (für kleine Vorschauen).
export const frameIcon = (frameId, size = 26) => {
  const f = FRAMES[frameId] || FRAMES.hex;
  return `<span class="emb emb-icon" style="--es:${size}px;--cy:${f.cy};--fs:${f.fs}" aria-hidden="true"><svg viewBox="0 0 100 100">${f.svg()}</svg></span>`;
};

const accentStyle = (item) => (item.hex ? `--sw:${item.hex}` : '');

// Kleine Vorschau einer Belohnung (Kugel im Pfad, Auswahl im Look).
export function itemOrb(item) {
  if (item.type === 'color') return `<span class="orb-sw" style="${accentStyle(item)}"></span>`;
  if (item.type === 'title') return icon('tag', 'orb-ic');
  if (item.type === 'frame') return frameIcon(item.id, 30);
  return `<span class="orb-jp">${esc(item.name.slice(0, 1))}</span>`;
}

// Große Vorschau im Belohnungs-Fenster.
export function itemShowcase(item, rankId) {
  if (item.type === 'color') return `<div class="show show-color" style="${accentStyle(item)}"><span></span></div>`;
  if (item.type === 'title') return `<div class="show show-title"><span>${esc(item.name)}</span></div>`;
  if (item.type === 'frame') return `<div class="show show-frame">${emblem(rankId, item.id, 92)}</div>`;
  return `<div class="show show-sign"><span>${esc(item.name)}</span></div>`;
}

export const itemLabel = (item) => (item.type === 'sign' ? `${item.name} (${item.de})` : item.name);
export const rankColor = (id) => rankById(id).color;
