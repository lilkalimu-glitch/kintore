// Versteckte Tempo-Messung (seit 2.11): siebenmal auf die Version in den Einstellungen tippen.
// Misst auf dem Handy, wie lange Seiten und Fenster bis zum nächsten Bild brauchen, und zeigt die Werte zum Kopieren.
// Ändert keine Daten: Es wird nur geblättert und das Look-Fenster geöffnet und wieder geschlossen.
import { app, actions, openSheet, closeSheet } from './core.js';
import { esc } from './util.js';
import { derive } from './stats.js';
import { lookSheet } from './view-rank.js';
import { toast } from './fx.js';
import { VERSION } from './version.js';
import { themeId } from './theme.js';

const ROUNDS = 3;
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];

// Seite öffnen und warten, bis sie gezeichnet ist.
function go(route) {
  return new Promise((resolve) => {
    const hash = `#/${route}`;
    if (location.hash === hash) { resolve(); return; }
    let done = false;
    const finish = () => { if (done) return; done = true; frame().then(resolve); };
    window.addEventListener('hashchange', finish, { once: true });
    setTimeout(finish, 1500);
    location.hash = hash;
  });
}

async function timeIt(fn) {
  const t0 = performance.now();
  await fn();
  return performance.now() - t0;
}

// Was gemessen wird: Name, Weg dorthin (vorher) und die Messung selbst. Ziel in Millisekunden.
const STEPS = [
  { name: 'Tab Start', from: 'training', run: () => go('start'), goal: 100 },
  { name: 'Tab Training', from: 'start', run: () => go('training'), goal: 100 },
  { name: 'Tab Übungen', from: 'start', run: () => go('uebungen'), goal: 100 },
  { name: 'Tab Verlauf', from: 'start', run: () => go('verlauf'), goal: 100 },
  { name: 'Tab Körper', from: 'start', run: () => go('koerper'), goal: 100 },
  { name: 'Rang-Pfad öffnen', from: 'start', run: () => go('rang'), goal: 300 },
  { name: 'Profil öffnen', from: 'start', run: () => go('profil'), goal: 100 },
  {
    name: 'Look-Fenster öffnen',
    from: 'profil',
    run: async () => { lookSheet('banner'); await frame(); },
    after: async () => { await closeSheet(); await wait(150); },
    goal: 100,
  },
];

let running = false;

async function measure() {
  if (running) return;
  running = true;
  await closeSheet();
  toast('Tempo wird gemessen, bitte nicht antippen.');
  await wait(400);
  const rows = [];
  for (const st of STEPS) {
    const times = [];
    for (let i = 0; i < ROUNDS; i++) {
      await go(st.from);
      await wait(250);
      times.push(await timeIt(st.run));
      if (st.after) await st.after();
    }
    rows.push({ name: st.name, ms: median(times), max: Math.max(...times), goal: st.goal });
  }
  // Alles neu rechnen (Level, Rekorde, Serie) wie nach dem Laden der App.
  const calc = [];
  for (let i = 0; i < ROUNDS; i++) calc.push(await timeIt(async () => { derive(app.state); }));
  rows.push({ name: 'Alles neu rechnen', ms: median(calc), max: Math.max(...calc), goal: null });
  await go('einstellungen');
  running = false;
  showResult(rows);
}

function resultText(rows) {
  const sets = app.state.sets?.length || 0;
  const head = `KINTORE ${VERSION}, Design ${themeId()}, ${sets} Sätze, ${navigator.hardwareConcurrency || '?'} Kerne`;
  const lines = rows.map((r) => `${r.name}: ${Math.round(r.ms)} ms (bis ${Math.round(r.max)} ms)${r.goal && r.ms > r.goal ? ' zu langsam' : ''}`);
  return [head, ...lines].join('\n');
}

const fmtS = (ms) => (ms < 10 ? 'unter 0,01 s' : `${(ms / 1000).toFixed(2).replace('.', ',')} s`);

function showResult(rows) {
  const text = resultText(rows);
  const slow = rows.filter((r) => r.goal && r.ms > r.goal).length;
  const el = openSheet(`
    <h2>Tempo auf diesem Handy</h2>
    <p class="lead">${slow ? `${slow} von ${rows.filter((r) => r.goal).length} Zielen verfehlt.` : 'Alles im Ziel.'} Ziel: 0,1 s, Rang-Pfad 0,3 s. Mittlerer Wert aus ${ROUNDS} Runden.</p>
    <ul class="tempo-list">${rows.map((r) => `<li class="${r.goal && r.ms > r.goal ? 'is-slow' : ''}"><span>${esc(r.name)}</span><b>${fmtS(r.ms)}</b></li>`).join('')}</ul>
    <button class="btn-neon btn-block" data-copy>Werte kopieren</button>
    <button class="btn-ghost btn-block" data-again>Noch mal messen</button>`);
  el.querySelector('[data-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Werte kopiert');
    } catch {
      toast('Kopieren ging nicht. Mach einen Screenshot.');
    }
  });
  el.querySelector('[data-again]').addEventListener('click', () => measure());
}

function introSheet() {
  const el = openSheet(`
    <h2>Tempo testen</h2>
    <p class="lead">Misst, wie schnell die App auf deinem Handy reagiert. Die App blättert dafür etwa 20 Sekunden lang selbst durch die Seiten. An deinen Daten ändert sich nichts.</p>
    <button class="btn-neon btn-block" data-start>Messen</button>`);
  el.querySelector('[data-start]').addEventListener('click', () => measure());
}

// Siebenmal kurz hintereinander auf die Version tippen.
let taps = [];
actions['about-tap'] = () => {
  const now = Date.now();
  taps = [...taps.filter((t) => now - t < 3000), now];
  if (taps.length >= 7) {
    taps = [];
    introSheet();
  }
};
