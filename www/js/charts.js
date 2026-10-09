// SVG-Diagramme im Neon-Stil.
import { esc, parseIso, fmtShort, fmtMon } from './util.js';
import { CAT } from './model.js';

let uid = 0;
const dayNum = (iso) => Math.round(parseIso(iso).getTime() / 86400000);

function niceTicks(min, max, count = 4) {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { lo, hi, ticks };
}

// Speichert die Punkte je Diagramm für die Antipp-Anzeige.
export const chartRegistry = new Map();

export function lineChart({ points, width = 340, height = 190, color = '#3CF0FF', yFmt = (v) => v, unit = '', avg = null, goal = null, area = true, label = '' }) {
  const id = 'c' + ++uid;
  if (!points.length) {
    return `<div class="chart chart-empty" style="height:${height}px"><p>Noch keine Daten in diesem Zeitraum.</p></div>`;
  }
  const padL = 40, padR = 12, padT = 14, padB = 26;
  const W = width - padL - padR;
  const H = height - padT - padB;
  const xs = points.map((p) => dayNum(p.x));
  let x0 = Math.min(...xs);
  let x1 = Math.max(...xs);
  if (x1 - x0 < 6) { x0 -= 3; x1 += 3; }
  const ys = points.map((p) => p.y).concat(avg ? avg.map((p) => p.y) : []).concat(goal ? [goal] : []);
  let y0 = Math.min(...ys);
  let y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.12 || Math.max(1, y1 * 0.05);
  const { lo, hi, ticks } = niceTicks(y0 - pad, y1 + pad, 4);
  y0 = lo; y1 = hi;
  const sx = (x) => padL + ((x - x0) / (x1 - x0)) * W;
  const sy = (y) => padT + H - ((y - y0) / (y1 - y0 || 1)) * H;

  const pts = points.map((p) => [sx(dayNum(p.x)), sy(p.y)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  const areaPath = `${line}L${pts[pts.length - 1][0].toFixed(1)} ${padT + H}L${pts[0][0].toFixed(1)} ${padT + H}Z`;
  const avgPath = avg?.length
    ? avg.map((p, i) => (i ? 'L' : 'M') + sx(dayNum(p.x)).toFixed(1) + ' ' + sy(p.y).toFixed(1)).join('')
    : '';

  const grid = ticks
    .map((t) => `<line x1="${padL}" x2="${width - padR}" y1="${sy(t).toFixed(1)}" y2="${sy(t).toFixed(1)}" class="grid"/><text x="${padL - 8}" y="${(sy(t) + 4).toFixed(1)}" class="ylab">${esc(yFmt(t))}</text>`)
    .join('');

  const first = points[0].x;
  const last = points[points.length - 1].x;
  const span = dayNum(last) - dayNum(first);
  const xl = (iso) => (span > 200 ? fmtMon(iso) + ' ' + iso.slice(2, 4) : fmtShort(iso));
  const xlabels = `<text x="${padL}" y="${height - 6}" class="xlab" text-anchor="start">${esc(xl(first))}</text><text x="${width - padR}" y="${height - 6}" class="xlab" text-anchor="end">${esc(xl(last))}</text>`;

  const dots = pts.length <= 60
    ? pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.4" class="dot"/>`).join('')
    : '';
  const lp = pts[pts.length - 1];
  const goalLine = goal != null
    ? `<line x1="${padL}" x2="${width - padR}" y1="${sy(goal).toFixed(1)}" y2="${sy(goal).toFixed(1)}" class="goal"/><text x="${width - padR}" y="${(sy(goal) - 6).toFixed(1)}" class="goal-lab" text-anchor="end">Ziel ${esc(yFmt(goal))}</text>`
    : '';

  chartRegistry.set(id, { points, pts, yFmt, unit, label, padT, H, width, height });

  return `<div class="chart" data-chart="${id}" style="--c:${color}">
  <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">
    <defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".34"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${grid}${goalLine}
    ${area ? `<path d="${areaPath}" fill="url(#g${id})"/>` : ''}
    ${avgPath ? `<path d="${avgPath}" class="avg"/>` : ''}
    <path d="${line}" class="line"/>
    ${dots}
    <circle cx="${lp[0].toFixed(1)}" cy="${lp[1].toFixed(1)}" r="4.5" class="dot-last"/>
    ${xlabels}
  </svg>
  <div class="chart-tip" hidden></div>
</div>`;
}

export function sparkline(values, color = '#3CF0FF', w = 72, h = 26) {
  if (values.length < 2) return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"></svg>`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sx = (i) => 2 + (i / (values.length - 1)) * (w - 4);
  const sy = (v) => h - 3 - ((v - min) / (max - min || 1)) * (h - 6);
  const d = values.map((v, i) => (i ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(v).toFixed(1)).join('');
  const lx = sx(values.length - 1);
  const ly = sy(values[values.length - 1]);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true" style="--c:${color}"><path d="${d}"/><circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="2.6"/></svg>`;
}

// Wochen-Radar: Sätze pro Muskelgruppe in den letzten 7 Tagen.
export function radarChart(counts, size = 260, target = 10) {
  const cats = Object.keys(counts);
  const n = cats.length;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const R = size / 2 - 46;
  const max = Math.max(target * 2, ...Object.values(counts), 1);
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  // Wurzel-Skala: kleine Werte bleiben sichtbar, auch wenn eine Muskelgruppe viel mehr Sätze hat.
  const scale = (v) => Math.sqrt(Math.max(0, v) / max);
  const pt = (i, v) => [cx + Math.cos(ang(i)) * R * scale(v), cy + Math.sin(ang(i)) * R * scale(v)];
  const ring = (v) => cats.map((_, i) => pt(i, v).map((x) => x.toFixed(1)).join(',')).join(' ');
  const rings = [0.25, 0.5, 0.75, 1].map((f) => `<polygon points="${ring(max * f * f)}" class="r-ring"/>`).join('');
  const spokes = cats.map((_, i) => { const [x, y] = pt(i, max); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="r-spoke"/>`; }).join('');
  const shape = cats.map((c, i) => pt(i, Math.max(counts[c], max * 0.004)).map((x) => x.toFixed(1)).join(',')).join(' ');
  const dots = cats.map((c, i) => { const [x, y] = pt(i, counts[c]); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="${CAT[c].color}" class="r-dot"/>`; }).join('');
  const labels = cats.map((c, i) => {
    const [x, y] = pt(i, max * 1.42);
    const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
    return `<text x="${x.toFixed(1)}" y="${(y + 2).toFixed(1)}" text-anchor="${anchor}" class="r-lab"><tspan class="r-name">${esc(CAT[c].name)}</tspan><tspan x="${x.toFixed(1)}" dy="14" class="r-val" style="fill:${CAT[c].color}">${counts[c]}</tspan></text>`;
  }).join('');
  return `<svg class="radar" viewBox="0 0 ${size} ${size + 8}" width="100%" role="img" aria-label="Sätze pro Muskelgruppe in den letzten 7 Tagen">
    <defs><linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3CF0FF" stop-opacity=".45"/><stop offset="1" stop-color="#9B6BFF" stop-opacity=".35"/></linearGradient></defs>
    ${rings}${spokes}
    <polygon points="${ring(target)}" class="r-target"/>
    <polygon points="${shape}" class="r-shape"/>
    ${dots}${labels}
  </svg>`;
}

export function ring(progress, size = 40, stroke = 4) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, progress)));
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bar" stroke-width="${stroke}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

// Antippen eines Diagramms zeigt den Wert am nächsten Punkt.
export function bindCharts(root) {
  root.querySelectorAll('.chart[data-chart]').forEach((el) => {
    const data = chartRegistry.get(el.dataset.chart);
    if (!data) return;
    const tip = el.querySelector('.chart-tip');
    const svg = el.querySelector('svg');
    const show = (ev) => {
      const rect = svg.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * data.width;
      let best = 0;
      for (let i = 1; i < data.pts.length; i++) if (Math.abs(data.pts[i][0] - x) < Math.abs(data.pts[best][0] - x)) best = i;
      const p = data.points[best];
      const [px, py] = data.pts[best];
      tip.hidden = false;
      tip.innerHTML = `<b>${esc(data.yFmt(p.y))}${data.unit ? ' ' + esc(data.unit) : ''}</b><span>${esc(p.label || fmtShort(p.x))}</span>`;
      const left = (px / data.width) * rect.width;
      const top = (py / data.height) * rect.height;
      tip.style.left = Math.max(48, Math.min(rect.width - 48, left)) + 'px';
      tip.style.top = Math.max(0, top - 52) + 'px';
      el.style.setProperty('--tx', left + 'px');
      el.classList.add('tipping');
    };
    el.addEventListener('pointerdown', (e) => { show(e); el.setPointerCapture?.(e.pointerId); });
    el.addEventListener('pointermove', (e) => { if (el.classList.contains('tipping')) show(e); });
    const hide = () => { setTimeout(() => { tip.hidden = true; el.classList.remove('tipping'); }, 1600); };
    el.addEventListener('pointerup', hide);
    el.addEventListener('pointercancel', hide);
  });
}
