// Designs zum Wählen: Dunkel (Standard), Hell und Neon (der Look bis 2.9).
// Das Design steht als Attribut an <html>: data-theme (dunkel, hell, neon), dazu data-calm für Dunkel und Hell.
// app.css ist das Design Neon, ruhig.css legt Dunkel und Hell darüber (CSS-Ebenen, siehe dort).
// Japanische Zeichen gibt es nur im Design Neon und nur, wenn sie in den Einstellungen an sind (data-jp).

// Automatisch (seit 2.11) übernimmt Hell oder Dunkel vom Handy und wechselt mit.
export const THEMES = [
  { id: 'dunkel', name: 'Dunkel' },
  { id: 'hell', name: 'Hell' },
  { id: 'auto', name: 'Automatisch' },
  { id: 'neon', name: 'Neon' },
];
export const DEFAULT_THEME = 'dunkel';

// Ist das Handy auf dunkel gestellt? Kommt in der App von Android (native.js meldet es über setSystemDark),
// im Browser aus prefers-color-scheme. Der letzte Wert liegt in localStorage, damit index.html ihn beim Start kennt.
let systemDark = null;
export function isSystemDark() {
  if (systemDark !== null) return systemDark;
  try {
    const saved = localStorage.getItem('kintore:sys');
    if (saved) return saved === 'dark';
  } catch {}
  try { return !window.matchMedia?.('(prefers-color-scheme: light)').matches; } catch { return true; }
}
// Gibt true zurück, wenn sich der Wert geändert hat.
export function setSystemDark(dark) {
  const changed = isSystemDark() !== !!dark;
  systemDark = !!dark;
  try { localStorage.setItem('kintore:sys', dark ? 'dark' : 'light'); } catch {}
  return changed;
}

// Farbe der Leisten oben und unten und der Grund beim Start, passend zum Design.
const BARS = {
  dunkel: { color: '#0E0F13', light: false },
  hell: { color: '#F3F4F6', light: true },
  neon: { color: '#0B1020', light: false },
};

// Ohne Seite (Tests in Node) gilt das Standard-Design.
const root = () => (typeof document !== 'undefined' ? document.documentElement : null);

// Gewählt in den Einstellungen (auch auto) und wirklich gezeigt (nie auto).
export const themeOf = (settings) => (THEMES.some((t) => t.id === settings?.theme) ? settings.theme : DEFAULT_THEME);
export const shownTheme = (settings) => {
  const t = themeOf(settings);
  if (t !== 'auto') return t;
  return isSystemDark() ? 'dunkel' : 'hell';
};
export const themeId = () => root()?.dataset.theme || DEFAULT_THEME;
// Dunkel oder Hell: ruhiger Look ohne Leuchten und ohne japanische Zeichen.
export const isCalm = () => themeId() !== 'neon';
export const isLight = () => themeId() === 'hell';
// Japanische Zeichen als Deko: nur im Design Neon und nur, wenn eingeschaltet.
export const jpOn = () => themeId() === 'neon' && root()?.dataset.jp === 'an';

let onBars = null;
let onStart = null;
// Grund des Startbilds beim nächsten Öffnen der App: Farbe des gezeigten Designs, bei Automatisch folgt Android dem Handy.
const startInfo = (settings) => ({ ...BARS[shownTheme(settings)], auto: themeOf(settings) === 'auto' });
// native.js meldet sich hier an und bekommt den Grund gleich und nach jedem Wechsel.
export const setStartHandler = (fn, settings) => { onStart = fn; onStart?.(startInfo(settings)); };
// native.js meldet sich hier an, um die Android-Leisten umzufärben (keine Abhängigkeit in die andere Richtung).
export const setBarsHandler = (fn) => { onBars = fn; onBars?.(BARS[themeId()]); };

// Gibt true zurück, wenn sich etwas geändert hat (dann muss alles neu gezeichnet werden).
export function applyTheme(settings) {
  const el = root();
  const id = shownTheme(settings);
  const jp = id === 'neon' && settings?.jp ? 'an' : 'aus';
  const changed = el.dataset.theme !== id || el.dataset.jp !== jp;
  el.dataset.theme = id;
  el.dataset.jp = jp;
  if (id === 'neon') el.removeAttribute('data-calm');
  else el.setAttribute('data-calm', '');
  // Für den nächsten Start merken (index.html setzt das Design, bevor die Seite gezeichnet wird).
  try { localStorage.setItem('kintore:design', `${themeOf(settings)}|${jp}`); } catch {}
  const bars = BARS[id];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bars.color);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', bars.light ? 'light' : 'dark');
  if (changed) onBars?.(bars);
  // Grund beim nächsten Start der App (Startbild): Automatisch folgt dort dem Handy.
  onStart?.(startInfo(settings));
  return changed;
}

// Farben aus dem Rang-Pfad in Dunkel (heller, dunkle Schrift darauf) und Hell (kräftiger, weiße Schrift darauf).
// Dieselben Werte stehen in ruhig.css als --acc. Hier für Farbmuster (Look, Sammlung).
export const CALM_ACCENT = {
  pink: ['#F571A6', '#C42673'],
  eis: ['#4CADF3', '#006FB1'],
  toxic: ['#45CF7A', '#007D25'],
  uv: ['#B389FF', '#804BCC'],
  sunset: ['#FA7A47', '#BD3D00'],
  crimson: ['#FD717C', '#C42843'],
  gold: ['#ECBD4A', '#8A5800'],
  tuerkis: ['#3CCFC2', '#007A72'],
  platin: ['#C5CEDA', '#4B5566'],
};
export const calmAccent = (id) => (CALM_ACCENT[id] || CALM_ACCENT.pink)[isLight() ? 1 : 0];

// Initialen für das Profilbild ohne Foto: erster Buchstabe von Vor- und Nachname, höchstens zwei.
export function initialsOf(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const first = [...words[0]][0] || '';
  const last = words.length > 1 ? [...words[words.length - 1]][0] || '' : '';
  return (first + last).toUpperCase();
}
