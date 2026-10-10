// Banner nach den Vorlagen des Besitzers (Version 2.7): dunkel, Tusche, Rot und Licht.
// Nur SVG und CSS, keine Bilddateien und keine bekannten Figuren: übernommen sind Stimmung, Farben und Motive.
// Selten (Rang C und B) stehen still. Ab Episch (Rang A) bewegt sich etwas, nur mit transform und opacity.
// Mit "weniger Bewegung" bleibt überall ein ruhiges Bild stehen.
// Das Kanji Oni (Dämon) und das Geräusch Don in Katakana sind als Pfad aus Noto Serif CJK und Noto Sans CJK
// übernommen (SIL Open Font License). So braucht es dafür keine neue Teil-Schrift.

const ONI = 'M288 499V352H427V499ZM425 22C421 61 413 116 407 155H297L148 98V585H168C211 585 257 568 277 553C271 731 220 869 24 966L28 976C326 911 421 757 433 527H468V845C468 936 499 957 619 957H735C933 957 980 934 980 880C980 854 971 839 932 824L929 684H919C894 752 876 799 863 819C854 830 848 834 832 835C815 836 783 836 751 836H644C611 836 605 831 605 815V527H706V563H730C777 563 848 538 850 531V206C870 201 883 192 889 184L759 85L696 155H485C521 133 566 104 595 85C618 84 633 76 637 57ZM706 499H564V352H706ZM288 324V183H427V324ZM706 324H564V183H706ZM753 642 743 647C752 661 759 678 765 697L684 700C718 672 748 639 770 613C792 614 803 606 807 594L668 554C665 597 658 656 648 701L606 702L663 819C673 817 683 811 689 797C724 771 752 750 774 733C776 749 777 765 775 780C852 855 959 701 753 642Z';
const DO = 'M696 122 596 164C635 219 652 250 684 319L787 274C765 229 726 167 696 122ZM833 65 734 111C773 164 792 192 827 261L927 212C905 168 864 108 833 65ZM271 795C271 836 266 903 259 946H449C444 901 438 822 438 795V538C544 576 681 629 782 681L851 512C767 471 573 400 438 361V224C438 176 444 132 448 94H259C267 132 271 184 271 224C271 309 271 707 271 795Z';
const N = 'M249 104 134 227C206 278 332 388 385 446L509 319C449 255 318 151 249 104ZM101 768 204 928C330 908 460 856 562 796C729 698 871 559 951 417L857 246C790 387 655 542 475 646C377 703 248 748 101 768Z';

// Fester Zufall, damit ein Banner immer gleich aussieht.
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const f1 = (n) => Math.round(n * 10) / 10;
const pt = ([x, y]) => `${f1(x)} ${f1(y)}`;
const svg = (body, cls = '', vb = '0 0 400 200') => `<svg class="bn-svg ${cls}" viewBox="${vb}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;

// Zackige Linie von a nach b (Dornen, Risse, Adern).
function jag(a, b, n, amp, r) {
  const out = [a];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const o = (r() - 0.5) * 2 * amp;
    out.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
  }
  out.push(b);
  return out;
}
const poly = (pts) => pts.map(pt).join(' ');

// Pinselstrich entlang eines Bogens: in der Mitte breit, an den Enden spitz, mit leichtem Zittern.
function brushArc(cx, cy, rx, ry, a0, a1, w, r, rot = 0) {
  const n = 46;
  const left = [];
  const right = [];
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = a0 + (a1 - a0) * t;
    const ex = Math.cos(a) * rx;
    const ey = Math.sin(a) * ry;
    const x = cx + ex * cr - ey * sr;
    const y = cy + ex * sr + ey * cr;
    const tx = -Math.sin(a) * rx;
    const ty = Math.cos(a) * ry;
    const rxT = tx * cr - ty * sr;
    const ryT = tx * sr + ty * cr;
    const l = Math.hypot(rxT, ryT) || 1;
    const nx = -ryT / l;
    const ny = rxT / l;
    const width = w * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15)), 0.55) * (0.82 + r() * 0.36);
    left.push([x + nx * width / 2, y + ny * width / 2]);
    right.push([x - nx * width / 2, y - ny * width / 2]);
  }
  return `M${left.map(pt).join('L')}L${right.reverse().map(pt).join('L')}Z`;
}

// Farbspritzer: Tropfen um einen Punkt, nach außen kleiner.
function splat(cx, cy, n, spread, rmax, r, cls) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.pow(r(), 1.6) * spread;
    const rad = Math.max(0.5, rmax * (1 - d / spread) * (0.3 + r() * 0.7));
    out += `<circle class="${cls}" cx="${f1(cx + Math.cos(a) * d)}" cy="${f1(cy + Math.sin(a) * d * 0.8)}" r="${f1(rad)}"/>`;
  }
  return out;
}

function specks(seed, n, { x0 = 0, x1 = 400, y0 = 0, y1 = 200, rmin = 0.4, rmax = 1.4, cls = 'sp' } = {}) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) out += `<circle class="${cls}" cx="${f1(x0 + r() * (x1 - x0))}" cy="${f1(y0 + r() * (y1 - y0))}" r="${f1(rmin + r() * (rmax - rmin))}" opacity="${f1(0.25 + r() * 0.75)}"/>`;
  return out;
}

// Funken und Glut als HTML, damit sie sich mit transform bewegen können.
function sparks(n, seed, cls) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    out += `<i class="${cls}" style="left:${f1(4 + r() * 92)}%;--k:${f1(0.15 + r() * 0.7)};--dx:${f1((r() - 0.5) * 50)}px;--t:${f1(2.6 + r() * 2.6)}s;--d:-${f1(r() * 5)}s"></i>`;
  }
  return out;
}

// ---------- Tusche: schwarzes Papier, rote Pinselschrift, Dornen und Umlaufbahnen ----------
function tusche() {
  const r = rng(115);
  let bars = '';
  for (let x = 14; x < 78;) {
    const w = 0.8 + Math.floor(r() * 3) * 0.9;
    bars += `<rect x="${f1(x)}" y="14" width="${f1(w)}" height="13"/>`;
    x += w + 0.9 + r() * 2.2;
  }
  let lines = '';
  for (let i = 0; i < 4; i++) lines += `<rect x="16" y="${f1(150 + i * 6.5)}" width="${f1(26 + r() * 34)}" height="2.2" rx="1"/>`;
  for (let i = 0; i < 7; i++) lines += `<rect x="${f1(332 + (i % 2) * 4)}" y="${f1(56 + i * 7)}" width="${f1(12 + r() * 30)}" height="1.6" rx="0.8"/>`;
  // Dornenzweig von links zur Mitte
  const spine = jag([-10, 72], [168, 46], 18, 5, r);
  let thorns = `<polyline class="tu-thorn" points="${poly(spine)}"/>`;
  for (let i = 2; i < spine.length - 1; i += 1) {
    const [x, y] = spine[i];
    const up = i % 2 ? -1 : 1;
    const l = 6 + r() * 12;
    thorns += `<polyline class="tu-thorn thin" points="${poly([[x, y], [x + l * 0.5, y + up * l], [x + l * 0.9, y + up * (l + 3)]])}"/>`;
  }
  const enso = brushArc(250, 98, 92, 84, -1.05, 4.35, 11, r, -0.15);
  const enso2 = brushArc(250, 98, 99, 90, -0.6, 3.6, 3, r, -0.1);
  return `<i class="tu-grain"></i>${svg(`
    <ellipse class="tu-orb" cx="246" cy="102" rx="160" ry="58" transform="rotate(-12 246 102)"/>
    <circle class="tu-orb" cx="250" cy="98" r="124"/>
    <text class="tu-word" x="212" y="146" text-anchor="middle">KINTORE</text>
    <path class="tu-slash" d="M318 0H330L296 200H284Z"/>
    <path class="tu-enso" d="${enso}"/><path class="tu-enso dry" d="${enso2}"/>
    <path class="tu-kanji echo" d="${ONI}" transform="translate(178 22) scale(0.152) rotate(-5 500 500)"/>
    <path class="tu-kanji" d="${ONI}" transform="translate(174 18) scale(0.152) rotate(-5 500 500)"/>
    ${splat(300, 66, 26, 46, 4.6, r, 'tu-drop')}${splat(196, 150, 14, 30, 3, r, 'tu-drop')}
    ${thorns}
    <g class="tu-bar">${bars}</g><g class="tu-txt">${lines}</g>`)}`;
}

// ---------- Klinge: Regen, Schwarz-Weiß, Lichtblitz auf der Schneide ----------
function klinge() {
  const r = rng(219);
  let rain = '';
  for (let i = 0; i < 64; i++) {
    const x = r() * 430;
    const y = r() * 200;
    const l = 10 + r() * 22;
    rain += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x - l * 0.22)}" y2="${f1(y + l)}" opacity="${f1(0.15 + r() * 0.4)}"/>`;
  }
  // Leicht gebogene Klinge: Schneide entlang einer Kurve, Rücken mit abnehmender Breite.
  const P0 = [70, 168];
  const C = [220, 92];
  const P1 = [392, 36];
  const at = (t) => [(1 - t) * (1 - t) * P0[0] + 2 * (1 - t) * t * C[0] + t * t * P1[0], (1 - t) * (1 - t) * P0[1] + 2 * (1 - t) * t * C[1] + t * t * P1[1]];
  const edge = [];
  const back = [];
  const hamon = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const [x, y] = at(t);
    const [x2, y2] = at(Math.min(1, t + 0.01));
    const l = Math.hypot(x2 - x, y2 - y) || 1;
    const nx = (y2 - y) / l;
    const ny = -(x2 - x) / l;
    const w = t > 0.93 ? 8.6 * (1 - (t - 0.93) / 0.07) : 8.6 - t * 1.8;
    edge.push([x, y]);
    back.push([x + nx * w, y + ny * w]);
    const wave = w * (0.42 + 0.12 * Math.sin(t * 46));
    hamon.push([x + nx * wave, y + ny * wave]);
  }
  const blade = `M${edge.map(pt).join('L')}L${back.reverse().map(pt).join('L')}Z`;
  const [gx, gy] = at(0.74);
  return svg(`
    <g class="kl-rain">${rain}</g>
    <g transform="rotate(-27 64 172)">
      <rect class="kl-tsuka" x="-6" y="164" width="68" height="15" rx="3"/>
      <path class="kl-wrap" d="M2 165 10 178 18 165 26 178 34 165 42 178 50 165 58 178"/>
      <ellipse class="kl-tsuba" cx="66" cy="171.5" rx="6" ry="15"/>
    </g>
    <path class="kl-blade" d="${blade}"/>
    <polyline class="kl-hamon" points="${poly(hamon)}"/>
    <polyline class="kl-edge" points="${poly(edge.slice(0, 41))}"/>
    <ellipse class="kl-streak" cx="${f1(gx)}" cy="${f1(gy)}" rx="120" ry="1.4"/>
    <path class="kl-star" d="M${f1(gx)} ${f1(gy - 26)}L${f1(gx + 2.2)} ${f1(gy - 2.2)}L${f1(gx + 34)} ${f1(gy)}L${f1(gx + 2.2)} ${f1(gy + 2.2)}L${f1(gx)} ${f1(gy + 26)}L${f1(gx - 2.2)} ${f1(gy + 2.2)}L${f1(gx - 34)} ${f1(gy)}L${f1(gx - 2.2)} ${f1(gy - 2.2)}Z"/>
    <circle class="kl-core" cx="${f1(gx)}" cy="${f1(gy)}" r="4.2"/>
    <circle class="kl-pr r" cx="${f1(gx - 46)}" cy="${f1(gy + 30)}" r="13"/>
    <circle class="kl-pr g" cx="${f1(gx - 64)}" cy="${f1(gy + 42)}" r="7"/>
    <circle class="kl-pr b" cx="${f1(gx - 78)}" cy="${f1(gy + 51)}" r="4"/>
    ${specks(222, 46, { rmax: 1.1, cls: 'kl-dust' })}`);
}

// ---------- Manga-Panel: Seite mit Rastern, Speedlines, rotem Pinselbogen und Geräusch ----------
// Links ein schwarzes Feld mit dem Geräusch Don (senkrecht), in der Mitte Speedlines, rechts ein Raster.
function panel() {
  const r = rng(322);
  let speed = '';
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2 + r() * 0.05;
    const r0 = 24 + r() * 28;
    speed += `<line x1="${f1(214 + Math.cos(a) * r0)}" y1="${f1(92 + Math.sin(a) * r0)}" x2="${f1(214 + Math.cos(a) * 300)}" y2="${f1(92 + Math.sin(a) * 300)}" stroke-width="${f1(0.5 + r() * 2.4)}"/>`;
  }
  // Raster rechts, unten dunkler (Halbton).
  let dots = '';
  for (let y = 0; y < 13; y++) {
    for (let x = 0; x < 13; x++) {
      const cx = 296 + x * 9 + (y % 2) * 4.5;
      const cy = 8 + y * 15;
      if (cx < 300 - (cy - 118) * 0.9 && cy > 118) continue;
      if (cx < 302) continue;
      dots += `<circle cx="${cx}" cy="${cy}" r="${f1(0.5 + (y / 12) * 2.6)}"/>`;
    }
  }
  let hatch = '';
  for (let i = 0; i < 16; i++) hatch += `<line x1="${f1(300 + i * 7)}" y1="200" x2="${f1(326 + i * 7)}" y2="140"/>`;
  let streaks = '';
  for (let i = 0; i < 16; i++) {
    const y = 6 + r() * 188;
    streaks += `<line x1="${f1(-4 + r() * 20)}" y1="${f1(y)}" x2="${f1(50 + r() * 50)}" y2="${f1(y)}" stroke-width="${f1(0.6 + r() * 1.6)}"/>`;
  }
  const A = '0,0 118,0 90,200 0,200';
  const B = '126,0 290,0 290,118 260,200 98,200';
  const C = '298,0 400,0 400,200 268,200 298,118';
  const swoosh = brushArc(214, 100, 150, 50, 2.2, 8.5, 9, r, -0.14);
  return `<i class="pn-paper"></i>${svg(`
    <g class="pn-speed">${speed}</g>
    <polygon class="pn-a" points="${C}"/><g class="pn-dots">${dots}</g><g class="pn-hatch">${hatch}</g>
    <polygon class="pn-c" points="${A}"/><g class="pn-streak">${streaks}</g>
    <polygon class="pn-gut" points="118,0 126,0 98,200 90,200"/><polygon class="pn-gut" points="290,0 298,0 298,118 268,200 260,200 290,118"/>
    <polygon class="pn-frame" points="${A}"/><polygon class="pn-frame" points="${B}"/><polygon class="pn-frame" points="${C}"/>
    <path class="pn-swoosh" d="${swoosh}"/>
    <g class="pn-sfx" transform="rotate(-6 50 80)">
      <path class="pn-sfx-o" d="${DO}" transform="translate(10 6) scale(0.074)"/><path class="pn-sfx-o" d="${N}" transform="translate(16 74) scale(0.074)"/>
      <path class="pn-sfx-i" d="${DO}" transform="translate(10 6) scale(0.074)"/><path class="pn-sfx-i" d="${N}" transform="translate(16 74) scale(0.074)"/>
    </g>
    ${splat(150, 44, 22, 38, 4, r, 'pn-drop')}${splat(240, 170, 12, 26, 3, r, 'pn-drop')}`)}`;
}

// ---------- Himmelslicht: violetter Nebel, Lichtstrahl, wirbelnde Lichtschleier ----------
function himmelslicht() {
  const r = rng(428);
  let swirl = '';
  for (let i = 0; i < 18; i++) {
    const rx = 18 + r() * 70;
    const ry = 6 + r() * 16;
    const cy = 30 + i * 8 + r() * 10;
    const a0 = r() * Math.PI * 2;
    const a1 = a0 + 1.4 + r() * 2.6;
    const cls = r() < 0.35 ? 'hl-sw hot' : 'hl-sw';
    swirl += `<path class="${cls}" d="${brushArc(262, cy, rx, ry, a0, a1, 1.5 + r() * 5, r, (r() - 0.5) * 0.5)}" opacity="${f1(0.25 + r() * 0.6)}"/>`;
  }
  return `<i class="hl-cloud c1"></i><i class="hl-cloud c2"></i><i class="hl-cloud c3"></i><i class="hl-beam"></i><i class="hl-core"></i>${svg(`
    ${specks(431, 46, { rmax: 1.2, cls: 'hl-star' })}
    <g class="hl-swirl">${swirl}</g>`)}<i class="hl-shade"></i>`;
}

// ---------- Finsternis: Ring einer Sonnenfinsternis, Asche und Nebel ----------
function finsternis() {
  const r = rng(533);
  let ash = '';
  for (let i = 0; i < 90; i++) {
    const x = r() * 400;
    const y = r() * 200;
    if (r() < 0.3) {
      const l = 3 + r() * 9;
      ash += `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x + l)}" y2="${f1(y + l * 0.35)}" opacity="${f1(0.2 + r() * 0.6)}"/>`;
    } else ash += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.4 + r() * 1.3)}" opacity="${f1(0.2 + r() * 0.7)}"/>`;
  }
  const ridge = jag([-10, 168], [410, 158], 22, 9, r);
  let rays = '';
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + r() * 0.08;
    const r0 = 34;
    const r1 = 40 + r() * 28;
    rays += `<line x1="${f1(264 + Math.cos(a) * r0)}" y1="${f1(72 + Math.sin(a) * r0)}" x2="${f1(264 + Math.cos(a) * r1)}" y2="${f1(72 + Math.sin(a) * r1)}" opacity="${f1(0.15 + r() * 0.45)}"/>`;
  }
  return `<i class="fi-fog"></i>${svg(`<g class="fi-rays">${rays}</g>`)}<i class="fi-ring"><i class="fi-arc"></i></i>${svg(`
    <polygon class="fi-ridge" points="-10,200 ${poly(ridge)} 410,200"/>
    <g class="fi-ash">${ash}</g>`)}`;
}

// ---------- Das Auge (episch): riesiges Auge mit Uhr-Ringen, Splitter, rote Funken ----------
function auge() {
  const r = rng(640);
  let shards = '';
  for (let i = 0; i < 30; i++) {
    const edge = i % 4;
    let x = r() * 400;
    let y = r() * 200;
    if (edge === 0) y = r() * 34;
    else if (edge === 1) y = 166 + r() * 34;
    else if (edge === 2) x = r() * 70;
    else x = 330 + r() * 70;
    const s = 6 + r() * 18;
    const a = r() * Math.PI;
    const p = [[x, y], [x + Math.cos(a) * s, y + Math.sin(a) * s], [x + Math.cos(a + 2.2) * s * 0.7, y + Math.sin(a + 2.2) * s * 0.7]];
    shards += `<polygon class="${r() < 0.25 ? 'au-shard red' : 'au-shard'}" points="${poly(p)}"/>`;
  }
  let veins = '';
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const ex = 210 + Math.cos(a) * 150;
    const ey = 100 + Math.sin(a) * 47;
    const ox = 210 + Math.cos(a) * (190 + r() * 40);
    const oy = 100 + Math.sin(a) * (70 + r() * 40);
    veins += `<polyline class="au-thorn" points="${poly(jag([ex, ey], [ox, oy], 5, 4, r))}"/>`;
  }
  let inner = '';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + r() * 0.2;
    const ex = 210 + Math.cos(a) * 140;
    const ey = 100 + Math.sin(a) * 40;
    const ix = 210 + Math.cos(a) * 62;
    const iy = 100 + Math.sin(a) * 34;
    inner += `<polyline class="au-vein" points="${poly(jag([ex, ey], [ix, iy], 4, 3, r))}"/>`;
  }
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const r0 = i % 5 ? 41 : 37;
    ticks += `<line x1="${f1(210 + Math.cos(a) * r0)}" y1="${f1(100 + Math.sin(a) * r0)}" x2="${f1(210 + Math.cos(a) * 45)}" y2="${f1(100 + Math.sin(a) * 45)}"/>`;
  }
  return `<i class="au-glow"></i>${svg(`
    <g class="au-shards">${shards}</g>
    <g class="au-thorns">${veins}</g>
    <g class="au-eye">
      <path class="au-white" d="M58 100Q210 8 362 100Q210 192 58 100Z"/>
      <path class="au-shade" d="M58 100Q210 8 362 100Q210 192 58 100Z"/>
      <g class="au-veins">${inner}</g>
      <circle class="au-iris" cx="210" cy="100" r="50"/>
      <g class="au-ticks">${ticks}</g>
      <circle class="au-ring" cx="210" cy="100" r="30"/>
      <circle class="au-pupil" cx="210" cy="100" r="19"/>
      <circle class="au-pring" cx="210" cy="100" r="22"/>
      <ellipse class="au-hi" cx="194" cy="84" rx="7" ry="4.5" transform="rotate(-25 194 84)"/>
      <path class="au-lid" d="M58 100Q210 8 362 100Q210 192 58 100Z"/>
    </g>
    <path class="au-fig" d="M209 160a2.4 2.4 0 1 1 2.4 2.4 2.4 2.4 0 0 1-2.4-2.4ZM207.4 164h4.6l1.4 9.5-1.2.6-.7 9.4h-1.5l-.6-8.2-.6 8.2h-1.5l-.6-9.4-1.1-.6Z"/>
    <line class="au-blade" x1="213.6" y1="168" x2="222" y2="183.5"/>`)}<i class="au-sparks">${sparks(14, 641, 'au-sp')}</i>`;
}

// ---------- Unterwelt (episch): Palast über einem Lavafeld, Blitz und Glut ----------
function unterwelt() {
  const r = rng(748);
  let wins = '';
  for (let x = 46; x < 330; x += 11) {
    wins += `<path class="uw-win" d="M${x} 104v-9a3 3 0 0 1 6 0v9Z" opacity="${f1(0.55 + r() * 0.45)}"/>`;
    if (x > 60 && x < 318) wins += `<path class="uw-win hi" d="M${x + 1} 86v-6a2 2 0 0 1 4 0v6Z" opacity="${f1(0.45 + r() * 0.5)}"/>`;
  }
  const towers = [[58, 46], [168, 34], [304, 50]].map(([x, top]) => `<path class="uw-house" d="M${x - 9} 76V${top + 8}l9-${8}l9 8V76Z"/><path class="uw-win" d="M${x - 2} ${top + 26}v-7a2 2 0 0 1 4 0v7Z"/>`).join('');
  const cliff = jag([20, 112], [360, 114], 18, 4, r);
  const rock = jag([-10, 150], [410, 140], 20, 10, r);
  // Risse: unterschiedlich lang, mit Abzweigungen, darunter ein breiter weicher Schein.
  let lava = '';
  let glowL = '';
  for (let i = 0; i < 16; i++) {
    const x0 = -20 + r() * 380;
    const y0 = 146 + r() * 50;
    const len = 50 + r() * 150;
    const c = jag([x0, y0], [x0 + len, y0 + (r() - 0.5) * 22], 6 + Math.floor(r() * 6), 4 + r() * 5, r);
    const w = 0.8 + r() * 2.6;
    lava += `<polyline class="uw-crack" points="${poly(c)}" stroke-width="${f1(w)}"/>`;
    glowL += `<polyline points="${poly(c)}" stroke-width="${f1(w * 4 + 3)}"/>`;
    if (r() < 0.6) {
      const k = 1 + Math.floor(r() * (c.length - 2));
      const [bx, by] = c[k];
      const br = jag([bx, by], [bx + (r() - 0.3) * 40, by + (r() < 0.5 ? -1 : 1) * (8 + r() * 14)], 4, 3, r);
      lava += `<polyline class="uw-crack" points="${poly(br)}" stroke-width="${f1(w * 0.6)}"/>`;
    }
  }
  const bolt = jag([346, -4], [304, 62], 9, 7, r);
  return `<i class="uw-sky"></i>${svg(`
    <ellipse class="uw-smoke" cx="90" cy="20" rx="140" ry="34"/><ellipse class="uw-smoke" cx="330" cy="10" rx="120" ry="28"/>
    <g class="uw-bolt"><polyline class="uw-bolt-g" points="${poly(bolt)}"/><polyline class="uw-bolt-c" points="${poly(bolt)}"/></g>
    <path class="uw-house" d="M36 112V78H340V112Z"/>
    ${towers}
    <path class="uw-roof" d="M34 78H342M44 92H332"/>
    <g class="uw-wins">${wins}</g>
    <polygon class="uw-cliff" points="10,200 ${poly(cliff)} 372,200"/>
    <polygon class="uw-rock" points="-10,200 ${poly(rock)} 410,200"/>
    <g class="uw-lglow">${glowL}</g>
    <g class="uw-lava">${lava}</g>
    <ellipse class="uw-pool" cx="120" cy="178" rx="34" ry="5"/><ellipse class="uw-pool" cx="300" cy="186" rx="44" ry="6"/>`)}<i class="uw-glow"></i><i class="uw-embers">${sparks(16, 749, 'uw-em')}</i>`;
}

// ---------- Schwarzes Loch (legendär): rote Scheibe, Photonenring, Wolken ----------
function diskSvg(seed) {
  const r = rng(seed);
  const cols = ['bh-a', 'bh-b', 'bh-c', 'bh-d'];
  let arcs = '';
  for (let i = 0; i < 54; i++) {
    const rad = 64 + Math.pow(r(), 0.8) * 132;
    const a0 = r() * Math.PI * 2;
    const a1 = a0 + 0.6 + r() * 2.2;
    const p0 = [200 + Math.cos(a0) * rad, 200 + Math.sin(a0) * rad];
    const p1 = [200 + Math.cos(a1) * rad, 200 + Math.sin(a1) * rad];
    arcs += `<path class="${cols[Math.floor(r() * 4)]}" d="M${pt(p0)}A${f1(rad)} ${f1(rad)} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${pt(p1)}" stroke-width="${f1(0.6 + r() * 3.4 * (1 - (rad - 64) / 160))}"/>`;
  }
  return `<svg viewBox="0 0 400 400" aria-hidden="true">${arcs}</svg>`;
}

function horizont() {
  const r = rng(860);
  // Wolkenrand aus unregelmäßigen Bögen: mal klein, mal groß, mal flach.
  const cloud = (y, amp, cls) => {
    let x = -20;
    let d = `M-20 200L-20 ${f1(y)}`;
    let yy = y;
    while (x < 420) {
      const w = 10 + r() * 46;
      const ny = y + (r() - 0.5) * amp * 2;
      const lift = 2 + Math.pow(r(), 1.6) * 20;
      d += `Q${f1(x + w * (0.3 + r() * 0.4))} ${f1(Math.min(yy, ny) - lift)} ${f1(x + w)} ${f1(ny)}`;
      x += w;
      yy = ny;
    }
    return `<path class="${cls}" d="${d}L420 200Z"/>`;
  };
  const disk = diskSvg(861);
  return `${svg(specks(862, 60, { rmax: 1.1, cls: 'bh-star' }))}<i class="bh-glow"></i>
    <i class="bh-disk back"><i class="bh-spin">${disk}</i></i>
    <i class="bh-lens"></i><i class="bh-core"></i>
    <i class="bh-disk front"><i class="bh-spin">${disk}</i></i>
    <i class="bh-mist"></i>${svg(`${cloud(150, 9, 'bh-cloud far')}${cloud(168, 7, 'bh-cloud')}${cloud(184, 5, 'bh-cloud near')}`)}`;
}

// ---------- Feuersturm (legendär): Feuerwirbel um ein weißes Glühen ----------
function feuersturm() {
  const r = rng(965);
  const cols = ['fs-a', 'fs-b', 'fs-c', 'fs-d', 'fs-e'];
  let strokes = '';
  for (let i = 0; i < 38; i++) {
    const a0 = r() * Math.PI * 2;
    const turn = 1.2 + r() * 1.6;
    const r0 = 18 + r() * 40;
    const grow = 1.35 + r() * 0.5;
    const w = 3 + r() * 13;
    const n = 22;
    const left = [];
    const right = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const a = a0 + turn * t;
      const rad = r0 * Math.pow(grow, t * 4.2);
      const x = 200 + Math.cos(a) * rad;
      const y = 200 + Math.sin(a) * rad;
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      const ww = w * Math.sin(Math.PI * t) * (0.7 + 0.3 * t);
      left.push([x + nx * ww / 2, y + ny * ww / 2]);
      right.push([x - nx * ww / 2, y - ny * ww / 2]);
    }
    strokes += `<path class="${cols[Math.floor(r() * cols.length)]}" d="M${left.map(pt).join('L')}L${right.reverse().map(pt).join('L')}Z" opacity="${f1(0.45 + r() * 0.55)}"/>`;
  }
  return `<i class="fs-smoke"></i><i class="fs-vortex"><i class="fs-spin"><svg viewBox="0 0 400 400" aria-hidden="true">${strokes}</svg></i></i>
    <i class="fs-burst"></i><i class="fs-embers">${sparks(18, 966, 'fs-em')}</i>`;
}

export const DARK_BANNERS = {
  tusche,
  klinge,
  panel,
  himmelslicht,
  finsternis,
  auge,
  unterwelt,
  horizont,
  feuersturm,
};
