// Körpergewicht: Kurve mit 7-Tage-Schnitt, Eintragen, Liste.
import { app, views, actions, render, openSheet, closeSheet } from './core.js';
import { esc, icon, kg, parseNum, today, addDays, fmtDay, fmtShort, relDay } from './util.js';
import { lineChart } from './charts.js';
import { setBody, deleteBody } from './ops.js';
import { toast } from './fx.js';

const RANGES = { '1m': 31, '3m': 92, '1j': 365, alle: 100000 };
const chartWidth = () => Math.max(260, Math.min(window.innerWidth, 560) - 32 - 32);

function movingAvg(list, days = 7) {
  return list.map((b) => {
    const from = addDays(b.d, -(days - 1));
    const win = list.filter((x) => x.d >= from && x.d <= b.d);
    return { x: b.d, y: Math.round((win.reduce((a, x) => a + x.kg, 0) / win.length) * 100) / 100 };
  });
}

function avgBetween(list, from, to) {
  const win = list.filter((x) => x.d >= from && x.d <= to);
  return win.length ? win.reduce((a, x) => a + x.kg, 0) / win.length : null;
}

views.koerper = {
  render() {
    const s = app.state;
    const list = s.body;
    const last = list[list.length - 1];
    const t = today();
    const from = addDays(t, -RANGES[app.ui.bodyRange]);
    const shown = list.filter((b) => b.d >= from);
    const avg = movingAvg(list).filter((p) => p.x >= from);
    const a7 = avgBetween(list, addDays(t, -6), t);
    const p7 = avgBetween(list, addDays(t, -13), addDays(t, -7));
    const diff = a7 != null && p7 != null ? a7 - p7 : null;
    const goal = Number(s.settings.goalWeight) > 0 ? Number(s.settings.goalWeight) : null;
    const rev = [...list].reverse().slice(0, 30);
    return `
    <header class="head">
      <span class="jp-mark" aria-hidden="true">体重</span>
      <div class="head-row"><h1>Körper</h1></div>
      <p class="sub">${list.length} Einträge${list.length ? ` seit ${esc(fmtDay(list[0].d))}` : ''}</p>
    </header>
    <div class="stack">
      <section class="card pad">
        ${last ? `<div class="body-hero">
          <div><b>${kg(last.kg)}<small>kg</small></b><p>Zuletzt gewogen ${esc(relDay(last.d))}</p></div>
        </div>
        <div class="kv">
          <div><span>Schnitt der letzten 7 Tage</span><b>${a7 != null ? kg(Math.round(a7 * 10) / 10) + ' kg' : '–'}</b></div>
          <div><span>Zur Woche davor</span><b>${diff != null ? (diff > 0 ? '+' : diff < 0 ? '−' : '±') + kg(Math.round(Math.abs(diff) * 10) / 10) + ' kg' : '–'}</b></div>
        </div>` : '<p class="soft" style="margin:0">Trag dein erstes Gewicht unten ein.</p>'}
        ${list.length ? `<div class="seg" role="tablist" style="margin-top:16px">${[['1m', '1 M'], ['3m', '3 M'], ['1j', '1 J'], ['alle', 'Alle']].map(([v, l]) => `<button class="${v === app.ui.bodyRange ? 'is-on' : ''}" data-act="body-range" data-v="${v}" role="tab" aria-selected="${v === app.ui.bodyRange}">${l}</button>`).join('')}</div>
        ${lineChart({ points: shown.map((b) => ({ x: b.d, y: b.kg, label: fmtShort(b.d) })), avg, goal, width: chartWidth(), height: 200, color: '#9B6BFF', yFmt: (v) => kg(Math.round(v * 10) / 10), unit: 'kg', label: 'Körpergewicht', area: true })}
        <div class="legend" style="margin:8px 0 0"><span><i style="border-top-color:#FF4FA3"></i>Schnitt 7 Tage</span></div>` : ''}
      </section>
      <section class="card pad">
        <div class="card-title"><h2>Eintragen</h2></div>
        <div class="entry-row">
          <label class="field" style="margin:0"><span>Datum</span><input class="input" type="date" data-body-date value="${t}" max="${t}"></label>
          <label class="field" style="margin:0"><span>Gewicht (kg)</span><input class="input input-big" inputmode="decimal" data-body-kg value="${last ? kg(last.kg) : ''}" placeholder="74,5"></label>
          <button class="save-set" data-act="body-save" aria-label="Gewicht speichern">${icon('check')}</button>
        </div>
      </section>
      ${rev.length ? `<section class="card pad">
        <div class="card-title"><h2>Einträge</h2><span class="hint">antippen zum Ändern</span></div>
        <ul class="bw-list">${rev.map((b) => {
          const i = list.indexOf(b);
          const prev = i > 0 ? list[i - 1] : null;
          const dlt = prev ? b.kg - prev.kg : 0;
          return `<li><button data-act="body-edit" data-d="${b.d}"><span>${esc(fmtDay(b.d))}</span><b>${kg(b.kg)} kg</b><span class="diff ${dlt > 0 ? 'up' : dlt < 0 ? 'down' : ''}">${prev ? (dlt > 0 ? '+' : dlt < 0 ? '−' : '±') + kg(Math.abs(Math.round(dlt * 100) / 100)) : ''}</span></button></li>`;
        }).join('')}</ul>
      </section>` : ''}
    </div>`;
  },
};

actions['body-range'] = (ds) => { app.ui.bodyRange = ds.v; render(); };
actions['body-save'] = () => {
  const d = document.querySelector('[data-body-date]')?.value || today();
  const v = parseNum(document.querySelector('[data-body-kg]')?.value);
  if (!(v > 20 && v < 400)) { toast('Bitte ein gültiges Gewicht eingeben.'); return; }
  if (d > today()) { toast('Das Datum liegt in der Zukunft.'); return; }
  setBody(d, v);
  toast(`${kg(v)} kg gespeichert`);
};
actions['body-edit'] = (ds) => {
  const entry = app.state.body.find((b) => b.d === ds.d);
  if (!entry) return;
  const el = openSheet(`<h2>${esc(fmtDay(entry.d))}</h2>
    <label class="field"><span>Gewicht (kg)</span><input class="input input-big" inputmode="decimal" value="${kg(entry.kg)}" data-kg></label>
    <div class="sheet-actions"><button class="btn-neon btn-block" data-save>Speichern</button><button class="btn-ghost danger" data-del>${icon('trash')} Eintrag löschen</button></div>`, { focus: '[data-kg]' });
  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-save]')) {
      const v = parseNum(el.querySelector('[data-kg]').value);
      if (!(v > 20 && v < 400)) { toast('Bitte ein gültiges Gewicht eingeben.'); return; }
      await closeSheet();
      setBody(entry.d, v);
    } else if (e.target.closest('[data-del]')) {
      await closeSheet();
      deleteBody(entry.d);
    }
  });
};
