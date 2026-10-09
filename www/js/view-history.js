// Verlauf: Monatskalender mit Muskelgruppen-Punkten, Tagesdetails, Nachtragen.
import { app, D, views, actions, render, navigate } from './core.js';
import { esc, icon, int, today, fmtMonth, fmtLong, parseIso, isoOf, fmtLoad, fmtDuration } from './util.js';
import { CAT } from './model.js';
import { daySummary, dayTemplate, catColor } from './stats.js';
import { startSession } from './ops.js';

function monthGrid(ym) {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(y, m - 1, 1 - offset);
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(isoOf(d));
  }
  if (days.slice(35).every((x) => x.slice(0, 7) !== ym)) days.length = 35;
  return days;
}

function shiftMonth(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return isoOf(d).slice(0, 7);
}

function dayPanel(s, d, date) {
  const day = d.days.get(date);
  const tpl = day ? dayTemplate(s, d, date) : null;
  if (!day) {
    return `<section class="card pad">
      <div class="card-title"><h2>${esc(fmtLong(date))}</h2></div>
      <p class="soft" style="margin:0 0 14px">An diesem Tag ist kein Training eingetragen.</p>
      ${date <= today() ? `<button class="btn-ghost btn-block" data-act="backfill" data-d="${date}">${icon('plus')} Training nachtragen</button>` : ''}
    </section>`;
  }
  const sum = daySummary(s, d, date);
  const blocks = day.ex
    .map((id) => {
      const ex = d.exById.get(id);
      const sets = day.sets.filter((x) => x.ex === id);
      return `<div class="day-ex" style="--c:${catColor(ex?.cat)}">
        <h4><i></i><button data-act="go" data-to="uebung" data-id="${id}">${esc(ex?.name || '')}</button></h4>
        <div class="hist-sets">${sets.map((x) => `<button class="hs ${d.prIds.has(x.id) ? 'is-pr' : ''}" data-act="edit-set" data-id="${x.id}">${fmtLoad(ex, x.w)}<small> × </small>${x.r}${x.note ? ` <small>${icon('note')}</small>` : ''}</button>`).join('')}</div>
      </div>`;
    })
    .join('');
  return `<section class="card pad">
    <div class="card-title"><h2>${esc(fmtLong(date))}</h2><span class="hint">${esc(tpl?.name || '')}</span></div>
    <div class="kv ${sum.dur ? '' : 'kv3'}" style="margin:0 0 6px">
      <div><span>Sätze</span><b>${sum.sets}</b></div>
      <div><span>Volumen</span><b>${int(sum.vol)} kg</b></div>
      ${sum.dur ? `<div><span>Dauer</span><b>${esc(fmtDuration(sum.dur))}</b></div>` : ''}
      <div><span>Rekorde</span><b>${sum.prs}</b></div>
    </div>
    ${blocks}
    <button class="btn-ghost btn-block" style="margin-top:12px" data-act="backfill" data-d="${date}">${icon('edit')} Sätze hinzufügen</button>
  </section>`;
}

views.verlauf = {
  render() {
    const s = app.state;
    const d = D();
    const ym = app.ui.calMonth;
    const days = monthGrid(ym);
    const t = today();
    const sel = app.ui.calDay;
    const prDays = new Set(d.prEvents.map((p) => p.d));
    let mDays = 0;
    let mSets = 0;
    let mVol = 0;
    for (const date of d.dates) {
      if (date.slice(0, 7) !== ym) continue;
      const day = d.days.get(date);
      mDays++;
      for (const x of day.sets) {
        if (x.r > 0) mSets++;
        mVol += d.loadOf(d.exById.get(x.ex), x.w) * x.r;
      }
    }
    const cells = days
      .map((date) => {
        const day = d.days.get(date);
        const cats = day ? [...day.cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c) : [];
        const cls = [date.slice(0, 7) !== ym ? 'out' : '', day ? 'has' : '', date === t ? 'today' : '', date === sel ? 'sel' : ''].join(' ');
        return `<button class="cal-day ${cls}" data-act="cal-day" data-d="${date}" aria-label="${esc(fmtLong(date))}${day ? ', Training' : ''}">${parseIso(date).getDate()}${day ? `<span class="cal-dots">${cats.map((c) => `<i style="--c:${CAT[c]?.color}"></i>`).join('')}</span>` : ''}${prDays.has(date) ? '<span class="pr-dot" aria-hidden="true">★</span>' : ''}</button>`;
      })
      .join('');
    return `
    <header class="head">
      <span class="jp-mark" aria-hidden="true">記録</span>
      <div class="head-row"><h1>Verlauf</h1></div>
      <p class="sub">${d.dates.length ? `${int(d.totals.days)} Trainingstage seit ${esc(fmtMonth(d.dates[0]))}` : 'Noch keine Trainingstage. Tipp einen Tag an, um ein Training nachzutragen.'}</p>
    </header>
    <div class="stack">
      <section class="card pad">
        <div class="cal-head">
          <button class="icon-btn" data-act="cal-shift" data-n="-1" aria-label="Vorheriger Monat">${icon('left')}</button>
          <h2>${esc(fmtMonth(ym + '-01'))}</h2>
          <button class="icon-btn" data-act="cal-shift" data-n="1" aria-label="Nächster Monat" ${ym >= t.slice(0, 7) ? 'disabled style="opacity:.3"' : ''}>${icon('right')}</button>
        </div>
        <div class="cal-grid">
          ${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((w) => `<span class="cal-wd">${w}</span>`).join('')}
          ${cells}
        </div>
        <div class="month-stats">
          <div><b>${mDays}</b><span>Trainingstage</span></div>
          <div><b>${int(mSets)}</b><span>Sätze</span></div>
          <div><b>${int(mVol / 1000)} t</b><span>Volumen</span></div>
        </div>
      </section>
      ${sel ? dayPanel(s, d, sel) : ''}
    </div>`;
  },
};

actions['cal-shift'] = (ds) => {
  const next = shiftMonth(app.ui.calMonth, Number(ds.n));
  if (next > today().slice(0, 7)) return;
  app.ui.calMonth = next;
  app.ui.calDay = null;
  render();
};
actions['cal-day'] = (ds) => {
  app.ui.calDay = app.ui.calDay === ds.d ? null : ds.d;
  if (ds.d.slice(0, 7) !== app.ui.calMonth) app.ui.calMonth = ds.d.slice(0, 7);
  render();
  if (app.ui.calDay) setTimeout(() => document.querySelector('.cal-head')?.closest('.card')?.nextElementSibling?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
};
actions.backfill = (ds) => {
  app.ui.drafts = {};
  startSession(null, ds.d);
  navigate('training');
};
