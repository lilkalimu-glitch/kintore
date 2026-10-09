// Effekte: NEW PR!, Level-Up, Mission Complete, kurze Hinweise.
import { esc, kg, int, fmtDuration } from './util.js';

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

function show(html, { autoClose = 2600, cls = '' } = {}) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'fx ' + cls + (reduced() ? ' fx-still' : '');
    el.setAttribute('role', 'alert');
    el.innerHTML = html;
    root().appendChild(el);
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      el.classList.add('fx-out');
      setTimeout(() => { el.remove(); resolve(); }, 260);
    };
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-fx-keep]')) return;
      close();
    });
    el.querySelector('[data-fx-close]')?.addEventListener('click', close);
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
      <div class="fx-sub">Geschätztes Maximum ${kg(Math.round(e1 * 10) / 10)} kg${gain > 0.05 ? ` <em>+${kg(Math.round(gain * 10) / 10)}</em>` : ''}</div>
      <div class="fx-xp">+50 XP</div>
    </div>`, { cls: 'fx-pr' }));
}

export function levelUp({ level, rank, rankUp }) {
  enqueue(() => show(`
    ${speedLines('#3CF0FF')}
    <div class="fx-tone" aria-hidden="true"></div>
    ${sparkles()}
    <div class="fx-card fx-card-lv">
      <div class="fx-jp" aria-hidden="true">${rankUp ? 'ランクアップ' : 'レベルアップ'}</div>
      <div class="fx-big">${rankUp ? 'RANK UP!' : 'LEVEL UP!'}</div>
      <div class="fx-val">Level ${level}</div>
      <div class="fx-sub">${rankUp ? `Neuer Rang: <b class="rank-inline rank-${esc(rank)}">${esc(rank)}</b>` : `Rang ${esc(rank)}`}</div>
    </div>`, { cls: 'fx-lv', autoClose: 2800 }));
}

export function missionComplete({ title, dur, sets, vol, prs, xp }) {
  enqueue(() => show(`
    <div class="fx-tone" aria-hidden="true"></div>
    <div class="fx-card fx-card-mc" data-fx-keep>
      <div class="fx-jp" aria-hidden="true">任務完了</div>
      <div class="fx-big fx-big-sm">Training geschafft</div>
      <div class="fx-ex">${esc(title)}</div>
      <dl class="mc-grid">
        <div><dt>Dauer</dt><dd>${dur ? esc(fmtDuration(dur)) : '–'}</dd></div>
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
