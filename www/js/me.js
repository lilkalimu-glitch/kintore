// Das eigene Profilbild: laden, speichern und überall gleich im angelegten Rahmen zeigen.
import { app, D } from './core.js';
import { loadAvatar, saveAvatar } from './store.js';
import { avatar, equipped } from './look.js';

let url = '';
let objectUrl = '';

// Kurze Blob-Adresse statt der langen Daten-Adresse, damit das HTML beim Neuzeichnen klein bleibt.
async function toUrl(dataUrl) {
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = ''; }
  if (!dataUrl) return '';
  try {
    const blob = await (await fetch(dataUrl)).blob();
    objectUrl = URL.createObjectURL(blob);
    return objectUrl;
  } catch {
    return dataUrl;
  }
}

export async function initAvatar() {
  try { url = await toUrl((await loadAvatar()) || ''); } catch { url = ''; }
}

export const avatarUrl = () => url;

export async function setAvatar(dataUrl) {
  await saveAvatar(dataUrl || null);
  url = await toUrl(dataUrl || '');
}

// Bild quadratisch aus der Mitte zuschneiden und verkleinern.
export function squareImage(file, size = 384) {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = c.height = Math.min(size, side);
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, c.width, c.height);
      URL.revokeObjectURL(src);
      resolve(c.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('Bild konnte nicht gelesen werden.')); };
    img.src = src;
  });
}

// Profilbild mit Rahmen, Rang und Effekt aus dem aktuellen Look.
export function myAvatar(opts = {}) {
  const lv = D().level;
  const look = equipped(app.state, lv.level);
  return avatar({
    frameId: look.frame.id,
    rankId: lv.rank,
    img: url,
    initial: app.state.profile?.name || '',
    effect: look.effect.id,
    ...opts,
  });
}
