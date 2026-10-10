// Einstellungen: Pausen-Timer, Training, Hintergrund, Backup und Import.
import { app, D, views, actions, render, commit, openSheet, closeSheet, replaceState } from './core.js';
import { esc, icon, kg, int, parseNum, today, fmtDate, fmtClock } from './util.js';
import { exportJson, importBackupText, importFitNotes, migrate } from './ops.js';
import { readFitNotes } from './fitnotes.js';
import { saveTextFile, notificationsAllowed, isNative } from './native.js';
import { loadBg, saveBg } from './store.js';
import { applyBackground } from './bg.js';
import { confirmSheet, templatesSheet } from './sheets.js';
import { toast } from './fx.js';
import { VERSION } from './version.js';
import { equipped, APP_TYPES } from './look.js';

let bgCache = null;

function sw(key, on) {
  return `<label class="switch"><input type="checkbox" data-setting="${key}" ${on ? 'checked' : ''}><span></span></label>`;
}
function mini(act, value, label) {
  return `<div class="mini-step"><button data-act="${act}" data-dir="-1" aria-label="${label} verringern">${icon('minus')}</button><output>${value}</output><button data-act="${act}" data-dir="1" aria-label="${label} erhöhen">${icon('plus')}</button></div>`;
}

views.einstellungen = {
  render() {
    const s = app.state;
    const st = s.settings;
    const d = D();
    const bwAuto = !(Number(st.bwManual) > 0);
    const look = equipped(s, d.level.level);
    return `
    <header class="head has-back">
      <span class="jp-mark" aria-hidden="true">設定</span>
      <div class="head-row"><button class="icon-btn back-btn" data-act="back" aria-label="Zurück">${icon('left')}</button></div>
      <h1 style="margin-top:14px">Einstellungen</h1>
    </header>

    <h2 class="group-title">Pausen-Timer</h2>
    <section class="card"><ul class="set-list">
      <li><span class="grow">Nach jedem Satz starten</span>${sw('restAuto', st.restAuto)}</li>
      <li><span class="grow">Eigene Pause je Übung</span>${sw('useExerciseRest', st.useExerciseRest)}</li>
      <li><span class="grow">Standard-Pause</span>${mini('set-rest', fmtClock(st.restDefault), 'Standard-Pause')}</li>
      <li><span class="grow">Vibration am Ende</span>${sw('restVibrate', st.restVibrate)}</li>
      <li><span class="grow">Mitteilung bei gesperrtem Handy${isNative() ? '' : '<small>Nur in der Android-App</small>'}</span>${sw('restNotify', st.restNotify)}</li>
    </ul></section>

    <h2 class="group-title">Training</h2>
    <section class="card"><ul class="set-list">
      <li><button class="row-btn" data-act="edit-templates">${icon('layers')}<span class="grow">Vorlagen<small>${esc(s.templates.map((t) => t.name).join(', ') || 'Keine')}</small></span>${icon('right')}</button></li>
      <li><span class="grow">Langhantel</span>${mini('set-bar', kg(st.barWeight) + ' kg', 'Hantelgewicht')}</li>
      <li><button class="row-btn" data-act="set-bw">${icon('scale')}<span class="grow">Körpergewicht für Klimmzüge und Dips<small>${bwAuto ? `Automatisch: letzter Eintrag (${kg(d.bw)} kg)` : `Fest: ${kg(st.bwManual)} kg`}</small></span>${icon('right')}</button></li>
      <li><button class="row-btn" data-act="set-goal">${icon('sparkle')}<span class="grow">Zielgewicht<small>${Number(st.goalWeight) > 0 ? `${kg(st.goalWeight)} kg` : 'Nicht gesetzt'}</small></span>${icon('right')}</button></li>
    </ul></section>

    <h2 class="group-title">Aussehen</h2>
    <section class="card"><ul class="set-list">
      <li><button class="row-btn" data-act="go" data-to="profil">${icon('image')}<span class="grow">Profil<small>${esc(s.profile.name || 'Name und Bild')}</small></span>${icon('right')}</button></li>
      <li><button class="row-btn" data-act="look-open">${icon('sparkle')}<span class="grow">Dein Look<small>${esc(APP_TYPES.map((t) => look[t].name).join(', '))}</small></span>${icon('right')}</button></li>
      <li><span class="bg-preview" data-bg-preview></span><span class="grow">Hintergrundbild</span>
        <label class="btn-ghost small">Wählen<input type="file" accept="image/*" data-bg-file class="visually-hidden"></label></li>
      <li data-bg-only><span class="grow">Abdunkeln</span><input type="range" min="0" max="0.9" step="0.05" value="${st.bgDim}" data-range="bgDim" aria-label="Abdunkeln" style="max-width:150px"></li>
      <li data-bg-only><span class="grow">Weichzeichnen</span><input type="range" min="0" max="20" step="1" value="${st.bgBlur}" data-range="bgBlur" aria-label="Weichzeichnen" style="max-width:150px"></li>
      <li data-bg-only><button class="row-btn" data-act="bg-remove">${icon('x')}<span class="grow">Bild entfernen</span></button></li>
    </ul></section>

    <h2 class="group-title">Daten</h2>
    <section class="card"><ul class="set-list">
      <li><button class="row-btn" data-act="backup-save">${icon('download')}<span class="grow">Backup speichern<small>${s.meta.lastBackup ? 'Zuletzt ' + esc(fmtDate(s.meta.lastBackup)) : 'Noch nie'}</small></span></button></li>
      <li><label class="row-btn">${icon('upload')}<span class="grow">Backup laden</span><input type="file" accept=".json,application/json,text/plain" data-backup-file class="visually-hidden"></label></li>
      <li><label class="row-btn">${icon('file')}<span class="grow">FitNotes-Backup importieren</span><input type="file" data-fitnotes-file class="visually-hidden"></label></li>
      <li><button class="row-btn" data-act="reset">${icon('trash')}<span class="grow">Alle Daten löschen</span></button></li>
    </ul></section>

    <div class="about">
      <b>KINTORE <span class="jp">筋トレ</span></b>
      Version ${esc(VERSION)}
    </div>`;
  },
  async after(main) {
    main.querySelectorAll('[data-setting]').forEach((inp) => {
      inp.addEventListener('change', async () => {
        const key = inp.dataset.setting;
        commit((s) => { s.settings[key] = inp.checked; }, { render: false });
        if (key === 'restNotify' && inp.checked && isNative()) {
          const ok = await notificationsAllowed(true);
          if (!ok) toast('Erlaube Mitteilungen für KINTORE in den Android-Einstellungen.');
        }
      });
    });
    main.querySelectorAll('[data-range]').forEach((inp) => {
      inp.addEventListener('input', () => {
        commit((s) => { s.settings[inp.dataset.range] = Number(inp.value); }, { render: false });
        applyBackground();
      });
    });
    const file = main.querySelector('[data-bg-file]');
    file?.addEventListener('change', () => pickBackground(file.files?.[0]));
    main.querySelector('[data-backup-file]')?.addEventListener('change', (e) => loadBackup(e.target.files?.[0], e.target));
    main.querySelector('[data-fitnotes-file]')?.addEventListener('change', (e) => loadFitNotes(e.target.files?.[0], e.target));
    if (bgCache === null) bgCache = (await loadBg()) || '';
    paintBgPreview(main);
  },
};

function paintBgPreview(main) {
  const prev = main.querySelector('[data-bg-preview]');
  if (prev) prev.style.backgroundImage = bgCache ? `url("${bgCache}")` : '';
  main.querySelectorAll('[data-bg-only]').forEach((li) => { li.hidden = !bgCache; });
}

function resizeImage(file, max = 1440) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.84));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht gelesen werden.')); };
    img.src = url;
  });
}

async function pickBackground(f) {
  if (!f) return;
  try {
    const data = await resizeImage(f);
    await saveBg(data);
    bgCache = data;
    applyBackground(data);
    paintBgPreview(document.getElementById('view'));
    toast('Hintergrund gesetzt');
  } catch (e) {
    toast(e.message || 'Bild konnte nicht geladen werden.');
  }
}

const readAs = (file, how) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
  if (how === 'text') r.readAsText(file);
  else r.readAsArrayBuffer(file);
});

async function loadBackup(f, input) {
  if (!f) return;
  try {
    const text = await readAs(f, 'text');
    JSON.parse(text);
    confirmSheet({
      title: 'Backup laden?',
      text: 'Das ersetzt alle Daten auf diesem Handy.',
      confirm: 'Backup laden',
      onConfirm: () => {
        try { importBackupText(text); toast('Backup geladen'); } catch (e) { toast(e.message); }
      },
    });
  } catch {
    toast('Diese Datei ist kein KINTORE-Backup.');
  } finally {
    input.value = '';
  }
}

async function loadFitNotes(f, input) {
  if (!f) return;
  try {
    const buf = await readAs(f, 'buffer');
    const fit = readFitNotes(buf);
    const have = new Set(app.state.sets.map((x) => x.d));
    const newDays = new Set(fit.sets.filter((x) => !have.has(x.d)).map((x) => x.d));
    const el = openSheet(`
      <h2>FitNotes-Backup</h2>
      <p class="lead">${esc(f.name)}</p>
      <div class="import-sum">
        <div><span>Trainingstage</span><b>${fit.summary.days}</b></div>
        <div><span>Sätze</span><b>${int(fit.summary.sets)}</b></div>
        <div><span>Davon neu für KINTORE</span><b>${newDays.size} Tage</b></div>
        <div><span>Letztes Training</span><b>${fit.summary.last ? esc(fmtDate(fit.summary.last)) : '-'}</b></div>
      </div>
      <div class="sheet-actions">
        <button class="btn-neon btn-block" data-mode="add" ${newDays.size ? '' : 'disabled style="opacity:.5"'}>${newDays.size ? `${newDays.size} fehlende Tage ergänzen` : 'Nichts Neues zum Ergänzen'}</button>
        <button class="btn-ghost" data-mode="replace">Alles durch FitNotes ersetzen</button>
      </div>`);
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-mode]');
      if (!b || b.disabled) return;
      const mode = b.dataset.mode;
      await closeSheet();
      if (mode === 'replace') {
        confirmSheet({
          title: 'Alles ersetzen?',
          text: 'Alle Sätze in KINTORE werden durch das FitNotes-Backup ersetzt. Vorlagen und Einstellungen bleiben.',
          confirm: 'Ersetzen',
          danger: true,
          onConfirm: () => { const r = importFitNotes(fit, 'replace'); toast(`${int(r.sets)} Sätze übernommen`); },
        });
      } else {
        const r = importFitNotes(fit, 'add');
        toast(`${int(r.sets)} Sätze an ${r.days} Tagen ergänzt`);
      }
    });
  } catch (e) {
    toast(e.message || 'Diese Datei ist kein FitNotes-Backup.');
  } finally {
    input.value = '';
  }
}

actions['set-rest'] = (ds) => commit((s) => { s.settings.restDefault = Math.max(15, Math.min(600, s.settings.restDefault + Number(ds.dir) * 15)); });
actions['set-bar'] = (ds) => commit((s) => { s.settings.barWeight = Math.max(5, Math.min(30, s.settings.barWeight + Number(ds.dir) * 2.5)); });

function numberSheet({ title, lead, value, placeholder, onSave, allowEmpty }) {
  const el = openSheet(`<h2>${esc(title)}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
    <label class="field"><span>Kilogramm</span><input class="input input-big" inputmode="decimal" value="${value ? kg(value) : ''}" placeholder="${esc(placeholder)}" data-v></label>
    <div class="sheet-actions"><button class="btn-neon btn-block" data-save>Speichern</button>${allowEmpty ? `<button class="btn-ghost" data-clear>${esc(allowEmpty)}</button>` : ''}</div>`, { focus: '[data-v]' });
  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-save]')) {
      const v = parseNum(el.querySelector('[data-v]').value);
      if (!(v > 20 && v < 400)) { toast('Bitte ein gültiges Gewicht eingeben.'); return; }
      await closeSheet();
      onSave(v);
    } else if (e.target.closest('[data-clear]')) {
      await closeSheet();
      onSave(null);
    }
  });
}

actions['set-bw'] = () => numberSheet({
  title: 'Körpergewicht für Klimmzüge und Dips',
  lead: 'Wird fürs 1RM zum Zusatzgewicht addiert. Ohne Wert nimmt die App den letzten Eintrag unter Körper.',
  value: app.state.settings.bwManual,
  placeholder: kg(D().bw),
  allowEmpty: 'Automatisch verwenden',
  onSave: (v) => commit((s) => { s.settings.bwManual = v; }),
});

actions['set-goal'] = () => numberSheet({
  title: 'Zielgewicht',
  lead: 'Wird als Linie im Diagramm angezeigt.',
  value: app.state.settings.goalWeight,
  placeholder: 'z. B. 80',
  allowEmpty: 'Kein Ziel',
  onSave: (v) => commit((s) => { s.settings.goalWeight = v; }),
});

actions['bg-remove'] = async () => {
  await saveBg(null);
  bgCache = '';
  applyBackground(null);
  render();
};

actions['backup-save'] = async () => {
  const res = await saveTextFile(`kintore-backup-${today()}.json`, exportJson());
  if (res.ok) {
    commit((s) => { s.meta.lastBackup = today(); });
    toast(res.how === 'documents' ? 'Backup in Dokumente gespeichert' : 'Backup erstellt');
  } else toast('Backup konnte nicht gespeichert werden.');
};

actions.reset = () => confirmSheet({
  title: 'Alle Daten löschen?',
  text: 'Alle Trainings, Gewichte und eigenen Übungen sind danach weg.',
  confirm: 'Alles löschen',
  danger: true,
  onConfirm: async () => {
    const res = await fetch('data/seed.json', { cache: 'no-store' });
    const seed = await res.json();
    seed.settings = app.state.settings;
    seed.profile = app.state.profile;
    replaceState(migrate(seed));
    toast('Alles gelöscht');
  },
});

actions['edit-templates'] = () => templatesSheet();
