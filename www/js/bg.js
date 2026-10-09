// Eigenes Hintergrundbild mit Abdunkeln und Weichzeichnen.
import { app } from './core.js';

export function applyBackground(dataUrl) {
  const bg = document.getElementById('bg');
  if (!bg) return;
  const s = app.state?.settings || {};
  bg.style.setProperty('--bg-dim', s.bgDim ?? 0.55);
  bg.style.setProperty('--bg-blur', (s.bgBlur ?? 6) + 'px');
  if (dataUrl !== undefined) {
    if (dataUrl) {
      bg.classList.add('has-img');
      bg.innerHTML = '<div class="bg-img"></div><div class="bg-dim"></div>';
      bg.querySelector('.bg-img').style.backgroundImage = `url("${dataUrl}")`;
    } else {
      bg.classList.remove('has-img');
      bg.innerHTML = '';
    }
  }
}
