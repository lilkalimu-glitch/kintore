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

// ---------- Navigation über die Adresszeile (#/…) ----------
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
    render();
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
  render();
  const keep = ['uebungen', 'verlauf'].includes(app.route.name) ? scrollMemory.get(routeKey(app.route)) : 0;
  window.scrollTo(0, keep || 0);
}

// ---------- Zeichnen ----------
const afterHooks = [];
export const onAfterRender = (fn) => afterHooks.push(fn);

export function render() {
  const view = views[app.route.name] || views.start;
  const main = document.getElementById('view');
  if (!main || !app.state) return;
  main.innerHTML = view.render(app.route.params);
  main.dataset.route = app.route.name;
  view.after?.(main, app.route.params);
  bindCharts(main);
  for (const fn of afterHooks) fn();
  app.ui.newSetId = null;
}

// ---------- Bottom-Sheets ----------
let sheet = null;
let popWaiters = [];

export function openSheet(html, { onClose = null, focus = null } = {}) {
  const root = document.getElementById('sheet-root');
  const fresh = !sheet;
  root.innerHTML = `<div class="sheet-backdrop" data-act="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-grip" aria-hidden="true"></div>${html}</div>`;
  root.classList.add('open');
  document.body.style.overflow = 'hidden';
  sheet = { onClose };
  if (fresh) history.pushState({ sheet: true }, '');
  const target = focus ? root.querySelector(focus) : null;
  if (target) setTimeout(() => { target.focus(); target.select?.(); }, 60);
  return root.querySelector('.sheet');
}

export const sheetOpen = () => !!sheet;

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
