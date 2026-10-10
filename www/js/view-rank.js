// Rang-Pfad: alle Ränge von E bis SS, Belohnungen zum Abholen und der eigene Look.
import { app, D, views, actions, navigate, openSheet } from './core.js';
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

function roadNode(st, lv, claimed, nextLv) {
  const reached = st.lv <= lv.level;
  let state = 'locked';
  if (st.lv === 1) state = 'done';
  else if (reached) state = claimed.has(st.lv) ? 'done' : 'ready';
  else if (st.lv === nextLv) state = 'next';
  const rar = st.items.length ? topRarity(st.items).id : 'n';
  const orb = st.rank
    ? `<span class="n-emb">${emblem(st.rank.id, 'hex', 64)}</span>`
    : rewardOrb(st.items[0]);
  const badge = state === 'done' && st.lv > 1 ? `<span class="n-badge ok">${icon('check')}</span>`
    : state === 'locked' || state === 'next' ? `<span class="n-badge">${icon('lock')}</span>` : '';
  const foot = state === 'ready'
    ? `<button class="btn-claim small" data-act="claim" data-lv="${st.lv}">Abholen</button>`
    : state === 'next' ? `<span class="n-next">Noch ${int(xpAt(st.lv) - lv.xp)} XP</span>` : '';
  const just = app.ui.justClaimed?.includes(st.lv) ? 'just-claimed' : '';
  return `<div class="node ${st.rank ? `is-rank rank-${esc(st.rank.id)}` : ''} nr-${rar} st-${state} ${just}" data-lv="${st.lv}">
    <div class="n-lv">Lv ${st.lv}</div>
    <div class="n-orb">${orb}${badge}</div>
    <div class="n-text">${nodeText(st)}</div>
    ${foot}
  </div>`;
}

const rarityLegend = () => `<div class="rar-legend" aria-label="Seltenheit">${RARITIES.map((r) => `<span class="rar-${r.id}"><i></i>${esc(r.name)}</span>`).join('')}</div>`;

function roadCard(s, lv, ready) {
  const claimed = new Set(s.rewards.claimed);
  const next = STATIONS.find((st) => st.lv > lv.level) || null;
  return `<section class="card road-card">
    <div class="card-title"><h2>Pfad</h2><span class="hint">${ready.length ? `${plural(ready.length, 'Belohnung', 'Belohnungen')} bereit` : next ? `Nächste bei Level ${next.lv}` : 'Alles freigeschaltet'}</span></div>
    <div class="road-scroll" data-road-scroll>
      <div class="road" data-road>
        <div class="road-line" aria-hidden="true"></div>
        <div class="road-lit" aria-hidden="true"><i></i></div>
        ${STATIONS.map((st) => persistHtml(roadNode(st, lv, claimed, next?.lv), 'nd')).join('')}
        <div class="road-you" aria-hidden="true"><span class="ry-chip">LV ${lv.level}</span><span class="ry-dot"></span></div>
      </div>
    </div>
    ${rarityLegend()}
  </section>`;
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

function optionPreview(it, rankId) {
  if (it.type === 'color' || it.type === 'effect') return rewardOrb(it, { chip: false });
  if (it.type === 'frame') return `<span class="lo-emb">${emblem(rankId, it.id, 46)}</span>`;
  if (it.type === 'banner') return `<span class="lo-bn">${bannerArt(it.id)}</span>`;
  return '';
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
