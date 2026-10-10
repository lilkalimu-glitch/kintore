// Zentrale: Zustand, Neuzeichnen, Navigation, Aktionen, Sheets.
import { persist } from './store.js';
import { derive } from './stats.js';
import { bindCharts } from './charts.js';
import { today } from './util.js';

export const app = {
  state: null,
  route: { name: 'start', params: {} },
  ui: {
    exCat: 'alle',
    exSearch: '',
    exShowAll: false,
    metric: 'e1rm',
    range: '6m',
    bodyRange: '3m',
    calMonth: today().slice(0, 7),
    calDay: null,
    drafts: {},
    newSetId: null,
    histLimit: 12,
  },
};

let cache = null;
export const D = () => (cache ||= derive(app.state));

export const views = {};
export const actions = {};
export const TOP = ['start', 'training', 'uebungen', 'verlauf', 'koerper'];

export function commit(fn, { render: doRender = true } = {}) {
  fn(app.state);
  cache = null;
  persist(app.state);
  if (doRender) render();
}

export function replaceState(next) {
  app.state = next;
  cache = null;
  persist(app.state);
  render();
}

// ---------- Navigation über die Adresszeile (#/...) ----------
export function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [name, param] = h.split('/');
  if (!name || !views[name]) return { name: 'start', params: {} };
  return { name, params: param != null ? { id: decodeURIComponent(param) } : {} };
}

export function navigate(name, id, { replace = false } = {}) {
  const hash = '#/' + name + (id != null ? '/' + encodeURIComponent(id) : '');
  if (location.hash === hash) {
    app.route = parseHash();
    render({ entering: true });
    window.scrollTo(0, 0);
    return;
  }
  if (replace) location.replace(hash);
  else location.hash = hash;
}

const scrollMemory = new Map();
const routeKey = (r) => r.name + ':' + (r.params.id ?? '');

export function onHashChange() {
  const prev = app.route;
  scrollMemory.set(routeKey(prev), window.scrollY);
  app.route = parseHash();
  render({ entering: true });
  const keep = ['uebungen', 'verlauf'].includes(app.route.name) ? scrollMemory.get(routeKey(app.route)) : 0;
  window.scrollTo(0, keep || 0);
}

// ---------- Zeichnen ----------
const afterHooks = [];
export const onAfterRender = (fn) => afterHooks.push(fn);

// Nichts soll springen, wenn eine Seite nach einer Änderung neu gezeichnet wird:
// - Leisten und Listen mit data-keep="name" behalten ihre Scroll-Position.
// - Der zuletzt angetippte Knopf bleibt an derselben Stelle auf dem Bildschirm, auch wenn darüber
//   etwas dazukommt (zum Beispiel ein neuer Satz). Scrollt man selbst, gilt die Merkstelle nicht mehr.
const ANCHOR_KEYS = ['act', 'id', 'v', 'cat', 'lv', 'type', 'd', 'to', 'tpl', 'k', 'f', 'dir', 'n', 'step'];
let anchor = null;

function anchorSelector(el) {
  const parts = [];
  for (const k of ANCHOR_KEYS) {
    const v = el.dataset?.[k];
    if (v != null) parts.push(`[data-${k}="${CSS.escape(v)}"]`);
  }
  return parts.join('');
}

// Wird bei jedem Antippen in der Seite aufgerufen (app.js). Gibt es den Knopf mehrmals,
// zählt seine Nummer unter den gleichen Knöpfen.
const routeId = () => app.route.name + ':' + (app.route.params.id ?? '');
export function noteTap(el) {
  const main = document.getElementById('view');
  // data-anchor="none": Knöpfe wie "Ältere anzeigen", bei denen Neues darunter erscheinen soll.
  const sel = el && main?.contains(el) && !el.closest('[data-anchor="none"]') ? anchorSelector(el) : '';
  if (!sel) { anchor = null; return; }
  const idx = [...main.querySelectorAll(sel)].indexOf(el);
  anchor = { sel, idx: Math.max(0, idx), top: el.getBoundingClientRect().top, y: window.scrollY, route: routeId() };
}

// (Ohne Browser, zum Beispiel in den Logik-Tests mit Node, gibt es kein window.)
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', () => {
    if (anchor && Math.abs(window.scrollY - anchor.y) > 8) anchor = null;
  }, { passive: true });
}

function holdAnchor(main) {
  if (!anchor || anchor.route !== routeId()) return;
  const el = main.querySelectorAll(anchor.sel)[anchor.idx];
  if (!el) return;
  const delta = el.getBoundingClientRect().top - anchor.top;
  if (Math.abs(delta) > 1) window.scrollBy(0, delta);
  anchor.y = window.scrollY;
  anchor.top = el.getBoundingClientRect().top;
}

// Deko mit data-persist="schlüssel" (Banner, Effekte, Profilbild, Abzeichen) wird beim Neuzeichnen
// übernommen, solange der Schlüssel gleich bleibt. Der Schlüssel muss sich ändern, sobald sich das
// Aussehen ändert. Mit moveBefore (neuere Android-Versionen) wandert das alte Element, ohne die Seite zu
// verlassen, und seine Animationen laufen einfach weiter. Sonst wird es eingesetzt und startet neu.
function readPersist(root) {
  const out = new Map();
  root.querySelectorAll('[data-persist]').forEach((el) => { if (!out.has(el.dataset.persist)) out.set(el.dataset.persist, el); });
  return out;
}

function fillView(main, html, old) {
  if (!old?.size) { main.innerHTML = html; return; }
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const fresh = [...tpl.content.children];
  const before = [...main.childNodes];
  const atomic = typeof main.moveBefore === 'function';
  if (atomic) {
    main.append(tpl.content);
    // Erst das Neue berechnen lassen, sonst startet Chrome die Animationen beim Verschieben trotzdem neu.
    void main.offsetHeight;
  } else main.replaceChildren(tpl.content);
  for (const top of fresh) {
    const list = top.matches('[data-persist]') ? [top] : [...top.querySelectorAll('[data-persist]')];
    for (const el of list) {
      if (!el.isConnected || !el.parentNode) continue;
      const prev = old.get(el.dataset.persist);
      if (!prev) continue;
      old.delete(el.dataset.persist);
      if (atomic && prev.isConnected) {
        try { el.parentNode.moveBefore(prev, el); el.remove(); continue; } catch { /* unten einsetzen */ }
      }
      el.replaceWith(prev);
    }
  }
  if (atomic) for (const n of before) n.remove();
}

function readKeep(root) {
  const out = new Map();
  root.querySelectorAll('[data-keep]').forEach((el) => out.set(el.dataset.keep, [el.scrollLeft, el.scrollTop]));
  return out;
}

function writeKeep(root, kept) {
  if (!kept?.size) return;
  root.querySelectorAll('[data-keep]').forEach((el) => {
    const pos = kept.get(el.dataset.keep);
    if (!pos) return;
    el.scrollLeft = pos[0];
    el.scrollTop = pos[1];
  });
}

// entering: Seite wird gerade neu geöffnet (nicht nur nach einer Änderung neu gezeichnet).
export function render({ entering = false } = {}) {
  const view = views[app.route.name] || views.start;
  const main = document.getElementById('view');
  if (!main || !app.state) return;
  const kept = entering ? null : readKeep(main);
  const persisted = entering ? null : readPersist(main);
  fillView(main, view.render(app.route.params), persisted);
  main.dataset.route = app.route.name;
  view.after?.(main, app.route.params, { entering });
  bindCharts(main);
  for (const fn of afterHooks) fn();
  if (entering) anchor = null;
  else {
    writeKeep(main, kept);
    holdAnchor(main);
  }
  app.ui.newSetId = null;
}

// ---------- Bottom-Sheets ----------
// Ein Fenster von unten. Ist schon eins offen, wird nur sein Inhalt getauscht: Das Fenster fährt nicht
// noch einmal herein. keep: gleicher Inhalt neu gezeichnet, die Scroll-Position im Fenster bleibt.
// Zurück gegeben wird der Inhalt (.sheet-body), an den man Klicks hängen kann.
let sheet = null;
let popWaiters = [];

export function openSheet(html, { onClose = null, focus = null, keep = false } = {}) {
  const root = document.getElementById('sheet-root');
  const fresh = !sheet;
  const body = document.createElement('div');
  body.className = 'sheet-body';
  body.innerHTML = html;
  let box = root.querySelector('.sheet');
  if (fresh || !box) {
    root.innerHTML = '<div class="sheet-backdrop" data-act="sheet-close" aria-hidden="true"></div><div class="sheet" role="dialog" aria-modal="true" tabindex="-1"><div class="sheet-grip" aria-hidden="true"></div></div>';
    box = root.querySelector('.sheet');
    box.appendChild(body);
    root.classList.add('open');
    document.body.style.overflow = 'hidden';
    history.pushState({ sheet: true }, '');
  } else {
    const top = box.scrollTop;
    const old = box.querySelector('.sheet-body');
    if (old) old.replaceWith(body);
    else box.appendChild(body);
    if (keep) box.scrollTop = top;
    else {
      box.scrollTop = 0;
      body.classList.add('is-swap');
    }
  }
  box.setAttribute('aria-label', body.querySelector('h2')?.textContent?.trim() || 'Fenster');
  sheet = { onClose };
  const target = focus ? body.querySelector(focus) : null;
  if (target) setTimeout(() => { target.focus(); target.select?.(); }, 60);
  else if (!keep) box.focus({ preventScroll: true });
  return body;
}

// Das Fenster, das gerade gescrollt wird (für Positionen im Fenster).
export const sheetBox = () => document.querySelector('#sheet-root .sheet');

export const sheetOpen = () => !!sheet;

actions['sheet-close'] = () => closeSheet();

function teardownSheet() {
  const root = document.getElementById('sheet-root');
  root.classList.remove('open');
  root.innerHTML = '';
  document.body.style.overflow = '';
  const cb = sheet?.onClose;
  sheet = null;
  cb?.();
}

// Schließt das Sheet. Das Promise wartet, bis der Verlaufseintrag entfernt ist,
// damit eine folgende Navigation nicht verschluckt wird.
export function closeSheet() {
  if (!sheet) return Promise.resolve();
  teardownSheet();
  return new Promise((resolve) => {
    popWaiters.push(resolve);
    history.back();
    setTimeout(() => { popWaiters = popWaiters.filter((r) => r !== resolve); resolve(); }, 400);
  });
}

export function onPopState() {
  if (sheet) teardownSheet();
  const waiters = popWaiters;
  popWaiters = [];
  waiters.forEach((r) => r());
}
