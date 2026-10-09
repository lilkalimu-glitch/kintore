// Bottom-Sheets: Übung wählen, Satz bearbeiten, Übung anlegen, Vorlagen, Bestätigen.
import { app, D, openSheet, closeSheet, navigate } from './core.js';
import { esc, icon, kg, parseNum, relDay, fmtDay } from './util.js';
import { CATEGORIES, CAT } from './model.js';
import {
  addToSession, createExercise, updateSet, deleteSet, removeFromSession, moveInSession,
  swapInSession, saveTemplate, deleteTemplate,
} from './ops.js';
import { toast } from './fx.js';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// ---------- Übung auswählen ----------
export function pickExercise({ title = 'Übung hinzufügen', onPick, markIn = [] }) {
  const d = D();
  const all = app.state.exercises
    .filter((e) => !e.hidden)
    .sort((a, b) => (d.lastUsed.get(b.id) || '').localeCompare(d.lastUsed.get(a.id) || '') || a.name.localeCompare(b.name));
  const listHtml = (q) => {
    const nq = norm(q.trim());
    const rows = all
      .filter((e) => !nq || norm(e.name).includes(nq) || norm(CAT[e.cat]?.name || '').includes(nq))
      .slice(0, 80)
      .map((e) => {
        const last = d.lastUsed.get(e.id);
        return `<li><button data-pick="${e.id}" style="--c:${CAT[e.cat]?.color}"><i></i><span>${esc(e.name)}<br><small>${esc(CAT[e.cat]?.name || '')}${last ? ', zuletzt ' + esc(relDay(last)) : ''}</small></span>${markIn.includes(e.id) ? '<span class="in">dabei</span>' : ''}</button></li>`;
      });
    return rows.length ? rows.join('') : `<li class="muted" style="padding:14px 6px">Keine Übung gefunden. Leg sie unten neu an.</li>`;
  };
  const el = openSheet(`
    <h2>${esc(title)}</h2>
    <label class="search">${icon('search')}<input type="search" placeholder="Übung suchen" aria-label="Übung suchen" data-q></label>
    <ul class="pick-list" data-list>${listHtml('')}</ul>
    <div class="sheet-actions"><button class="btn-ghost" data-new>${icon('plus')} Neue Übung anlegen</button></div>`);
  const input = el.querySelector('[data-q]');
  input.addEventListener('input', () => { el.querySelector('[data-list]').innerHTML = listHtml(input.value); });
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pick]');
    if (b) {
      const id = Number(b.dataset.pick);
      await closeSheet();
      onPick(id);
      return;
    }
    if (e.target.closest('[data-new]')) newExerciseSheet({ name: input.value, onCreated: (id) => onPick(id) });
  });
}

// ---------- Neue Übung ----------
export function newExerciseSheet({ name = '', onCreated }) {
  let cat = 'brust';
  const el = openSheet(`
    <h2>Neue Übung</h2>
    <label class="field"><span>Name</span><input class="input" data-name value="${esc(name)}" placeholder="z. B. Incline Cable Fly" autocomplete="off"></label>
    <div class="field"><span>Muskelgruppe</span><div class="cat-pick">${CATEGORIES.map((c) => `<button class="cat-chip ${c.id === cat ? 'is-on' : ''}" style="--c:${c.color}" data-cat="${c.id}"><i></i>${esc(c.name)}</button>`).join('')}</div></div>
    <ul class="set-list">
      <li><span class="grow">Mit Langhantel<small>Zeigt die Scheiben pro Seite an</small></span><label class="switch"><input type="checkbox" data-bar><span></span></label></li>
      <li><span class="grow">Körpergewicht-Übung<small>Gewicht zählt als Zusatzgewicht, z. B. Dips</small></span><label class="switch"><input type="checkbox" data-bw><span></span></label></li>
    </ul>
    <div class="sheet-actions"><button class="btn-neon btn-block" data-save>Übung anlegen</button></div>`, { focus: '[data-name]' });
  el.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-cat]');
    if (c) {
      cat = c.dataset.cat;
      el.querySelectorAll('[data-cat]').forEach((x) => x.classList.toggle('is-on', x === c));
      return;
    }
    if (e.target.closest('[data-save]')) {
      const n = el.querySelector('[data-name]').value.trim();
      if (!n) { el.querySelector('[data-name]').focus(); toast('Gib der Übung einen Namen.'); return; }
      const id = createExercise({ name: n, cat, bar: el.querySelector('[data-bar]').checked, bw: el.querySelector('[data-bw]').checked });
      await closeSheet();
      if (id != null) onCreated?.(id);
    }
  });
}

// ---------- Satz bearbeiten ----------
export function editSetSheet(setId) {
  const set = app.state.sets.find((x) => x.id === setId);
  if (!set) return;
  const ex = D().exById.get(set.ex);
  const el = openSheet(`
    <h2>Satz bearbeiten</h2>
    <p class="lead">${esc(ex?.name || '')}, ${esc(fmtDay(set.d))}</p>
    <div class="two">
      <label class="field"><span>${ex?.bw ? 'Zusatzgewicht (kg)' : 'Gewicht (kg)'}</span><input class="input input-big" inputmode="decimal" value="${kg(set.w)}" data-w></label>
      <label class="field"><span>Wiederholungen</span><input class="input input-big" inputmode="numeric" value="${set.r}" data-r></label>
    </div>
    <label class="field"><span>Notiz</span><textarea class="input" data-note placeholder="z. B. letzte Wdh. mit Hilfe">${esc(set.note || '')}</textarea></label>
    <div class="sheet-actions">
      <button class="btn-neon btn-block" data-save>Speichern</button>
      <button class="btn-ghost danger" data-del>${icon('trash')} Satz löschen</button>
    </div>`);
  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-save]')) {
      const w = parseNum(el.querySelector('[data-w]').value);
      const r = Math.round(parseNum(el.querySelector('[data-r]').value));
      if (!(w >= 0) || !(r >= 0)) { toast('Bitte gültige Zahlen eingeben.'); return; }
      const note = el.querySelector('[data-note]').value.trim();
      await closeSheet();
      updateSet(setId, { w, r, note });
      toast('Satz gespeichert');
    } else if (e.target.closest('[data-del]')) {
      await closeSheet();
      deleteSet(setId);
    }
  });
}

// ---------- Menü einer Übung im Training ----------
export function exerciseMenu(exId) {
  const d = D();
  const ex = d.exById.get(exId);
  const a = app.state.active;
  const hasSets = (d.days.get(a?.d)?.sets || []).some((x) => x.ex === exId);
  const el = openSheet(`
    <h2>${esc(ex?.name || '')}</h2>
    <ul class="menu-list">
      <li><button data-m="detail">${icon('layers')} Verlauf und Einstellungen</button></li>
      <li><button data-m="up">${icon('up')} Nach oben schieben</button></li>
      <li><button data-m="down">${icon('down')} Nach unten schieben</button></li>
      <li><button data-m="swap">${icon('swap')} Gegen andere Übung tauschen</button></li>
      ${hasSets ? '' : `<li><button data-m="remove" class="danger">${icon('x')} Aus diesem Training nehmen</button></li>`}
    </ul>`);
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    const m = b.dataset.m;
    await closeSheet();
    if (m === 'detail') navigate('uebung', exId);
    else if (m === 'up') moveInSession(exId, -1);
    else if (m === 'down') moveInSession(exId, 1);
    else if (m === 'remove') removeFromSession(exId);
    else if (m === 'swap') pickExercise({ title: 'Tauschen gegen', markIn: app.state.active?.ex || [], onPick: (id) => swapInSession(exId, id) });
  });
}

// ---------- Bestätigen ----------
export function confirmSheet({ title, text, confirm = 'OK', danger = false, onConfirm }) {
  const el = openSheet(`
    <h2>${esc(title)}</h2>
    ${text ? `<p class="lead">${esc(text)}</p>` : ''}
    <div class="sheet-actions">
      <button class="${danger ? 'btn-ghost danger' : 'btn-neon btn-block'}" data-yes>${esc(confirm)}</button>
      <button class="btn-ghost" data-no>Abbrechen</button>
    </div>`);
  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-yes]')) { await closeSheet(); onConfirm(); }
    else if (e.target.closest('[data-no]')) closeSheet();
  });
}

// ---------- Vorlagen ----------
export function templatesSheet() {
  const s = app.state;
  const el = openSheet(`
    <h2>Vorlagen</h2>
    <p class="lead">Deine Trainingstage mit ihren Übungen. Die Reihenfolge im Split: ${esc(s.rotation.map((id) => (id === 'off' ? 'Ruhetag' : s.templates.find((t) => t.id === id)?.name || id)).join(', '))}.</p>
    <ul class="menu-list">
      ${s.templates.map((t) => `<li><button data-t="${esc(t.id)}">${icon('edit')} <span class="grow">${esc(t.name)} <small class="muted">${t.ex.length} Übungen</small></span></button></li>`).join('')}
      <li><button data-t="__new">${icon('plus')} Neue Vorlage</button></li>
    </ul>`);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    const id = b.dataset.t;
    const tpl = id === '__new' ? { id: 'v' + Date.now().toString(36), name: '', jp: '', ex: [] } : structuredClone(s.templates.find((t) => t.id === id));
    templateEditor(tpl, id === '__new');
  });
}

function templateEditor(tpl, isNew) {
  const d = D();
  const draw = () => {
    const el = openSheet(`
      <h2>${isNew ? 'Neue Vorlage' : 'Vorlage bearbeiten'}</h2>
      <label class="field"><span>Name</span><input class="input" data-name value="${esc(tpl.name)}" placeholder="z. B. Oberkörper"></label>
      <ul class="tpl-edit set-list" style="margin-bottom:10px">
        ${tpl.ex.map((id, i) => {
          const ex = d.exById.get(id);
          return `<li style="--c:${CAT[ex?.cat]?.color}"><i></i><span>${esc(ex?.name || '?')}</span>
            <button class="icon-btn" data-up="${i}" aria-label="Nach oben">${icon('up')}</button>
            <button class="icon-btn" data-down="${i}" aria-label="Nach unten">${icon('down')}</button>
            <button class="icon-btn" data-rm="${i}" aria-label="Entfernen">${icon('x')}</button></li>`;
        }).join('') || '<li class="muted">Noch keine Übungen.</li>'}
      </ul>
      <button class="btn-dashed" data-add>${icon('plus')} Übung hinzufügen</button>
      <div class="sheet-actions">
        <button class="btn-neon btn-block" data-save>Speichern</button>
        ${isNew ? '' : '<button class="btn-ghost danger" data-del>Vorlage löschen</button>'}
      </div>`);
    const nameIn = el.querySelector('[data-name]');
    nameIn.addEventListener('input', () => { tpl.name = nameIn.value; });
    el.addEventListener('click', async (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.up != null) { const i = +t.dataset.up; if (i > 0) [tpl.ex[i - 1], tpl.ex[i]] = [tpl.ex[i], tpl.ex[i - 1]]; draw(); }
      else if (t.dataset.down != null) { const i = +t.dataset.down; if (i < tpl.ex.length - 1) [tpl.ex[i + 1], tpl.ex[i]] = [tpl.ex[i], tpl.ex[i + 1]]; draw(); }
      else if (t.dataset.rm != null) { tpl.ex.splice(+t.dataset.rm, 1); draw(); }
      else if (t.hasAttribute('data-add')) {
        pickExercise({ title: 'Zur Vorlage hinzufügen', markIn: tpl.ex, onPick: (id) => { if (!tpl.ex.includes(id)) tpl.ex.push(id); setTimeout(draw, 30); } });
      } else if (t.hasAttribute('data-save')) {
        tpl.name = nameIn.value.trim();
        if (!tpl.name) { toast('Gib der Vorlage einen Namen.'); nameIn.focus(); return; }
        await closeSheet();
        saveTemplate(tpl);
        toast(`Vorlage „${tpl.name}“ gespeichert`);
      } else if (t.hasAttribute('data-del')) {
        await closeSheet();
        confirmSheet({ title: `„${tpl.name}“ löschen?`, text: 'Deine eingetragenen Sätze bleiben erhalten.', confirm: 'Vorlage löschen', danger: true, onConfirm: () => deleteTemplate(tpl.id) });
      }
    });
  };
  draw();
}

// Für das Training: Übung in die laufende Einheit holen.
export function addExerciseToSession() {
  pickExercise({ markIn: app.state.active?.ex || [], onPick: (id) => addToSession(id) });
}
