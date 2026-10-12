// Admin-Modus (seit 2.12): 15-mal auf die Version in den Einstellungen tippen.
// Siebenmal tippen und aufhören öffnet weiter die Tempo-Messung (`js/tempo.js`).
// Das Passwort legt der Besitzer beim ersten Mal selbst fest. Gespeichert wird nur ein Prüfwert
// (PBKDF2 mit SHA-256 und zufälligem Salz) in `state.meta.admin`, nie das Passwort selbst.
// Admin an heißt: Alle Looks sind nutzbar (`owned` in `js/look.js`). Level, XP und abgeholte Belohnungen bleiben.
import { app, actions, openSheet, closeSheet } from './core.js';
import { setAdmin, setAdminPassword } from './ops.js';
import { adminOn } from './look.js';
import { lookSheet } from './view-rank.js';
import { tempoSheet } from './tempo.js';
import { toast } from './fx.js';

const ADMIN_TAPS = 15;
const TEMPO_TAPS = 7;
const GAP = 1200; // Längste Pause zwischen zwei Tipps in Millisekunden
const ROUNDS = 150000;
const MIN_LEN = 4;

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (str) => new Uint8Array(str.match(/../g).map((h) => parseInt(h, 16)));
const canHash = () => !!globalThis.crypto?.subtle;

async function hashOf(password, saltHex) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: ROUNDS }, key, 256);
  return hex(bits);
}

const field = (label, attr, auto) => `<label class="field"><span>${label}</span><input class="input" type="password" ${attr} autocomplete="${auto}" autocapitalize="off" spellcheck="false"></label>`;

function showError(el, text) {
  const p = el.querySelector('[data-err]');
  p.textContent = text;
  p.hidden = !text;
}

// Ein Formular, damit auch Enter auf der Tastatur abschickt. Der Knopf ist gesperrt, solange gerechnet wird.
function wireForm(el, run) {
  const form = el.querySelector('form');
  const btn = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    btn.disabled = true;
    try { await run(); } finally { if (btn.isConnected) btn.disabled = false; }
  });
}

function setupSheet() {
  const el = openSheet(`
    <h2>Admin-Modus</h2>
    <p class="lead">Leg ein Passwort fest. Mit Admin sind alle Looks aus dem Rang-Pfad frei, dein Level bleibt gleich.</p>
    <form class="admin-form" novalidate>
      ${field('Passwort', 'data-pw', 'new-password')}
      ${field('Passwort wiederholen', 'data-pw2', 'new-password')}
      <p class="admin-err" data-err role="alert" hidden></p>
      <button class="btn-neon btn-block" type="submit">Festlegen</button>
    </form>`, { focus: '[data-pw]' });
  wireForm(el, async () => {
    const pw = el.querySelector('[data-pw]').value;
    const pw2 = el.querySelector('[data-pw2]').value;
    if (pw.length < MIN_LEN) return showError(el, `Mindestens ${MIN_LEN} Zeichen.`);
    if (pw !== pw2) return showError(el, 'Die Passwörter sind nicht gleich.');
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    setAdminPassword(salt, await hashOf(pw, salt));
    toast('Admin an. Alle Looks sind frei.');
    onSheet();
  });
}

function loginSheet() {
  const el = openSheet(`
    <h2>Admin-Modus</h2>
    <p class="lead">Gib dein Passwort ein.</p>
    <form class="admin-form" novalidate>
      ${field('Passwort', 'data-pw', 'current-password')}
      <p class="admin-err" data-err role="alert" hidden></p>
      <button class="btn-neon btn-block" type="submit">Admin an</button>
    </form>`, { focus: '[data-pw]' });
  wireForm(el, async () => {
    const inp = el.querySelector('[data-pw]');
    const a = app.state.meta.admin;
    if (!a || (await hashOf(inp.value, a.salt)) !== a.hash) {
      inp.value = '';
      inp.focus();
      return showError(el, 'Falsches Passwort.');
    }
    setAdmin(true);
    toast('Admin an. Alle Looks sind frei.');
    onSheet();
  });
}

function onSheet() {
  const el = openSheet(`
    <h2>Admin ist an</h2>
    <p class="lead">Alle Looks aus dem Rang-Pfad sind frei. Dein Level und deine XP bleiben gleich.</p>
    <button class="btn-neon btn-block" data-look>Look ändern</button>
    <button class="btn-ghost btn-block" data-off>Admin aus</button>`);
  el.querySelector('[data-look]').addEventListener('click', () => lookSheet());
  el.querySelector('[data-off]').addEventListener('click', async () => {
    setAdmin(false);
    await closeSheet();
    toast('Admin aus. Du hast wieder deine abgeholten Looks.');
  });
}

export function adminSheet() {
  if (!canHash()) { toast('Admin geht auf diesem Gerät nicht.'); return; }
  const a = app.state.meta.admin;
  if (!a) setupSheet();
  else if (adminOn(app.state)) onSheet();
  else loginSheet();
}

// Tipps zählen: Bei 15 öffnet sofort der Admin-Modus. Hört man nach 7 bis 14 auf, kommt die Tempo-Messung.
let count = 0;
let last = 0;
let timer = null;
actions['about-tap'] = () => {
  const now = Date.now();
  count = now - last < GAP ? count + 1 : 1;
  last = now;
  clearTimeout(timer);
  if (count >= ADMIN_TAPS) {
    count = 0;
    adminSheet();
  } else if (count >= TEMPO_TAPS) {
    timer = setTimeout(() => { count = 0; tempoSheet(); }, GAP);
  }
};
