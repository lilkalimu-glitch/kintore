// Training: Vorlage wählen, Sätze eintragen, Pausen-Timer, Steigerungs-Tipps.
import { app, D, views, actions, navigate } from './core.js';
import { esc, icon, kg, parseNum, round2, today, fmtDay, relDay, fmtDuration, fmtLoad, fmtSetText } from './util.js';
import { progressionTip, plateLoad, dayTemplate, nextQuest, catColor, questGoal } from './stats.js';
import { addSet, startSession, finishSession } from './ops.js';
import { exerciseMenu, editSetSheet, addExerciseToSession, templatesSheet, confirmSheet } from './sheets.js';
import { haptic } from './native.js';
import { toast } from './fx.js';

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

function draftFor(id) {
  const ui = app.ui;
  if (ui.drafts[id]) return ui.drafts[id];
  const d = D();
  const a = app.state.active;
  const date = a?.d || today();
  const ex = d.exById.get(id);
  const todaySets = (d.days.get(date)?.sets || []).filter((x) => x.ex === id);
  let draft;
  if (todaySets.length) {
    const last = todaySets[todaySets.length - 1];
    draft = { w: last.w, r: last.r };
  } else {
    const tip = progressionTip(ex, d.sessionsByEx.get(id), date);
    if (tip) draft = { w: tip.w, r: tip.r };
    else draft = { w: ex?.bw ? 0 : 20, r: ex?.repMin || 8 };
  }
  ui.drafts[id] = draft;
  return draft;
}

function platesHtml(ex, w) {
  const st = app.state.settings;
  const bar = st.barWeight || 20;
  if (w < bar) return `<span class="chip" data-plates="${ex.id}">Leichter als die Stange (${kg(bar)} kg)</span>`;
  const res = plateLoad(w, bar, st.plates);
  if (!res.plates.length) return `<span class="chip" data-plates="${ex.id}">Nur die Stange</span>`;
  const plates = res.plates.map((p) => `<span class="plate p${String(p).replace('.', '-')}">${kg(p)}</span>`).join('');
  return `<span class="chip" data-plates="${ex.id}" aria-label="Scheiben pro Seite">Pro Seite <span class="plates">${plates}</span>${res.rest > 0 ? ` +${kg(res.rest)} kg` : ''}</span>`;
}

function exBlock(id) {
  const d = D();
  const a = app.state.active;
  const ex = d.exById.get(id);
  if (!ex) return '';
  const todaySets = (d.days.get(a.d)?.sets || []).filter((x) => x.ex === id);
  const sessions = d.sessionsByEx.get(id) || [];
  let prev = null;
  for (let i = sessions.length - 1; i >= 0; i--) if (sessions[i].d < a.d) { prev = sessions[i]; break; }
  const tip = progressionTip(ex, sessions, a.d);
  const draft = draftFor(id);
  const setRows = todaySets
    .map((x, i) => {
      const pr = d.prIds.has(x.id);
      return `<li><button class="set ${pr ? 'is-pr' : ''} ${app.ui.newSetId === x.id ? 'is-new' : ''}" data-act="edit-set" data-id="${x.id}" aria-label="Satz ${i + 1} bearbeiten">
        <span class="n">${i + 1}</span>
        <span class="v">${fmtLoad(ex, x.w)}<small>${ex.bw && !(x.w > 0) ? '×' : 'kg ×'}</small>${x.r}</span>
        <span>${pr ? '<span class="pr-tag">PR</span>' : ''}${x.note ? `<span class="note-ic">${icon('note')}</span>` : ''}</span>
      </button></li>`;
    })
    .join('');
  return `<article class="card exb" style="--c:${catColor(ex.cat)}" data-ex="${id}">
    <div class="exb-head">
      <h2 class="exb-name"><button data-act="go" data-to="uebung" data-id="${id}">${esc(ex.name)}</button></h2>
      <button class="icon-btn" data-act="ex-menu" data-id="${id}" aria-label="Optionen für ${esc(ex.name)}">${icon('more')}</button>
    </div>
    <p class="exb-last">${prev ? `${esc(cap(relDay(prev.d)))}: ${prev.sets.filter((s) => s.r > 0).map((s) => fmtSetText(ex, s)).join(', ')}` : 'Erstes Mal'}</p>
    <div class="chips">
      ${tip ? `<span class="chip chip-tip ${tip.up ? 'up' : ''}">${icon(tip.up ? 'arrowUp' : 'target')}${tip.up ? 'Gewicht hoch:' : 'Ziel:'} <b>${fmtSetText(ex, { w: tip.w, r: tip.r })}</b></span>` : ''}
      ${ex.bar ? platesHtml(ex, draft.w) : ''}
      <span class="chip">${ex.repMin}-${ex.repMax} Wdh.</span>
    </div>
    ${setRows ? `<ol class="sets">${setRows}</ol>` : ''}
    <div class="entry">
      <div class="stepper">
        <button data-step="${id}" data-f="w" data-dir="-1" aria-label="Gewicht verringern">${icon('minus')}</button>
        <label><input inputmode="decimal" enterkeyhint="next" autocomplete="off" value="${kg(draft.w)}" data-in="${id}" data-f="w" aria-label="${ex.bw ? 'Zusatzgewicht' : 'Gewicht'} in Kilogramm"><span class="unit">${ex.bw ? '+ kg' : 'kg'}</span></label>
        <button data-step="${id}" data-f="w" data-dir="1" aria-label="Gewicht erhöhen">${icon('plus')}</button>
      </div>
      <div class="stepper">
        <button data-step="${id}" data-f="r" data-dir="-1" aria-label="Weniger Wiederholungen">${icon('minus')}</button>
        <label><input inputmode="numeric" enterkeyhint="done" autocomplete="off" value="${draft.r}" data-in="${id}" data-f="r" aria-label="Wiederholungen"><span class="unit">Wdh.</span></label>
        <button data-step="${id}" data-f="r" data-dir="1" aria-label="Mehr Wiederholungen">${icon('plus')}</button>
      </div>
      <button class="save-set" data-act="save-set" data-id="${id}" aria-label="Satz speichern">${icon('check')}</button>
    </div>
  </article>`;
}

function renderActive() {
  const s = app.state;
  const a = s.active;
  const tpl = s.templates.find((t) => t.id === a.tpl);
  const isToday = a.d === today();
  const start = s.sessions[a.d]?.start;
  const goal = isToday ? questGoal(s, D(), nextQuest(s, D())) : null;
  return `
  <header class="head">
    <span class="jp-mark" aria-hidden="true">${esc(tpl?.jp || 'トレーニング')}</span>
    <div class="head-row"><h1>${esc(tpl?.name || 'Training')}</h1></div>
    <div class="session-meta">
      ${isToday
        ? `<span class="clock">${icon('timer')}<span data-elapsed>${start ? 'Seit ' + fmtDuration(Date.now() - start) : 'Bereit'}</span></span>`
        : `<span class="clock">${icon('calendar')}<span>Nachtrag für ${esc(fmtDay(a.d))}</span></span>`}
      ${goal?.kind === 'sets' ? `<span class="q-chip ${goal.done ? 'is-done' : ''}" title="Tages-Quest">${icon(goal.done ? 'check' : 'target')}${goal.done ? 'Quest geschafft' : `Quest ${goal.count}/${goal.target}`}</span>` : ''}
      <span class="spacer"></span>
      <button class="btn-ghost small" data-act="finish">${isToday ? 'Beenden' : 'Fertig'}</button>
    </div>
  </header>
  <div class="stack">
    ${a.ex.map(exBlock).join('') || '<p class="empty-hint">Füge die erste Übung hinzu.</p>'}
    <button class="btn-dashed" data-act="add-ex">${icon('plus')} Übung hinzufügen</button>
    <button class="btn-neon btn-block" data-act="finish">${isToday ? 'Training beenden' : 'Nachtrag fertig'}</button>
  </div>`;
}

function lastDoneOf(s, d, tplId) {
  for (let i = d.dates.length - 1, n = 0; i >= 0 && n < 90; i--, n++) {
    if (dayTemplate(s, d, d.dates[i])?.id === tplId) return d.dates[i];
  }
  return null;
}

function renderPicker() {
  const s = app.state;
  const d = D();
  const q = nextQuest(s, d);
  const suggested = q.kind === 'go' ? q.tpl?.id : null;
  const todaySets = d.days.get(today())?.sets.length || 0;
  return `
  <header class="head">
    <span class="jp-mark" aria-hidden="true">トレーニング</span>
    <div class="head-row"><h1>Training</h1></div>
    <p class="sub">${q.kind === 'rest' ? 'Laut Split ist heute Ruhetag.' : 'Was trainierst du heute?'}</p>
  </header>
  <div class="stack">
    ${todaySets ? `<section class="card pad"><div class="card-title"><h2>Heute schon ${todaySets} ${todaySets === 1 ? 'Satz' : 'Sätze'}</h2></div><button class="btn-neon btn-block" data-act="resume">Weiter trainieren</button></section>` : ''}
    ${s.templates
      .map((t) => {
        const last = lastDoneOf(s, d, t.id);
        return `<section class="card tpl-card ${t.id === suggested ? 'is-next' : ''}">
          <div>
            <h3>${esc(t.name)} <span>${esc(t.jp || '')}</span></h3>
            <p>${t.ex.length} Übungen${last ? `, zuletzt ${esc(relDay(last))}` : ''}</p>
            ${t.id === suggested ? '<span class="badge">Heute dran</span>' : ''}
          </div>
          <button class="round-go" data-act="start-session" data-tpl="${esc(t.id)}" aria-label="${esc(t.name)} starten">${icon('play')}</button>
        </section>`;
      })
      .join('')}
    <button class="btn-dashed" data-act="start-free">${icon('plus')} Ohne Vorlage starten</button>
    <button class="link-btn" data-act="edit-templates">Vorlagen bearbeiten</button>
  </div>`;
}

let elapsedTimer = null;

views.training = {
  render() {
    return app.state.active ? renderActive() : renderPicker();
  },
  after(main) {
    clearInterval(elapsedTimer);
    const el = main.querySelector('[data-elapsed]');
    const start = app.state.sessions[app.state.active?.d]?.start;
    if (el && start) elapsedTimer = setInterval(() => { if (document.body.contains(el)) el.textContent = 'Seit ' + fmtDuration(Date.now() - start); else clearInterval(elapsedTimer); }, 20000);
    bindEntry(main);
  },
};

// ---------- Eingabe: Stepper mit Gedrückthalten, Tastatur ----------
function applyStep(id, f, dir) {
  const ex = D().exById.get(id);
  const dr = draftFor(id);
  if (f === 'w') dr.w = Math.max(0, round2(dr.w + dir * (ex?.inc || 2.5)));
  else dr.r = Math.max(0, dr.r + dir);
  syncInputs(id);
  haptic('LIGHT');
}

function syncInputs(id) {
  const dr = draftFor(id);
  const block = document.querySelector(`.exb[data-ex="${id}"]`);
  if (!block) return;
  const w = block.querySelector('input[data-f="w"]');
  const r = block.querySelector('input[data-f="r"]');
  if (w && document.activeElement !== w) w.value = kg(dr.w);
  if (r && document.activeElement !== r) r.value = dr.r;
  const chip = block.querySelector('[data-plates]');
  const ex = D().exById.get(id);
  if (chip && ex) chip.outerHTML = platesHtml(ex, dr.w);
}

function bindEntry(main) {
  let hold = null;
  let repeated = false;
  const stop = () => { clearTimeout(hold?.t); clearInterval(hold?.i); hold = null; };
  main.querySelectorAll('[data-step]').forEach((b) => {
    const go = () => applyStep(Number(b.dataset.step), b.dataset.f, Number(b.dataset.dir));
    b.addEventListener('pointerdown', () => {
      repeated = false;
      stop();
      hold = { t: setTimeout(() => { repeated = true; hold.i = setInterval(go, 85); }, 420) };
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
    b.addEventListener('click', (e) => { e.preventDefault(); if (!repeated) go(); repeated = false; });
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  main.querySelectorAll('input[data-in]').forEach((inp) => {
    const id = Number(inp.dataset.in);
    inp.addEventListener('focus', () => setTimeout(() => inp.select(), 0));
    inp.addEventListener('input', () => {
      const v = parseNum(inp.value);
      if (!Number.isFinite(v)) return;
      const dr = draftFor(id);
      if (inp.dataset.f === 'w') { dr.w = Math.max(0, v); syncInputs(id); }
      else dr.r = Math.max(0, Math.round(v));
    });
    inp.addEventListener('blur', () => syncInputs(id));
    inp.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (inp.dataset.f === 'w') main.querySelector(`input[data-in="${id}"][data-f="r"]`)?.focus();
      else { inp.blur(); saveSet(id); }
    });
  });
}

function saveSet(id) {
  const block = document.querySelector(`.exb[data-ex="${id}"]`);
  const dr = draftFor(id);
  if (block) {
    const w = parseNum(block.querySelector('input[data-f="w"]').value);
    const r = parseNum(block.querySelector('input[data-f="r"]').value);
    if (Number.isFinite(w)) dr.w = Math.max(0, w);
    if (Number.isFinite(r)) dr.r = Math.max(0, Math.round(r));
  }
  if (!(dr.r > 0)) { toast('Trag mindestens 1 Wiederholung ein.'); return; }
  if (dr.w > 1000) { toast('Das Gewicht sieht falsch aus.'); return; }
  addSet(id, dr.w, dr.r);
}

actions['save-set'] = (ds) => saveSet(Number(ds.id));
actions['edit-set'] = (ds) => editSetSheet(Number(ds.id));
actions['ex-menu'] = (ds) => exerciseMenu(Number(ds.id));
actions['add-ex'] = () => addExerciseToSession();
actions['edit-templates'] = () => templatesSheet();
actions['start-free'] = () => { app.ui.drafts = {}; startSession(null); };
actions.resume = () => { app.ui.drafts = {}; startSession(app.state.sessions[today()]?.tpl || null); };
actions.finish = () => {
  const a = app.state.active;
  if (!a) return;
  const n = (D().days.get(a.d)?.sets || []).length;
  if (!n) {
    confirmSheet({ title: 'Training ohne Sätze beenden?', text: 'Es wurde noch nichts eingetragen.', confirm: 'Beenden', onConfirm: () => { finishSession(); navigate('start'); } });
    return;
  }
  finishSession();
  navigate(a.d === today() ? 'start' : 'verlauf');
};
