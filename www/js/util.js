// Kleine Helfer: Formatierung, Datum, HTML, Icons.
import { isCalm, jpOn } from './theme.js';

export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const nf2 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export const kg = (w) => nf2.format(Math.round((Number(w) || 0) * 100) / 100);
export const num1 = (v) => nf1.format(Number(v) || 0);
export const int = (v) => nf0.format(Math.round(Number(v) || 0));

export const parseNum = (s) => {
  const n = parseFloat(String(s ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

export const round2 = (x) => Math.round(x * 100) / 100;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ---------- Datum (immer lokale Zeit) ----------
const pad = (n) => String(n).padStart(2, '0');
export const isoOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const today = () => isoOf(new Date());
export const parseIso = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (iso, n) => {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
};
export const daysBetween = (a, b) => Math.round((parseIso(b) - parseIso(a)) / 86400000);
// Montag der Woche. Gemerkt, weil es für jeden Trainingstag oft gebraucht wird.
const weekCache = new Map();
export const weekStart = (iso) => {
  let w = weekCache.get(iso);
  if (w) return w;
  const d = parseIso(iso);
  const dow = (d.getDay() + 6) % 7; // Montag = 0
  d.setDate(d.getDate() - dow);
  w = isoOf(d);
  if (weekCache.size > 20000) weekCache.clear();
  weekCache.set(iso, w);
  return w;
};

const dfDay = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
const dfLong = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const dfDate = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
const dfShort = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' });
const dfMonth = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });
const dfMon = new Intl.DateTimeFormat('de-DE', { month: 'short' });

const tidy = (s) => s.replace(/^(\p{L}{2})\.,/u, '$1,').replace(/\.\./g, '.');
export const fmtDay = (iso) => tidy(dfDay.format(parseIso(iso)));
export const fmtLong = (iso) => dfLong.format(parseIso(iso));
export const fmtDate = (iso) => tidy(dfDate.format(parseIso(iso)));
export const fmtShort = (iso) => tidy(dfShort.format(parseIso(iso)));
export const fmtMonth = (iso) => dfMonth.format(parseIso(iso));
export const fmtMon = (iso) => tidy(dfMon.format(parseIso(iso)));

export function relDay(iso) {
  const n = daysBetween(iso, today());
  if (n === 0) return 'heute';
  if (n === 1) return 'gestern';
  if (n > 1 && n < 14) return `vor ${n} Tagen`;
  if (n >= 14 && n < 60) return `vor ${Math.round(n / 7)} Wochen`;
  return fmtDate(iso);
}

export const fmtClock = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
};
export const fmtDuration = (ms) => {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${pad(min % 60)} min`;
};

// ---------- Icons (24er Raster, Linien) ----------
const P = {
  home: 'M3.5 11 12 4l8.5 7M5.5 9.5V20h4.5v-5.5h4V20h4.5V9.5',
  bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6z',
  list: 'M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01',
  calendar: 'M7.5 3v3.5M16.5 3v3.5M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5z',
  scale: 'M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 11a4 4 0 0 1 8 0M12 11l1.6-2.2',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5.5 12h13',
  check: 'M5 12.5 9.5 17 19 7.5',
  x: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  left: 'M15 5.5 8.5 12l6.5 6.5',
  right: 'M9 5.5l6.5 6.5L9 18.5',
  up: 'M6.5 14.5 12 9l5.5 5.5',
  down: 'M6.5 9.5 12 15l5.5-5.5',
  arrowUp: 'M12 19V5.5M6.5 11 12 5.5l5.5 5.5',
  more: 'M5.5 12h.01M12 12h.01M18.5 12h.01',
  timer: 'M12 8.5v4.5l2.8 1.8M9.5 2.5h5M12 4.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
  star: 'M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z',
  trash: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5',
  edit: 'M4.5 19.5h4l10-10-4-4-10 10zM13 7l4 4',
  search: 'M10.5 4.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM19.5 19.5 15 15',
  download: 'M12 4.5v10M7.5 10.5 12 15l4.5-4.5M5 19.5h14',
  upload: 'M12 15V5M7.5 9.5 12 5l4.5 4.5M5 19.5h14',
  image: 'M4.5 5h15v14h-15zM4.5 15.5l4.5-4.5 4 4 2.5-2.5 4 4M15 8.8h.01',
  flame: 'M12 3c.8 3 4.5 5.2 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2.4 1.3-3.7 2.4-4.6.1 2 1 3.1 2.1 3.4C11.5 8.5 11 6 12 3z',
  sparkle: 'M12 3l1.7 5.6L19 10.5l-5.3 1.8L12 18l-1.7-5.7L5 10.5l5.3-1.9z',
  play: 'M8 5.5v13l10.5-6.5z',
  swap: 'M5 8.5h13.5L15 5M19 15.5H5.5L9 19',
  note: 'M6 4h12v16H6zM9 9h6M9 12.5h6M9 16h4',
  file: 'M7 3.5h7l4 4V20.5H7zM14 3.5V8h4',
  layers: 'M12 4 3.5 8.5 12 13l8.5-4.5zM3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5',
  bell: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 20.5h4',
  shield: 'M12 3.5 5 6.2v5.6c0 4.1 2.9 7.4 7 8.7 4.1-1.3 7-4.6 7-8.7V6.2z',
  lock: 'M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5M5.5 10.5h13v10h-13zM12 14.5v2',
  gift: 'M4 8.5h16v4H4zM5.5 12.5v8h13v-8M12 8.5v12M12 8.5C10.5 5.5 7 4.5 6.6 6.4S9.5 8.5 12 8.5c2.5 0 5.8.2 5.4-2.1S13.5 5.5 12 8.5',
  tag: 'M3.8 4.5h7.4l9 9-7.2 7.2-9.2-9zM8.3 9h.01',
  target: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.8a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4zM12 12h.01',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c.9-3.6 3.9-5.8 7.5-5.8s6.6 2.2 7.5 5.8',
  palette: 'M12 3.5a8.5 8.5 0 1 0 0 17c1.1 0 1.7-.7 1.7-1.5 0-1-.8-1.4-.8-2.3 0-.9.7-1.6 1.6-1.6h2.2c2.1 0 3.8-1.7 3.8-3.8 0-4.4-3.8-7.8-8.5-7.8zM7.6 12.2h.01M9.4 8h.01M14.4 7.8h.01',
};

// Symbole für Dunkel und Hell: ein einheitlicher Satz aus Lucide (lucide.dev, Lizenz in LICENSE-Lucide.txt), alle im
// 24er Raster mit gleicher Strichstärke. sign, none und ring sind eigene im selben Stil. Das Design Neon behält die
// eigenen Symbole oben.
const PL = {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  bolt: '<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"/>',
  dumbbell: '<path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"/><path d="m2.5 21.5 1.4-1.4"/><path d="m20.1 3.9 1.4-1.4"/><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"/><path d="m9.6 14.4 4.8-4.8"/>',
  list: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>',
  calendar: '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>',
  scale: '<circle cx="12" cy="5" r="3"/><path d="M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z"/>',
  body: '<circle cx="12" cy="4.5" r="1.5"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/>',
  sliders: '<path d="M10 5H3"/><path d="M12 19H3"/><path d="M14 3v4"/><path d="M16 17v4"/><path d="M21 12h-9"/><path d="M21 19h-5"/><path d="M21 5h-7"/><path d="M8 10v4"/><path d="M8 12H3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  timer: '<path d="M10 2h4"/><path d="m12 14 3-3"/><circle cx="12" cy="14" r="8"/>',
  star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  trophy: '<path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2"/><path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2"/><path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"/>',
  trash: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
  download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
  upload: '<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  flame: '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>',
  sparkle: '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>',
  play: '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>',
  swap: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  note: '<path d="M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><path d="M15 3v5a1 1 0 0 0 1 1h5"/>',
  file: '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/>',
  layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
  bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  gift: '<path d="M12 7v14"/><path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"/><path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"/><rect x="3" y="7" width="18" height="4" rx="1"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  palette: '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
  sign: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 12h10"/>',
  none: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  ring: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>',
  activity: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
  orbit: '<path d="M20.341 6.484A10 10 0 0 1 10.266 21.85"/><path d="M3.659 17.516A10 10 0 0 1 13.74 2.152"/><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/>',
  waves: '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
};

export const icon = (name, cls = '') => (isCalm() && PL[name]
  ? `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${PL[name]}</svg>`
  : `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[name] || P[NEON_ALIAS[name]] || ''}"/></svg>`);
// Namen, die es nur im neuen Symbol-Satz gibt, zeigen im Design Neon das alte Gegenstück.
const NEON_ALIAS = { dumbbell: 'bolt', body: 'scale', trophy: 'star', sign: 'tag', none: 'x', ring: 'target', activity: 'target', orbit: 'target', waves: 'target', sun: 'star' };

// Japanisches Wasserzeichen hinter einer Überschrift: nur im Design Neon mit eingeschalteten Zeichen.
export const jpMark = (text) => (jpOn() && text ? `<span class="jp-mark" aria-hidden="true">${esc(text)}</span>` : '');

// Kurzer Fingerabdruck eines Textes, zum Beispiel als Schlüssel für data-persist.
export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

// Setzt data-persist auf das erste Element eines HTML-Stücks. Der Schlüssel folgt aus dem Inhalt:
// Ändert sich das HTML, ist es ein neues Element. Kommentare davor und danach markieren das Stück, damit
// morph() (core.js) unveränderte Stücke beim Neuzeichnen gar nicht erst einlesen muss.
const persistMemo = new Map();
export function persistHtml(html, prefix = 'p') {
  let memo = persistMemo.get(prefix);
  if (!memo) persistMemo.set(prefix, (memo = new Map()));
  let out = memo.get(html);
  if (out == null) {
    const key = `${prefix}-${hashStr(html)}`;
    out = `<!--p:${key}-->${html.replace(/^(\s*<[a-zA-Z][\w-]*)/, `$1 data-persist="${key}"`)}<!--/p:${key}-->`;
    if (memo.size > 400) memo.clear();
    memo.set(html, out);
  }
  return out;
}
export const PERSIST_PART = /<!--p:([\w-]+)-->[\s\S]*?<!--\/p:\1-->/g;
export const PERSIST_MARK = /<!--\/?p:[\w-]+-->/g;

export function debounce(fn, ms) {
  let t = null;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.flush = (...args) => {
    clearTimeout(t);
    fn(...args);
  };
  return wrapped;
}

// Gewicht einer Übung anzeigen: bei Körpergewicht-Übungen als Zusatzgewicht.
export const fmtLoad = (ex, w) => (ex?.bw ? (w > 0 ? '+' + kg(w) : 'BW') : kg(w));
export const fmtSetText = (ex, s) => `${fmtLoad(ex, s.w)}${ex?.bw && !(s.w > 0) ? '' : ' kg'} × ${s.r}`;
