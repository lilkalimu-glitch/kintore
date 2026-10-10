// Kurze Einführung beim ersten Öffnen einer Seite (Profil, Rang-Pfad): wenige Schritte, ein Gedanke pro
// Schritt, jederzeit überspringbar. Gesehenes steht in state.meta.intro, zum Beispiel { profil: true }.
// Mit "weniger Bewegung" springt der Rahmen ohne Animation von Schritt zu Schritt.
import { app, commit, sheetOpen } from './core.js';
import { esc } from './util.js';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let active = null;

export const introOpen = () => !!active;

function markSeen(key) {
  commit((s) => { s.meta.intro = { ...(s.meta.intro || {}), [key]: true }; }, { render: false });
}

// Wird beim Öffnen einer Seite aufgerufen. Startet kurz danach, wenn nichts anderes im Weg ist.
export function maybeIntro(key, steps) {
  if (app.state?.meta?.intro?.[key] || active) return;
  const route = app.route.name;
  setTimeout(() => {
    if (active || app.route.name !== route || app.state.meta?.intro?.[key]) return;
    if (sheetOpen() || document.querySelector('#fx-root .fx')) return;
    const list = steps.filter((st) => document.querySelector(st.sel));
    if (list.length) start(key, list);
  }, reduced() ? 150 : 700);
}

function start(key, steps) {
  const root = document.getElementById('fx-root');
  const el = document.createElement('div');
  el.className = 'intro' + (reduced() ? ' is-still' : '');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Kurze Einführung');
  el.innerHTML = `<div class="in-spot" aria-hidden="true"></div>
    <div class="in-card">
      <div class="in-top"><span class="in-step" data-step></span><button class="in-skip" data-skip>Überspringen</button></div>
      <p class="in-text" data-text aria-live="polite"></p>
      <div class="in-foot"><span class="in-dots" aria-hidden="true">${steps.map(() => '<i></i>').join('')}</span><button class="btn-neon in-next" data-next>Weiter</button></div>
    </div>`;
  root.appendChild(el);
  document.body.classList.add('intro-open');
  active = { key, steps, i: 0, el };
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-skip]')) finish();
    else if (e.target.closest('[data-next]')) next();
  });
  window.addEventListener('resize', place);
  show(0);
}

function show(i) {
  const a = active;
  if (!a) return;
  a.i = i;
  const st = a.steps[i];
  const target = document.querySelector(st.sel);
  a.el.querySelector('[data-step]').textContent = `${i + 1} von ${a.steps.length}`;
  a.el.querySelector('[data-text]').innerHTML = esc(st.text);
  a.el.querySelectorAll('.in-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
  const last = i === a.steps.length - 1;
  const btn = a.el.querySelector('[data-next]');
  btn.textContent = last ? 'Fertig' : 'Weiter';
  a.el.classList.add('is-moving');
  if (target) {
    const r = target.getBoundingClientRect();
    const top = r.top + window.scrollY - (window.innerHeight - Math.min(r.height, window.innerHeight * 0.45)) / 2 + 60;
    window.scrollTo({ top: Math.max(0, top), behavior: reduced() ? 'auto' : 'smooth' });
  }
  setTimeout(() => {
    if (active !== a) return;
    place();
    a.el.classList.remove('is-moving');
    btn.focus({ preventScroll: true });
  }, reduced() ? 30 : 380);
}

// Rahmen um das Ziel legen und die Karte darunter oder darüber setzen.
function place() {
  const a = active;
  if (!a) return;
  const target = document.querySelector(a.steps[a.i].sel);
  const spot = a.el.querySelector('.in-spot');
  const card = a.el.querySelector('.in-card');
  if (!target) { spot.style.opacity = '0'; return; }
  const r = target.getBoundingClientRect();
  const pad = 8;
  spot.style.opacity = '1';
  spot.style.left = `${Math.max(6, r.left - pad)}px`;
  spot.style.top = `${r.top - pad}px`;
  spot.style.width = `${Math.min(window.innerWidth - 12, r.width + pad * 2)}px`;
  spot.style.height = `${r.height + pad * 2}px`;
  const h = card.offsetHeight;
  const below = r.bottom + pad + 14;
  const above = r.top - pad - 14 - h;
  const fitsBelow = below + h < window.innerHeight - 12;
  card.style.top = `${fitsBelow ? below : Math.max(12, above)}px`;
}

function next() {
  const a = active;
  if (!a) return;
  if (a.i < a.steps.length - 1) show(a.i + 1);
  else finish();
}

// Schließt die Einführung (auch mit der Zurück-Taste) und merkt sie als gesehen.
export function finish() {
  const a = active;
  if (!a) return;
  active = null;
  window.removeEventListener('resize', place);
  document.body.classList.remove('intro-open');
  a.el.classList.add('is-out');
  setTimeout(() => a.el.remove(), reduced() ? 0 : 220);
  markSeen(a.key);
}
