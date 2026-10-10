// Belohnungen im Rang-Pfad: Neon-Farben, Titel, Rahmen, Neon-Schilder, Banner und Effekte.
// Jede Station im Pfad hat ein Level. Ist es erreicht, kann man die Belohnung abholen und anlegen.
// Die Seltenheit ergibt sich aus dem Rang der Station: je höher der Rang, desto besonderer.
import { esc, icon, hashStr } from './util.js';
import { RANKS, rankById, rankOf } from './stats.js';
import { bannerArt, effectParts } from './art.js';

export const TYPES = {
  color: { name: 'Neon-Farbe', plural: 'Neon-Farben' },
  title: { name: 'Titel', plural: 'Titel' },
  frame: { name: 'Rahmen', plural: 'Rahmen' },
  sign: { name: 'Neon-Schild', plural: 'Neon-Schilder' },
  banner: { name: 'Banner', plural: 'Banner' },
  effect: { name: 'Effekt', plural: 'Effekte' },
};
export const TYPE_ORDER = ['color', 'title', 'frame', 'sign', 'banner', 'effect'];
// Diese Typen färben die ganze App, Banner und Effekt gehören nur zum Profil.
export const APP_TYPES = ['color', 'title', 'frame', 'sign'];

// lv 1 = von Anfang an da. Ränge schalten immer einen neuen Rahmen frei.
export const ITEMS = [
  { type: 'color', id: 'pink', name: 'Neon Pink', hex: '#FF4FA3', lv: 1 },
  { type: 'title', id: 'rookie', name: 'Rookie', lv: 1 },
  { type: 'frame', id: 'hex', name: 'Hexagon', lv: 1 },
  { type: 'sign', id: 'kintore', name: '筋トレ', de: 'Krafttraining', lv: 1 },
  { type: 'banner', id: 'nacht', name: 'Nachtlicht', lv: 1 },
  { type: 'effect', id: 'none', name: 'Kein Effekt', lv: 1 },
  { type: 'title', id: 'stammgast', name: 'Stammgast', lv: 2 },
  { type: 'banner', id: 'raster', name: 'Neon-Raster', lv: 3 },
  { type: 'color', id: 'eis', name: 'Eisblau', hex: '#58B8FF', lv: 4 },
  { type: 'effect', id: 'glitzer', name: 'Glitzer', lv: 5 },
  { type: 'frame', id: 'double', name: 'Doppelt', lv: 6 },
  { type: 'title', id: 'grinder', name: 'Grinder', lv: 8 },
  { type: 'banner', id: 'skyline', name: 'Skyline', lv: 9 },
  { type: 'sign', id: 'konjo', name: '根性', de: 'Biss', lv: 10 },
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
  { type: 'sign', id: 'tanren', name: '鍛錬', de: 'Disziplin', lv: 26 },
  { type: 'banner', id: 'himmelslicht', name: 'Himmelslicht', lv: 28 },
  { type: 'color', id: 'sunset', name: 'Sunset', hex: '#FF7A45', lv: 29 },
  { type: 'title', id: 'stahlwille', name: 'Stahlwille', lv: 32 },
  { type: 'banner', id: 'finsternis', name: 'Finsternis', lv: 33 },
  { type: 'frame', id: 'crest', name: 'Wappen', lv: 35 },
  { type: 'banner', id: 'regen', name: 'Neon-Regen', lv: 37 },
  { type: 'title', id: 'ronin', name: 'Gym-Ronin', lv: 39 },
  { type: 'banner', id: 'auge', name: 'Das Auge', lv: 40 },
  { type: 'effect', id: 'funken', name: 'Funken', lv: 41 },
  { type: 'sign', id: 'fukutsu', name: '不屈', de: 'Unbeugsam', lv: 43 },
  { type: 'banner', id: 'aurora', name: 'Polarlicht', lv: 45 },
  { type: 'color', id: 'crimson', name: 'Crimson', hex: '#FF3358', lv: 47 },
  { type: 'banner', id: 'unterwelt', name: 'Unterwelt', lv: 48 },
  { type: 'effect', id: 'blitze', name: 'Blitze', lv: 49 },
  { type: 'frame', id: 'wings', name: 'Flügel', lv: 50 },
  { type: 'effect', id: 'flammen', name: 'Neon-Flammen', lv: 52 },
  { type: 'title', id: 'sensei', name: 'Sensei', lv: 54 },
  { type: 'banner', id: 'inferno', name: 'Inferno', lv: 56 },
  { type: 'sign', id: 'kakusei', name: '覚醒', de: 'Erwachen', lv: 58 },
  { type: 'banner', id: 'horizont', name: 'Schwarzes Loch', lv: 60 },
  { type: 'title', id: 'titan', name: 'Titan', lv: 62 },
  { type: 'effect', id: 'sterne', name: 'Sternenregen', lv: 64 },
  { type: 'banner', id: 'feuersturm', name: 'Feuersturm', lv: 65 },
  { type: 'color', id: 'gold', name: 'Gold', hex: '#FFC93D', lv: 66 },
  { type: 'banner', id: 'kosmos', name: 'Kosmos', lv: 68 },
  { type: 'frame', id: 'crown', name: 'Krone', lv: 70 },
  { type: 'title', id: 'endgegner', name: 'Endgegner', lv: 70 },
  { type: 'sign', id: 'genkai', name: '限界突破', de: 'Grenzen sprengen', lv: 70 },
];

export const DEFAULT_LOOK = { color: 'pink', title: 'rookie', frame: 'hex', sign: 'kintore', banner: 'nacht', effect: 'none' };
export const itemOf = (type, id) => ITEMS.find((x) => x.type === type && x.id === id) || null;

// ---------- Seltenheit ----------
export const RARITIES = [
  { id: 'n', name: 'Normal', jp: 'ノーマル' },
  { id: 's', name: 'Selten', jp: 'レア' },
  { id: 'e', name: 'Episch', jp: 'エピック' },
  { id: 'l', name: 'Legendär', jp: 'レジェンド' },
];
const RARITY_OF_RANK = { E: 'n', D: 'n', C: 's', B: 's', A: 'e', S: 'l', SS: 'l' };
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
  },
  crest: {
    cy: 47, fs: 0.92,
    main: { path: SHIELD, box: [14, 8, 72, 88] },
    over: () => '<path class="f-line" d="M23 17H77V46C77 64 65 77 50 86C35 77 23 64 23 46Z"/>',
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
  const f = frameOf(frameId);
  const r = rankById(rankId);
  const keep = fx ? ` data-persist="emb-${hashStr([r.id, frameId, size, cls].join('|'))}"` : '';
  return `<span class="emb rank-${esc(r.id)} ${r.id.length > 1 ? 'emb-wide' : ''} ${cls}" style="--es:${size}px;--cy:${f.cy};--fs:${f.fs}" aria-hidden="true"${keep}>${fx ? frameSparks(frameId) : ''}<svg viewBox="0 0 100 100">${frameSvg(f)}${fx ? frameSheen(f, frameId) : ''}</svg><b>${esc(r.id)}</b></span>`;
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
  const f = frameOf(frameId);
  const [bx, by, bw, bh] = f.main.box;
  const s = size / bh;
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const w = 100 * s;
  const left = size / 2 - cx * s;
  const top = size / 2 - cy * s;
  const id = `avc${++clipN}`;
  const ini = [...String(initial || '').trim()][0] || '筋';
  const jp = /[\u3000-\u9fff]/.test(ini);
  const fx = effectParts(effect);
  const frameIt = itemOf('frame', frameId);
  const keep = hashStr([frameId, rankId, img, ini, size, deco ? 1 : 0, cls, effect].join('|'));
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
    </svg>${img ? '' : `<b class="av-ini ${jp ? 'jp' : ''}">${esc(ini)}</b>`}${deco ? frameSparks(frameId) : ''}${fx.front}</span>`;
}

const accentStyle = (item) => (item.hex ? `--sw:${item.hex}` : '');

const EFFECT_ICONS = { none: 'x', glitzer: 'sparkle', ring: 'target', manga: 'bolt', funken: 'sparkle', blitze: 'bolt', flammen: 'flame', sterne: 'star' };

// Kleine Vorschau einer Belohnung (Inhalt der Kugel).
export function itemOrb(item) {
  if (item.type === 'color') return `<span class="orb-sw" style="${accentStyle(item)}"></span>`;
  if (item.type === 'title') return icon('tag', 'orb-ic');
  if (item.type === 'frame') return frameIcon(item.id, 30);
  if (item.type === 'banner') return `<span class="orb-bn">${bannerArt(item.id)}</span>`;
  if (item.type === 'effect') return icon(EFFECT_ICONS[item.id] || 'sparkle', 'orb-ic');
  return `<span class="orb-jp">${esc(item.name.slice(0, 1))}</span>`;
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
  return wrap('show-sign', `<span class="sg sg-${r}">${esc(item.name)}</span>`);
}

// Legendäre Neon-Schilder sprühen Funken.
export const signSparks = (item) => (rarityOf(item).id === 'l' ? '<i class="sg-sparks" aria-hidden="true"><b></b><b></b><b></b><b></b><b></b></i>' : '');

export const itemLabel = (item) => (item.type === 'sign' ? `${item.name} (${item.de})` : item.name);
export const rankColor = (id) => rankById(id).color;
