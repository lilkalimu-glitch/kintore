// Pausen-Timer: läuft über die Endzeit, damit er auch nach dem Sperren des Handys stimmt.
import { ring } from './charts.js';
import { fmtClock, icon } from './util.js';
import { vibrate, haptic, scheduleRest, cancelRest } from './native.js';

const KEY = 'kintore:timer';
let t = null; // { end, total, label, fired }
let tick = null;
let doneTimeout = null;
let getSettings = () => ({});

export function initTimer(settingsGetter) {
  getSettings = settingsGetter;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.end > Date.now() - 5000) { t = saved; loop(); }
  } catch {}
  document.getElementById('timer').addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    const a = b.dataset.t;
    if (a === 'minus') adjust(-15);
    else if (a === 'plus') adjust(15);
    else if (a === 'stop') stopTimer();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) paint(); });
}

const save = () => { try { t ? localStorage.setItem(KEY, JSON.stringify(t)) : localStorage.removeItem(KEY); } catch {} };

export function startTimer(seconds, label = '') {
  const s = getSettings();
  t = { end: Date.now() + seconds * 1000, total: seconds, label, fired: false };
  save();
  if (s.restNotify !== false) scheduleRest(t.end, label ? `Nächster Satz: ${label}` : 'Weiter geht’s!');
  loop();
}

export function stopTimer() {
  t = null;
  save();
  cancelRest();
  clearInterval(tick);
  tick = null;
  clearTimeout(doneTimeout);
  paint();
}

function adjust(delta) {
  if (!t) return;
  haptic('LIGHT');
  if (t.fired) { t.fired = false; t.end = Date.now(); t.total = 0; }
  t.end += delta * 1000;
  t.total = Math.max(1, t.total + delta);
  if (t.end <= Date.now()) { stopTimer(); return; }
  save();
  const s = getSettings();
  if (s.restNotify !== false) scheduleRest(t.end, t.label ? `Nächster Satz: ${t.label}` : 'Weiter geht’s!');
  loop();
}

function loop() {
  clearInterval(tick);
  tick = setInterval(paint, 250);
  paint();
}

function paint() {
  const el = document.getElementById('timer');
  if (!el) return;
  if (!t) {
    el.hidden = true;
    el.classList.remove('is-done');
    document.body.classList.remove('has-timer');
    return;
  }
  const left = (t.end - Date.now()) / 1000;
  if (left <= 0 && !t.fired) {
    t.fired = true;
    save();
    const s = getSettings();
    if (s.restVibrate !== false) vibrate([380, 160, 380, 160, 380]);
    if (!document.hidden) cancelRest();
    clearTimeout(doneTimeout);
    doneTimeout = setTimeout(stopTimer, 6000);
  }
  el.hidden = false;
  document.body.classList.add('has-timer');
  el.classList.toggle('is-done', !!t.fired);
  if (!el.querySelector('.t-main')) {
    el.innerHTML = `${ring(0, 44, 4)}
      <div class="t-main"><span class="t-time"></span><span class="t-label"></span></div>
      <button class="t-btn" data-t="minus" aria-label="15 Sekunden weniger">−15</button>
      <button class="t-btn" data-t="plus" aria-label="15 Sekunden mehr">+15</button>
      <button class="t-btn" data-t="stop" aria-label="Timer beenden">${icon('x')}</button>`;
  }
  const progress = t.fired ? 1 : Math.min(1, Math.max(0, 1 - left / t.total));
  const bar = el.querySelector('.ring-bar');
  const c = parseFloat(bar.getAttribute('stroke-dasharray'));
  bar.setAttribute('stroke-dashoffset', (c * (1 - progress)).toFixed(2));
  el.querySelector('.t-time').textContent = t.fired ? 'Los!' : fmtClock(left);
  el.querySelector('.t-label').textContent = t.fired ? 'Pause vorbei' : t.label || 'Pause';
}

export const timerRunning = () => !!t && !t.fired;
