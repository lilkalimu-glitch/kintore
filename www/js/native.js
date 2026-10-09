// Brücke zu den Android-Funktionen (Capacitor-Plugins).
// Im Browser fehlen diese Plugins – dann greifen einfache Web-Ersatzlösungen.

const g = typeof window !== 'undefined' ? window : globalThis;

function plugin(name) {
  try {
    const fromBundle = g.KPlugins?.[name];
    if (fromBundle) return fromBundle;
    const bundle = g['capacitor' + name];
    if (bundle && bundle[name]) return bundle[name];
    const fromCore = g.Capacitor?.Plugins?.[name];
    if (fromCore) return fromCore;
  } catch {}
  return null;
}

export const isNative = () => {
  try { return !!g.Capacitor?.isNativePlatform?.(); } catch { return false; }
};

async function safe(fn, fallback = null) {
  try { return await fn(); } catch (e) { console.warn('[native]', e?.message || e); return fallback; }
}

// ---------- Vibration ----------
export async function haptic(style = 'LIGHT') {
  const H = plugin('Haptics');
  if (H) return safe(() => H.impact({ style }));
  try { navigator.vibrate?.(style === 'HEAVY' ? 30 : 12); } catch {}
}

export async function vibrate(pattern = [350, 160, 350]) {
  const H = plugin('Haptics');
  if (H && isNative()) {
    let total = 0;
    for (let i = 0; i < pattern.length; i += 2) {
      setTimeout(() => safe(() => H.vibrate({ duration: pattern[i] })), total);
      total += pattern[i] + (pattern[i + 1] || 0);
    }
    return;
  }
  try { navigator.vibrate?.(pattern); } catch {}
}

// ---------- Benachrichtigung für den Pausen-Timer ----------
const REST_ID = 4711;
let channelReady = false;

export async function notificationsAllowed(ask = false) {
  const LN = plugin('LocalNotifications');
  if (!LN || !isNative()) return false;
  const res = await safe(() => (ask ? LN.requestPermissions() : LN.checkPermissions()));
  return res?.display === 'granted';
}

export async function scheduleRest(atMs, body) {
  const LN = plugin('LocalNotifications');
  if (!LN || !isNative()) return;
  if (!(await notificationsAllowed(true))) return;
  if (!channelReady) {
    await safe(() => LN.createChannel({
      id: 'rest', name: 'Pausen-Timer', description: 'Meldet sich, wenn die Satzpause vorbei ist',
      importance: 5, visibility: 1, vibration: true,
    }));
    channelReady = true;
  }
  await safe(() => LN.cancel({ notifications: [{ id: REST_ID }] }));
  await safe(() => LN.schedule({
    notifications: [{
      id: REST_ID,
      title: 'Pause vorbei',
      body,
      channelId: 'rest',
      schedule: { at: new Date(atMs), allowWhileIdle: true },
    }],
  }));
}

export async function cancelRest() {
  const LN = plugin('LocalNotifications');
  if (!LN || !isNative()) return;
  await safe(() => LN.cancel({ notifications: [{ id: REST_ID }] }));
}

// ---------- Dateien ----------
const MIRROR = 'kintore-daten.json';

export async function mirrorWrite(text) {
  const FS = plugin('Filesystem');
  if (!FS || !isNative()) return;
  await safe(() => FS.writeFile({ path: MIRROR, data: text, directory: 'DATA', encoding: 'utf8' }));
}

export async function mirrorRead() {
  const FS = plugin('Filesystem');
  if (!FS || !isNative()) return null;
  const res = await safe(() => FS.readFile({ path: MIRROR, directory: 'DATA', encoding: 'utf8' }));
  return typeof res?.data === 'string' ? res.data : null;
}

// Speichert eine Textdatei und öffnet das Teilen-Menü (Drive, WhatsApp, Dateien …).
export async function saveTextFile(filename, text, mime = 'application/json') {
  const FS = plugin('Filesystem');
  const SH = plugin('Share');
  if (FS && isNative()) {
    const written = await safe(() => FS.writeFile({ path: filename, data: text, directory: 'CACHE', encoding: 'utf8' }));
    if (written?.uri && SH) {
      const shared = await safe(async () => { await SH.share({ title: filename, files: [written.uri] }); return true; }, false);
      if (shared) return { ok: true, how: 'share' };
    }
    const doc = await safe(() => FS.writeFile({ path: filename, data: text, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true }));
    if (doc) return { ok: true, how: 'documents' };
    return { ok: false };
  }
  try {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { ok: true, how: 'download' };
  } catch {
    return { ok: false };
  }
}

// ---------- System-Leisten, Zurück-Taste, App-Status ----------
export function initNative({ onBack, onResume, onPause }) {
  if (!isNative()) return;
  const SB = plugin('StatusBar');
  if (SB) {
    safe(() => SB.setOverlaysWebView({ overlay: false }));
    safe(() => SB.setBackgroundColor({ color: '#0B1020' }));
    safe(() => SB.setStyle({ style: 'DARK' }));
  }
  const App = plugin('App');
  if (App) {
    safe(() => App.addListener('backButton', () => onBack?.()));
    safe(() => App.addListener('appStateChange', ({ isActive }) => (isActive ? onResume?.() : onPause?.())));
  }
}

export function exitApp() {
  const App = plugin('App');
  if (App) safe(() => App.exitApp());
}
