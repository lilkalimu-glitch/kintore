// Belohnungen im Rang-Pfad: Neon-Farben, Titel, Rahmen, Neon-Schilder, Banner und Effekte.
// Jede Station im Pfad hat ein Level. Ist es erreicht, kann man die Belohnung abholen und anlegen.
// Die Seltenheit ergibt sich aus dem Rang der Station: je höher der Rang, desto besonderer.
import { esc, icon, hashStr } from './util.js';
import { RANKS, rankById, rankOf } from './stats.js';
import { bannerArt, effectParts } from './art.js';
import { isCalm, jpOn, initialsOf, themeId, calmAccent } from './theme.js';

// Im Design Neon heißen Farbe und Schild mit Neon davor, in Dunkel und Hell nicht.
const neonName = (calm, neon) => ({ get name() { return isCalm() ? calm[0] : neon[0]; }, get plural() { return isCalm() ? calm[1] : neon[1]; } });
export const TYPES = {
  color: neonName(['Farbe', 'Farben'], ['Neon-Farbe', 'Neon-Farben']),
  title: { name: 'Titel', plural: 'Titel' },
  frame: { name: 'Rahmen', plural: 'Rahmen' },
  sign: neonName(['Schild', 'Schilder'], ['Neon-Schild', 'Neon-Schilder']),
  banner: { name: 'Banner', plural: 'Banner' },
  effect: { name: 'Effekt', plural: 'Effekte' },
};

// Japanische Schrift nur für Namen, die wirklich japanische Zeichen enthalten.
export const isJp = (text) => /[\u3000-\u9fff]/.test(String(text || ''));
export const TYPE_ORDER = ['color', 'title', 'frame', 'sign', 'banner', 'effect'];
// Diese Typen färben die ganze App, Banner und Effekt gehören nur zum Profil.
export const APP_TYPES = ['color', 'title', 'frame', 'sign'];

// lv 1 = von Anfang an da. Ränge schalten immer einen neuen Rahmen frei.
// Neue Belohnungen nur auf Level ohne bisherige Station, sonst gälten sie bei schon abgeholten Stationen sofort als
// abgeholt (abgeholt wird pro Level, `state.rewards.claimed`).
export const ITEMS = [
  { type: 'color', id: 'pink', get name() { return isCalm() ? 'Pink' : 'Neon Pink'; }, hex: '#FF4FA3', lv: 1 },
  { type: 'title', id: 'rookie', name: 'Rookie', lv: 1 },
  { type: 'frame', id: 'hex', name: 'Hexagon', lv: 1 },
  { type: 'sign', id: 'kintore', name: '筋トレ', de: 'Krafttraining', lv: 1 },
  // Neon-Schilder mit einem Wort statt Schriftzeichen (seit 2.10), jeweils neben dem japanischen Schild.
  { type: 'sign', id: 'kraft', name: 'KRAFT', lv: 1 },
  { type: 'banner', id: 'nacht', name: 'Nachtlicht', lv: 1 },
  { type: 'effect', id: 'none', name: 'Kein Effekt', lv: 1 },
  { type: 'effect', id: 'schimmer', name: 'Schimmer', lv: 1 },
  { type: 'title', id: 'stammgast', name: 'Stammgast', lv: 2 },
  { type: 'banner', id: 'raster', name: 'Neon-Raster', lv: 3 },
  { type: 'color', id: 'eis', name: 'Eisblau', hex: '#58B8FF', lv: 4 },
  { type: 'effect', id: 'glitzer', name: 'Glitzer', lv: 5 },
  { type: 'frame', id: 'double', name: 'Doppelt', lv: 6 },
  { type: 'effect', id: 'puls', name: 'Puls', lv: 7 },
  { type: 'title', id: 'grinder', name: 'Grinder', lv: 8 },
  { type: 'banner', id: 'skyline', name: 'Skyline', lv: 9 },
  { type: 'sign', id: 'konjo', name: '根性', de: 'Biss', lv: 10 },
  { type: 'sign', id: 'biss', name: 'BISS', lv: 11 },
  { type: 'frame', id: 'star', name: 'Stern', lv: 12 },
  { type: 'effect', id: 'ring', name: 'Neon-Ring', lv: 13 },
  { type: 'color', id: 'toxic', name: 'Toxic', hex: '#3DFF8F', lv: 14 },
  { type: 'banner', id: 'tusche', name: 'Tusche', lv: 15 },
  { type: 'title', id: 'eisenfresser', name: 'Eisenfresser', lv: 16 },
  { type: 'banner', id: 'sakura', name: 'Sakura', lv: 17 },
  { type: 'color', id: 'uv', name: 'Ultraviolett', hex: '#A974FF', lv: 18 },
  { type: 'banner', id: 'klinge', name: 'Klinge', lv: 19 },
  { type: 'frame', id: 'crystal', name: 'Kristall', lv: 20 },
  { type: 'effect', id: 'manga', name: 'Manga-Linien', lv: 21 },
  { type: 'banner', id: 'panel', name: 'Manga-Panel', lv: 22 },
  { type: 'title', id: 'prjaeger', name: 'PR-Jäger', lv: 23 },
  { type: 'banner', id: 'synthwave', name: 'Synthwave', lv: 24 },
  { type: 'effect', id: 'kreide', name: 'Kreidestaub', lv: 25 },
  { type: 'sign', id: 'tanren', name: '鍛錬', de: 'Disziplin', lv: 26 },
  { type: 'sign', id: 'disziplin', name: 'DISZIPLIN', lv: 27 },
  { type: 'banner', id: 'himmelslicht', name: 'Himmelslicht', lv: 28 },
  { type: 'color', id: 'sunset', name: 'Sunset', hex: '#FF7A45', lv: 29 },
  { type: 'title', id: 'hantelheld', name: 'Hantelheld', lv: 30 },
  { type: 'effect', id: 'orbit', name: 'Orbit', lv: 31 },
  { type: 'title', id: 'stahlwille', name: 'Stahlwille', lv: 32 },
  { type: 'banner', id: 'finsternis', name: 'Finsternis', lv: 33 },
  { type: 'sign', id: 'fokus', name: 'FOKUS', lv: 34 },
  { type: 'frame', id: 'crest', name: 'Wappen', lv: 35 },
  { type: 'title', id: 'kraftwerk', name: 'Kraftwerk', lv: 36 },
  { type: 'banner', id: 'regen', name: 'Neon-Regen', lv: 37 },
  { type: 'effect', id: 'welle', name: 'Schockwelle', lv: 38 },
  { type: 'title', id: 'ronin', name: 'Gym-Ronin', lv: 39 },
  { type: 'banner', id: 'auge', name: 'Das Auge', lv: 40 },
  { type: 'effect', id: 'funken', name: 'Funken', lv: 41 },
  { type: 'sign', id: 'wille', name: 'WILLE', lv: 42 },
  { type: 'sign', id: 'fukutsu', name: '不屈', de: 'Unbeugsam', lv: 43 },
  { type: 'sign', id: 'unbeugsam', name: 'UNBEUGSAM', lv: 44 },
  { type: 'banner', id: 'aurora', name: 'Polarlicht', lv: 45 },
  { type: 'title', id: 'heber', name: 'Gewichtheber', lv: 46 },
  { type: 'color', id: 'crimson', name: 'Crimson', hex: '#FF3358', lv: 47 },
  { type: 'banner', id: 'unterwelt', name: 'Unterwelt', lv: 48 },
  { type: 'effect', id: 'blitze', name: 'Blitze', lv: 49 },
  { type: 'frame', id: 'wings', name: 'Flügel', lv: 50 },
  { type: 'title', id: 'unaufhaltsam', name: 'Unaufhaltsam', lv: 51 },
  { type: 'effect', id: 'flammen', name: 'Neon-Flammen', lv: 52 },
  { type: 'effect', id: 'aura', name: 'Aura', lv: 53 },
  { type: 'title', id: 'sensei', name: 'Sensei', lv: 54 },
  { type: 'sign', id: 'stahl', name: 'STAHL', lv: 55 },
  { type: 'banner', id: 'inferno', name: 'Inferno', lv: 56 },
  { type: 'title', id: 'biest', name: 'Biest', lv: 57 },
  { type: 'sign', id: 'kakusei', name: '覚醒', de: 'Erwachen', lv: 58 },
  { type: 'sign', id: 'erwachen', name: 'ERWACHEN', lv: 59 },
  { type: 'banner', id: 'horizont', name: 'Schwarzes Loch', lv: 60 },
  { type: 'color', id: 'tuerkis', name: 'Türkis', hex: '#2EE6D6', lv: 61 },
  { type: 'title', id: 'titan', name: 'Titan', lv: 62 },
  { type: 'sign', id: 'hunger', name: 'HUNGER', lv: 63 },
  { type: 'effect', id: 'sterne', name: 'Sternenregen', lv: 64 },
  { type: 'banner', id: 'feuersturm', name: 'Feuersturm', lv: 65 },
  { type: 'color', id: 'gold', name: 'Gold', hex: '#FFC93D', lv: 66 },
  { type: 'title', id: 'halbgott', name: 'Halbgott', lv: 67 },
  { type: 'banner', id: 'kosmos', name: 'Kosmos', lv: 68 },
  { type: 'sign', id: 'grenzenlos', name: 'GRENZENLOS', lv: 69 },
  { type: 'frame', id: 'crown', name: 'Krone', lv: 70 },
  { type: 'title', id: 'endgegner', name: 'Endgegner', lv: 70 },
  { type: 'sign', id: 'genkai', name: '限界突破', de: 'Grenzen sprengen', lv: 70 },
  // Level 71-100 und der Rang SSS (seit 2.11).
  { type: 'title', id: 'unsterblich', name: 'Unsterblich', lv: 72 },
  { type: 'banner', id: 'gipfel', name: 'Gipfel', lv: 74 },
  { type: 'sign', id: 'tetsujin', name: '鉄人', de: 'Eisenmensch', lv: 75 },
  { type: 'sign', id: 'eisern', name: 'EISERN', lv: 76 },
  { type: 'title', id: 'koloss', name: 'Koloss', lv: 78 },
  { type: 'title', id: 'legende', name: 'Legende', lv: 82 },
  { type: 'sign', id: 'muteki', name: '無敵', de: 'Unbesiegbar', lv: 84 },
  { type: 'sign', id: 'unbesiegbar', name: 'UNBESIEGBAR', lv: 85 },
  { type: 'banner', id: 'tiefsee', name: 'Tiefsee', lv: 86 },
  { type: 'effect', id: 'nova', name: 'Supernova', lv: 88 },
  { type: 'frame', id: 'halo', name: 'Heiligenschein', lv: 90 },
  { type: 'title', id: 'mythos', name: 'Mythos', lv: 90 },
  { type: 'title', id: 'eisengott', name: 'Eisengott', lv: 94 },
  { type: 'sign', id: 'tatsujin', name: '達人', de: 'Meister', lv: 97 },
  { type: 'sign', id: 'meister', name: 'MEISTER', lv: 98 },
  { type: 'title', id: 'grossmeister', name: 'Großmeister', lv: 100 },
  { type: 'color', id: 'platin', name: 'Platin', hex: '#E4EAF2', lv: 100 },
];

export const DEFAULT_LOOK = { color: 'pink', title: 'rookie', frame: 'hex', sign: 'kraft', banner: 'nacht', effect: 'none' };
export const itemOf = (type, id) => ITEMS.find((x) => x.type === type && x.id === id) || null;

// ---------- Seltenheit ----------
export const RARITIES = [
  { id: 'n', name: 'Normal', jp: 'ノーマル' },
  { id: 's', name: 'Selten', jp: 'レア' },
  { id: 'e', name: 'Episch', jp: 'エピック' },
  { id: 'l', name: 'Legendär', jp: 'レジェンド' },
];
const RARITY_OF_RANK = { E: 'n', D: 'n', C: 's', B: 's', A: 'e', S: 'l', SS: 'l', SSS: 'l' };
export const itemRank = (item) => rankOf(Math.max(1, item?.lv || 1));
export const rarityOf = (item) => RARITIES.find((r) => r.id === RARITY_OF_RANK[itemRank(item)]) || RARITIES[0];
export const rarityIndex = (item) => RARITIES.indexOf(rarityOf(item));
// Höchste Seltenheit einer Liste.
export const topRarity = (items) => RARITIES[Math.max(0, ...items.map(rarityIndex))];
// Ab Episch bewegt sich etwas.
export const animated = (item) => rarityIndex(item) >= 2;

export const rankChip = (rankId) => `<span class="rchip rank-${esc(rankId)}" aria-hidden="true">${esc(rankId)}</span>`;

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

export const ownedItems = (state, level) => ITEMS.filter((it) => owned(state, level, it));

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

// ---------- Formen der Rahmen ----------
const pts = (list) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
function hexList(cx, cy, r) {
  const out = [];
  for (let i = 0; i < 6; i++) {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}
const hexPts = (cx, cy, r) => pts(hexList(cx, cy, r));
// Regelmäßiges Achteck mit flacher Oberkante.
function octList(cx, cy, r) {
  const out = [];
  for (let i = 0; i < 8; i++) {
    const a = ((-112.5 + i * 45) * Math.PI) / 180;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}
const octPts = (cx, cy, r) => pts(octList(cx, cy, r));
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
const SHIELD = 'M14 8H86V46C86 71 69 86 50 96C31 86 14 71 14 46Z';

// Hauptform als Sechseck: Mittelpunkt und Radius, daraus Umriss und Rechteck fürs Profilbild.
const hexMain = (cx, cy, r) => ({ poly: hexPts(cx, cy, r), box: [cx - r * 0.866, cy - r, r * 1.732, r * 2] });

// deco: hinter der Hauptform, main: Hauptform (Abzeichen und Profilbild), over: Linien darüber.
// cy: Mitte der Hauptform in Prozent (für den Buchstaben), fs: Schriftgröße relativ.
const FRAMES = {
  hex: { cy: 50, fs: 1, main: hexMain(50, 50, 45) },
  double: { cy: 50, fs: 0.92, deco: () => `<polygon class="f-line" points="${hexPts(50, 50, 49)}"/>`, main: hexMain(50, 50, 40) },
  star: { cy: 50, fs: 0.88, deco: () => `<polygon class="f-soft" points="${starPts(50, 50, 50, 40, 12)}"/>`, main: hexMain(50, 50, 37) },
  crystal: {
    cy: 50, fs: 0.88,
    deco: () => `<polygon class="f-soft" points="50,0 86,17 99,50 86,83 50,100 14,83 1,50 14,17"/>
      <path class="f-line" d="M50 0 50 13M99 50 82 50M50 100 50 87M1 50 18 50M86 17 75 28M86 83 75 72M14 83 25 72M14 17 25 28"/>
      `,
    main: hexMain(50, 50, 37),
    // Dunkel und Hell: Achteck um das runde Bild, mit Steinen an den Ecken, ohne Linien ins Bild.
    calm: { deco: () => `<polygon class="f-soft" points="${octPts(50, 50, 49)}"/>${octList(50, 50, 49).map(([x, y]) => `<circle class="f-fill" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/>`).join('')}` },
  },
  crest: {
    cy: 47, fs: 0.92,
    main: { path: SHIELD, box: [14, 8, 72, 88] },
    over: () => '<path class="f-line" d="M23 17H77V46C77 64 65 77 50 86C35 77 23 64 23 46Z"/>',
    // Dunkel und Hell: das runde Bild sitzt im Wappen, die Spitze schaut unten heraus.
    calm: { cy: 42, r: 26, deco: () => `<path class="f-soft" d="${SHIELD}"/>` },
  },
  wings: {
    cy: 52, fs: 0.78,
    deco: () => `<path class="f-fill" d="${WING}"/><path class="f-fill" transform="matrix(-1 0 0 1 100 0)" d="${WING}"/>`,
    main: hexMain(50, 52, 31),
  },
  crown: {
    cy: 59, fs: 0.78,
    deco: () => '<path class="f-fill" d="M29 31 26 10 38 20 50 4 62 20 74 10 71 31Z"/><circle class="f-fill" cx="26" cy="10" r="3.4"/><circle class="f-fill" cx="50" cy="4" r="3.4"/><circle class="f-fill" cx="74" cy="10" r="3.4"/>',
    main: hexMain(50, 60, 31),
  },
  // Rang SSS (seit 2.11): ein Ring über dem Kopf, mit kurzen Strahlen.
  halo: {
    cy: 60, fs: 0.78,
    deco: () => '<path class="f-line" d="M22 13 15 9M78 13 85 9M36 6 34 1M64 6 66 1"/><path class="f-fill" fill-rule="evenodd" d="M50 4C66 4 79 8.5 79 14S66 24 50 24 21 19.5 21 14 34 4 50 4ZM50 9C37 9 27.5 11.3 27.5 14S37 19 50 19 72.5 16.7 72.5 14 63 9 50 9Z"/>',
    main: hexMain(50, 61, 31),
  },
};
const frameOf = (id) => FRAMES[id] || FRAMES.hex;
const mainShape = (m, cls, extra = '') => (m.poly ? `<polygon class="${cls}" points="${m.poly}"${extra}/>` : `<path class="${cls}" d="${m.path}"${extra}/>`);
const frameSvg = (f) => `${f.deco ? f.deco() : ''}${mainShape(f.main, 'f-main')}${f.over ? f.over() : ''}`;

// Glanz über der Hauptform für epische und legendäre Rahmen, in der SVG genau auf die Form zugeschnitten.
// clipId: vorhandener Zuschnitt (Profilbild), sonst wird einer angelegt.
let fxN = 0;
function frameSheen(f, frameId, clipId = '') {
  const it = itemOf('frame', frameId);
  if (!it || !animated(it)) return '';
  const id = ++fxN;
  const clip = clipId || `fxc${id}`;
  return `<defs>${clipId ? '' : `<clipPath id="${clip}">${mainShape(f.main, '')}</clipPath>`}<linearGradient id="fxg${id}"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><g clip-path="url(#${clip})"><g transform="skewX(-16)"><rect class="f-sheen" x="-60" y="-10" width="30" height="120" fill="url(#fxg${id})"/></g></g>`;
}

// Funkelnde Sterne um legendäre Rahmen.
function frameSparks(frameId) {
  const it = itemOf('frame', frameId);
  if (!it || rarityIndex(it) < 3) return '';
  return '<i class="emb-fx" aria-hidden="true"><i class="ef-sp" style="--d:0s;--x:16%;--y:24%"></i><i class="ef-sp" style="--d:.9s;--x:84%;--y:30%"></i><i class="ef-sp" style="--d:1.7s;--x:72%;--y:86%"></i><i class="ef-sp" style="--d:2.4s;--x:22%;--y:80%"></i></i>';
}

// ---------- Rang-Abzeichen mit Rahmen ----------
// fx: Glanz und Funkeln bei epischen und legendären Rahmen (für große Abzeichen).
// Abzeichen mit Glanz bleiben beim Neuzeichnen stehen (data-persist), damit der Glanz nicht neu startet.
export function emblem(rankId, frameId = 'hex', size = 60, cls = '', { fx = false } = {}) {
  // Dunkel und Hell: flaches Abzeichen ohne Glanz und Funkeln.
  if (isCalm()) fx = false;
  const f = frameOf(frameId);
  const r = rankById(rankId);
  const keep = fx ? ` data-persist="emb-${hashStr([r.id, frameId, size, cls].join('|'))}"` : '';
  return `<span class="emb rank-${esc(r.id)} ${r.id.length > 2 ? 'emb-wide emb-wide3' : r.id.length > 1 ? 'emb-wide' : ''} ${cls}" style="--es:${size}px;--cy:${f.cy};--fs:${f.fs}" aria-hidden="true"${keep}>${fx ? frameSparks(frameId) : ''}<svg viewBox="0 0 100 100">${frameSvg(f)}${fx ? frameSheen(f, frameId) : ''}</svg><b>${esc(r.id)}</b></span>`;
}

// Nur der Rahmen, ohne Buchstaben (für kleine Vorschauen).
export const frameIcon = (frameId, size = 26) => {
  const f = frameOf(frameId);
  return `<span class="emb emb-icon" style="--es:${size}px;--cy:${f.cy};--fs:${f.fs}" aria-hidden="true"><svg viewBox="0 0 100 100">${frameSvg(f)}</svg></span>`;
};

// ---------- Profilbild im Rahmen ----------
// size: Breite und Höhe des Bildes. Verzierungen wie Flügel und Krone ragen darüber hinaus.
// img: Adresse des Profilbilds oder leer, dann steht der Anfangsbuchstabe drin.
// effect: Effekt aus dem Rang-Pfad, der hinter und vor dem Bild liegt.
let clipN = 0;
export function avatar({ frameId = 'hex', rankId = 'E', img = '', initial = '', size = 96, deco = true, cls = '', effect = 'none' } = {}) {
  if (isCalm()) return calmAvatar({ frameId, rankId, img, initial, size, deco, cls, effect });
  const f = frameOf(frameId);
  const [bx, by, bw, bh] = f.main.box;
  const s = size / bh;
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const w = 100 * s;
  const left = size / 2 - cx * s;
  const top = size / 2 - cy * s;
  const id = `avc${++clipN}`;
  // Ohne Foto: mit japanischen Zeichen der erste Buchstabe oder 筋, sonst die Initialen.
  const ini = jpOn() ? [...String(initial || '').trim()][0] || '筋' : initialsOf(initial);
  const jp = isJp(ini);
  const fx = effectParts(effect);
  const frameIt = itemOf('frame', frameId);
  const keep = hashStr([frameId, rankId, img, ini, size, deco ? 1 : 0, cls, effect, themeId()].join('|'));
  return `<span class="av rank-${esc(rankId)} fr-${frameIt ? rarityOf(frameIt).id : 'n'} ${cls}" style="--av:${size}px" aria-hidden="true" data-persist="av-${keep}">${fx.back}
    <svg class="av-svg" viewBox="0 0 100 100" style="width:${w.toFixed(1)}px;height:${w.toFixed(1)}px;left:${left.toFixed(1)}px;top:${top.toFixed(1)}px">
      <defs><clipPath id="${id}">${mainShape(f.main, '')}</clipPath></defs>
      ${deco && f.deco ? f.deco() : ''}
      <g clip-path="url(#${id})">
        <rect class="av-base" x="${bx}" y="${by}" width="${bw}" height="${bh}"/>
        <rect class="av-tint" x="${bx}" y="${by}" width="${bw}" height="${bh}"/>
        ${img ? `<image href="${esc(img)}" x="${bx}" y="${by}" width="${bw}" height="${bh}" preserveAspectRatio="xMidYMid slice"/>` : ''}
      </g>
      ${mainShape(f.main, 'f-edge')}${f.over ? f.over() : ''}${deco ? frameSheen(f, frameId, id) : ''}
    </svg>${img ? '' : ini ? `<b class="av-ini ${jp ? 'jp' : ''} ${ini.length > 1 ? 'av-two' : ''}">${esc(ini)}</b>` : `<b class="av-ini av-none">${icon('user')}</b>`}${deco ? frameSparks(frameId) : ''}${fx.front}</span>`;
}

// Profilbild in Dunkel und Hell: rund, mit einem Ring in der Akzentfarbe. Verzierungen des Rahmens (Flügel, Krone,
// Stern) liegen flach dahinter, ohne Leuchten. Effekte bleiben, sie sind Belohnungen.
function calmAvatar({ frameId, rankId, img, initial, size, deco, cls, effect }) {
  const f = frameOf(frameId);
  const id = `avc${++clipN}`;
  const ini = initialsOf(initial);
  const fx = effectParts(effect);
  const frameIt = itemOf('frame', frameId);
  // Eigene Lage des runden Bildes und eigene Verzierung für Dunkel und Hell, wenn der Rahmen sie hat.
  const c = f.calm || {};
  const [bx, by, bw, bh0] = f.main.box;
  const cx = bx + bw / 2;
  const cy = c.cy ?? by + bh0 / 2;
  const r = c.r ?? bh0 / 2;
  const bh = r * 2;
  const s = size / bh;
  const w = 100 * s;
  const left = size / 2 - cx * s;
  const top = size / 2 - cy * s;
  const keep = hashStr([frameId, rankId, img, ini, size, deco ? 1 : 0, cls, effect, themeId()].join('|'));
  // Ring mit etwas Abstand zum Bild, in Pixeln gerechnet (das Bild ist size groß).
  const gap = Math.max(2, size * 0.035) / s;
  return `<span class="av av-calm rank-${esc(rankId)} fr-${frameIt ? rarityOf(frameIt).id : 'n'} ${cls}" style="--av:${size}px" aria-hidden="true" data-persist="av-${keep}">${fx.back}
    <svg class="av-svg" viewBox="0 0 100 100" style="width:${w.toFixed(1)}px;height:${w.toFixed(1)}px;left:${left.toFixed(1)}px;top:${top.toFixed(1)}px">
      <defs><clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
      ${deco && frameId !== 'double' ? (c.deco || f.deco)?.() || '' : ''}
      <circle class="av-base" cx="${cx}" cy="${cy}" r="${r}"/>
      ${img ? `<g clip-path="url(#${id})"><image href="${esc(img)}" x="${cx - r}" y="${cy - r}" width="${bh}" height="${bh}" preserveAspectRatio="xMidYMid slice"/></g>` : ''}
      ${deco ? `<circle class="av-ring" cx="${cx}" cy="${cy}" r="${(r + gap).toFixed(2)}"/>` : ''}
      ${deco && frameId === 'double' ? `<circle class="av-ring2" cx="${cx}" cy="${cy}" r="${(r + gap * 2.6).toFixed(2)}"/>` : ''}
    </svg>${img ? '' : ini ? `<b class="av-ini ${ini.length > 1 ? 'av-two' : ''}">${esc(ini)}</b>` : `<b class="av-ini av-none">${icon('user')}</b>`}${fx.front}</span>`;
}

const accentStyle = (item) => (item.hex ? `--sw:${isCalm() ? calmAccent(item.id) : item.hex}` : '');

const EFFECT_ICONS = {
  none: 'x', glitzer: 'sparkle', ring: 'target', manga: 'bolt', funken: 'sparkle', blitze: 'bolt', flammen: 'flame', sterne: 'star',
  schimmer: 'sparkle', puls: 'activity', kreide: 'dumbbell', orbit: 'orbit', welle: 'waves', aura: 'sun', nova: 'star',
};

// Kleine Vorschau einer Belohnung (Inhalt der Kugel).
export function itemOrb(item) {
  if (item.type === 'color') return `<span class="orb-sw" style="${accentStyle(item)}"></span>`;
  if (item.type === 'title') return icon('tag', 'orb-ic');
  if (item.type === 'frame') return frameIcon(item.id, 30);
  if (item.type === 'banner') return `<span class="orb-bn">${bannerArt(item.id)}</span>`;
  if (item.type === 'effect') return icon(isCalm() && item.id === 'none' ? 'none' : EFFECT_ICONS[item.id] || 'sparkle', 'orb-ic');
  return isJp(item.name) ? `<span class="orb-jp">${esc(item.name.slice(0, 1))}</span>` : `<span class="orb-word">${esc(item.name.slice(0, 1))}</span>`;
}

// Verzierung je nach Seltenheit: Ring (selten), drehender Ring (episch), Flammen und Funken (legendär).
function rarityDeco(r) {
  if (r === 's') return '<i class="rr" aria-hidden="true"></i>';
  if (r === 'e') return '<i class="rr" aria-hidden="true"></i><i class="rr-spin" aria-hidden="true"></i>';
  if (r === 'l') return '<i class="rr" aria-hidden="true"></i><i class="rr-flame" aria-hidden="true"><b></b><b></b><b></b><b></b><b></b></i><i class="rr-sp" aria-hidden="true"><b></b><b></b><b></b></i>';
  return '';
}

// Kugel mit Seltenheit und Rang-Kennzeichen (Pfad, Look, Sammlung, Belohnungen).
export function rewardOrb(item, { chip = true, cls = '' } = {}) {
  const r = rarityOf(item).id;
  return `<span class="orb rar-${r} orb-${item.type} ${cls}">${rarityDeco(r)}${itemOrb(item)}${chip ? rankChip(itemRank(item)) : ''}</span>`;
}

// Große Vorschau im Belohnungs-Fenster.
// me: { img, initial, frameId } für Effekte, damit man sie gleich am eigenen Profilbild sieht.
export function itemShowcase(item, rankId, me = {}) {
  const r = rarityOf(item).id;
  const wrap = (cls, inner) => `<div class="show ${cls} rar-${r}">${r === 'n' ? '' : '<i class="show-glow" aria-hidden="true"></i>'}${inner}</div>`;
  if (item.type === 'color') return wrap('show-color', `<span style="${accentStyle(item)}"></span>`);
  if (item.type === 'title') return wrap('show-title', `<span class="tt tt-${r}">${esc(item.name)}</span>`);
  if (item.type === 'frame') return wrap('show-frame', emblem(rankId, item.id, 92, '', { fx: true }));
  if (item.type === 'banner') return wrap('show-banner', `<span class="show-bn">${bannerArt(item.id)}</span>`);
  if (item.type === 'effect') {
    const card = effectParts(item.id).card;
    return wrap('show-effect', `${card}${avatar({ frameId: me.frameId || 'hex', rankId, img: me.img || '', initial: me.initial || '', size: 70, effect: item.id })}`);
  }
  return wrap('show-sign', `<span class="sg sg-${r} ${isJp(item.name) ? '' : 'sg-word'}">${esc(item.name)}</span>`);
}

// Legendäre Neon-Schilder sprühen Funken.
export const signSparks = (item) => (rarityOf(item).id === 'l' && !isCalm() ? '<i class="sg-sparks" aria-hidden="true"><b></b><b></b><b></b><b></b><b></b></i>' : '');

export const itemLabel = (item) => (item.type === 'sign' && item.de ? `${item.name} (${item.de})` : item.name);
export const rankColor = (id) => rankById(id).color;
