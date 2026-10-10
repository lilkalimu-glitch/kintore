// Rang-Pfad: alle Ränge von E bis SS, Belohnungen zum Abholen und der eigene Look.
import { app, D, views, actions, navigate, openSheet } from './core.js';
import { esc, icon, int, clamp } from './util.js';
import { RANKS, xpAt, PR_XP, QUEST_XP, REST_XP, weekXp, SHIELD_EVERY, SHIELD_MAX } from './stats.js';
import { STATIONS, TYPES, TYPE_ORDER, ITEMS, emblem, itemOrb, itemLabel, equipped, readyStations, owned, stationAt } from './look.js';
import { claimStations, equipItems } from './ops.js';
import { rewardReveal, rewardSummary, toast } from './fx.js';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// ---------- Kopf: aktueller Rang ----------
function hero(lv, look, ready) {
  const nr = lv.nextRank;
  const pct = (clamp(lv.rankProgress, 0, 1) * 100).toFixed(1);
  return `<section class="card rp-hero rank-${esc(lv.rank)}">
    <div class="rp-top">
      <div class="rp-emb">${emblem(lv.rank, look.frame.id, 96)}</div>
      <div class="rp-info">
        <small>Dein Rang</small>
        <h2>Rang <span class="rank-inline rank-${esc(lv.rank)}">${esc(lv.rank)}</span></h2>
        <div class="title-tag">${esc(look.title.name)}</div>
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

function roadNode(st, lv, claimed, nextLv) {
  const reached = st.lv <= lv.level;
  let state = 'locked';
  if (st.lv === 1) state = 'done';
  else if (reached) state = claimed.has(st.lv) ? 'done' : 'ready';
  else if (st.lv === nextLv) state = 'next';
  const orb = st.rank
    ? `<span class="n-emb">${emblem(st.rank.id, 'hex', 64)}</span>`
    : `<span class="orb">${itemOrb(st.items[0])}</span>`;
  const badge = state === 'done' && st.lv > 1 ? `<span class="n-badge ok">${icon('check')}</span>`
    : state === 'locked' || state === 'next' ? `<span class="n-badge">${icon('lock')}</span>` : '';
  const foot = state === 'ready'
    ? `<button class="btn-claim small" data-act="claim" data-lv="${st.lv}">Abholen</button>`
    : state === 'next' ? `<span class="n-next">Noch ${int(xpAt(st.lv) - lv.xp)} XP</span>` : '';
  const just = app.ui.justClaimed?.includes(st.lv) ? 'just-claimed' : '';
  return `<div class="node ${st.rank ? `is-rank rank-${esc(st.rank.id)}` : ''} st-${state} ${just}" data-lv="${st.lv}">
    <div class="n-lv">Lv ${st.lv}</div>
    <div class="n-orb">${orb}${badge}</div>
    <div class="n-text">${nodeText(st)}</div>
    ${foot}
  </div>`;
}

function roadCard(s, lv, ready) {
  const claimed = new Set(s.rewards.claimed);
  const next = STATIONS.find((st) => st.lv > lv.level) || null;
  return `<section class="card road-card">
    <div class="card-title"><h2>Pfad</h2><span class="hint">${ready.length ? `${plural(ready.length, 'Belohnung', 'Belohnungen')} bereit` : next ? `Nächste bei Level ${next.lv}` : 'Alles freigeschaltet'}</span></div>
    <div class="road-scroll" data-road-scroll>
      <div class="road" data-road>
        <div class="road-line" aria-hidden="true"></div>
        <div class="road-lit" aria-hidden="true"><i></i></div>
        ${STATIONS.map((st) => roadNode(st, lv, claimed, next?.lv)).join('')}
        <div class="road-you" aria-hidden="true"><span class="ry-chip">LV ${lv.level}</span><span class="ry-dot"></span></div>
      </div>
    </div>
  </section>`;
}

// ---------- Look ----------
function lookCard(look) {
  return `<section class="card pad look-card">
    <div class="card-title"><h2>Dein Look</h2><button class="link-btn" data-act="look-open">Ändern</button></div>
    <div class="look-grid">
      ${TYPE_ORDER.map((t) => `<button class="look-tile" data-act="look-open" data-type="${t}">
        <span class="orb">${itemOrb(look[t])}</span>
        <span class="lt-text"><small>${esc(TYPES[t].name)}</small><b class="${t === 'sign' ? 'jp' : ''}">${esc(look[t].name)}</b></span>
      </button>`).join('')}
    </div>
  </section>`;
}

function rulesCard() {
  return `<section class="card pad rules-card">
    <div class="card-title"><h2>So gibt es XP</h2></div>
    <ul class="rule-list">
      <li><span>Jeder Satz</span><b>10 XP + 1 pro Wdh.</b></li>
      <li><span>Neuer Rekord</span><b>+${PR_XP} XP</b></li>
      <li><span>Tages-Quest</span><b>+${QUEST_XP} XP</b></li>
      <li><span>Ruhetag-Quest</span><b>+${REST_XP} XP</b></li>
      <li><span>Woche mit 3 Trainings</span><b>+${weekXp(1)}-${weekXp(9)} XP</b></li>
    </ul>
    <p class="rules-note">Der Wochenbonus steigt mit deiner Serie. Alle ${SHIELD_EVERY} Serien-Wochen gibt es einen Serien-Schutz, höchstens ${SHIELD_MAX}. Schaffst du eine Woche nicht, rettet er deine Serie.</p>
  </section>`;
}

views.rang = {
  render() {
    const s = app.state;
    const lv = D().level;
    const look = equipped(s, lv.level);
    const ready = readyStations(s, lv.level);
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
  },
};

// Position der Knoten messen, Leuchtlinie und Markierung setzen, zur eigenen Position scrollen.
let panFrame = 0;
function setupRoad(main, entering) {
  const scroller = main.querySelector('[data-road-scroll]');
  const road = main.querySelector('[data-road]');
  if (!scroller || !road) return;
  const nodes = [...road.querySelectorAll('.node')];
  if (!nodes.length) return;
  const lv = D().level;
  const centers = nodes.map((n) => n.offsetLeft + n.offsetWidth / 2);
  const radius = nodes.map((n) => (n.classList.contains('is-rank') ? 36 : 28));
  const lvls = nodes.map((n) => Number(n.dataset.lv));
  let a = 0;
  for (let i = 0; i < lvls.length; i++) if (lvls[i] <= lv.level) a = i;
  const b = a + 1;
  const f = b < lvls.length ? clamp((lv.xp - xpAt(lvls[a])) / (xpAt(lvls[b]) - xpAt(lvls[a])), 0, 1) : 0;
  // Die Markierung bleibt in der Lücke zwischen zwei Stationen, damit sie nichts verdeckt.
  let xm = centers[a];
  if (b < lvls.length) {
    const from = centers[a] + radius[a];
    const to = centers[b] - radius[b];
    xm = to > from ? from + f * (to - from) : (centers[a] + centers[b]) / 2;
  }
  road.style.setProperty('--x0', centers[0] + 'px');
  road.style.setProperty('--x1', centers[centers.length - 1] + 'px');
  road.style.setProperty('--xm', xm + 'px');
  road.classList.toggle('is-max', b >= lvls.length);

  const target = clamp(xm - scroller.clientWidth * 0.45, 0, scroller.scrollWidth - scroller.clientWidth);
  cancelAnimationFrame(panFrame);
  scroller.addEventListener('scroll', () => { app.ui.roadScroll = scroller.scrollLeft; }, { passive: true });
  if (!entering) {
    scroller.scrollLeft = app.ui.roadScroll ?? target;
    return;
  }
  // Beim ersten Öffnen fährt die Kamera am Pfad entlang bis zur eigenen Position.
  if (app.ui.roadIntro || reduced() || target < 40) {
    scroller.scrollLeft = target;
    app.ui.roadScroll = target;
    road.classList.add('is-enter');
    return;
  }
  app.ui.roadIntro = true;
  road.classList.add('is-intro');
  const dur = Math.min(1500, 700 + target * 0.35);
  road.style.setProperty('--intro', dur + 'ms');
  const t0 = performance.now();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const stop = () => cancelAnimationFrame(panFrame);
  scroller.addEventListener('pointerdown', stop, { once: true });
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    scroller.scrollLeft = target * ease(t);
    if (t < 1) panFrame = requestAnimationFrame(step);
  };
  panFrame = requestAnimationFrame(step);
}

function scrollRoadTo(lvl) {
  const scroller = document.querySelector('[data-road-scroll]');
  const node = scroller?.querySelector(`.node[data-lv="${lvl}"]`);
  if (!node) return;
  cancelAnimationFrame(panFrame);
  const left = clamp(node.offsetLeft + node.offsetWidth / 2 - scroller.clientWidth / 2, 0, scroller.scrollWidth - scroller.clientWidth);
  scroller.scrollTo({ left, behavior: reduced() ? 'auto' : 'smooth' });
  node.classList.remove('is-flash');
  void node.offsetWidth;
  node.classList.add('is-flash');
  const card = scroller.closest('.road-card');
  const r = card?.getBoundingClientRect();
  if (r && (r.top < 0 || r.bottom > window.innerHeight)) card.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
}

// ---------- Abholen ----------
function claimOne(lvl, onEquipped = null) {
  const st = stationAt(lvl);
  const lv = D().level;
  if (!st || st.lv <= 1 || st.lv > lv.level || app.state.rewards.claimed.includes(st.lv)) return;
  app.ui.justClaimed = [st.lv];
  claimStations([st.lv]);
  rewardReveal({
    items: st.items,
    rankId: lv.rank,
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
  rewardSummary({ items: list.flatMap((st) => st.items), onLook: () => lookSheet() });
};
actions['road-to'] = (ds) => scrollRoadTo(Number(ds.lv));
actions['look-open'] = (ds) => lookSheet(ds.type || null);
actions['rank-back'] = () => { if (history.length > 1) history.back(); else navigate('start'); };

// ---------- Look ändern ----------
function optionPreview(it, rankId) {
  if (it.type === 'color') return `<span class="orb">${itemOrb(it)}</span>`;
  if (it.type === 'frame') return `<span class="lo-emb">${emblem(rankId, it.id, 46)}</span>`;
  return '';
}

function lookOption(it, ctx) {
  const has = owned(app.state, ctx.level, it);
  const ready = !has && it.lv <= ctx.level;
  const on = ctx.look[it.type].id === it.id;
  const state = on ? 'Aktiv' : has ? '' : ready ? 'Abholen' : `Lv ${it.lv}`;
  return `<button class="look-opt lo-${it.type} ${on ? 'is-on' : ''} ${has ? '' : ready ? 'is-ready' : 'is-locked'}" data-type="${it.type}" data-id="${it.id}" aria-pressed="${on}">
    ${optionPreview(it, ctx.rank)}
    <span class="lo-name ${it.type === 'sign' ? 'jp' : ''}">${esc(it.name)}</span>
    ${it.type === 'sign' ? `<span class="lo-de">${esc(it.de)}</span>` : ''}
    ${state ? `<small>${has || ready ? '' : icon('lock')}${state}</small>` : ''}
  </button>`;
}

export function lookSheet(focusType = null) {
  const content = () => {
    const lv = D().level;
    const ctx = { level: lv.level, rank: lv.rank, look: equipped(app.state, lv.level) };
    return `
      <h2>Dein Look</h2>
      <p class="lead">Neues holst du im Rang-Pfad ab.</p>
      ${TYPE_ORDER.map((t) => `<div class="look-sec" data-sec="${t}">
        <h3>${esc(TYPES[t].plural)}</h3>
        <div class="look-opts look-${t}">${ITEMS.filter((it) => it.type === t).map((it) => lookOption(it, ctx)).join('')}</div>
      </div>`).join('')}`;
  };
  const el = openSheet(content());
  const refresh = () => {
    if (!el.isConnected) return;
    const top = el.scrollTop;
    el.innerHTML = `<div class="sheet-grip" aria-hidden="true"></div>${content()}`;
    el.scrollTop = top;
  };
  if (focusType) el.querySelector(`[data-sec="${focusType}"]`)?.scrollIntoView({ block: 'start' });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    const it = ITEMS.find((x) => x.type === b.dataset.type && x.id === b.dataset.id);
    if (!it) return;
    const cur = D().level;
    if (owned(app.state, cur.level, it)) {
      equipItems([it]);
      refresh();
    } else if (it.lv <= cur.level) {
      claimOne(it.lv, refresh);
      refresh();
    } else {
      toast(`${TYPES[it.type].name} ${itemLabel(it)} gibt es ab Level ${it.lv}.`);
    }
  });
}
