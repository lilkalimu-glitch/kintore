// Startseite: Neon-Schild, Status-Fenster, Tages-Quest, Wochen-Radar, Rekorde.
import { app, D, views, actions, navigate, commit } from './core.js';
import { esc, icon, int, fmtLong, today, relDay, fmtSetText, fmtDate, daysBetween } from './util.js';
import { nextQuest, progressionTip, weekCats, weekStreak, daySummary } from './stats.js';
import { radarChart } from './charts.js';
import { startSession } from './ops.js';


function rankBadge(lv) {
  return `<div class="rank rank-${esc(lv.rank)}" aria-label="Rang ${esc(lv.rank)}">
    <svg viewBox="0 0 54 60" aria-hidden="true"><polygon points="27,3 51,16 51,44 27,57 3,44 3,16"/></svg>
    <b>${esc(lv.rank)}</b><small>Rang</small>
  </div>`;
}

function rotationTrack(s, currentId) {
  const rot = s.rotation;
  const idx = rot.indexOf(currentId);
  return `<div class="rotation" aria-label="Reihenfolge deines Splits">${rot
    .map((id, i) => {
      const name = id === 'off' ? 'Ruhetag' : s.templates.find((t) => t.id === id)?.name || id;
      const cls = i === idx ? 'is-now' : idx >= 0 && i < idx ? 'is-done' : '';
      return `${i ? '<span class="rot-link"></span>' : ''}<span class="rot-step ${cls}">${esc(name)}</span>`;
    })
    .join('')}</div>`;
}

function targetsList(s, d, tpl) {
  const ids = tpl.ex.slice(0, 5);
  const rows = ids.map((id) => {
    const ex = d.exById.get(id);
    if (!ex) return '';
    const tip = progressionTip(ex, d.sessionsByEx.get(id), today());
    const val = tip
      ? `<span class="t-val ${tip.up ? 'up' : ''}">${tip.up ? icon('arrowUp') : ''}${fmtSetText(ex, { w: tip.w, r: tip.r })}</span>`
      : `<span class="t-val">${ex.repMin}–${ex.repMax} Wdh.</span>`;
    return `<li><span class="t-name">${esc(ex.name)}</span>${val}</li>`;
  });
  const more = tpl.ex.length - ids.length;
  return `<ul class="targets">${rows.join('')}${more > 0 ? `<li class="more">und ${more} weitere</li>` : ''}</ul>`;
}

function questCard(s, d) {
  const q = nextQuest(s, d);
  if (q.kind === 'active') {
    const n = d.days.get(today())?.sets.length || 0;
    return `<section class="card quest">
      <div class="quest-label">Läuft gerade</div>
      <div class="quest-title"><b>${esc(q.tpl?.name || 'Training')}</b>${q.tpl ? `<span>${esc(q.tpl.jp)}</span>` : ''}</div>
      <p class="rest-msg">${n ? `${n} ${n === 1 ? 'Satz' : 'Sätze'} eingetragen.` : 'Noch kein Satz eingetragen.'}</p>
      <button class="btn-neon btn-block" data-act="go" data-to="training">Weiter trainieren</button>
    </section>`;
  }
  if (q.kind === 'done') {
    const sum = daySummary(s, d, today());
    const next = (() => {
      const rot = s.rotation;
      if (!q.tpl) return null;
      const i = rot.indexOf(q.tpl.id);
      if (i < 0) return null;
      let id = rot[(i + 1) % rot.length];
      if (id === 'off') return 'Ruhetag';
      return s.templates.find((t) => t.id === id)?.name || null;
    })();
    return `<section class="card quest">
      <div class="quest-label">Heute erledigt</div>
      <div class="quest-title"><b>${esc(q.tpl?.name || 'Training')}</b><span>完了</span></div>
      ${q.tpl ? rotationTrack(s, q.tpl.id) : ''}
      <p class="rest-msg">${sum.sets} Sätze, ${int(sum.vol)} kg Volumen${sum.prs ? `, ${sum.prs} ${sum.prs === 1 ? 'Rekord' : 'Rekorde'}` : ''}.${next ? ` Als Nächstes: ${esc(next)}.` : ''}</p>
      <button class="btn-ghost btn-block" data-act="start-session" data-tpl="${esc(q.tpl?.id || '')}">Noch etwas eintragen</button>
    </section>`;
  }
  if (q.kind === 'rest') {
    return `<section class="card quest">
      <div class="quest-label">Heute dran</div>
      <div class="quest-title"><b>Ruhetag</b><span>休息日</span></div>
      ${rotationTrack(s, 'off')}
      <p class="rest-msg">Nach dem ${esc(q.lastTpl?.name || 'letzten')}-Tag ist Pause. ${q.tpl ? `Danach geht es mit ${esc(q.tpl.name)} weiter.` : ''}</p>
      ${q.tpl ? `<button class="btn-ghost btn-block" data-act="start-session" data-tpl="${esc(q.tpl.id)}">Trotzdem ${esc(q.tpl.name)} trainieren</button>` : ''}
    </section>`;
  }
  if (!q.tpl) {
    return `<section class="card quest">
      <div class="quest-label">Heute dran</div>
      <div class="quest-title"><b>Training</b></div>
      <button class="btn-neon btn-block" data-act="go" data-to="training">Training starten</button>
    </section>`;
  }
  return `<section class="card quest">
    <div class="quest-label">Heute dran${q.last ? `, letztes Training ${esc(relDay(q.last))}` : ''}</div>
    <div class="quest-title"><b>${esc(q.tpl.name)}</b><span>${esc(q.tpl.jp || '')}</span></div>
    ${rotationTrack(s, q.tpl.id)}
    ${targetsList(s, d, q.tpl)}
    <button class="btn-neon btn-block" data-act="start-session" data-tpl="${esc(q.tpl.id)}">${icon('play', 'ic-fill')} ${esc(q.tpl.name)} starten</button>
  </section>`;
}

function weekCard(d) {
  const ws = weekStreak(d);
  const t = today();
  const names = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  return `<section class="card pad">
    <div class="card-title"><h2>Diese Woche</h2><span class="hint">Sätze je Muskel, 7 Tage</span></div>
    ${radarChart(weekCats(d))}
    <div class="legend"><span><i></i>10 Sätze pro Woche</span></div>
    <div class="week">${ws.days.map((x, i) => `<div class="wk-day ${x.trained ? 'on' : ''} ${x.d === t ? 'today' : ''} ${x.future ? 'future' : ''}"><i></i>${names[i]}</div>`).join('')}</div>
    <div class="streak">${icon('flame')}<span>${ws.streak ? `<b>${ws.streak} ${ws.streak === 1 ? 'Woche' : 'Wochen'}</b> am Stück mit mindestens 3 Trainings` : 'Schaff 3 Trainings diese Woche für eine neue Serie'}</span></div>
  </section>`;
}

function prCard(d) {
  const recent = d.prEvents.slice(-5).reverse();
  if (!recent.length) return '';
  return `<section class="card pad">
    <div class="card-title"><h2>Neue Rekorde</h2><span class="hint">${int(d.prEvents.length)} insgesamt</span></div>
    <ul class="pr-list">${recent
      .map((p) => {
        const ex = d.exById.get(p.ex);
        return `<li data-act="go" data-to="uebung" data-id="${p.ex}" role="button" tabindex="0"><span class="pr-star">${icon('star')}</span><span class="pr-name">${esc(ex?.name || '')}<small>${esc(relDay(p.d))}</small></span><span class="pr-val">${fmtSetText(ex, p)}</span></li>`;
      })
      .join('')}</ul>
  </section>`;
}

function noticeCard(s) {
  const m = s.meta || {};
  if (!m.welcomeDone && !s.sets.length) {
    return `<section class="card pad notice">
      <div class="card-title"><h2>Willkommen</h2><span class="jp" aria-hidden="true">ようこそ</span></div>
      <p class="soft">Starte dein erstes Training mit einer Vorlage unten. Die Vorlagen und Wiederholungsbereiche kannst du jederzeit anpassen. Hast du vorher FitNotes benutzt? Dann hol deine Daten über <b>Einstellungen → FitNotes-Backup importieren</b>.</p>
      <button class="btn-ghost small" data-act="notice-ok" data-k="welcomeDone">Alles klar</button>
    </section>`;
  }
  if (!m.welcomeDone && m.summary) {
    const last = m.summary.last || (D().dates.slice(-1)[0] ?? null);
    return `<section class="card pad notice">
      <div class="card-title"><h2>Willkommen</h2><span class="jp" aria-hidden="true">ようこそ</span></div>
      <p class="soft">Deine FitNotes-Daten${last ? ` bis ${esc(fmtDate(last))}` : ''} sind schon drin. Falls du seitdem noch in FitNotes trainiert hast, hol die Tage über <b>Einstellungen → FitNotes-Backup importieren</b> nach.</p>
      <button class="btn-ghost small" data-act="notice-ok" data-k="welcomeDone">Alles klar</button>
    </section>`;
  }
  const lastBackup = m.lastBackup;
  const lastSet = s.sets.reduce((a, x) => (x.t && x.t > a ? x.t : a), 0);
  const due = lastSet && (!lastBackup || daysBetween(lastBackup, today()) >= 30) && (!m.backupSnooze || daysBetween(m.backupSnooze, today()) >= 7);
  if (due) {
    return `<section class="card pad notice">
      <div class="card-title"><h2>Backup fällig</h2></div>
      <p class="soft">${lastBackup ? `Dein letztes Backup ist vom ${esc(fmtDate(lastBackup))}.` : 'Du hast noch kein Backup gespeichert.'} Speichere eins, damit beim Handywechsel nichts verloren geht.</p>
      <div class="row-actions"><button class="btn-ghost small" data-act="go" data-to="einstellungen">Zum Backup</button><button class="btn-ghost small" data-act="notice-ok" data-k="backupSnooze">Später</button></div>
    </section>`;
  }
  return '';
}

actions['notice-ok'] = (ds) => commit((s) => { s.meta[ds.k] = ds.k === 'backupSnooze' ? today() : true; });

views.start = {
  render() {
    const s = app.state;
    const d = D();
    const lv = d.level;
    return `
    <section class="hero">
      <div class="neon-sign" role="img" aria-label="筋トレ, japanisch für Krafttraining">筋トレ</div>
      <div>
        <div class="brand">
          <div class="brand-name"><b>KINTORE</b><span>${esc(fmtLong(today()))}</span></div>
          <button class="icon-btn" data-act="go" data-to="einstellungen" aria-label="Einstellungen">${icon('sliders')}</button>
        </div>
        <div class="card status">
          <div class="status-top">
            <div class="lv"><small>LV</small><b>${lv.level}</b></div>
            ${rankBadge(lv)}
          </div>
          <div class="xpbar" style="--p:${(lv.progress * 100).toFixed(1)}%" role="progressbar" aria-valuenow="${Math.round(lv.progress * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="Fortschritt zum nächsten Level"><i></i></div>
          <div class="xp-text"><span>Noch ${int(lv.toNext)} XP bis Level ${lv.level + 1}</span>${lv.nextRank ? `<span>Rang ${esc(lv.nextRank.id)} ab Level ${lv.nextRank.level}</span>` : ''}</div>
        </div>
      </div>
    </section>
    <section class="card stats3">
      <div><b>${int(d.totals.days)}</b><span>Trainingstage</span></div>
      <div><b>${int(d.totals.sets)}</b><span>Sätze</span></div>
      <div><b>${int(d.totals.tonnage / 1000)} t</b><span>bewegt</span></div>
    </section>
    <div class="stack">
      ${noticeCard(s)}
      ${questCard(s, d)}
      ${weekCard(d)}
      ${prCard(d)}
    </div>`;
  },
};

actions.go = (ds) => navigate(ds.to, ds.id ?? null);
actions['start-session'] = (ds) => {
  app.ui.drafts = {};
  startSession(ds.tpl || null);
  navigate('training');
};
