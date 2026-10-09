// Übungen: Liste mit Suche und Muskelgruppen, Detail mit Diagramm, Rekorden und Einstellungen.
import { app, D, views, actions, navigate, render, openSheet, closeSheet } from './core.js';
import { esc, icon, kg, int, num1, relDay, fmtDay, fmtShort, today, addDays, fmtLoad, fmtSetText } from './util.js';
import { CATEGORIES, CAT } from './model.js';
import { sparkline, lineChart } from './charts.js';
import { exerciseRecords, trend30, weightFor, catColor, e1rmOf } from './stats.js';
import { updateExercise, deleteExercise, addToSession, startSession } from './ops.js';
import { confirmSheet, newExerciseSheet } from './sheets.js';
import { toast } from './fx.js';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const chartWidth = () => Math.max(260, Math.min(window.innerWidth, 560) - 32 - 32);

// ---------- Liste ----------
function listRows(list, d) {
  return list
    .map((ex) => {
      const last = d.lastUsed.get(ex.id);
      const sessions = d.sessionsByEx.get(ex.id) || [];
      const best = d.bestE1.get(ex.id);
      const spark = sessions.slice(-12).map((s) => s.best);
      const meta = last ? `${relDay(last)}${best ? `, 1RM ${ex.bw ? '+' : ''}${kg(Math.round((ex.bw ? best - d.bw : best) * 10) / 10)} kg` : ''}` : 'Noch nicht trainiert';
      return `<li><button class="ex-row" style="--c:${catColor(ex.cat)}" data-act="go" data-to="uebung" data-id="${ex.id}">
        <span class="bar"></span>
        <span><span class="name">${esc(ex.name)}</span><span class="meta">${esc(meta)}</span></span>
        ${spark.length > 1 ? sparkline(spark, catColor(ex.cat)) : ''}
      </button></li>`;
    })
    .join('');
}

function filtered(d) {
  const ui = app.ui;
  const q = norm(ui.exSearch.trim());
  return app.state.exercises.filter((e) => !e.hidden && (ui.exCat === 'alle' || e.cat === ui.exCat) && (!q || norm(e.name).includes(q)));
}

function listBody(d) {
  const all = filtered(d);
  const used = all.filter((e) => d.lastUsed.has(e.id)).sort((a, b) => d.lastUsed.get(b.id).localeCompare(d.lastUsed.get(a.id)));
  const unused = all.filter((e) => !d.lastUsed.has(e.id)).sort((a, b) => a.name.localeCompare(b.name));
  const searching = !!app.ui.exSearch.trim();
  if (!used.length) {
    return `${unused.length ? `<section class="card list-card"><ul class="ex-list">${listRows(unused, d)}</ul></section>` : `<p class="empty-hint">Nichts gefunden. Leg die Übung neu an.</p>`}
    <button class="btn-dashed" data-act="new-ex">${icon('plus')} Neue Übung anlegen</button>`;
  }
  return `
    ${used.length ? `<section class="card list-card"><ul class="ex-list">${listRows(used, d)}</ul></section>` : ''}
    ${unused.length ? `<section class="card list-card">
      <button class="section-toggle" data-act="toggle-unused" aria-expanded="${app.ui.exShowAll || searching}">Weitere Übungen (${unused.length}) ${icon(app.ui.exShowAll || searching ? 'up' : 'down')}</button>
      ${app.ui.exShowAll || searching ? `<ul class="ex-list">${listRows(unused, d)}</ul>` : ''}
    </section>` : ''}
    ${!used.length && !unused.length ? `<p class="empty-hint">Nichts gefunden. Leg die Übung neu an.</p>` : ''}
    <button class="btn-dashed" data-act="new-ex">${icon('plus')} Neue Übung anlegen</button>`;
}

views.uebungen = {
  render() {
    const d = D();
    const ui = app.ui;
    return `
    <header class="head">
      <span class="jp-mark" aria-hidden="true">種目</span>
      <div class="head-row"><h1>Übungen</h1></div>
      <p class="sub">${d.setsByEx.size ? `${d.setsByEx.size} trainiert, ${int(d.prEvents.length)} Rekorde` : `${app.state.exercises.filter((e) => !e.hidden).length} Übungen`}</p>
    </header>
    <label class="search">${icon('search')}<input type="search" placeholder="Übung suchen" value="${esc(ui.exSearch)}" data-ex-search aria-label="Übung suchen"></label>
    <div class="cat-row" role="tablist" aria-label="Muskelgruppe">
      <button class="cat-chip ${ui.exCat === 'alle' ? 'is-on' : ''}" style="--c:#EEF1FF" data-act="ex-cat" data-cat="alle" role="tab" aria-selected="${ui.exCat === 'alle'}"><i></i>Alle</button>
      ${CATEGORIES.filter((c) => app.state.exercises.some((e) => e.cat === c.id && !e.hidden)).map((c) => `<button class="cat-chip ${ui.exCat === c.id ? 'is-on' : ''}" style="--c:${c.color}" data-act="ex-cat" data-cat="${c.id}" role="tab" aria-selected="${ui.exCat === c.id}"><i></i>${esc(c.name)}</button>`).join('')}
    </div>
    <div class="stack" data-ex-body>${listBody(d)}</div>`;
  },
  after(main) {
    const inp = main.querySelector('[data-ex-search]');
    inp?.addEventListener('input', () => {
      app.ui.exSearch = inp.value;
      main.querySelector('[data-ex-body]').innerHTML = listBody(D());
    });
  },
};

actions['ex-cat'] = (ds) => { app.ui.exCat = ds.cat; render(); };
actions['toggle-unused'] = () => { app.ui.exShowAll = !app.ui.exShowAll; const b = document.querySelector('[data-ex-body]'); if (b) b.innerHTML = listBody(D()); };
actions['new-ex'] = () => newExerciseSheet({ name: app.ui.exSearch, onCreated: (id) => navigate('uebung', id) });

// ---------- Detail ----------
const RANGES = { '3m': 91, '6m': 182, '1j': 365, alle: 100000 };

function chartFor(ex, d) {
  const sessions = d.sessionsByEx.get(ex.id) || [];
  const from = addDays(today(), -RANGES[app.ui.range]);
  const inRange = sessions.filter((s) => s.d >= from && s.top);
  const m = app.ui.metric;
  const sub = (v) => (ex.bw ? v - d.bw : v);
  let points;
  let unit = 'kg';
  let fmt = (v) => kg(Math.round(v * 10) / 10);
  if (m === 'e1rm') points = inRange.map((s) => ({ x: s.d, y: Math.round(s.best * 10) / 10, label: `${fmtShort(s.d)}, bester Satz ${fmtSetText(ex, s.top)}` }));
  else if (m === 'top') points = inRange.map((s) => ({ x: s.d, y: s.top.w, label: `${fmtShort(s.d)}, ${fmtSetText(ex, s.top)}` }));
  else {
    points = inRange.map((s) => ({ x: s.d, y: Math.round(s.vol), label: `${fmtShort(s.d)}, ${s.sets.length} Sätze` }));
    fmt = (v) => int(v);
  }
  return lineChart({ points, width: chartWidth(), height: 200, color: catColor(ex.cat), yFmt: fmt, unit, label: `Verlauf ${ex.name}` });
}

function seg(name, options, current) {
  return `<div class="seg" role="tablist">${options.map(([v, l]) => `<button class="${v === current ? 'is-on' : ''}" data-act="${name}" data-v="${v}" role="tab" aria-selected="${v === current}">${l}</button>`).join('')}</div>`;
}

function miniStep(field, value, label) {
  return `<div class="mini-step"><button data-act="ex-step" data-f="${field}" data-dir="-1" aria-label="${label} verringern">${icon('minus')}</button><output>${value}</output><button data-act="ex-step" data-f="${field}" data-dir="1" aria-label="${label} erhöhen">${icon('plus')}</button></div>`;
}

views.uebung = {
  render({ id }) {
    const d = D();
    const ex = d.exById.get(Number(id));
    if (!ex) return `<header class="head has-back"><div class="head-row"><button class="icon-btn back-btn" data-act="back" aria-label="Zurück">${icon('left')}</button><h1>Nicht gefunden</h1></div></header><p class="soft">Diese Übung gibt es nicht mehr.</p>`;
    const sessions = d.sessionsByEx.get(ex.id) || [];
    const best = d.bestE1.get(ex.id) || 0;
    const tr = trend30(sessions);
    const records = exerciseRecords(d, ex);
    const c = catColor(ex.cat);
    const maxW = sessions.length ? Math.max(...sessions.map((s) => s.top?.w || 0)) : 0;
    const bigValue = ex.bw ? (maxW > 0 ? '+' + kg(maxW) : 'BW') : kg(Math.round(best * 10) / 10);
    const bigLabel = ex.bw ? `Bestes Zusatzgewicht, 1RM mit Körpergewicht ca. ${kg(Math.round(best))} kg` : 'Geschätztes 1RM';
    let bestRec = null;
    for (const r of records) {
      const v = e1rmOf(d.loadOf(ex, r.w), r.r);
      if (!bestRec || v > bestRec.v) bestRec = { r: r.r, v };
    }
    const hist = [...sessions].reverse();
    const shown = hist.slice(0, app.ui.histLimit);
    const inSession = app.state.active?.ex.includes(ex.id);

    return `
    <header class="head has-back">
      <span class="jp-mark" aria-hidden="true">${esc(CAT[ex.cat]?.jp || '')}</span>
      <div class="head-row">
        <button class="icon-btn back-btn" data-act="back" aria-label="Zurück">${icon('left')}</button>
        <span style="flex:1"></span>
        <button class="icon-btn" data-act="ex-more" data-id="${ex.id}" aria-label="Weitere Optionen">${icon('more')}</button>
      </div>
      <h1 style="margin-top:14px">${esc(ex.name)}</h1>
      <p class="sub"><span class="cat-badge" style="--c:${c}"><i></i>${esc(CAT[ex.cat]?.name || '')}</span>${sessions.length ? `, ${sessions.length} Einheiten seit ${esc(fmtDay(sessions[0].d))}` : ''}</p>
    </header>
    <div class="stack">
      ${sessions.length ? `
      <section class="card pad">
        <div class="big-stat">
          <div><b>${bigValue}<small>kg</small></b><span>${esc(bigLabel)}</span></div>
          ${tr != null && Math.abs(tr) >= 0.1 ? `<span class="trend ${tr < 0 ? 'down' : ''}">${tr > 0 ? '+' : '-'}${kg(Math.round(Math.abs(tr) * 10) / 10)} kg</span>` : ''}
        </div>
        ${seg('metric', [['e1rm', '1RM'], ['top', 'Top-Satz'], ['vol', 'Volumen']], app.ui.metric)}
        ${seg('range', [['3m', '3 M'], ['6m', '6 M'], ['1j', '1 J'], ['alle', 'Alle']], app.ui.range)}
        ${chartFor(ex, d)}
      </section>
      <section class="card pad">
        <div class="card-title"><h2>Bestwerte</h2><span class="hint">je Wiederholungszahl</span></div>
        <div class="rec-grid">${records.map((r) => `<div class="rec ${bestRec && r.r === bestRec.r ? 'best' : ''}"><span>${r.r} Wdh.</span><b>${fmtLoad(ex, r.w)}${ex.bw && !(r.w > 0) ? '' : ' kg'}</b></div>`).join('')}</div>
      </section>
      <section class="card pad">
        <div class="card-title"><h2>Schätzung</h2><span class="hint">aus deinem 1RM</span></div>
        <table class="rm-table"><tbody>${[1, 3, 5, 6, 8, 10, 12].map((r) => {
          const w = weightFor(best, r) - (ex.bw ? d.bw : 0);
          return `<tr><td>${r} Wdh.</td><td>${ex.bw ? (w > 0 ? '+' + kg(Math.round(w * 2) / 2) + ' kg' : 'BW') : kg(Math.round(w * 2) / 2) + ' kg'}</td></tr>`;
        }).join('')}</tbody></table>
      </section>` : `<section class="card pad"><p class="soft" style="margin:0">Noch keine Sätze.</p></section>`}
      <section class="card">
        <ul class="set-list">
          <li><span class="grow">Wdh.-Bereich</span><div class="range-pick">${miniStep('range-lo', ex.repMin, 'Untergrenze')}<span class="muted">bis</span>${miniStep('range-hi', ex.repMax, 'Obergrenze')}</div></li>
          <li><span class="grow">Gewichtssprung</span>${miniStep('inc', kg(ex.inc) + ' kg', 'Steigerung')}</li>
          <li><span class="grow">Pause</span>${miniStep('rest', Math.floor(ex.rest / 60) + ':' + String(ex.rest % 60).padStart(2, '0'), 'Pause')}</li>
          <li><span class="grow">Langhantel<small>Scheiben pro Seite anzeigen</small></span><label class="switch"><input type="checkbox" data-ex-flag="bar" ${ex.bar ? 'checked' : ''}><span></span></label></li>
          <li><span class="grow">Körpergewicht-Übung<small>Gewicht = Zusatzgewicht</small></span><label class="switch"><input type="checkbox" data-ex-flag="bw" ${ex.bw ? 'checked' : ''}><span></span></label></li>
          <li><button class="row-btn" data-act="ex-cat-pick">${icon('layers')}<span class="grow">Muskelgruppe<small>${esc(CAT[ex.cat]?.name || '')}</small></span>${icon('right')}</button></li>
          <li><button class="row-btn" data-act="ex-note">${icon('note')}<span class="grow">Notiz zur Übung<small>${esc(ex.notes ? ex.notes.slice(0, 60) : 'z. B. Sitzhöhe 4, Griff eng')}</small></span>${icon('right')}</button></li>
        </ul>
      </section>
      ${app.state.active && !inSession ? `<button class="btn-neon btn-block cyan" data-act="ex-to-session">${icon('plus')} Zum laufenden Training</button>` : ''}
      ${!app.state.active ? `<button class="btn-ghost btn-block" data-act="ex-train-now">${icon('play', 'ic-fill')} Jetzt trainieren</button>` : ''}
      ${hist.length ? `<section class="card pad">
        <div class="card-title"><h2>Verlauf</h2><span class="hint">${hist.length} Einheiten</span></div>
        ${shown.map((s) => `<div class="hist-day"><h3><span>${esc(fmtDay(s.d))}</span><span class="muted">1RM ${ex.bw ? '+' : ''}${kg(Math.round((ex.bw ? s.best - d.bw : s.best) * 10) / 10)} kg</span></h3>
          <div class="hist-sets">${s.sets.map((x) => `<button class="hs ${d.prIds.has(x.id) ? 'is-pr' : ''}" data-act="edit-set" data-id="${x.id}">${fmtLoad(ex, x.w)}<small> × </small>${x.r}${x.note ? ` <small>${icon('note')}</small>` : ''}</button>`).join('')}</div></div>`).join('')}
        ${hist.length > shown.length ? `<button class="link-btn" data-act="hist-more">Ältere anzeigen</button>` : ''}
      </section>` : ''}
    </div>`;
  },
  after(main, { id }) {
    main.querySelectorAll('[data-ex-flag]').forEach((inp) => {
      inp.addEventListener('change', () => updateExercise(Number(id), { [inp.dataset.exFlag]: inp.checked }));
    });
  },
};

const curEx = () => D().exById.get(Number(app.route.params.id));

actions.back = () => { if (history.length > 1) history.back(); else navigate('uebungen'); };
actions.metric = (ds) => { app.ui.metric = ds.v; render(); };
actions.range = (ds) => { app.ui.range = ds.v; render(); };
actions['hist-more'] = () => { app.ui.histLimit += 20; render(); };
actions['ex-to-session'] = () => { const ex = curEx(); if (ex) { addToSession(ex.id); navigate('training'); } };
actions['ex-train-now'] = () => { const ex = curEx(); if (!ex) return; app.ui.drafts = {}; startSession(null); addToSession(ex.id); navigate('training'); };

const INC_STEPS = [0.5, 1, 1.25, 2, 2.5, 4, 5, 10];
actions['ex-step'] = (ds) => {
  const ex = curEx();
  if (!ex) return;
  const dir = Number(ds.dir);
  if (ds.f === 'range-lo') updateExercise(ex.id, { repMin: Math.max(1, Math.min(ex.repMax, ex.repMin + dir)) });
  else if (ds.f === 'range-hi') updateExercise(ex.id, { repMax: Math.max(ex.repMin, Math.min(50, ex.repMax + dir)) });
  else if (ds.f === 'rest') updateExercise(ex.id, { rest: Math.max(15, Math.min(600, ex.rest + dir * 15)) });
  else if (ds.f === 'inc') {
    let i = INC_STEPS.findIndex((v) => v >= ex.inc - 1e-9);
    if (i < 0) i = INC_STEPS.length - 1;
    i = Math.max(0, Math.min(INC_STEPS.length - 1, i + dir));
    updateExercise(ex.id, { inc: INC_STEPS[i] });
  }
};

actions['ex-cat-pick'] = () => {
  const ex = curEx();
  if (!ex) return;
  const el = openSheet(`<h2>Muskelgruppe</h2><div class="cat-pick">${CATEGORIES.map((c) => `<button class="cat-chip ${c.id === ex.cat ? 'is-on' : ''}" style="--c:${c.color}" data-cat="${c.id}"><i></i>${esc(c.name)}</button>`).join('')}</div>`);
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    await closeSheet();
    updateExercise(ex.id, { cat: b.dataset.cat });
  });
};

actions['ex-note'] = () => {
  const ex = curEx();
  if (!ex) return;
  const el = openSheet(`<h2>Notiz</h2><p class="lead">${esc(ex.name)}</p><label class="field"><span>Notiz zur Übung</span><textarea class="input" data-note placeholder="z. B. Sitzhöhe 4, Griff eng">${esc(ex.notes || '')}</textarea></label><div class="sheet-actions"><button class="btn-neon btn-block" data-save>Speichern</button></div>`, { focus: '[data-note]' });
  el.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-save]')) return;
    const v = el.querySelector('[data-note]').value.trim();
    await closeSheet();
    updateExercise(ex.id, { notes: v });
  });
};

actions['ex-more'] = () => {
  const ex = curEx();
  if (!ex) return;
  const used = D().setsByEx.has(ex.id);
  const el = openSheet(`<h2>${esc(ex.name)}</h2><ul class="menu-list">
    <li><button data-m="rename">${icon('edit')} Umbenennen</button></li>
    <li><button data-m="hide">${icon('x')} Aus der Liste ausblenden</button></li>
    <li><button data-m="delete" class="danger">${icon('trash')} Löschen${used ? ' (mit allen Sätzen)' : ''}</button></li>
  </ul>`);
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    const m = b.dataset.m;
    if (m === 'rename') {
      const s2 = openSheet(`<h2>Umbenennen</h2><label class="field"><span>Name</span><input class="input" data-name value="${esc(ex.name)}"></label><div class="sheet-actions"><button class="btn-neon btn-block" data-save>Speichern</button></div>`, { focus: '[data-name]' });
      s2.addEventListener('click', async (ev) => {
        if (!ev.target.closest('[data-save]')) return;
        const n = s2.querySelector('[data-name]').value.trim();
        if (!n) return;
        await closeSheet();
        updateExercise(ex.id, { name: n });
      });
      return;
    }
    await closeSheet();
    if (m === 'hide') { updateExercise(ex.id, { hidden: true }); toast('Übung ausgeblendet'); navigate('uebungen'); }
    else if (m === 'delete') {
      const n = D().setsByEx.get(ex.id)?.length || 0;
      confirmSheet({
        title: `${ex.name} löschen?`,
        text: n ? `${n} Sätze werden mitgelöscht.` : '',
        confirm: 'Endgültig löschen',
        danger: true,
        onConfirm: () => { deleteExercise(ex.id); navigate('uebungen', null, { replace: true }); toast('Übung gelöscht'); },
      });
    }
  });
};
