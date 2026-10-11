// Rang-Pfad: alle Ränge von E bis SS, Belohnungen zum Abholen und der eigene Look.
import { app, D, views, actions, navigate, openSheet, once, watchOff, unwatchOff, setAnimations, sheetBox } from './core.js';
import { esc, icon, int, clamp, hashStr, persistHtml } from './util.js';
import { maybeIntro } from './intro.js';
import { RANKS, xpAt, PR_XP, QUEST_XP, REST_XP, LIFT_XP, LIFT_CAP, weekXp, SHIELD_EVERY, SHIELD_MAX } from './stats.js';
import {
  STATIONS, TYPES, TYPE_ORDER, ITEMS, RARITIES, emblem, rewardOrb, rankChip, itemLabel, itemRank, rarityOf, topRarity,
  equipped, readyStations, owned, stationAt, avatar,
} from './look.js';
import { bannerArt, effectParts } from './art.js';
import { claimStations, equipItems } from './ops.js';
import { rewardReveal, rewardSummary, toast } from './fx.js';
import { vibrate } from './native.js';
import { avatarUrl } from './me.js';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const titleClass = (it) => `tt-${rarityOf(it).id}`;

// ---------- Kopf: aktueller Rang ----------
function hero(lv, look, ready) {
  const nr = lv.nextRank;
  const pct = (clamp(lv.rankProgress, 0, 1) * 100).toFixed(1);
  return `<section class="card rp-hero rank-${esc(lv.rank)}">
    <div class="rp-top">
      <div class="rp-emb">${emblem(lv.rank, look.frame.id, 96, '', { fx: true })}</div>
      <div class="rp-info">
        <small>Dein Rang</small>
        <h2>Rang <span class="rank-inline rank-${esc(lv.rank)}">${esc(lv.rank)}</span></h2>
        <div class="title-tag ${titleClass(look.title)}">${esc(look.title.name)}</div>
        <span class="rp-lv">Level ${lv.level}, ${int(lv.xp)} XP</span>
      </div>
    </div>
    ${nr ? `<div class="rp-prog">
      <div class="rp-ends"><span class="rank-inline rank-${esc(lv.rank)}">${esc(lv.rank)}</span><span class="rank-inline rank-${esc(nr.id)}">${esc(nr.id)}</span></div>
      <div class="rp-bar rank-${esc(nr.id)}" style="--p:${pct}%" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100" aria-label="Fortschritt bis Rang ${esc(nr.id)}"><i></i></div>
      <p>Noch <b>${int(lv.toRank)} XP</b> bis Rang ${esc(nr.id)} (Level ${nr.level})</p>
    </div>` : '<p class="rp-max">Du hast den höchsten Rang.</p>'}
    ${ready.length ? `<div class="rp-ready">
      <span>${icon('gift')}<span><b>${plural(ready.length, 'Belohnung', 'Belohnungen')}</b> bereit</span></span>
      <button class="btn-claim" data-act="claim-all">${ready.length === 1 ? 'Abholen' : 'Alle abholen'}</button>
    </div>` : ''}
  </section>`;
}

// ---------- Alle Ränge auf einen Blick ----------
function rankStrip(lv) {
  const idx = RANKS.findIndex((r) => r.id === lv.rank);
  const lit = idx + (lv.nextRank ? clamp(lv.rankProgress, 0, 1) : 0);
  return `<section class="card rank-strip" style="--lit:${((lit / (RANKS.length - 1)) * 100).toFixed(2)}%" aria-label="Alle Ränge">
    <div class="rs-line" aria-hidden="true"><i></i></div>
    ${RANKS.map((r, i) => `<button class="rs-item ${i < idx ? 'is-past' : i === idx ? 'is-now' : 'is-next'}" data-act="road-to" data-lv="${r.min}" aria-label="Rang ${r.id} ab Level ${r.min}">
      <span class="rs-emb">${emblem(r.id, 'hex', i === idx ? 42 : 32)}</span>
      <span class="rs-lv">Lv ${r.min}</span>
    </button>`).join('')}
  </section>`;
}

// ---------- Der Pfad ----------
function nodeText(st) {
  if (st.lv === 1) return '<b class="n-rank">Rang E</b><span class="n-name">Start</span>';
  if (st.rank) {
    const names = st.items.length === 1 ? `${TYPES[st.items[0].type].name} ${st.items[0].name}` : `${st.items.length} Belohnungen`;
    return `<b class="n-rank">Rang ${esc(st.rank.id)}</b><span class="n-name">${esc(names)}</span>`;
  }
  const it = st.items[0];
  return `<small>${esc(TYPES[it.type].name)}</small><span class="n-name ${it.type === 'sign' ? 'jp' : ''}">${esc(it.name)}</span>`;
}

// full: Station mit Kugel oder Abzeichen. Sonst nur Text und Knopf, die Kugel kommt beim Scrollen dazu.
// So muss der Browser beim Öffnen nur die Stationen zeichnen, die man sieht.
function roadNode(st, lv, claimed, nextLv, full = true) {
  const reached = st.lv <= lv.level;
  let state = 'locked';
  if (st.lv === 1) state = 'done';
  else if (reached) state = claimed.has(st.lv) ? 'done' : 'ready';
  else if (st.lv === nextLv) state = 'next';
  const rar = st.items.length ? topRarity(st.items).id : 'n';
  const orb = !full ? '' : st.rank
    ? `<span class="n-emb">${emblem(st.rank.id, 'hex', 64)}</span>`
    : rewardOrb(st.items[0]);
  const badge = !full ? '' : state === 'done' && st.lv > 1 ? `<span class="n-badge ok">${icon('check')}</span>`
    : state === 'locked' || state === 'next' ? `<span class="n-badge">${icon('lock')}</span>` : '';
  const foot = state === 'ready'
    ? `<button class="btn-claim small" data-act="claim" data-lv="${st.lv}">Abholen</button>`
    : state === 'next' ? `<span class="n-next">Noch ${int(xpAt(st.lv) - lv.xp)} XP</span>` : '';
  const just = app.ui.justClaimed?.includes(st.lv) ? 'just-claimed' : '';
  return `<div class="node ${st.rank ? `is-rank rank-${esc(st.rank.id)}` : ''} nr-${rar} st-${state} ${just}${full ? '' : ' is-empty'}" data-lv="${st.lv}">
    <div class="n-lv">Lv ${st.lv}</div>
    <div class="n-orb">${orb}${badge}</div>
    <div class="n-text">${nodeText(st)}</div>
    ${foot}
  </div>`;
}

const rarityLegend = () => `<div class="rar-legend" aria-label="Seltenheit">${RARITIES.map((r) => `<span class="rar-${r.id}"><i></i>${esc(r.name)}</span>`).join('')}</div>`;

// ---------- Lage der Stationen ----------
// Die Maße stehen in app.css (.road, .node, .node.is-rank). Hier dieselben Werte, damit die Positionen ohne
// Messen feststehen. Messen würde den Browser zwingen, die ganze Seite vorab zu berechnen.
const ROAD = { pad: 16, gap: 4, node: 90, rank: 116 };
const GEO = (() => {
  let x = ROAD.pad;
  const list = STATIONS.map((st) => {
    const w = st.rank ? ROAD.rank : ROAD.node;
    const g = { lv: st.lv, left: x, w, center: x + w / 2, radius: st.rank ? 36 : 28 };
    x += w + ROAD.gap;
    return g;
  });
  return { list, width: x - ROAD.gap + ROAD.pad };
})();

// Breite des sichtbaren Pfads: gemessen, wenn es ihn schon gibt, sonst aus der Fensterbreite
// (#view höchstens 560 px, 16 px Rand je Seite, 1 px Rahmen der Karte).
const roadView = () => document.querySelector('[data-road-scroll]')?.clientWidth || Math.min(window.innerWidth || 393, 560) - 34;

// Markierung "Du bist hier": in der Lücke zwischen zwei Stationen, damit sie nichts verdeckt.
function marker(lv) {
  const L = GEO.list;
  let a = 0;
  for (let i = 0; i < L.length; i++) if (L[i].lv <= lv.level) a = i;
  const b = a + 1;
  if (b >= L.length) return { xm: L[a].center, max: true };
  const f = clamp((lv.xp - xpAt(L[a].lv)) / (xpAt(L[b].lv) - xpAt(L[a].lv)), 0, 1);
  const from = L[a].center + L[a].radius;
  const to = L[b].center - L[b].radius;
  return { xm: to > from ? from + f * (to - from) : (L[a].center + L[b].center) / 2, max: false };
}

const homeScroll = (lv, w = roadView()) => clamp(marker(lv).xm - w * 0.45, 0, Math.max(0, GEO.width - w));
// Ohne Messen geschätzt, damit beim Öffnen nichts vorab berechnet werden muss.
const estView = () => Math.min(window.innerWidth || 393, 560) - 34;
// Fährt die Kamera beim Öffnen vom Anfang zur eigenen Position? Nur beim ersten Mal und mit Bewegung.
const willPan = (home) => !app.ui.roadIntro && !reduced() && home >= 40;

// Welche Stationen voll gezeichnet werden: alles im Bereich [von, bis] in Pixeln auf dem Pfad.
function inRange(from, to) {
  return GEO.list.filter((g) => g.left + g.w >= from && g.left <= to).map((g) => g.lv);
}

function roadCard(s, lv, ready) {
  const claimed = new Set(s.rewards.claimed);
  const next = STATIONS.find((st) => st.lv > lv.level) || null;
  const filled = app.ui.roadFilled;
  const m = marker(lv);
  const L = GEO.list;
  return `<section class="card road-card">
    <div class="card-title"><h2>Pfad</h2><span class="hint">${ready.length ? `${plural(ready.length, 'Belohnung', 'Belohnungen')} bereit` : next ? `Nächste bei Level ${next.lv}` : 'Alles freigeschaltet'}</span></div>
    <div class="road-scroll" data-road-scroll data-keep="road">
      <div class="road${m.max ? ' is-max' : ''}" data-road style="--x0:${L[0].center}px;--x1:${L[L.length - 1].center}px;--xm:${m.xm.toFixed(1)}px">
        <div class="road-line" aria-hidden="true"></div>
        <div class="road-lit" aria-hidden="true"><i></i></div>
        ${STATIONS.map((st) => persistHtml(roadNode(st, lv, claimed, next?.lv, filled.has(st.lv)), 'nd')).join('')}
        <div class="road-you" aria-hidden="true"><span class="ry-chip">LV ${lv.level}</span><span class="ry-dot"></span></div>
      </div>
    </div>
    ${rarityLegend()}
  </section>`;
}

// Stationen voll zeichnen, die bisher nur Text hatten. Was nicht im Bild ist, hält seine Animationen gleich an.
// watchOff (core.js) startet sie, sobald die Station ins Bild kommt.
function swapNode(scroller, lvl, full) {
  const el = scroller.querySelector(`.node[data-lv="${lvl}"]`);
  if (!el) return null;
  const lv = D().level;
  const claimed = new Set(app.state.rewards.claimed);
  const nextLv = STATIONS.find((st) => st.lv > lv.level)?.lv;
  const tpl = document.createElement('template');
  tpl.innerHTML = persistHtml(roadNode(stationAt(lvl), lv, claimed, nextLv, full), 'nd');
  const node = tpl.content.firstElementChild;
  const g = GEO.list.find((x) => x.lv === lvl);
  const sl = scroller.scrollLeft;
  unwatchOff(el);
  el.replaceWith(node);
  watchOff([node]);
  // Außerhalb des Bildes gleich anhalten, nicht erst, wenn der Beobachter sich meldet.
  if (g.left + g.w < sl - OFF_MARGIN || g.left > sl + scroller.clientWidth + OFF_MARGIN) setAnimations(node, false);
  return node;
}

function fillLevels(scroller, levels) {
  for (const lvl of levels) {
    if (app.ui.roadFilled.has(lvl)) continue;
    const node = swapNode(scroller, lvl, true);
    if (!node) continue;
    app.ui.roadFilled.add(lvl);
  }
}

// Nur die Stationen in der Nähe sind voll gezeichnet. Was weit weg ist, wird wieder zur leeren Station.
// So bleibt die Seite klein, egal wie weit man scrollt.
let pinned = null;
let pinTimer = 0;
const NEAR = [-0.7, 1.7];
const FAR = [-2.2, 3.2];
const OFF_MARGIN = 60;
const centerOf = (lvl) => GEO.list.find((g) => g.lv === lvl).center;

// Ein Schritt: höchstens max Stationen zeichnen (die nächsten zuerst) und eine weit entfernte leeren.
// Gibt true zurück, wenn noch etwas zu tun ist.
function syncRoad(scroller, { max = 1, prune = true } = {}) {
  const w = scroller.clientWidth;
  const sl = scroller.scrollLeft;
  const mid = sl + w / 2;
  const want = inRange(sl + w * NEAR[0], sl + w * NEAR[1]).filter((lvl) => !app.ui.roadFilled.has(lvl))
    .sort((a, b) => Math.abs(centerOf(a) - mid) - Math.abs(centerOf(b) - mid));
  fillLevels(scroller, want.slice(0, max));
  let far = [];
  if (prune) {
    const keep = new Set(inRange(sl + w * FAR[0], sl + w * FAR[1]));
    far = [...app.ui.roadFilled].filter((lvl) => !keep.has(lvl) && lvl !== pinned);
    const lvl = far.sort((a, b) => Math.abs(centerOf(b) - mid) - Math.abs(centerOf(a) - mid))[0];
    if (lvl != null && swapNode(scroller, lvl, false)) app.ui.roadFilled.delete(lvl);
  }
  return want.length > max || far.length > 1;
}

// ---------- Look ----------
function lookCard(look) {
  return `<section class="card pad look-card">
    <div class="card-title"><h2>Dein Look</h2><button class="link-btn" data-act="look-open">Ändern</button></div>
    <div class="look-grid">
      ${TYPE_ORDER.map((t) => `<button class="look-tile" data-act="look-open" data-type="${t}">
        ${rewardOrb(look[t], { chip: false })}
        <span class="lt-text"><small>${esc(TYPES[t].name)}</small><b class="${t === 'sign' ? 'jp' : ''}">${esc(look[t].name)}</b></span>
      </button>`).join('')}
    </div>
    <button class="btn-ghost btn-block look-profile" data-act="go" data-to="profil">${icon('user')} Profil ansehen</button>
  </section>`;
}

function rulesCard() {
  return `<section class="card pad rules-card">
    <div class="card-title"><h2>So gibt es XP</h2></div>
    <ul class="rule-list">
      <li><span>Jeder Satz</span><b>10 XP + 1 pro Wdh.</b></li>
      <li><span>Gewichts-Bonus pro Satz</span><b>bis +${LIFT_XP * LIFT_CAP} XP</b></li>
      <li><span>Neuer Rekord</span><b>+${PR_XP} XP</b></li>
      <li><span>Tages-Quest</span><b>+${QUEST_XP} XP</b></li>
      <li><span>Ruhetag-Quest</span><b>+${REST_XP} XP</b></li>
      <li><span>Woche mit 3 Trainings</span><b>+${weekXp(1)}-${weekXp(9)} XP</b></li>
    </ul>
    <p class="rules-note">Jede Übung hat einen eigenen Maßstab aus typischen Werten, so zählen Beinpresse und Curls gleich fair. Ein Satz auf diesem Niveau bringt ${LIFT_XP} XP extra, schwerere Sätze mehr.</p>
    <p class="rules-note">Der Wochenbonus steigt mit deiner Serie. Alle ${SHIELD_EVERY} Serien-Wochen gibt es einen Serien-Schutz, höchstens ${SHIELD_MAX}. Schaffst du eine Woche nicht, rettet er deine Serie.</p>
  </section>`;
}

views.rang = {
  render() {
    const s = app.state;
    const lv = D().level;
    const look = equipped(s, lv.level);
    const ready = readyStations(s, lv.level);
    // Beim Öffnen nur die Stationen voll zeichnen, die man im ersten Bild sieht: um die eigene Position,
    // oder den Anfang, wenn die Kamera gleich vom Start aus losfährt. Den Rest zeichnen setupRoad und
    // syncRoad nach, in ruhigen Momenten und beim Scrollen.
    if (!app.ui.roadFilled || document.getElementById('view')?.dataset.route !== 'rang') {
      const w = estView();
      const home = homeScroll(lv, w);
      app.ui.roadFilled = new Set(willPan(home) ? inRange(0, w * 1.05) : inRange(home - w * 0.05, home + w * 1.05));
    }
    return `
    <header class="head has-back">
      <span class="jp-mark" aria-hidden="true">ランク</span>
      <div class="head-row"><button class="icon-btn back-btn" data-act="rank-back" aria-label="Zurück">${icon('left')}</button></div>
      <h1 style="margin-top:14px">Rang-Pfad</h1>
      <p class="sub">Level ${lv.level}, Rang ${esc(lv.rank)}</p>
    </header>
    <div class="stack">
      ${hero(lv, look, ready)}
      ${rankStrip(lv)}
      ${roadCard(s, lv, ready)}
      ${lookCard(look)}
      ${rulesCard()}
    </div>`;
  },
  after(main, params, { entering = false } = {}) {
    if (entering && !reduced()) main.querySelector('.rp-hero')?.classList.add('enter');
    setupRoad(main, entering);
    app.ui.justClaimed = null;
    if (entering) {
      maybeIntro('rang', [
        { sel: '.rp-hero', text: 'Hier stehen dein Rang und die XP bis zum nächsten Rang.' },
        { sel: '.road-card', text: 'Auf dem Pfad liegen Belohnungen. Ab dem Level darüber kannst du sie abholen.' },
        { sel: '.look-card', text: 'Abgeholtes legst du hier an. Es zeigt sich in der App und auf deinem Profil.' },
      ]);
    }
  },
};

// Zur eigenen Position scrollen, beim Scrollen Stationen nachzeichnen und weit entfernte leeren.
// Stationen außerhalb des Bildes halten ihre Animationen an (watchOff in core.js).
let panFrame = 0;
let panWait = 0;
let syncFrame = 0;
let idleSync = 0;
let panning = false;
const PAN_WAIT = 260;
const PAN_MAX = 700;
const hasIdle = typeof requestIdleCallback === 'function';
const idle = (fn) => (hasIdle ? requestIdleCallback(fn, { timeout: 200 }) : setTimeout(fn, 60));
const unidle = (id) => (hasIdle ? cancelIdleCallback(id) : clearTimeout(id));

// Beim langsamen Scrollen eine Station pro Bild nachzeichnen. Beim schnellen Wischen wird nichts gezeichnet,
// damit nichts ruckelt: Die Stationen zeigen dann kurz nur Level und Name, die Kugeln kommen dazu, sobald es
// ruhiger wird. Leeren (weit weg) nur in Ruhe, nie während gescrollt wird.
const FAST = 0.9; // Pixel pro Millisekunde
let lastX = 0;
let lastT = 0;
let quiet = 0;
function scheduleSync(scroller) {
  if (syncFrame) return;
  syncFrame = requestAnimationFrame(function step() {
    syncFrame = 0;
    if (!scroller.isConnected) return;
    if (syncRoad(scroller, { prune: false })) syncFrame = requestAnimationFrame(step);
  });
}

function onRoadScroll(scroller) {
  const now = performance.now();
  const x = scroller.scrollLeft;
  const dt = now - lastT;
  // Beim ersten Schritt einer Bewegung ist das Tempo noch unbekannt: dann erst einmal nichts zeichnen.
  const speed = dt > 0 && dt < 120 ? Math.abs(x - lastX) / dt : Infinity;
  lastX = x;
  lastT = now;
  app.ui.roadScroll = x;
  if (panning) return;
  if (speed < FAST) scheduleSync(scroller);
  else { cancelAnimationFrame(syncFrame); syncFrame = 0; }
  unidle(idleSync);
  clearTimeout(quiet);
  quiet = setTimeout(() => settle(scroller), 140);
}

function settle(scroller) {
  unidle(idleSync);
  const run = () => {
    if (!scroller.isConnected || panning) return;
    if (syncRoad(scroller, { max: 2 })) idleSync = idle(run);
  };
  idleSync = idle(run);
}

function setupRoad(main, entering) {
  const scroller = main.querySelector('[data-road-scroll]');
  const road = main.querySelector('[data-road]');
  if (!scroller || !road) return;
  watchOff(road.querySelectorAll('.node'));
  if (once(scroller, 'road')) scroller.addEventListener('scroll', () => onRoadScroll(scroller), { passive: true });
  if (!entering) return;
  const w = estView();
  const target = homeScroll(D().level, w);
  cancelAnimationFrame(panFrame);
  clearTimeout(panWait);
  panning = false;
  if (!willPan(target)) {
    scroller.scrollLeft = target;
    app.ui.roadScroll = target;
    road.classList.add('is-enter');
    settle(scroller);
    return;
  }
  // Beim ersten Öffnen fährt die Kamera am Pfad entlang bis zur eigenen Position. Vorher werden die
  // Stationen am Ziel und auf dem Weg dorthin gezeichnet, in kleinen Portionen, damit die App bedienbar bleibt
  // und die Fahrt flüssig. Die Kamera startet, sobald alles da ist (frühestens nach PAN_WAIT, spätestens nach
  // PAN_MAX). Bis dahin sind Leuchtlinie und Markierung versteckt (.is-wait), dann laufen ihre Animationen an.
  app.ui.roadIntro = true;
  panning = true;
  road.classList.add('is-wait');
  const dur = Math.min(1500, 700 + target * 0.35);
  const queue = [...new Set([...inRange(target + w * NEAR[0], target + w * NEAR[1]), ...inRange(0, target)])];
  const t0 = performance.now();
  let started = false;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const done = () => { panning = false; settle(scroller); };
  const go = () => {
    if (started || !scroller.isConnected) return;
    started = true;
    clearTimeout(panWait);
    road.classList.remove('is-wait');
    road.style.setProperty('--intro', dur + 'ms');
    road.classList.add('is-intro');
    const s0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - s0) / dur);
      scroller.scrollLeft = target * ease(t);
      if (t < 1) panFrame = requestAnimationFrame(step);
      else done();
    };
    panFrame = requestAnimationFrame(step);
  };
  const work = () => {
    if (!scroller.isConnected || started) return;
    fillLevels(scroller, queue.splice(0, 4));
    if (queue.length) idleSync = idle(work);
    else panWait = setTimeout(go, Math.max(0, PAN_WAIT - (performance.now() - t0)));
  };
  idleSync = idle(work);
  panWait = setTimeout(go, PAN_MAX);
  // Antippen hält die Kamera an, der Pfad bleibt, wo er ist.
  scroller.addEventListener('pointerdown', () => {
    clearTimeout(panWait);
    cancelAnimationFrame(panFrame);
    if (!started) { started = true; road.classList.remove('is-wait'); road.classList.add('is-enter'); }
    done();
  }, { once: true });
}

function scrollRoadTo(lvl) {
  const scroller = document.querySelector('[data-road-scroll]');
  const g = GEO.list.find((x) => x.lv === lvl);
  if (!scroller || !g) return;
  cancelAnimationFrame(panFrame);
  // Die Ziel-Station gleich voll zeichnen, damit sie beim Ankommen aufleuchtet. Unterwegs wird sie nicht
  // geleert, auch wenn sie am Anfang der Fahrt noch weit weg ist.
  pinned = lvl;
  clearTimeout(pinTimer);
  pinTimer = setTimeout(() => { pinned = null; }, 2000);
  fillLevels(scroller, [lvl]);
  const node = scroller.querySelector(`.node[data-lv="${lvl}"]`);
  setAnimations(node, true);
  const w = scroller.clientWidth;
  const left = clamp(g.center - w / 2, 0, Math.max(0, GEO.width - w));
  scroller.scrollTo({ left, behavior: reduced() ? 'auto' : 'smooth' });
  node.classList.remove('is-flash');
  void node.offsetWidth;
  node.classList.add('is-flash');
  const card = scroller.closest('.road-card');
  const r = card?.getBoundingClientRect();
  if (r && (r.top < 0 || r.bottom > window.innerHeight)) card.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
}

// ---------- Abholen ----------
// Daten fürs eigene Profilbild, damit neue Effekte gleich daran zu sehen sind.
const meInfo = () => {
  const lv = D().level;
  return { img: avatarUrl(), initial: app.state.profile?.name || '', frameId: equipped(app.state, lv.level).frame.id };
};

// Je seltener, desto stärker die Vibration.
const BUZZ = { n: [30], s: [40, 50, 60], e: [50, 60, 160], l: [60, 50, 60, 50, 260] };

function claimOne(lvl, onEquipped = null) {
  const st = stationAt(lvl);
  const lv = D().level;
  if (!st || st.lv <= 1 || st.lv > lv.level || app.state.rewards.claimed.includes(st.lv)) return;
  app.ui.justClaimed = [st.lv];
  claimStations([st.lv]);
  vibrate(BUZZ[topRarity(st.items).id]);
  rewardReveal({
    items: st.items,
    rankId: lv.rank,
    me: meInfo(),
    onEquip: () => {
      equipItems(st.items);
      toast(st.items.length > 1 ? 'Alles angelegt' : `${itemLabel(st.items[0])} angelegt`);
      onEquipped?.();
    },
  });
}

actions.claim = (ds) => claimOne(Number(ds.lv));
actions['claim-all'] = () => {
  const lv = D().level;
  const list = readyStations(app.state, lv.level);
  if (!list.length) return;
  if (list.length === 1) { claimOne(list[0].lv); return; }
  app.ui.justClaimed = list.map((st) => st.lv);
  claimStations(list.map((st) => st.lv));
  const items = list.flatMap((st) => st.items);
  vibrate(BUZZ[topRarity(items).id]);
  rewardSummary({ items, onLook: () => lookSheet() });
};
actions['road-to'] = (ds) => scrollRoadTo(Number(ds.lv));
actions['look-open'] = (ds) => lookSheet(ds.type || null);
actions['rank-back'] = () => { if (history.length > 1) history.back(); else navigate('start'); };

// ---------- Look ändern ----------
// Ein Fenster mit Vorschau oben (Mini-Profil), Reitern für die sechs Teile und den Optionen darunter.
// Antippen legt an, die Vorschau zeigt es sofort. Nichts baut sich neu auf: Nur geänderte Teile werden ersetzt.
const LEAD = {
  color: 'Die Neon-Farbe färbt die ganze App.',
  title: 'Der Titel steht unter deinem Namen.',
  frame: 'Der Rahmen liegt um dein Profilbild und dein Rang-Abzeichen.',
  sign: 'Das Neon-Schild leuchtet auf der Startseite und auf deinem Profil.',
  banner: 'Der Banner ist das große Bild oben in deinem Profil.',
  effect: 'Der Effekt liegt um dein Profilbild und über deiner Profilkarte.',
};

// Banner kommen erst dazu, wenn sie im Fenster zu sehen sind (watchBanners). So öffnet das Fenster sofort.
function optionPreview(it, rankId) {
  if (it.type === 'color' || it.type === 'effect') return rewardOrb(it, { chip: false });
  if (it.type === 'frame') return `<span class="lo-emb">${emblem(rankId, it.id, 46)}</span>`;
  if (it.type === 'banner') return `<span class="lo-bn" data-bn="${esc(it.id)}"></span>`;
  return '';
}

// Banner-Vorschauen im Fenster: zeichnen, sobald sie zu sehen sind (höchstens drei pro Bild),
// und ihre Animationen anhalten, solange sie aus dem Bild gescrollt sind.
let bannerWatch = null;
function watchBanners(box, root) {
  bannerWatch?.disconnect();
  const list = box.querySelectorAll('.lo-bn');
  if (!list.length || typeof IntersectionObserver === 'undefined') {
    list.forEach((b) => { if (b.dataset.bn) { b.innerHTML = bannerArt(b.dataset.bn); delete b.dataset.bn; } });
    return;
  }
  const queue = new Set();
  let frame = 0;
  const pump = () => {
    frame = 0;
    let n = 0;
    for (const b of queue) {
      queue.delete(b);
      if (b.isConnected && b.dataset.bn) {
        b.innerHTML = bannerArt(b.dataset.bn);
        delete b.dataset.bn;
        if (++n >= 3) break;
      }
    }
    if (queue.size) frame = requestAnimationFrame(pump);
  };
  const watch = new IntersectionObserver((entries) => {
    for (const e of entries) {
      setAnimations(e.target, e.isIntersecting);
      if (e.isIntersecting && e.target.dataset.bn) queue.add(e.target);
    }
    if (queue.size && !frame) frame = requestAnimationFrame(pump);
  }, { root, rootMargin: '160px 0px' });
  list.forEach((b) => watch.observe(b));
  bannerWatch = watch;
}

function optionState(it, ctx) {
  const has = owned(app.state, ctx.level, it);
  const ready = !has && it.lv <= ctx.level;
  const on = ctx.look[it.type].id === it.id;
  const rar = rarityOf(it);
  const label = on ? 'Aktiv' : has ? rar.name : ready ? 'Abholen' : `Ab Lv ${it.lv}`;
  const small = `${on ? icon('check') : has || ready ? '' : icon('lock')}${label}`;
  const aria = `${TYPES[it.type].name} ${itemLabel(it)}, ${rar.name}, Rang ${itemRank(it)}. ${on ? 'Angelegt' : has ? 'Antippen zum Anlegen' : ready ? 'Antippen zum Abholen' : `Gibt es ab Level ${it.lv}`}`;
  return { has, ready, on, rar, small, aria };
}

function lookOption(it, ctx) {
  const st = optionState(it, ctx);
  const nameCls = it.type === 'sign' ? 'jp' : it.type === 'title' ? `tt tt-${st.rar.id}` : '';
  return `<button class="look-opt lo-${it.type} rar-${st.rar.id} ${st.on ? 'is-on' : ''} ${st.has ? '' : st.ready ? 'is-ready' : 'is-locked'}" data-type="${it.type}" data-id="${it.id}" aria-pressed="${st.on}" aria-label="${esc(st.aria)}">
    ${rankChip(itemRank(it))}
    ${optionPreview(it, ctx.rank)}
    <span class="lo-name ${nameCls}">${esc(it.name)}</span>
    ${it.type === 'sign' ? `<span class="lo-de">${esc(it.de)}</span>` : ''}
    <small>${st.small}</small>
  </button>`;
}

// Mini-Profil als Vorschau: Banner mit Schild, Profilbild mit Rahmen und Effekt, Name und Titel.
function lookPreview() {
  const lv = D().level;
  const look = equipped(app.state, lv.level);
  const p = app.state.profile;
  const fx = effectParts(look.effect.id);
  return `<div class="lp rank-${esc(lv.rank)}" aria-hidden="true">
    <div class="lp-bn">${bannerArt(look.banner.id)}<span class="lp-sign sg-${rarityOf(look.sign).id} sign-${[...look.sign.name].length}">${esc(look.sign.name)}</span></div>
    ${fx.card ? `<div class="lp-cfx">${fx.card}</div>` : ''}
    <div class="lp-row">
      <span class="lp-av">${avatar({ frameId: look.frame.id, rankId: lv.rank, img: avatarUrl(), initial: p.name, size: 60, effect: look.effect.id })}</span>
      <span class="lp-txt"><b class="lp-name">${esc(p.name || 'Dein Name')}</b><span class="title-tag tt-${rarityOf(look.title).id}">${esc(look.title.name)}</span></span>
    </div>
  </div>`;
}

export function lookSheet(focusType = null) {
  let type = TYPE_ORDER.includes(focusType) ? focusType : TYPE_ORDER[0];
  const ctxNow = () => {
    const lv = D().level;
    return { level: lv.level, rank: lv.rank, look: equipped(app.state, lv.level) };
  };
  const counts = (t, ctx) => {
    const list = ITEMS.filter((it) => it.type === t);
    return `${list.filter((it) => owned(app.state, ctx.level, it)).length}/${list.length}`;
  };
  const optsHtml = (ctx) => ITEMS.filter((it) => it.type === type).map((it) => lookOption(it, ctx)).join('');
  const ctx0 = ctxNow();
  const el = openSheet(`
    <h2>Dein Look</h2>
    <div class="lp-wrap" data-preview>${lookPreview()}</div>
    <div class="lk-tabs" role="tablist" aria-label="Teil vom Look">
      ${TYPE_ORDER.map((t) => `<button class="lk-tab ${t === type ? 'is-on' : ''}" role="tab" data-tab="${t}" aria-selected="${t === type}">${esc(TYPES[t].name)}<small data-count="${t}">${counts(t, ctx0)}</small></button>`).join('')}
    </div>
    <p class="lead lk-lead" data-lead>${esc(LEAD[type])}</p>
    <div class="look-opts look-${type}" data-opts role="tabpanel">${optsHtml(ctx0)}</div>
    <p class="lk-foot">Neues holst du im Rang-Pfad ab.</p>`);
  const opts = el.querySelector('[data-opts]');
  const preview = el.querySelector('[data-preview]');
  watchBanners(opts, sheetBox());

  // Nach Anlegen oder Abholen: Zustände der Optionen, Zähler und Vorschau aktualisieren.
  const sync = () => {
    if (!el.isConnected) return;
    const ctx = ctxNow();
    opts.querySelectorAll('.look-opt').forEach((b) => {
      const it = ITEMS.find((x) => x.type === b.dataset.type && x.id === b.dataset.id);
      if (!it) return;
      const st = optionState(it, ctx);
      b.classList.toggle('is-on', st.on);
      b.classList.toggle('is-ready', !st.has && st.ready);
      b.classList.toggle('is-locked', !st.has && !st.ready);
      b.setAttribute('aria-pressed', String(st.on));
      b.setAttribute('aria-label', st.aria);
      const sm = b.querySelector('small');
      if (sm && sm.innerHTML !== st.small) sm.innerHTML = st.small;
    });
    el.querySelectorAll('[data-count]').forEach((c) => { c.textContent = counts(c.dataset.count, ctx); });
    const html = lookPreview();
    const h = hashStr(html);
    if (preview.dataset.h !== h) { preview.innerHTML = html; preview.dataset.h = h; }
  };
  preview.dataset.h = hashStr(lookPreview());

  el.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      if (tab.dataset.tab === type) return;
      type = tab.dataset.tab;
      el.querySelectorAll('[data-tab]').forEach((b) => {
        const on = b.dataset.tab === type;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', String(on));
      });
      el.querySelector('[data-lead]').textContent = LEAD[type];
      // Das Fenster wird nicht kürzer, sonst springt es nach oben, wenn ein Reiter weniger Optionen hat.
      const minH = Math.max(opts.offsetHeight, parseFloat(opts.style.minHeight) || 0);
      opts.style.minHeight = `${minH}px`;
      opts.className = `look-opts look-${type}`;
      opts.innerHTML = optsHtml(ctxNow());
      watchBanners(opts, sheetBox());
      return;
    }
    const b = e.target.closest('.look-opt');
    if (!b) return;
    const it = ITEMS.find((x) => x.type === b.dataset.type && x.id === b.dataset.id);
    if (!it) return;
    const cur = D().level;
    if (owned(app.state, cur.level, it)) {
      if (equipped(app.state, cur.level)[it.type].id !== it.id) equipItems([it]);
      sync();
    } else if (it.lv <= cur.level) {
      claimOne(it.lv, sync);
      sync();
    } else {
      toast(`${TYPES[it.type].name} ${itemLabel(it)} gibt es ab Level ${it.lv}.`);
    }
  });
}
