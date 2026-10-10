// Profil wie bei Discord: großer Banner, Profilbild im Rahmen, Name, Titel, Motto und Abzeichen.
// Jeder Teil vom Look lässt sich direkt antippen und ändern. Der Stift am Profilbild öffnet Bearbeiten.
// Darunter Trainings-Kalender, Level, Bestwerte, Statistik und die Sammlung. Jeder Teil lässt sich ausblenden.
import { app, D, views, actions, navigate, openSheet, closeSheet, render } from './core.js';
import { esc, icon, int, kg, fmtMonth, fmtSetText, relDay, clamp, today, addDays, weekStart, parseIso, persistHtml } from './util.js';
import { weekStreak, e1rmOf, catColor } from './stats.js';
import { CAT } from './model.js';
import {
  ITEMS, TYPES, TYPE_ORDER, RARITIES, equipped, emblem, rewardOrb, ownedItems, rarityOf, rarityIndex, itemLabel, signSparks, rankChip,
} from './look.js';
import { bannerArt, effectParts } from './art.js';
import { saveProfile, NAME_MAX, MOTTO_MAX } from './ops.js';
import { myAvatar, avatarUrl, setAvatar, squareImage } from './me.js';
import { toast } from './fx.js';
import { maybeIntro } from './intro.js';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Kurze Namen der Look-Teile für die Leiste im Profil.
const SHORT = { color: 'Farbe', title: 'Titel', frame: 'Rahmen', sign: 'Schild', banner: 'Banner', effect: 'Effekt' };

// ---------- Bestwerte ----------
// Bester Satz einer Übung nach geschätztem 1RM.
function bestSet(d, exId) {
  const ex = d.exById.get(exId);
  let best = null;
  for (const s of d.setsByEx.get(exId) || []) {
    if (!(s.r > 0)) continue;
    const e1 = e1rmOf(d.loadOf(ex, s.w), s.r);
    if (!best || e1 > best.e1) best = { s, e1 };
  }
  return best;
}

// Ohne eigene Auswahl: die drei Übungen mit den meisten Einheiten.
export function liftIds(s, d) {
  const chosen = (s.profile.lifts || []).filter((id) => d.setsByEx.has(id));
  if (chosen.length) return chosen;
  return [...d.sessionsByEx.entries()]
    .filter(([id]) => d.exById.has(id))
    .sort((a, b) => b[1].length - a[1].length || (d.bestE1.get(b[0]) || 0) - (d.bestE1.get(a[0]) || 0))
    .slice(0, 3)
    .map(([id]) => id);
}

function liftsCard(s, d) {
  const ids = liftIds(s, d);
  const rows = ids.map((id) => {
    const ex = d.exById.get(id);
    const b = bestSet(d, id);
    if (!ex || !b) return '';
    const rm = ex.bw ? b.e1 - d.bw : b.e1;
    const rmText = ex.bw ? (rm > 0 ? `+${kg(Math.round(rm * 10) / 10)} kg` : 'BW') : `${kg(Math.round(rm * 10) / 10)} kg`;
    return `<li><button class="pf-lift" style="--c:${catColor(ex.cat)}" data-act="go" data-to="uebung" data-id="${id}">
      <span class="pl-bar"></span>
      <span class="pl-name">${esc(ex.name)}<small>1RM ca. ${rmText}, ${esc(relDay(b.s.d))}</small></span>
      <span class="pl-val">${fmtSetText(ex, b.s)}</span>
    </button></li>`;
  }).join('');
  return `<section class="card pad pf-sec">
    <div class="card-title"><h2>Bestwerte</h2><button class="link-btn" data-act="profile-lifts">${s.profile.lifts.length ? 'Ändern' : 'Auswählen'}</button></div>
    ${rows ? `<ul class="pf-lifts">${rows}</ul>` : '<p class="soft pf-empty">Sobald du trainierst, stehen hier deine besten Sätze.</p>'}
  </section>`;
}

// ---------- Level, Statistik, Sammlung ----------
function levelCard(lv, look) {
  return `<section class="card pad pf-sec rank-${esc(lv.rank)}">
    <div class="card-title"><h2>Level und Rang</h2><button class="link-btn" data-act="go" data-to="rang">Rang-Pfad</button></div>
    <div class="pf-lv">
      ${emblem(lv.rank, look.frame.id, 64, '', { fx: true })}
      <div><b>Rang <span class="rank-inline rank-${esc(lv.rank)}">${esc(lv.rank)}</span></b><span class="pf-lv-sub">Level ${lv.level}, ${int(lv.xp)} XP</span></div>
    </div>
    <div class="xpbar" style="--p:${(clamp(lv.progress, 0, 1) * 100).toFixed(1)}%" role="progressbar" aria-valuenow="${Math.round(lv.progress * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="Fortschritt zum nächsten Level"><i></i></div>
    <p class="pf-note">Noch ${int(lv.toNext)} XP bis Level ${lv.level + 1}</p>
  </section>`;
}

function statsCard(d, ws) {
  return `<section class="card pad pf-sec">
    <div class="card-title"><h2>Statistik</h2></div>
    <div class="kv pf-kv">
      <div><span>Trainingstage</span><b>${int(d.totals.days)}</b></div>
      <div><span>Sätze</span><b>${int(d.totals.sets)}</b></div>
      <div><span>Bewegt</span><b>${int(d.totals.tonnage / 1000)} t</b></div>
      <div><span>Rekorde</span><b>${int(d.prEvents.length)}</b></div>
      <div><span>Serie</span><b>${ws.streak} ${ws.streak === 1 ? 'Woche' : 'Wochen'}</b></div>
      <div><span>Belohnungen</span><b>${ownedItems(app.state, d.level.level).length}</b></div>
    </div>
  </section>`;
}

function collectionCard(s, lv) {
  const have = ownedItems(s, lv.level).sort((a, b) => rarityIndex(b) - rarityIndex(a) || b.lv - a.lv);
  const per = RARITIES.map((r) => ({ r, n: have.filter((it) => rarityOf(it).id === r.id).length, of: ITEMS.filter((it) => rarityOf(it).id === r.id).length }));
  return `<section class="card pad pf-sec">
    <div class="card-title"><h2>Sammlung</h2><span class="hint">${have.length} von ${ITEMS.length}</span></div>
    <div class="pf-rar">${per.map(({ r, n, of }) => `<span class="rar-${r.id}" style="--f:${((n / of) * 100).toFixed(1)}%"><i></i><b>${n}/${of}</b>${esc(r.name)}</span>`).join('')}</div>
    <div class="pf-coll">${have.map((it) => `<button class="pc-item" data-act="look-open" data-type="${it.type}" aria-label="${esc(`${TYPES[it.type].name} ${itemLabel(it)}, ${rarityOf(it).name}`)}">${rewardOrb(it)}<span class="pc-name ${it.type === 'sign' ? 'jp' : ''}">${esc(it.name)}</span></button>`).join('')}</div>
  </section>`;
}

// ---------- Neon-Kalender: die letzten 16 Wochen ----------
const CAL_WEEKS = 16;
const MON = new Intl.DateTimeFormat('de-DE', { month: 'short' });

export function calendarData(d, weeks = CAL_WEEKS, end = today()) {
  const first = addDays(weekStart(end), -7 * (weeks - 1));
  const cells = [];
  let trained = 0;
  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(first, i);
    const day = d.days.get(date);
    const n = day ? day.sets.filter((x) => x.r > 0).length : 0;
    if (n && date <= end) trained++;
    const lvl = !n ? 0 : n < 10 ? 1 : n < 20 ? 2 : 3;
    cells.push({ date, lvl, future: date > end, today: date === end });
  }
  return { first, cells, trained };
}

function calendarCard(d) {
  const { first, cells, trained } = calendarData(d);
  // Monatsname über der ersten Woche eines Monats. Stehen zwei zu dicht, bleibt der spätere.
  const marks = [];
  let prev = '';
  for (let w = 0; w < CAL_WEEKS; w++) {
    const mon = addDays(first, w * 7);
    if (mon.slice(0, 7) === prev) continue;
    prev = mon.slice(0, 7);
    marks.push({ w, label: MON.format(parseIso(mon)).replace('.', '') });
  }
  const kept = [];
  for (let i = marks.length - 1; i >= 0; i--) {
    const m = marks[i];
    if (m.w > CAL_WEEKS - 2 || (kept.length && kept[0].w - m.w < 3)) continue;
    kept.unshift(m);
  }
  const months = kept.map((m) => `<span style="grid-column:${m.w + 1} / span 3">${esc(m.label)}</span>`).join('');
  const grid = cells.map((c, i) => `<i class="c16 l${c.lvl}${c.today ? ' is-today' : ''}${c.future ? ' is-future' : ''}" style="--i:${i}"></i>`).join('');
  return `<section class="card pad pf-sec pf-cal">
    <div class="card-title"><h2>Trainingstage</h2><span class="hint">Letzte ${CAL_WEEKS} Wochen</span></div>
    <div class="c16-wrap" role="img" aria-label="${trained} Trainingstage in den letzten ${CAL_WEEKS} Wochen">
      <div class="c16-days" aria-hidden="true"><span>Mo</span><span></span><span>Mi</span><span></span><span>Fr</span><span></span><span>So</span></div>
      <div class="c16-main" aria-hidden="true">
        <div class="c16-months">${months}</div>
        <div class="c16-grid">${grid}</div>
      </div>
    </div>
    <div class="c16-foot">
      <span><b>${trained}</b> ${trained === 1 ? 'Tag' : 'Tage'} trainiert</span>
      <span class="c16-legend" aria-hidden="true">Weniger<i class="c16 l0"></i><i class="c16 l1"></i><i class="c16 l2"></i><i class="c16 l3"></i>Mehr</span>
    </div>
  </section>`;
}

// ---------- Kopf mit Banner ----------
function badges(d, lv, ws) {
  const first = d.dates[0];
  const prs = d.prEvents.length;
  const out = [`<li class="pf-badge rank-${esc(lv.rank)}">${rankChip(lv.rank)}<span>Rang ${esc(lv.rank)}</span></li>`];
  if (ws.streak) out.push(`<li class="pf-badge b-streak">${icon('flame')}<span>${ws.streak} ${ws.streak === 1 ? 'Woche' : 'Wochen'} Serie</span></li>`);
  if (prs) out.push(`<li class="pf-badge b-pr">${icon('star')}<span>${int(prs)} ${prs === 1 ? 'Rekord' : 'Rekorde'}</span></li>`);
  if (first) out.push(`<li class="pf-badge b-since">${icon('calendar')}<span>Seit ${esc(fmtMonth(first))}</span></li>`);
  return `<ul class="pf-badges" aria-label="Abzeichen">${out.join('')}</ul>`;
}

function lookRow(look) {
  return `<div class="pf-look">
    <div class="pf-look-h"><span>Dein Look</span><small>Zum Ändern antippen</small></div>
    <div class="pf-look-row">${TYPE_ORDER.map((t) => `<button class="pl-tile" data-act="look-open" data-type="${t}" aria-label="${esc(`${TYPES[t].name}: ${itemLabel(look[t])}. Ändern`)}">
      ${rewardOrb(look[t], { chip: false })}<span>${SHORT[t]}</span>
    </button>`).join('')}</div>
  </div>`;
}

function headCard(s, d, lv, look, ws) {
  const p = s.profile;
  const fx = effectParts(look.effect.id);
  const signRar = rarityOf(look.sign).id;
  return `<section class="card pf-card rank-${esc(lv.rank)}">
    <div class="pf-banner">
      <button class="pf-banner-btn" data-act="look-open" data-type="banner" aria-label="${esc(`Banner ${look.banner.name}. Ändern`)}">${persistHtml(bannerArt(look.banner.id), 'bn')}</button>
      <span class="pf-hint" aria-hidden="true">${icon('palette')}</span>
      <button class="pf-sign sg-${signRar} sign-${[...look.sign.name].length}" data-act="look-open" data-type="sign" aria-label="${esc(`Neon-Schild ${itemLabel(look.sign)}. Ändern`)}"><span aria-hidden="true">${esc(look.sign.name)}</span>${signSparks(look.sign)}</button>
    </div>
    ${fx.card ? `<div class="pf-cfx" aria-hidden="true">${persistHtml(fx.card, 'cfx')}</div>` : ''}
    <div class="pf-head">
      <div class="pf-avwrap">
        <button class="pf-av" data-act="look-open" data-type="frame" aria-label="${esc(`Rahmen ${look.frame.name}. Ändern`)}">${myAvatar({ size: 104 })}</button>
        <button class="pf-pen" data-act="profile-edit" aria-label="Profilbild und Name ändern">${icon('edit')}</button>
      </div>
      ${p.show.level ? `<button class="pf-rank" data-act="go" data-to="rang" aria-label="Rang-Pfad öffnen. Rang ${esc(lv.rank)}, Level ${lv.level}">${emblem(lv.rank, look.frame.id, 38)}<span><small>Level</small><b>${lv.level}</b></span></button>` : ''}
    </div>
    <div class="pf-body">
      ${p.name ? `<h2 class="pf-name-h"><button class="pf-name nm-${rarityOf(look.color).id}" data-act="profile-edit" aria-label="${esc(`${p.name}. Name ändern`)}">${esc(p.name)}</button></h2>` : '<button class="pf-noname" data-act="profile-edit">Name eintragen</button>'}
      <div><button class="title-tag pf-title tt-${rarityOf(look.title).id}" data-act="look-open" data-type="title" aria-label="${esc(`Titel ${look.title.name}. Ändern`)}">${esc(look.title.name)}</button></div>
      ${p.show.motto && p.motto ? `<p class="pf-motto">${esc(p.motto)}</p>` : ''}
      ${badges(d, lv, ws)}
      ${lookRow(look)}
    </div>
  </section>`;
}

views.profil = {
  render() {
    const s = app.state;
    const d = D();
    const lv = d.level;
    const look = equipped(s, lv.level);
    const ws = weekStreak(d);
    const show = s.profile.show;
    return `
    <header class="head has-back pf-headbar">
      <span class="jp-mark" aria-hidden="true">プロフィール</span>
      <div class="head-row"><button class="icon-btn back-btn" data-act="profile-back" aria-label="Zurück">${icon('left')}</button><h1>Profil</h1></div>
    </header>
    <div class="stack">
      ${headCard(s, d, lv, look, ws)}
      ${show.calendar ? calendarCard(d) : ''}
      ${show.level ? levelCard(lv, look) : ''}
      ${show.lifts ? liftsCard(s, d) : ''}
      ${show.stats ? statsCard(d, ws) : ''}
      ${show.collection ? collectionCard(s, lv) : ''}
    </div>`;
  },
  after(main, params, { entering = false } = {}) {
    if (!entering) return;
    if (!reduced()) {
      main.querySelector('.pf-card')?.classList.add('enter');
      main.querySelector('.pf-cal')?.classList.add('enter');
    }
    maybeIntro('profil', [
      { sel: '.pf-pen', text: 'Mit dem Stift änderst du dein Profilbild und deinen Namen.' },
      { sel: '.pf-banner', text: 'Tipp direkt auf den Banner, um ihn zu wechseln. Ein Tipp aufs Profilbild wechselt den Rahmen.' },
      { sel: '.pf-look', text: 'Hier siehst du deinen ganzen Look. Neue Teile holst du dir im Rang-Pfad ab.' },
    ]);
  },
};

actions['profile-back'] = () => { if (history.length > 1) history.back(); else navigate('start'); };

// ---------- Bearbeiten ----------
const sw = (key, on) => `<span class="switch"><input type="checkbox" data-show="${key}" ${on ? 'checked' : ''}><span></span></span>`;

function editSheet() {
  const p = app.state.profile;
  const el = openSheet(`
    <h2>Profil bearbeiten</h2>
    <div class="pf-edit-top">
      <span class="pf-edit-av" data-av>${myAvatar({ size: 64, effect: 'none' })}</span>
      <div class="pf-edit-btns">
        <label class="btn-ghost small">${icon('image')} Bild wählen<input type="file" accept="image/*" data-av-file class="visually-hidden"></label>
        ${avatarUrl() ? '<button class="btn-ghost small" data-av-del>Entfernen</button>' : ''}
      </div>
    </div>
    <label class="field"><span>Name</span><input class="input" data-name maxlength="${NAME_MAX}" value="${esc(p.name)}" placeholder="Dein Name" autocomplete="off" autocapitalize="words"></label>
    <label class="field"><span>Motto</span><input class="input" data-motto maxlength="${MOTTO_MAX}" value="${esc(p.motto)}" placeholder="z. B. Kein Tag ohne Klimmzüge" autocomplete="off"></label>
    <h3 class="sheet-sub">Auf dem Profil zeigen</h3>
    <ul class="set-list pf-switches">
      <li><label class="sw-row"><span class="grow">Motto</span>${sw('motto', p.show.motto)}</label></li>
      <li><label class="sw-row"><span class="grow">Level und Rang</span>${sw('level', p.show.level)}</label></li>
      <li><label class="sw-row"><span class="grow">Trainingstage<small>Kalender der letzten ${CAL_WEEKS} Wochen</small></span>${sw('calendar', p.show.calendar)}</label></li>
      <li><label class="sw-row"><span class="grow">Bestwerte</span>${sw('lifts', p.show.lifts)}</label></li>
      <li><label class="sw-row"><span class="grow">Statistik</span>${sw('stats', p.show.stats)}</label></li>
      <li><label class="sw-row"><span class="grow">Sammlung<small>Alles aus dem Rang-Pfad</small></span>${sw('collection', p.show.collection)}</label></li>
    </ul>
    <div class="sheet-actions"><button class="btn-neon btn-block" data-save>Speichern</button></div>`);
  const repaintAv = () => { const box = el.querySelector('[data-av]'); if (box) box.innerHTML = myAvatar({ size: 64, effect: 'none' }); };
  el.querySelector('[data-av-file]')?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      await setAvatar(await squareImage(f));
      repaintAv();
      const btns = el.querySelector('.pf-edit-btns');
      if (btns && !btns.querySelector('[data-av-del]')) btns.insertAdjacentHTML('beforeend', '<button class="btn-ghost small" data-av-del>Entfernen</button>');
      render();
      toast('Profilbild gesetzt');
    } catch (err) {
      toast(err.message || 'Bild konnte nicht geladen werden.');
    }
  });
  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-av-del]')) {
      await setAvatar(null);
      e.target.closest('[data-av-del]').remove();
      repaintAv();
      render();
      toast('Profilbild entfernt');
      return;
    }
    if (!e.target.closest('[data-save]')) return;
    const show = {};
    el.querySelectorAll('[data-show]').forEach((inp) => { show[inp.dataset.show] = inp.checked; });
    const name = el.querySelector('[data-name]').value;
    const motto = el.querySelector('[data-motto]').value;
    await closeSheet();
    saveProfile({ name, motto, show });
    toast('Profil gespeichert');
  });
}

actions['profile-edit'] = () => editSheet();

// ---------- Bestwerte auswählen ----------
function liftsSheet() {
  const d = D();
  let chosen = [...app.state.profile.lifts];
  const list = [...d.sessionsByEx.entries()]
    .filter(([id]) => d.exById.has(id))
    .sort((a, b) => b[1].length - a[1].length)
    .map(([id, ses]) => ({ ex: d.exById.get(id), n: ses.length }));
  const rows = () => list.map(({ ex, n }) => {
    const on = chosen.includes(ex.id);
    return `<li><button data-lift="${ex.id}" class="${on ? 'is-on' : ''}" style="--c:${CAT[ex.cat]?.color}" aria-pressed="${on}"><i></i><span>${esc(ex.name)}<br><small>${n} ${n === 1 ? 'Einheit' : 'Einheiten'}</small></span><span class="in">${on ? icon('check') : ''}</span></button></li>`;
  }).join('');
  const el = openSheet(`
    <h2>Bestwerte</h2>
    <p class="lead">Wähl bis zu 3 Übungen. Ohne Auswahl zeigt das Profil die, die du am häufigsten trainierst.</p>
    ${list.length ? `<ul class="pick-list pf-pick" data-list>${rows()}</ul>` : '<p class="soft">Noch keine Übung trainiert.</p>'}
    <div class="sheet-actions">
      <button class="btn-neon btn-block" data-done>Fertig</button>
      <button class="btn-ghost btn-block" data-auto>Automatisch wählen</button>
    </div>`);
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-lift]');
    if (b) {
      const id = Number(b.dataset.lift);
      if (chosen.includes(id)) chosen = chosen.filter((x) => x !== id);
      else if (chosen.length >= 3) { toast('Höchstens 3 Übungen'); return; }
      else chosen.push(id);
      // Nur die angetippte Zeile ändert sich, die Liste bleibt stehen.
      const on = chosen.includes(id);
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
      b.querySelector('.in').innerHTML = on ? icon('check') : '';
      return;
    }
    if (e.target.closest('[data-auto]')) chosen = [];
    else if (!e.target.closest('[data-done]')) return;
    await closeSheet();
    saveProfile({ lifts: chosen });
    toast(chosen.length ? 'Bestwerte gespeichert' : 'Bestwerte werden automatisch gewählt');
  });
}

actions['profile-lifts'] = () => liftsSheet();
