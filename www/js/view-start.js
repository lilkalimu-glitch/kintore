// Startseite: Neon-Schild, Status-Fenster, Tages-Quest, Wochen-Radar, Rekorde.
import { app, D, views, actions, navigate, commit } from './core.js';
import { esc, icon, int, fmtLong, today, relDay, fmtSetText, fmtDate, daysBetween, addDays } from './util.js';
import { nextQuest, progressionTip, weekCats, weekStreak, daySummary, questGoal, weekXp, SHIELD_MAX } from './stats.js';
import { radarChart } from './charts.js';
import { startSession } from './ops.js';
import { emblem, equipped, readyStations, rarityOf, signSparks } from './look.js';
import { myAvatar } from './me.js';

function rankBadge(lv, look, ready) {
  return `<div class="rank-badge">
    ${emblem(lv.rank, look.frame.id, 58, '', { fx: true })}
    ${ready ? `<span class="badge-dot" aria-label="${ready} ${ready === 1 ? 'Belohnung' : 'Belohnungen'} bereit">${ready}</span>` : ''}
    <small>Rang</small>
  </div>`;
}

// Fortschritt der Tages-Quest als kleine Leiste.
function questGoalRow(goal) {
  const pct = goal.done ? 100 : Math.min(100, (goal.count / goal.target) * 100);
  const body = goal.kind === 'body';
  return `<div class="qgoal ${goal.done ? 'is-done' : ''} ${body ? 'is-body' : ''}">
    <div class="qg-row">
      <span class="qg-label">${icon(goal.done ? 'check' : 'target')}Tages-Quest: ${body ? 'Gewicht eintragen' : `${goal.target} Sätze`}</span>
      <span class="qg-xp">+${goal.xp} XP</span>
    </div>
    ${body ? '' : `<div class="qg-bar" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100" aria-label="Tages-Quest"><i style="--p:${pct}%"></i></div>
    <div class="qg-state">${goal.done ? 'Geschafft' : `${goal.count}/${goal.target}`}</div>`}
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
      : `<span class="t-val">${ex.repMin}-${ex.repMax} Wdh.</span>`;
    return `<li><span class="t-name">${esc(ex.name)}</span>${val}</li>`;
  });
  const more = tpl.ex.length - ids.length;
  return `<ul class="targets">${rows.join('')}${more > 0 ? `<li class="more">und ${more} weitere</li>` : ''}</ul>`;
}

function questCard(s, d) {
  const q = nextQuest(s, d);
  const goal = questGoal(s, d, q);
  if (q.kind === 'active') {
    const n = d.days.get(today())?.sets.length || 0;
    return `<section class="card quest">
      <div class="quest-label">Läuft gerade</div>
      <div class="quest-title"><b>${esc(q.tpl?.name || 'Training')}</b>${q.tpl ? `<span>${esc(q.tpl.jp)}</span>` : ''}</div>
      ${questGoalRow(goal)}
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
      ${questGoalRow(goal)}
      <p class="rest-msg">${sum.sets} Sätze, ${int(sum.vol)} kg Volumen${sum.prs ? `, ${sum.prs} ${sum.prs === 1 ? 'Rekord' : 'Rekorde'}` : ''}.${next ? ` Als Nächstes: ${esc(next)}.` : ''}</p>
      <button class="btn-ghost btn-block" data-act="start-session" data-tpl="${esc(q.tpl?.id || '')}">Noch etwas eintragen</button>
    </section>`;
  }
  if (q.kind === 'rest') {
    return `<section class="card quest">
      <div class="quest-label">Heute dran</div>
      <div class="quest-title"><b>Ruhetag</b><span>休息日</span></div>
      ${rotationTrack(s, 'off')}
      ${questGoalRow(goal)}
      <p class="rest-msg">Heute ist Pause.${q.tpl ? ` Danach kommt ${esc(q.tpl.name)}.` : ''}</p>
      ${goal.done ? '' : `<button class="btn-neon btn-block" data-act="go" data-to="koerper">${icon('scale')} Gewicht eintragen</button>`}
      ${q.tpl ? `<button class="btn-ghost btn-block ${goal.done ? '' : 'mt'}" data-act="start-session" data-tpl="${esc(q.tpl.id)}">Trotzdem ${esc(q.tpl.name)} trainieren</button>` : ''}
    </section>`;
  }
  if (!q.tpl) {
    return `<section class="card quest">
      <div class="quest-label">Heute dran</div>
      <div class="quest-title"><b>Training</b></div>
      ${questGoalRow(goal)}
      <button class="btn-neon btn-block" data-act="go" data-to="training">Training starten</button>
    </section>`;
  }
  return `<section class="card quest">
    <div class="quest-label">Heute dran</div>
    <div class="quest-title"><b>${esc(q.tpl.name)}</b><span>${esc(q.tpl.jp || '')}</span></div>
    ${rotationTrack(s, q.tpl.id)}
    ${targetsList(s, d, q.tpl)}
    ${questGoalRow(goal)}
    <button class="btn-neon btn-block" data-act="start-session" data-tpl="${esc(q.tpl.id)}">${icon('play', 'ic-fill')} ${esc(q.tpl.name)} starten</button>
  </section>`;
}

// Serie, Wochenbonus und Serien-Schutz.
function streakBlock(s, ws) {
  const bonus = (s.bonus || []).find((b) => b.k === 'week' && b.w === ws.week);
  const left = Math.max(0, 3 - ws.thisWeek);
  const bonusText = bonus
    ? `Wochenbonus geholt <b>+${int(bonus.xp)} XP</b>`
    : left
      ? `Noch ${left} ${left === 1 ? 'Training' : 'Trainings'} bis zum Wochenbonus <b>+${int(weekXp(ws.streak + 1))} XP</b>`
      : 'Woche geschafft';
  const slots = Array.from({ length: SHIELD_MAX }, (_, i) => `<i class="${i < ws.shields ? 'on' : ''}">${icon('shield')}</i>`).join('');
  const savedLast = ws.protectedWeeks.includes(addDays(ws.week, -7));
  let shieldText;
  if (savedLast) shieldText = 'Letzte Woche hat ein Schutz deine Serie gerettet';
  else if (!ws.streak) shieldText = 'Alle 4 Serien-Wochen gibt es einen Schutz';
  else if (ws.nextShieldIn == null) shieldText = 'Serien-Schutz voll';
  else shieldText = `Nächster Schutz in ${ws.nextShieldIn} ${ws.nextShieldIn === 1 ? 'Woche' : 'Wochen'}`;
  return `<div class="streak">${icon('flame')}<span>${ws.streak ? `<b>${ws.streak} ${ws.streak === 1 ? 'Woche' : 'Wochen'}</b> in Folge mit 3+ Trainings` : '3 Trainings in einer Woche starten eine Serie'}</span></div>
    <div class="streak-more">
      <div class="sm-row">${icon('sparkle')}<span>${bonusText}</span></div>
      <div class="sm-row"><span class="shields" aria-label="${ws.shields} von ${SHIELD_MAX} Serien-Schutz">${slots}</span><span>${esc(shieldText)}</span></div>
    </div>`;
}

function weekCard(s, d) {
  const ws = weekStreak(d);
  const t = today();
  const names = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  return `<section class="card pad">
    <div class="card-title"><h2>Diese Woche</h2><span class="hint">Sätze pro Muskel</span></div>
    ${radarChart(weekCats(d))}
    <div class="legend"><span><i></i>10 Sätze pro Woche</span></div>
    <div class="week">${ws.days.map((x, i) => `<div class="wk-day ${x.trained ? 'on' : ''} ${x.d === t ? 'today' : ''} ${x.future ? 'future' : ''}"><i></i>${names[i]}</div>`).join('')}</div>
    ${streakBlock(s, ws)}
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
      <p class="soft">Wähl unten eine Vorlage und leg los. Ein FitNotes-Backup kannst du in den Einstellungen importieren.</p>
      <button class="btn-ghost small" data-act="notice-ok" data-k="welcomeDone">Ok</button>
    </section>`;
  }
  if (!m.welcomeDone && m.summary) {
    const last = m.summary.last || (D().dates.slice(-1)[0] ?? null);
    return `<section class="card pad notice">
      <div class="card-title"><h2>Willkommen</h2><span class="jp" aria-hidden="true">ようこそ</span></div>
      <p class="soft">Deine FitNotes-Daten${last ? ` bis ${esc(fmtDate(last))}` : ''} sind drin. Wenn du danach noch in FitNotes trainiert hast, importier das neue Backup in den Einstellungen.</p>
      <button class="btn-ghost small" data-act="notice-ok" data-k="welcomeDone">Ok</button>
    </section>`;
  }
  // Einmal nach dem Update: neue XP-Rechnung erklären.
  if (m.xpNote && typeof m.xpNote === 'object') {
    return `<section class="card pad notice">
      <div class="card-title"><h2>Neue XP-Rechnung</h2><span class="jp" aria-hidden="true">経験値</span></div>
      <p class="soft">Schwere Sätze bringen jetzt mehr XP. Jede Übung hat dafür einen eigenen Maßstab. Dein Level ist von <b>${m.xpNote.from}</b> auf <b>${m.xpNote.to}</b> gestiegen.</p>
      <div class="row-actions"><button class="btn-ghost small" data-act="go" data-to="rang">Zum Rang-Pfad</button><button class="btn-ghost small" data-act="notice-ok" data-k="xpNote">Ok</button></div>
    </section>`;
  }
  const lastBackup = m.lastBackup;
  const lastSet = s.sets.reduce((a, x) => (x.t && x.t > a ? x.t : a), 0);
  const due = lastSet && (!lastBackup || daysBetween(lastBackup, today()) >= 30) && (!m.backupSnooze || daysBetween(m.backupSnooze, today()) >= 7);
  if (due) {
    return `<section class="card pad notice">
      <div class="card-title"><h2>Backup</h2></div>
      <p class="soft">${lastBackup ? `Letztes Backup: ${esc(fmtDate(lastBackup))}` : 'Noch kein Backup gespeichert.'}</p>
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
    const look = equipped(s, lv.level);
    const ready = readyStations(s, lv.level).length;
    const sign = look.sign;
    return `
    <section class="hero">
      <div class="neon-sign sign-${[...sign.name].length} sg-${rarityOf(sign).id}" role="img" aria-label="${esc(sign.name)}, japanisch für ${esc(sign.de)}">${esc(sign.name)}${signSparks(sign)}</div>
      <div>
        <div class="brand">
          <div class="brand-name"><b>KINTORE</b><span>${esc(fmtLong(today()))}</span></div>
          <button class="av-btn" data-act="go" data-to="profil" aria-label="Profil">${myAvatar({ size: 40, deco: false, effect: 'none' })}</button>
          <button class="icon-btn" data-act="go" data-to="einstellungen" aria-label="Einstellungen">${icon('sliders')}</button>
        </div>
        <div class="card status is-link" data-act="go" data-to="rang" role="button" tabindex="0" aria-label="Rang-Pfad öffnen. Level ${lv.level}, Rang ${esc(lv.rank)}">
          <div class="status-top">
            <div class="lv-col">
              <div class="lv"><small>LV</small><b>${lv.level}</b></div>
              <div class="title-tag tt-${rarityOf(look.title).id}">${esc(look.title.name)}</div>
            </div>
            ${rankBadge(lv, look, ready)}
          </div>
          <div class="xpbar" style="--p:${(lv.progress * 100).toFixed(1)}%" role="progressbar" aria-valuenow="${Math.round(lv.progress * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="Fortschritt zum nächsten Level"><i></i></div>
          <div class="xp-text"><span>Noch ${int(lv.toNext)} XP bis Level ${lv.level + 1}</span>
            <span class="xp-path"><span>${lv.nextRank ? `Rang ${esc(lv.nextRank.id)} ab Level ${lv.nextRank.level}` : 'Höchster Rang erreicht'}</span><span class="go">Rang-Pfad${icon('right')}</span></span></div>
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
      ${weekCard(s, d)}
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
