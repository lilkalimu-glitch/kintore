// Profil wie bei Discord: Banner, Profilbild im Rahmen, Name, Titel und Motto.
// Darunter Level, Bestwerte, Statistik und die Sammlung aus dem Rang-Pfad. Jeder Teil lässt sich ausblenden.
import { app, D, views, actions, navigate, openSheet, closeSheet, render } from './core.js';
import { esc, icon, int, kg, fmtMonth, fmtSetText, relDay, clamp } from './util.js';
import { weekStreak, e1rmOf, catColor } from './stats.js';
import { CAT } from './model.js';
import {
  ITEMS, TYPES, RARITIES, equipped, emblem, rewardOrb, ownedItems, rarityOf, rarityIndex, itemLabel, signSparks,
} from './look.js';
import { bannerArt, effectParts } from './art.js';
import { saveProfile, NAME_MAX, MOTTO_MAX } from './ops.js';
import { myAvatar, avatarUrl, setAvatar, squareImage } from './me.js';
import { toast } from './fx.js';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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

// ---------- Kopf mit Banner ----------
function headCard(s, d, lv, look, ws) {
  const p = s.profile;
  const fx = effectParts(look.effect.id);
  const first = d.dates[0];
  const signRar = rarityOf(look.sign).id;
  return `<section class="card pf-card rank-${esc(lv.rank)}">
    <div class="pf-banner">${bannerArt(look.banner.id)}
      <div class="pf-sign sg-${signRar} sign-${[...look.sign.name].length}" aria-hidden="true">${esc(look.sign.name)}${signSparks(look.sign)}</div>
    </div>
    ${fx.card ? `<div class="pf-card-fx" aria-hidden="true">${fx.card}</div>` : ''}
    <div class="pf-head">
      <button class="pf-av" data-act="profile-edit" aria-label="Profilbild und Name ändern">${myAvatar({ size: 92 })}</button>
      ${p.show.level ? `<button class="pf-rank" data-act="go" data-to="rang" aria-label="Rang ${esc(lv.rank)}, Level ${lv.level}">${emblem(lv.rank, look.frame.id, 38)}<span><small>Level</small><b>${lv.level}</b></span></button>` : ''}
    </div>
    <div class="pf-body">
      ${p.name ? `<h2 class="pf-name nm-${rarityOf(look.color).id}">${esc(p.name)}</h2>` : '<button class="pf-noname" data-act="profile-edit">Name eintragen</button>'}
      <div class="title-tag tt-${rarityOf(look.title).id}">${esc(look.title.name)}</div>
      ${p.show.motto && p.motto ? `<p class="pf-motto">${esc(p.motto)}</p>` : ''}
      ${first || ws.streak ? `<div class="pf-meta">
        ${first ? `<span>${icon('calendar')}Dabei seit ${esc(fmtMonth(first))}</span>` : ''}
        ${ws.streak ? `<span>${icon('flame')}${ws.streak} ${ws.streak === 1 ? 'Woche' : 'Wochen'} Serie</span>` : ''}
      </div>` : ''}
      <div class="row-actions pf-actions">
        <button class="btn-ghost small" data-act="profile-edit">${icon('edit')} Bearbeiten</button>
        <button class="btn-ghost small" data-act="look-open" data-type="banner">${icon('sparkle')} Look</button>
      </div>
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
      ${show.level ? levelCard(lv, look) : ''}
      ${show.lifts ? liftsCard(s, d) : ''}
      ${show.stats ? statsCard(d, ws) : ''}
      ${show.collection ? collectionCard(s, lv) : ''}
    </div>`;
  },
  after(main, params, { entering = false } = {}) {
    if (entering && !reduced()) main.querySelector('.pf-card')?.classList.add('enter');
  },
};

actions['profile-back'] = () => { if (history.length > 1) history.back(); else navigate('start'); };

// ---------- Bearbeiten ----------
const sw = (key, on) => `<label class="switch"><input type="checkbox" data-show="${key}" ${on ? 'checked' : ''}><span></span></label>`;

function editSheet() {
  const p = app.state.profile;
  const draw = () => `
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
      <li><span class="grow">Motto</span>${sw('motto', p.show.motto)}</li>
      <li><span class="grow">Level und Rang</span>${sw('level', p.show.level)}</li>
      <li><span class="grow">Bestwerte</span>${sw('lifts', p.show.lifts)}</li>
      <li><span class="grow">Statistik</span>${sw('stats', p.show.stats)}</li>
      <li><span class="grow">Sammlung<small>Alles aus dem Rang-Pfad</small></span>${sw('collection', p.show.collection)}</li>
    </ul>
    <div class="sheet-actions"><button class="btn-neon btn-block" data-save>Speichern</button></div>`;
  const el = openSheet(draw());
  const repaintAv = () => { const box = el.querySelector('[data-av]'); if (box) box.innerHTML = myAvatar({ size: 64, effect: 'none' }); };
  const bindFile = () => {
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
  };
  bindFile();
  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-av-del]')) {
      await setAvatar(null);
      e.target.closest('[data-av-del]').remove();
      repaintAv();
      render();
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
      <button class="btn-ghost" data-auto>Automatisch wählen</button>
    </div>`);
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-lift]');
    if (b) {
      const id = Number(b.dataset.lift);
      if (chosen.includes(id)) chosen = chosen.filter((x) => x !== id);
      else if (chosen.length >= 3) { toast('Höchstens 3 Übungen'); return; }
      else chosen.push(id);
      el.querySelector('[data-list]').innerHTML = rows();
      return;
    }
    if (e.target.closest('[data-auto]')) chosen = [];
    else if (!e.target.closest('[data-done]')) return;
    await closeSheet();
    saveProfile({ lifts: chosen });
  });
}

actions['profile-lifts'] = () => liftsSheet();
