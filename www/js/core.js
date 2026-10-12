// Zentrale: Zustand, Neuzeichnen, Navigation, Aktionen, Sheets.
import { persist } from './store.js';
import { derive } from './stats.js';
import { bindCharts } from './charts.js';
import { today, PERSIST_PART, PERSIST_MARK } from './util.js';

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

// derive sagt, was mit den abgeleiteten Daten (Level, Rekorde, Verlauf) nach der Änderung passiert:
//   nichts angegeben  alles neu rechnen (immer richtig, bei Jahren an Verlauf aber spürbar)
//   'keep'            die Änderung betrifft weder Sätze, Übungen, Körpergewicht noch Bonus-XP
//   (d) => bool       nur das Geänderte in d nachtragen. false heißt: geht nicht, dann alles neu rechnen
export function commit(fn, { render: doRender = true, derive: how } = {}) {
  fn(app.state);
  if (typeof how === 'function') { if (cache && !how(cache)) cache = null; }
  else if (how !== 'keep') cache = null;
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

// Design gewechselt (Einstellungen): Teile außerhalb der Seite neu zeichnen (Tabbar, Timer), dann die Seite.
const designHooks = [];
export const onDesignChange = (fn) => designHooks.push(fn);
export function redesign() {
  for (const fn of designHooks) fn();
  render({ entering: true });
  // Ein offenes Fenster mit Texten oder Symbolen je nach Design baut sich neu auf (seit 2.11, für Automatisch).
  sheet?.rebuild?.();
}

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

// ---------- Nur ändern, was sich ändert ----------
// Nach einer Änderung wird die Seite nicht neu gebaut. morph() legt das neue HTML neben das, was schon da ist,
// und ändert nur, was anders ist: Texte, Attribute, neue und entfernte Elemente. Alles andere bleibt stehen,
// mit Scroll-Position, Fokus und laufenden Animationen. Der Browser muss so nur das Geänderte neu berechnen.
//
// Schlüssel halten Elemente auseinander, wenn Listen sich verschieben:
// - data-persist="…" (Deko wie Banner, Effekte, Profilbild): Der Schlüssel folgt aus dem Inhalt. Gleicher
//   Schlüssel heißt gleiches Aussehen, das Element bleibt unberührt. Es darf auch den Platz wechseln.
// - data-key="…": feste Kennung (zum Beispiel eine Übung im Training), der Inhalt wird abgeglichen.
// Klassen, die erst nach dem Zeichnen per Skript dazukommen und bleiben sollen, stehen in JS_CLASSES.
const JS_CLASSES = ['is-wait', 'is-intro', 'is-enter'];
const canMove = typeof Element !== 'undefined' && typeof Element.prototype.moveBefore === 'function';

// Platzhalter (template data-stub) stehen für ein unverändertes Stück mit data-persist, siehe morph().
const keyOf = (n) => {
  if (n.nodeType !== 1) return null;
  const p = n.getAttribute('data-persist') || n.getAttribute('data-stub');
  if (p) return 'p:' + p;
  const k = n.getAttribute('data-key');
  return k ? 'k:' + k : null;
};
const isStub = (n) => n.nodeType === 1 && n.hasAttribute('data-stub');

function collectKeys(root, into) {
  root.querySelectorAll('[data-persist],[data-key],template[data-stub]').forEach((el) => { const k = keyOf(el); if (!into.has(k)) into.set(k, el); });
  return into;
}

function syncAttrs(old, nw) {
  const want = nw.attributes;
  // Meist ist alles gleich: Dann reicht ein Durchgang, und Attribute zum Entfernen gibt es nicht.
  let missing = want.length !== old.attributes.length;
  for (let i = 0; i < want.length; i++) {
    const { name, value } = want[i];
    const cur = old.getAttribute(name);
    if (cur === value) continue;
    if (cur === null) missing = true;
    if (name === 'class' && cur !== null) {
      let v = value;
      for (const c of JS_CLASSES) if (old.classList.contains(c) && !nw.classList.contains(c)) v += ' ' + c;
      if (cur !== v) old.setAttribute('class', v);
    } else old.setAttribute(name, value);
  }
  if (!missing) return;
  const have = old.attributes;
  for (let i = have.length - 1; i >= 0; i--) {
    const name = have[i].name;
    if (!nw.hasAttribute(name)) {
      if (name === 'class') {
        const keep = JS_CLASSES.filter((c) => old.classList.contains(c)).join(' ');
        if (keep) { old.setAttribute('class', keep); continue; }
      }
      old.removeAttribute(name);
    }
  }
}

// Eingaben: Was der Nutzer gerade tippt, bleibt stehen.
function syncValue(old, nw) {
  if (old === document.activeElement) return;
  if (old.tagName === 'INPUT') {
    if (old.type === 'checkbox' || old.type === 'radio') old.checked = nw.hasAttribute('checked');
    else if (old.type !== 'file') {
      const v = nw.getAttribute('value') ?? '';
      if (old.value !== v) old.value = v;
    }
  } else if (old.tagName === 'TEXTAREA' && old.value !== nw.value) old.value = nw.value;
}

function morphNode(old, nw, ctx) {
  if (old.nodeType !== 1) {
    if (old.nodeValue !== nw.nodeValue) old.nodeValue = nw.nodeValue;
    return;
  }
  syncAttrs(old, nw);
  if (old.tagName === 'INPUT' || old.tagName === 'TEXTAREA') syncValue(old, nw);
  morphChildren(old, nw, ctx);
}

function place(parent, el, before) {
  if (canMove && el.isConnected) {
    try { parent.moveBefore(el, before); return; } catch { /* unten einsetzen */ }
  }
  parent.insertBefore(el, before);
}

// prev ist das letzte fertige Kind. Der nächste Kandidat wird jedes Mal neu bestimmt, weil Elemente mit
// Schlüssel beim Abgleich darunter an eine andere Stelle wandern können.
function morphChildren(oldParent, newParent, ctx) {
  let prev = null;
  let nw = newParent.firstChild;
  while (nw) {
    const next = nw.nextSibling;
    let cur = prev ? prev.nextSibling : oldParent.firstChild;
    // Alte Elemente mit Schlüssel, die es im neuen HTML nicht mehr gibt, fallen gleich weg.
    while (cur && cur.nodeType === 1) {
      const ck = keyOf(cur);
      if (!ck || ctx.want.has(ck)) break;
      const after = cur.nextSibling;
      cur.remove();
      cur = after;
    }
    const k = keyOf(nw);
    const ck = cur ? keyOf(cur) : null;
    if (cur && ck === k && (k?.[0] === 'p' || (cur.nodeType === nw.nodeType && cur.nodeName === nw.nodeName))) {
      if (k) ctx.old.delete(k);
      if (!k || k[0] !== 'p') morphNode(cur, nw, ctx);
      prev = cur;
    } else if (k && ctx.old.has(k) && !ctx.old.get(k).contains(oldParent)) {
      // Gibt es schon, nur an anderer Stelle: herholen statt neu bauen.
      const el = ctx.old.get(k);
      ctx.old.delete(k);
      place(oldParent, el, cur);
      if (k[0] !== 'p') morphNode(el, nw, ctx);
      prev = el;
    } else {
      if (isStub(nw)) throw new Error('Platzhalter ohne Element');
      oldParent.insertBefore(nw, cur);
      if (nw.nodeType === 1 && ctx.old.size) adoptKeyed(nw, ctx);
      prev = nw;
    }
    nw = next;
  }
  let cur = prev ? prev.nextSibling : oldParent.firstChild;
  while (cur) {
    const after = cur.nextSibling;
    cur.remove();
    cur = after;
  }
}

// In einem neu eingesetzten Teil die Elemente mit Schlüssel durch die vorhandenen ersetzen,
// damit Deko darin weiterläuft und nicht neu startet.
function adoptKeyed(root, ctx) {
  for (const el of root.querySelectorAll('[data-persist],[data-key],template[data-stub]')) {
    if (!root.contains(el)) continue;
    const k = keyOf(el);
    const old = ctx.old.get(k);
    if (!old || old.contains(root)) {
      if (isStub(el)) throw new Error('Platzhalter ohne Element');
      continue;
    }
    ctx.old.delete(k);
    place(el.parentNode, old, el);
    if (k[0] !== 'p') morphNode(old, el, ctx);
    el.remove();
  }
}

export function morph(root, html) {
  const old = collectKeys(root, new Map());
  // Stücke mit data-persist, die es schon gibt, werden gar nicht erst eingelesen: Ein Platzhalter merkt sich
  // die Stelle, das vorhandene Element bleibt. Das spart bei großen Seiten (Rang-Pfad) das meiste.
  const stubbed = new Set();
  const src = old.size ? html.replace(PERSIST_PART, (part, key) => {
    if (!old.has('p:' + key) || stubbed.has(key)) return part;
    stubbed.add(key);
    return `<template data-stub="${key}"></template>`;
  }) : html;
  const tpl = document.createElement('template');
  tpl.innerHTML = src.replace(PERSIST_MARK, '');
  const ctx = { old, want: new Set(collectKeys(tpl.content, new Map()).keys()) };
  try {
    morphChildren(root, tpl.content, ctx);
  } catch (err) {
    // Sollte nie passieren. Falls doch: die Seite ganz neu aufbauen statt etwas Falsches zu zeigen.
    console.warn('[morph]', err?.message || err);
    root.innerHTML = html.replace(PERSIST_MARK, '');
  }
}

// Hängt einen Listener nur einmal an, auch wenn das Element beim Neuzeichnen stehen bleibt.
const bound = new WeakMap();
export function once(el, key) {
  let set = bound.get(el);
  if (!set) bound.set(el, (set = new Set()));
  if (set.has(key)) return false;
  set.add(key);
  return true;
}

// Leisten und Listen mit data-keep: Wird so ein Element doch einmal ersetzt, bekommt das neue die alte Position.
function readKeep(root) {
  const out = new Map();
  root.querySelectorAll('[data-keep]').forEach((el) => out.set(el.dataset.keep, { el, x: el.scrollLeft, y: el.scrollTop }));
  return out;
}

function writeKeep(root, kept) {
  if (!kept?.size) return;
  root.querySelectorAll('[data-keep]').forEach((el) => {
    const pos = kept.get(el.dataset.keep);
    if (!pos || pos.el === el) return;
    el.scrollLeft = pos.x;
    el.scrollTop = pos.y;
  });
}

// ---------- Animationen nur, solange sie zu sehen sind ----------
// Karten, Deko und Stationen außerhalb des Bildschirms halten ihre Animationen an. Angehalten wird direkt an
// den Animationen (cancel), nicht über eine Klasse: So muss der Browser nichts neu berechnen, wenn etwas ins Bild
// kommt oder es verlässt, und für angehaltene Animationen legt er keine Grafik-Ebenen an. Kommt das Element
// wieder ins Bild, laufen sie von vorn los. Jede Animation gehört dem nächsten beobachteten Element über ihr,
// so kommen sich Karte und Stationen darin nicht in die Quere.
const watched = new WeakSet();
const stopped = new WeakMap();

function holderOf(target, root) {
  for (let n = target; n && n !== root; n = n.parentElement) if (watched.has(n)) return n;
  return root;
}

export function setAnimations(el, on, list = null) {
  if (on) {
    const mine = stopped.get(el);
    if (!mine) return;
    stopped.delete(el);
    for (const a of mine) {
      const t = a.effect?.target;
      if (a.playState !== 'idle' || !t?.isConnected) continue;
      // Nur, was das Element laut Stil noch haben soll (es kann sich inzwischen geändert haben).
      const names = getComputedStyle(t, a.effect.pseudoElement || null).animationName.split(/,\s*/);
      if (names.includes(a.animationName)) a.play();
    }
    return;
  }
  if (!list && typeof el.getAnimations !== 'function') return;
  let mine = stopped.get(el);
  for (const a of list || el.getAnimations({ subtree: true })) {
    if (a.playState !== 'running' || typeof a.animationName !== 'string') continue;
    if (holderOf(a.effect?.target, el) !== el) continue;
    a.cancel();
    if (!mine) stopped.set(el, (mine = new Set()));
    mine.add(a);
  }
}

let offWatch = null;
export function watchOff(list) {
  if (typeof IntersectionObserver === 'undefined') return;
  offWatch ||= new IntersectionObserver((entries) => {
    // Erst alle Animationen holen, dann anhalten: so rechnet der Browser die Stile nur einmal.
    const work = entries.map((e) => [e.target, e.isIntersecting, e.isIntersecting ? null : e.target.getAnimations?.({ subtree: true })]);
    for (const [el, on, anims] of work) setAnimations(el, on, anims);
  }, { rootMargin: '60px' });
  for (const el of list) {
    watched.add(el);
    offWatch.observe(el);
  }
}

export function unwatchOff(el) {
  offWatch?.unobserve(el);
  watched.delete(el);
  stopped.delete(el);
}

const OFF_SEL = ':scope > .card, :scope > .hero, :scope > .stack > .card, :scope > .stack > section';

// entering: Seite wird gerade neu geöffnet (nicht nur nach einer Änderung neu gezeichnet).
export function render({ entering = false } = {}) {
  const view = views[app.route.name] || views.start;
  const main = document.getElementById('view');
  if (!main || !app.state) return;
  const html = view.render(app.route.params);
  const fresh = entering || main.dataset.route !== app.route.name;
  let kept = null;
  if (fresh) {
    offWatch?.disconnect();
    main.innerHTML = html.replace(PERSIST_MARK, '');
  } else {
    kept = readKeep(main);
    morph(main, html);
  }
  main.dataset.route = app.route.name;
  view.after?.(main, app.route.params, { entering });
  bindCharts(main);
  watchOff(main.querySelectorAll(OFF_SEL));
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

// rebuild: baut das Fenster nach einem Designwechsel neu auf (redesign), sonst bleibt der Inhalt stehen.
export function openSheet(html, { onClose = null, focus = null, keep = false, rebuild = null } = {}) {
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
  sheet = { onClose, rebuild };
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
