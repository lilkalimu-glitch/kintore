// Effekte: NEW PR!, Level-Up, Rang-Aufstieg, Belohnungen, Quest-Banner, Mission Complete, kurze Hinweise.
import { esc, kg, int, fmtDuration, icon } from './util.js';
import {
  TYPES, RARITIES, emblem, itemShowcase, rewardOrb, rankChip, itemLabel, itemRank, rankColor, rarityOf, rarityIndex, topRarity,
} from './look.js';
import { fireRow } from './art.js';

const root = () => document.getElementById('fx-root');
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const queue = [];
let busy = false;

function speedLines(color) {
  let lines = '';
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + (i % 2) * 0.02;
    const r0 = 150 + ((i * 37) % 70);
    const r1 = 520;
    const w = 1.2 + ((i * 13) % 5) * 0.7;
    lines += `<line x1="${(200 + Math.cos(a) * r0).toFixed(1)}" y1="${(400 + Math.sin(a) * r0).toFixed(1)}" x2="${(200 + Math.cos(a) * r1).toFixed(1)}" y2="${(400 + Math.sin(a) * r1).toFixed(1)}" stroke-width="${w}"/>`;
  }
  return `<svg class="fx-lines" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="--lc:${color}">${lines}</svg>`;
}

function sparkles() {
  const spots = [[14, 22], [82, 18], [8, 64], [90, 58], [24, 84], [74, 86], [50, 12], [60, 76]];
  return spots.map(([x, y], i) => `<span class="fx-spark" style="left:${x}%;top:${y}%;--d:${i * 70}ms">✦</span>`).join('');
}

// lockMs: so lange zählt Antippen nicht, damit der Auftakt seltener Belohnungen nicht weggetippt wird.
function show(html, { autoClose = 2600, cls = '', style = '', onAct = null, lockMs = 0 } = {}) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'fx ' + cls + (reduced() ? ' fx-still' : '');
    el.setAttribute('role', 'alert');
    if (style) el.setAttribute('style', style);
    el.innerHTML = html;
    root().appendChild(el);
    const t0 = performance.now();
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      el.classList.add('fx-out');
      setTimeout(() => { el.remove(); resolve(); }, 260);
    };
    el.addEventListener('click', (e) => {
      if (lockMs && !reduced() && performance.now() - t0 < lockMs) return;
      const act = e.target.closest('[data-fx-act]');
      if (act) { close(); onAct?.(act.dataset.fxAct); return; }
      if (e.target.closest('[data-fx-keep]')) return;
      close();
    });
    el.querySelectorAll('[data-fx-close]').forEach((b) => b.addEventListener('click', close));
    if (autoClose) setTimeout(close, autoClose);
  });
}

async function run() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const job = queue.shift();
    await job();
  }
  busy = false;
}
const enqueue = (job) => { queue.push(job); run(); };

const rewardLine = (rewards) => {
  if (!rewards?.length) return '';
  const what = rewards.length > 2 ? `${rewards.length} Belohnungen` : rewards.map((r) => `${TYPES[r.type].name} ${itemLabel(r)}`).join(', ');
  return `<div class="fx-reward">${icon('gift')}<span>Neu im Rang-Pfad: ${esc(what)}</span></div>`;
};

export function prBurst({ name, w, r, bw, e1, gain }) {
  enqueue(() => show(`
    ${speedLines('#FFA586')}
    <div class="fx-tone" aria-hidden="true"></div>
    ${sparkles()}
    <div class="fx-card fx-card-pr">
      <div class="fx-jp" aria-hidden="true">新記録</div>
      <div class="fx-big">NEW PR!</div>
      <div class="fx-ex">${esc(name)}</div>
      <div class="fx-val">${bw ? (w > 0 ? '+' + kg(w) + ' kg' : 'Körpergewicht') : kg(w) + ' kg'} × ${r}</div>
      <div class="fx-sub">1RM ${kg(Math.round(e1 * 10) / 10)} kg${gain > 0.05 ? ` <em>+${kg(Math.round(gain * 10) / 10)}</em>` : ''}</div>
      <div class="fx-xp">+50 XP</div>
    </div>`, { cls: 'fx-pr' }));
}

export function levelUp({ level, rank, rewards = [] }) {
  enqueue(() => show(`
    ${speedLines('#3CF0FF')}
    <div class="fx-tone" aria-hidden="true"></div>
    ${sparkles()}
    <div class="fx-card fx-card-lv">
      <div class="fx-jp" aria-hidden="true">レベルアップ</div>
      <div class="fx-big">LEVEL UP!</div>
      <div class="fx-val">Level ${level}</div>
      <div class="fx-sub">Rang ${esc(rank)}</div>
      ${rewardLine(rewards)}
    </div>`, { cls: 'fx-lv', autoClose: rewards.length ? 3200 : 2800 }));
}

// Rang-Aufstieg: altes Abzeichen lädt auf und zerfällt, das neue erscheint mit Lichtstrahlen.
export function rankUp({ from, to, level, frame = 'hex', rewards = [] }) {
  enqueue(() => show(`
    <div class="rk-rays" aria-hidden="true"></div>
    <div class="fx-tone" aria-hidden="true"></div>
    <div class="rk-flash" aria-hidden="true"></div>
    <div class="rk-wrap">
      <div class="rk-stage" aria-hidden="true">
        <div class="rk-old">${emblem(from, frame, 112)}</div>
        <div class="rk-wave"></div>
        <div class="rk-new">${emblem(to, frame, 136)}</div>
      </div>
      <div class="rk-copy">
        <div class="fx-jp" aria-hidden="true">ランクアップ</div>
        <div class="fx-big">RANK UP!</div>
        <div class="rk-name">Rang <b class="rank-inline rank-${esc(to)}">${esc(to)}</b><span>Level ${level}</span></div>
        ${rewardLine(rewards)}
      </div>
      <div class="rk-hint">Antippen zum Schließen</div>
    </div>`, { cls: 'fx-rank', autoClose: rewards.length ? 3600 : 3000, style: `--rc0:${rankColor(from)};--rc1:${rankColor(to)}` }));
}

// Auftakt je nach Seltenheit: Episch lädt kurz auf, Legendär mit Flammen und Funken.
function rarityIntro(r) {
  if (r !== 'e' && r !== 'l') return '';
  return `<div class="rw-charge" aria-hidden="true"><i></i><b></b></div><div class="rw-flash" aria-hidden="true"></div>
    ${r === 'l' ? `<div class="rw-fire" aria-hidden="true">${fireRow(11, 5)}</div><div class="rw-embers" aria-hidden="true">${emberRain()}</div>` : ''}`;
}
const LOCK = { n: 0, s: 0, e: 950, l: 1500 };

function emberRain() {
  let out = '';
  for (let i = 0; i < 18; i++) out += `<i style="left:${(i * 53) % 100}%;--t:${(2 + ((i * 7) % 10) / 6).toFixed(2)}s;--d:${(1.2 + ((i * 13) % 20) / 10).toFixed(2)}s;--dx:${((i * 17) % 40) - 20}px"></i>`;
  return out;
}

const rarityHead = (top, rk) => `<div class="rw-head"><span class="rw-rar">${esc(top.name)}</span><span class="rw-from">${rankChip(rk)}aus Rang ${esc(rk)}</span></div>`;

// Eine Station abholen: Belohnung zeigen, auf Wunsch direkt anlegen.
// me: eigenes Profilbild, damit ein neuer Effekt gleich daran zu sehen ist.
export function rewardReveal({ items, rankId, me = {}, onEquip }) {
  const top = topRarity(items);
  const rk = itemRank(items[0]);
  enqueue(() => show(`
    ${rarityIntro(top.id)}
    <div class="rw-rays" aria-hidden="true"></div>
    <div class="fx-tone" aria-hidden="true"></div>
    ${sparkles()}
    <div class="fx-card fx-card-rw" data-fx-keep>
      ${rarityHead(top, rk)}
      <div class="fx-jp" aria-hidden="true">${esc(top.jp)}</div>
      <div class="rw-show ${items.length > 1 ? 'multi' : ''}">
        ${items.map((it) => `<figure>${itemShowcase(it, rankId, me)}<figcaption><small>${esc(TYPES[it.type].name)}</small><b>${esc(itemLabel(it))}</b></figcaption></figure>`).join('')}
      </div>
      <div class="row-actions">
        <button class="btn-ghost" data-fx-close>Später</button>
        <button class="btn-neon" data-fx-act="equip">Anlegen</button>
      </div>
    </div>`, { cls: `fx-rw rw-${top.id}`, autoClose: 0, lockMs: LOCK[top.id], onAct: (act) => { if (act === 'equip') onEquip?.(); } }));
}

// Mehrere Stationen auf einmal abholen. Die seltensten stehen oben.
export function rewardSummary({ items, onLook }) {
  const top = topRarity(items);
  const sorted = [...items].sort((a, b) => rarityIndex(b) - rarityIndex(a) || b.lv - a.lv);
  const counts = RARITIES.map((r) => [r, items.filter((it) => rarityOf(it).id === r.id).length]).filter(([, n]) => n).reverse();
  enqueue(() => show(`
    ${rarityIntro(top.id)}
    <div class="rw-rays" aria-hidden="true"></div>
    <div class="fx-tone" aria-hidden="true"></div>
    ${sparkles()}
    <div class="fx-card fx-card-rw" data-fx-keep>
      <div class="fx-jp" aria-hidden="true">報酬</div>
      <div class="fx-big fx-big-sm">${items.length} Belohnungen</div>
      <div class="rw-counts">${counts.map(([r, n]) => `<span class="rar-${r.id}"><i></i>${n} ${esc(r.name)}</span>`).join('')}</div>
      <ul class="rw-list">
        ${sorted.map((it, i) => `<li class="rar-${rarityOf(it).id}" style="--i:${Math.min(i, 12)}">${rewardOrb(it, { chip: false, cls: 'is-done' })}<span><small>${esc(TYPES[it.type].name)}</small><b>${esc(itemLabel(it))}</b></span><em>${esc(rarityOf(it).name)}</em>${rankChip(itemRank(it))}</li>`).join('')}
      </ul>
      <div class="row-actions">
        <button class="btn-ghost" data-fx-close>Ok</button>
        <button class="btn-neon" data-fx-act="look">Look ändern</button>
      </div>
    </div>`, { cls: `fx-rw rw-${top.id} rw-sum`, autoClose: 0, lockMs: LOCK[top.id], onAct: (act) => { if (act === 'look') onLook?.(); } }));
}

// Kleines Banner oben (blockiert nichts), z. B. Tages-Quest geschafft.
export function banner({ jp, text, xp }) {
  enqueue(() => new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'fx-banner' + (reduced() ? ' fx-still' : '');
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="fb-jp" aria-hidden="true">${esc(jp)}</span><b>${esc(text)}</b><em>+${int(xp)} XP</em>`;
    root().appendChild(el);
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      el.classList.add('fb-out');
      setTimeout(() => { el.remove(); resolve(); }, 240);
    };
    el.addEventListener('click', close);
    setTimeout(close, 2300);
  }));
}

export function missionComplete({ title, dur, sets, vol, prs, xp }) {
  enqueue(() => show(`
    <div class="fx-tone" aria-hidden="true"></div>
    <div class="fx-card fx-card-mc" data-fx-keep>
      <div class="fx-jp" aria-hidden="true">任務完了</div>
      <div class="fx-big fx-big-sm">Training geschafft</div>
      <div class="fx-ex">${esc(title)}</div>
      <dl class="mc-grid">
        <div><dt>Dauer</dt><dd>${dur ? esc(fmtDuration(dur)) : '-'}</dd></div>
        <div><dt>Sätze</dt><dd>${sets}</dd></div>
        <div><dt>Volumen</dt><dd>${int(vol)} kg</dd></div>
        <div><dt>Rekorde</dt><dd>${prs}</dd></div>
      </dl>
      <div class="fx-xp">+${int(xp)} XP</div>
      <button class="btn-neon btn-block" data-fx-close>Fertig</button>
    </div>`, { cls: 'fx-mc', autoClose: 0 }));
}

let toastTimer = null;
export function toast(msg, action = null) {
  const el = document.getElementById('toast-root');
  clearTimeout(toastTimer);
  el.innerHTML = `<div class="toast"><span>${esc(msg)}</span>${action ? `<button class="toast-btn">${esc(action.label)}</button>` : ''}</div>`;
  if (action) el.querySelector('.toast-btn').addEventListener('click', () => { el.innerHTML = ''; action.run(); });
  toastTimer = setTimeout(() => { el.innerHTML = ''; }, action ? 5200 : 3200);
}
