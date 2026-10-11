// Designs zum Wählen: Dunkel (Standard), Hell und Neon (der Look bis 2.9).
// Das Design steht als Attribut an <html>: data-theme (dunkel, hell, neon), dazu data-calm für Dunkel und Hell.
// app.css ist das Design Neon, ruhig.css legt Dunkel und Hell darüber (CSS-Ebenen, siehe dort).
// Japanische Zeichen gibt es nur im Design Neon und nur, wenn sie in den Einstellungen an sind (data-jp).

export const THEMES = [
  { id: 'dunkel', name: 'Dunkel' },
  { id: 'hell', name: 'Hell' },
  { id: 'neon', name: 'Neon' },
];
export const DEFAULT_THEME = 'dunkel';

// Farbe der Leisten oben und unten und der Grund beim Start, passend zum Design.
const BARS = {
  dunkel: { color: '#0E0F13', light: false },
  hell: { color: '#F3F4F6', light: true },
  neon: { color: '#0B1020', light: false },
};

// Ohne Seite (Tests in Node) gilt das Standard-Design.
const root = () => (typeof document !== 'undefined' ? document.documentElement : null);

export const themeOf = (settings) => (THEMES.some((t) => t.id === settings?.theme) ? settings.theme : DEFAULT_THEME);
export const themeId = () => root()?.dataset.theme || DEFAULT_THEME;
// Dunkel oder Hell: ruhiger Look ohne Leuchten und ohne japanische Zeichen.
export const isCalm = () => themeId() !== 'neon';
export const isLight = () => themeId() === 'hell';
// Japanische Zeichen als Deko: nur im Design Neon und nur, wenn eingeschaltet.
export const jpOn = () => themeId() === 'neon' && root()?.dataset.jp === 'an';

let onBars = null;
// native.js meldet sich hier an, um die Android-Leisten umzufärben (keine Abhängigkeit in die andere Richtung).
export const setBarsHandler = (fn) => { onBars = fn; onBars?.(BARS[themeId()]); };

// Gibt true zurück, wenn sich etwas geändert hat (dann muss alles neu gezeichnet werden).
export function applyTheme(settings) {
  const el = root();
  const id = themeOf(settings);
  const jp = id === 'neon' && settings?.jp ? 'an' : 'aus';
  const changed = el.dataset.theme !== id || el.dataset.jp !== jp;
  el.dataset.theme = id;
  el.dataset.jp = jp;
  if (id === 'neon') el.removeAttribute('data-calm');
  else el.setAttribute('data-calm', '');
  // Für den nächsten Start merken (index.html setzt das Design, bevor die Seite gezeichnet wird).
  try { localStorage.setItem('kintore:design', `${id}|${jp}`); } catch {}
  const bars = BARS[id];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bars.color);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', bars.light ? 'light' : 'dark');
  if (changed) onBars?.(bars);
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
