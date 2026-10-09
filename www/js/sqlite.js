// Minimaler, nur lesender SQLite-Leser.
// Reicht für FitNotes-Backups (normale Rowid-Tabellen, UTF-8).
// Läuft im Browser und in Node, ohne Abhängigkeiten.

function readVarint(arr, pos) {
  let v = 0;
  for (let i = 0; i < 8; i++) {
    const b = arr[pos + i];
    v = v * 128 + (b & 0x7f);
    if (!(b & 0x80)) return [v, i + 1];
  }
  v = v * 256 + arr[pos + 8];
  return [v, 9];
}

function parseColumns(sql) {
  const start = sql.indexOf('(');
  const end = sql.lastIndexOf(')');
  const body = sql.slice(start + 1, end);
  const parts = [];
  let depth = 0;
  let cur = '';
  let quote = null;
  for (const ch of body) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; cur += ch; continue; }
    if (ch === '[') { quote = ']'; cur += ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());

  const cols = [];
  for (const p of parts) {
    if (/^(constraint|primary|unique|check|foreign)\b/i.test(p)) continue;
    const m = p.match(/^(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|(\S+))\s*([\s\S]*)$/);
    if (!m) continue;
    const name = m[1] || m[2] || m[3] || m[4];
    const rest = (m[5] || '').trim();
    const ipk = /^integer\s+primary\s+key/i.test(rest);
    let def = null;
    const dm = rest.match(/default\s+('(?:[^']|'')*'|-?\d+(?:\.\d+)?|null)/i);
    if (dm) {
      const s = dm[1];
      if (s[0] === "'") def = s.slice(1, -1).replace(/''/g, "'");
      else if (/^null$/i.test(s)) def = null;
      else def = Number(s);
    }
    cols.push({ name, ipk, def });
  }
  return cols;
}

export function openSqlite(input) {
  const u8 = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (u8.length < 100) throw new Error('Die Datei ist zu klein für eine Datenbank.');
  const header = String.fromCharCode(...u8.subarray(0, 15));
  if (header !== 'SQLite format 3') throw new Error('Das ist keine gültige Backup-Datei.');

  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let pageSize = dv.getUint16(16);
  if (pageSize === 1) pageSize = 65536;
  const usable = pageSize - u8[20];
  const encoding = dv.getUint32(56);
  const decoder = new TextDecoder(encoding === 2 ? 'utf-16le' : encoding === 3 ? 'utf-16be' : 'utf-8');

  const pageStart = (n) => (n - 1) * pageSize;

  function payload(pos, total) {
    const maxLocal = usable - 35;
    if (total <= maxLocal) return u8.subarray(pos, pos + total);
    const minLocal = Math.floor(((usable - 12) * 32) / 255) - 23;
    const k = minLocal + ((total - minLocal) % (usable - 4));
    const local = k <= maxLocal ? k : minLocal;
    const out = new Uint8Array(total);
    out.set(u8.subarray(pos, pos + local), 0);
    let written = local;
    let next = dv.getUint32(pos + local);
    let guard = 0;
    while (written < total && next && guard++ < 100000) {
      const base = pageStart(next);
      const following = dv.getUint32(base);
      const n = Math.min(usable - 4, total - written);
      out.set(u8.subarray(base + 4, base + 4 + n), written);
      written += n;
      next = following;
    }
    return out;
  }

  function collect(pageNo, out, depth = 0) {
    if (depth > 64) throw new Error('Datenbank-Struktur ist beschädigt.');
    const base = pageStart(pageNo);
    const h = base + (pageNo === 1 ? 100 : 0);
    const type = u8[h];
    const cells = dv.getUint16(h + 3);
    if (type === 0x05) {
      for (let i = 0; i < cells; i++) {
        const cp = base + dv.getUint16(h + 12 + i * 2);
        collect(dv.getUint32(cp), out, depth + 1);
      }
      collect(dv.getUint32(h + 8), out, depth + 1);
    } else if (type === 0x0d) {
      for (let i = 0; i < cells; i++) {
        let p = base + dv.getUint16(h + 8 + i * 2);
        const [len, a] = readVarint(u8, p); p += a;
        const [rowid, b] = readVarint(u8, p); p += b;
        out.push({ rowid, data: payload(p, len) });
      }
    } else {
      throw new Error('Unbekannter Seitentyp in der Datenbank.');
    }
  }

  function decode(rec) {
    const rdv = new DataView(rec.buffer, rec.byteOffset, rec.byteLength);
    const [hsize, l] = readVarint(rec, 0);
    const types = [];
    let hp = l;
    while (hp < hsize) {
      const [t, n] = readVarint(rec, hp);
      types.push(t);
      hp += n;
    }
    let bp = hsize;
    const vals = [];
    for (const t of types) {
      switch (t) {
        case 0: vals.push(null); break;
        case 1: vals.push(rdv.getInt8(bp)); bp += 1; break;
        case 2: vals.push(rdv.getInt16(bp)); bp += 2; break;
        case 3: vals.push((rdv.getInt8(bp) << 16) | (rdv.getUint8(bp + 1) << 8) | rdv.getUint8(bp + 2)); bp += 3; break;
        case 4: vals.push(rdv.getInt32(bp)); bp += 4; break;
        case 5: vals.push(rdv.getInt16(bp) * 4294967296 + rdv.getUint32(bp + 2)); bp += 6; break;
        case 6: vals.push(Number(rdv.getBigInt64(bp))); bp += 8; break;
        case 7: vals.push(rdv.getFloat64(bp)); bp += 8; break;
        case 8: vals.push(0); break;
        case 9: vals.push(1); break;
        default:
          if (t >= 12 && t % 2 === 0) {
            const n = (t - 12) / 2;
            vals.push(rec.slice(bp, bp + n));
            bp += n;
          } else if (t >= 13) {
            const n = (t - 13) / 2;
            vals.push(decoder.decode(rec.subarray(bp, bp + n)));
            bp += n;
          } else {
            vals.push(null);
          }
      }
    }
    return vals;
  }

  const master = [];
  collect(1, master);
  const tables = new Map();
  for (const row of master) {
    const [type, name, , rootpage, sql] = decode(row.data);
    if (type === 'table' && rootpage && sql && !/without\s+rowid/i.test(sql)) {
      tables.set(String(name).toLowerCase(), { name, root: rootpage, cols: parseColumns(sql) });
    }
  }

  return {
    tableNames: () => [...tables.values()].map((t) => t.name),
    has: (name) => tables.has(name.toLowerCase()),
    rows(name) {
      const t = tables.get(name.toLowerCase());
      if (!t) return [];
      const raw = [];
      collect(t.root, raw);
      return raw.map(({ rowid, data }) => {
        const vals = decode(data);
        const o = {};
        t.cols.forEach((c, i) => {
          let v = i < vals.length ? vals[i] : c.def;
          if (c.ipk && v == null) v = rowid;
          o[c.name] = v;
        });
        return o;
      });
    },
  };
}
