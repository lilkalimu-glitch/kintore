// Einstieg: Daten laden, Tabbar, Klicks verteilen, Android-Zurück-Taste.
import { app, D, actions, render, navigate, parseHash, onHashChange, onPopState, closeSheet, sheetOpen, TOP, onAfterRender } from './core.js';
import { applyBackground } from './bg.js';
import { loadState, persist, flushPersist, loadBg } from './store.js';
import { migrate, noteXpRule } from './ops.js';
import { initTimer } from './timer.js';
import { initNative, exitApp, isNative } from './native.js';
import { icon } from './util.js';
import { applyLook, equipped } from './look.js';
import './view-start.js';
import './view-training.js';
import './view-exercises.js';
import './view-history.js';
import './view-body.js';
import './view-settings.js';
import './view-rank.js';
import './view-profile.js';
import { initAvatar } from './me.js';

const TABS = [
  { id: 'start', label: 'Start', icon: 'home' },
  { id: 'training', label: 'Training', icon: 'bolt' },
  { id: 'uebungen', label: 'Übungen', icon: 'list' },
  { id: 'verlauf', label: 'Verlauf', icon: 'calendar' },
  { id: 'koerper', label: 'Körper', icon: 'scale' },
];
const TAB_OF = { uebung: 'uebungen', einstellungen: 'start', rang: 'start', profil: 'start' };

// Neon-Farbe aus dem Rang-Pfad auf die ganze App legen.
const updateLook = () => { if (app.state) applyLook(equipped(app.state, D().level.level)); };

function renderTabs() {
  const nav = document.getElementById('tabs');
  nav.innerHTML = TABS.map((t) => `<button class="tab" data-tab="${t.id}" aria-label="${t.label}">${icon(t.icon)}<span>${t.label}</span></button>`).join('');
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    if (sheetOpen()) closeSheet();
    const id = b.dataset.tab;
    if (app.route.name === id) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    navigate(id, null, { replace: TOP.includes(app.route.name) && app.route.name !== 'start' });
  });
}

function updateTabs() {
  const active = TAB_OF[app.route.name] || app.route.name;
  document.querySelectorAll('#tabs .tab').forEach((b) => {
    const on = b.dataset.tab === active;
    b.classList.toggle('is-active', on);
    if (on) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
    const live = b.dataset.tab === 'training' && app.state?.active;
    let dot = b.querySelector('.live');
    if (live && !dot) b.insertAdjacentHTML('beforeend', '<i class="live" aria-hidden="true"></i>');
    if (!live && dot) dot.remove();
  });
}



function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = actions[el.dataset.act];
  if (!fn) return;
  if (el.tagName === 'A') e.preventDefault();
  fn(el.dataset, el, e);
}

function onKey(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest('[role="button"][data-act]');
  if (!el) return;
  e.preventDefault();
  actions[el.dataset.act]?.(el.dataset, el, e);
}

function onBack() {
  const fx = document.querySelector('#fx-root .fx');
  if (fx) { fx.click(); return; }
  if (sheetOpen()) { closeSheet(); return; }
  if (app.route.name === 'start') { exitApp(); return; }
  if (TOP.includes(app.route.name)) { navigate('start', null, { replace: true }); return; }
  history.back();
}

// Falls Android die App doch unter die Statusleiste zeichnet und keine Abstände meldet: Abstand selbst setzen.
function ensureSafeArea() {
  if (!isNative()) return;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;padding-top:env(safe-area-inset-top);visibility:hidden';
  document.body.appendChild(probe);
  const envTop = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  if (envTop < 1 && screen.height - window.innerHeight < 12) {
    document.documentElement.style.setProperty('--safe-top', '30px');
    document.documentElement.style.setProperty('--safe-bottom', '18px');
  }
}

async function boot() {
  ensureSafeArea();
  const view = document.getElementById('view');
  view.innerHTML = '<div class="loading" aria-label="Lädt">筋トレ</div>';
  let loaded;
  try {
    loaded = await loadState();
  } catch (err) {
    view.innerHTML = `<div class="card pad"><h2>Daten konnten nicht geladen werden</h2><p class="soft">${String(err.message || err)}</p></div>`;
    return;
  }
  app.state = migrate(loaded.state);
  if (loaded.origin !== 'db') persist(app.state);
  noteXpRule();

  renderTabs();
  initTimer(() => app.state.settings);
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('popstate', onPopState);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushPersist(); });
  window.addEventListener('pagehide', flushPersist);
  initNative({ onBack, onPause: flushPersist, onResume: () => render() });

  // Bei offener Tastatur Tabbar und Timer ausblenden, damit sie nichts verdecken.
  let fullHeight = window.innerHeight;
  window.addEventListener('resize', () => {
    fullHeight = Math.max(fullHeight, window.innerHeight);
    document.body.classList.toggle('kb-open', window.innerHeight < fullHeight * 0.78);
  });

  applyBackground(await loadBg());
  await initAvatar();
  app.route = parseHash();
  if (!location.hash) history.replaceState(null, '', '#/start');
  render({ entering: true });
  updateTabs();
  window.KINTORE = { app };
}

onAfterRender(updateTabs);
onAfterRender(updateLook);
boot();
