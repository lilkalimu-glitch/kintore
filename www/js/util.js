// Kleine Helfer: Formatierung, Datum, HTML, Icons.

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
export const weekStart = (iso) => {
  const d = parseIso(iso);
  const dow = (d.getDay() + 6) % 7; // Montag = 0
  d.setDate(d.getDate() - dow);
  return isoOf(d);
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

export const icon = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[name] || ''}"/></svg>`;

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
// Ändert sich das HTML, ist es ein neues Element.
export const persistHtml = (html, prefix = 'p') => html.replace(/^(\s*<[a-zA-Z][\w-]*)/, `$1 data-persist="${prefix}-${hashStr(html)}"`);

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
