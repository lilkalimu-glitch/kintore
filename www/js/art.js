// Bilder fürs Profil: Banner und Effekte, nur mit SVG und CSS gezeichnet.
// Die dunklen Banner nach den Vorlagen des Besitzers (Version 2.7) stehen in banners.js.
// Ab Episch bewegen sie sich. Bewegte Teile nutzen nur transform und opacity, damit es auf dem Handy flüssig bleibt.
// Ohne Bewegung (Android-Einstellung "Animationen entfernen") bleibt ein ruhiges Bild stehen.

// Fester Zufall, damit ein Banner immer gleich aussieht.
import { DARK_BANNERS } from './banners.js';

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const f1 = (n) => Math.round(n * 10) / 10;

// ---------- Banner ----------
function skyline(seed, { far = true, lit = 0.32, h0 = 34, h1 = 92, moon = false } = {}) {
  const r = rng(seed);
  const layer = (minH, maxH, cls, litShare) => {
    let x = -8;
    let rects = '';
    let wins = '';
    while (x < 408) {
      const w = 16 + Math.floor(r() * 30);
      const h = minH + Math.floor(r() * (maxH - minH));
      const y = 150 - h;
      rects += `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
      if (r() < 0.22) rects += `<rect x="${x + Math.floor(w / 2) - 1}" y="${y - 9}" width="2" height="9"/>`;
      if (litShare) {
        for (let wy = y + 6; wy < 144; wy += 8) {
          for (let wx = x + 4; wx < x + w - 5; wx += 7) if (r() < litShare) wins += `<rect x="${wx}" y="${wy}" width="3" height="4" class="w${Math.floor(r() * 3)}"/>`;
        }
      }
      x += w + 1 + Math.floor(r() * 5);
    }
    return `<g class="${cls}">${rects}</g>${wins ? `<g class="sk-w">${wins}</g>` : ''}`;
  };
  return `<svg class="bn-svg" viewBox="0 0 400 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    ${moon ? '<circle class="sk-moon-g" cx="318" cy="40" r="34"/><circle class="sk-moon" cx="318" cy="40" r="17"/>' : ''}
    ${far ? layer(h0 + 20, h1 + 20, 'sk-far', 0) : ''}${layer(h0, h1, 'sk-near', lit)}
  </svg>`;
}

function starsSvg(seed, n, { h = 150, maxR = 1.3 } = {}) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) out += `<circle cx="${f1(r() * 400)}" cy="${f1(r() * h)}" r="${f1(0.3 + r() * maxR)}" opacity="${f1(0.3 + r() * 0.7)}"/>`;
  return `<svg class="bn-svg bn-stars" viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${out}</svg>`;
}

const PETAL = 'M0 0C-3.6 -2.6 -3.8 -8 0 -10.5C3.8 -8 3.6 -2.6 0 0Z';
function flower(x, y, s, rot = 0) {
  let p = '';
  for (let i = 0; i < 5; i++) p += `<path d="${PETAL}" transform="rotate(${i * 72})"/>`;
  return `<g class="sa-fl" transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${p}<circle r="2.1" class="sa-core"/></g>`;
}

function sakura() {
  const r = rng(17);
  let flowers = '';
  const spots = [[62, 28], [96, 38], [128, 52], [150, 47], [176, 70], [204, 80], [228, 92], [254, 110], [112, 24], [188, 58], [40, 22], [238, 104]];
  for (const [x, y] of spots) flowers += flower(x, y, 0.75 + r() * 0.5, Math.floor(r() * 72));
  let petals = '';
  for (let i = 0; i < 16; i++) {
    const x = f1(r() * 400);
    const y = f1(20 + r() * 125);
    petals += `<ellipse class="sa-pt" cx="${x}" cy="${y}" rx="${f1(2 + r() * 2)}" ry="${f1(1 + r() * 1.2)}" transform="rotate(${Math.floor(r() * 180)} ${x} ${y})"/>`;
  }
  return `<svg class="bn-svg" viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <circle class="sa-moon-g" cx="320" cy="56" r="52"/><circle class="sa-moon" cx="320" cy="56" r="30"/>
    <path class="sa-br" d="M-10 14C40 18 80 26 118 40S182 64 214 86 250 112 268 134"/>
    <path class="sa-br thin" d="M118 40C122 26 132 16 146 10M176 66C186 56 200 52 214 52M214 86C208 100 210 112 218 122M80 26C88 16 100 12 112 12"/>
    ${flowers}<g class="sa-pts">${petals}</g>
  </svg>`;
}

function synthwave() {
  let grid = '';
  for (let i = 1; i <= 7; i++) {
    const y = 96 + 54 * Math.pow(i / 7, 1.8);
    grid += `<line x1="0" y1="${f1(y)}" x2="400" y2="${f1(y)}"/>`;
  }
  for (let k = -9; k <= 9; k++) grid += `<line x1="${200 + k * 14}" y1="96" x2="${200 + k * 70}" y2="150"/>`;
  return `<i class="sw-sun" aria-hidden="true"></i>
    <svg class="bn-svg" viewBox="0 0 400 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <polygon class="sw-mt" points="0,96 30,70 58,84 92,52 128,80 150,72 172,96"/>
      <polygon class="sw-mt" points="236,96 262,76 286,86 318,58 352,82 376,70 400,84 400,96"/>
      <path class="sw-mt-l" d="M92 52 104 70 98 96M318 58 330 76 322 96M30 70 40 84"/>
      <rect class="sw-floor" x="0" y="96" width="400" height="54"/>
      <g class="sw-grid">${grid}</g>
    </svg>`;
}

function rainSvg(seed, n, len) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = r() * 404;
    const y = r() * 150;
    const l = len * (0.6 + r() * 0.8);
    out += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x - l * 0.18)}" y2="${f1(y + l)}"/><line x1="${f1(x)}" y1="${f1(y + 150)}" x2="${f1(x - l * 0.18)}" y2="${f1(y + 150 + l)}"/>`;
  }
  return `<svg viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">${out}</svg>`;
}

function mountains() {
  return `<svg class="bn-svg" viewBox="0 0 400 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <polygon class="mt-far" points="0,150 0,112 40,94 74,108 118,82 160,104 204,88 246,106 290,80 336,100 372,90 400,98 400,150"/>
    <polygon class="mt-near" points="0,150 0,128 36,118 70,130 112,112 150,126 196,116 236,132 278,114 318,128 360,118 400,126 400,150"/>
  </svg>`;
}

// Reihe aus Flammenzungen (Inferno-Banner und legendäre Belohnungen).
export function fireRow(n, seed) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) / n * 100 + (r() - 0.5) * 6;
    const w = 26 + r() * 30;
    const h = 52 + r() * 58;
    out += `<i class="fl" style="left:${f1(x)}%;--w:${f1(w)}px;--h:${f1(h)}px;--t:${f1(0.7 + r() * 0.7)}s;--d:-${f1(r() * 2)}s"></i>`;
  }
  return out;
}

function embers(n, seed, cls = 'em') {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    out += `<i class="${cls}" style="left:${f1(4 + r() * 92)}%;--k:${f1(0.15 + r() * 0.7)};--dx:${f1((r() - 0.5) * 40)}px;--t:${f1(2.2 + r() * 2.2)}s;--d:-${f1(r() * 4)}s"></i>`;
  }
  return out;
}

const BANNERS = {
  nacht: () => '<i class="bn-dots"></i>',
  raster: () => '<i class="rs-floor"></i><i class="rs-horizon"></i><i class="bn-dots top"></i>',
  skyline: () => `${skyline(9, { moon: true })}<i class="bn-haze"></i>`,
  sakura: () => sakura(),
  synthwave: () => synthwave(),
  regen: () => `${skyline(37, { lit: 0.22, far: true })}<i class="rn rn-far">${rainSvg(5, 46, 14)}</i><i class="rn rn-near">${rainSvg(11, 26, 24)}</i><i class="bn-haze"></i>`,
  aurora: () => `${starsSvg(45, 46, { h: 110 })}<i class="au au1"></i><i class="au au2"></i><i class="au au3"></i>${mountains()}`,
  inferno: () => `<i class="if-glow"></i>${fireRow(13, 56)}<i class="if-front">${fireRow(9, 57)}</i>${embers(14, 58)}`,
  kosmos: () => `${starsSvg(68, 70)}<i class="gx"><i class="gx-disk"></i><i class="gx-core"></i></i>${twinkles(6, 69)}<i class="ss" style="--d:-1s;--y:18%"></i><i class="ss" style="--d:-4.6s;--y:42%"></i>`,
  ...DARK_BANNERS,
};

export function bannerArt(id) {
  const fn = BANNERS[id] || BANNERS.nacht;
  return `<div class="bn bn-${BANNERS[id] ? id : 'nacht'}" aria-hidden="true">${fn()}</div>`;
}

// ---------- Effekte ums Profilbild ----------
function twinkles(n, seed) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) out += `<i class="tw" style="left:${f1(6 + r() * 88)}%;top:${f1(6 + r() * 80)}%;--s:${f1(6 + r() * 8)}px;--d:-${f1(r() * 3)}s"></i>`;
  return out;
}

function glints() {
  const spots = [[8, 30, 13], [90, 22, 10], [96, 66, 8], [14, 80, 9], [74, 4, 7], [30, 2, 6]];
  return spots.map(([x, y, s]) => `<i class="gl" style="left:${x}%;top:${y}%;--s:${s}px"></i>`).join('');
}

function speedLines() {
  let lines = '';
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2 + (i % 3) * 0.03;
    const r0 = 34 + ((i * 7) % 9);
    const r1 = 100;
    lines += `<line x1="${f1(100 + Math.cos(a) * r0)}" y1="${f1(100 + Math.sin(a) * r0)}" x2="${f1(100 + Math.cos(a) * r1)}" y2="${f1(100 + Math.sin(a) * r1)}" stroke-width="${f1(0.6 + ((i * 5) % 4) * 0.45)}"/>`;
  }
  return `<svg viewBox="0 0 200 200" aria-hidden="true">${lines}</svg>`;
}

function bolts() {
  const one = (pts) => `<svg viewBox="0 0 40 100" aria-hidden="true"><polyline class="bz-g" points="${pts}"/><polyline class="bz-c" points="${pts}"/></svg>`;
  const a = '22,0 12,38 24,42 10,100';
  const b = '18,0 28,30 14,46 26,58 16,100';
  // Blitze schlagen seitlich und nach oben aus, nicht nach unten über den Namen.
  return `<i class="bz" style="--r:100deg;--d:-0.2s">${one(a)}</i><i class="bz" style="--r:-104deg;--d:-1.5s">${one(b)}</i><i class="bz" style="--r:150deg;--d:-2.3s">${one(a)}</i><i class="bz" style="--r:-146deg;--d:-0.9s">${one(b)}</i><i class="bz-glow"></i>`;
}

function flameRing() {
  // Zungen hinter dem Bild, die an den Seiten und oben herausschlagen. [x, unten, Breite, Höhe] in Prozent.
  const spots = [[8, 4, 18, 46], [19, 2, 20, 62], [30, 0, 22, 80], [42, 0, 24, 94], [58, 0, 24, 98], [70, 0, 22, 82], [81, 2, 20, 64], [92, 4, 18, 48]];
  return spots.map(([x, b, w, h], i) => `<i class="ft" style="left:${x}%;bottom:${b}%;--w:${w}%;--h:${h}%;--t:${f1(0.75 + (i % 4) * 0.16)}s;--d:-${f1((i * 0.37) % 1.4)}s"></i>`).join('');
}

// ---------- Effekte über die ganze Profilkarte (seit 2.7) ----------
// Sie liegen hinter Name und Text, damit alles lesbar bleibt. Mittelpunkt ist das Profilbild (--ax, --ay).
function cardGlints() {
  const spots = [[8, 10, 13], [31, 5, 9], [52, 16, 15], [77, 8, 10], [93, 27, 12], [89, 57, 9], [66, 71, 13], [10, 63, 10], [40, 88, 9], [83, 91, 12], [24, 38, 8], [58, 46, 8]];
  return spots.map(([x, y, sz], i) => `<i class="cg" style="left:${x}%;top:${y}%;--s:${sz}px;--d:-${f1(i * 0.41)}s"></i>`).join('');
}

function cardLines() {
  let lines = '';
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + (i % 3) * 0.02;
    const r0 = 74 + ((i * 13) % 34);
    lines += `<line x1="${f1(Math.cos(a) * r0)}" y1="${f1(Math.sin(a) * r0)}" x2="${f1(Math.cos(a) * 900)}" y2="${f1(Math.sin(a) * 900)}" stroke-width="${f1(0.6 + ((i * 7) % 4) * 0.55)}"/>`;
  }
  return `<svg class="cl" viewBox="-900 -900 1800 1800" aria-hidden="true">${lines}</svg>`;
}

function cardBolts() {
  const one = (pts) => `<svg viewBox="0 0 40 100" aria-hidden="true"><polyline class="bz-g" points="${pts}"/><polyline class="bz-c" points="${pts}"/></svg>`;
  return `<i class="cb" style="left:3%;top:22%;--r:-8deg;--d:-0.3s">${one('22,0 12,38 24,42 10,100')}</i><i class="cb" style="left:87%;top:8%;--r:14deg;--d:-1.6s">${one('18,0 28,30 14,46 26,58 16,100')}</i><i class="cb" style="left:90%;top:58%;--r:-18deg;--d:-2.4s">${one('22,0 12,38 24,42 10,100')}</i><i class="cb-edge"></i>`;
}

function cardFlames() {
  const r = rng(152);
  let out = '';
  for (let i = 0; i < 15; i++) {
    const x = (i + 0.5) / 15 * 100 + (r() - 0.5) * 5;
    out += `<i class="cf" style="left:${f1(x)}%;--w:${f1(26 + r() * 26)}px;--h:${f1(46 + r() * 52)}px;--t:${f1(0.8 + r() * 0.7)}s;--d:-${f1(r() * 2)}s"></i>`;
  }
  return `<i class="cf-glow"></i>${out}`;
}

const EFFECTS = {
  none: () => ({}),
  glitzer: () => ({ back: glints(), card: cardGlints() }),
  ring: () => ({ back: '<i class="rg rg1"></i><i class="rg rg2"></i>', card: '<i class="cr" style="--d:0s"></i><i class="cr" style="--d:-1.6s"></i><i class="cr" style="--d:-3.2s"></i>' }),
  manga: () => ({ back: speedLines(), card: cardLines() }),
  funken: () => ({ back: embers(13, 41, 'fs'), front: embers(9, 42, 'fs'), card: embers(16, 43, 'cs') }),
  blitze: () => ({ back: bolts(), card: cardBolts() }),
  flammen: () => ({ back: `<i class="ft-glow"></i>${flameRing()}`, front: embers(7, 52, 'fe'), card: `${cardFlames()}${embers(10, 53, 'cs')}` }),
  sterne: () => ({ back: twinkles(7, 64), card: `${twinkles(9, 65)}<i class="ss" style="--d:-0.4s;--y:12%"></i><i class="ss" style="--d:-2.2s;--y:34%"></i><i class="ss" style="--d:-3.9s;--y:6%"></i><i class="ss" style="--d:-5.1s;--y:48%"></i>` }),
};

// Teile eines Effekts: back (hinter dem Bild), front (davor), card (über der ganzen Profilkarte).
export function effectParts(id) {
  const fn = EFFECTS[id] || EFFECTS.none;
  const p = fn();
  const wrap = (html, cls) => (html ? `<span class="efx ef-${id} ${cls}">${html}</span>` : '');
  return { back: wrap(p.back, 'is-back'), front: wrap(p.front, 'is-front'), card: wrap(p.card, 'is-card') };
}
