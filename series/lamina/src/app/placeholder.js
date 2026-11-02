// Placeholder page art used until the typesetter delivers real pages.
import * as THREE from 'three/webgpu';

export function placeholderPage(label, { paper = '#fbf8f1', ink = '#1c1a17', side = 'recto', w = 1024 } = {}) {
  const h = Math.round(w * 1.38);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = paper;
  g.fillRect(0, 0, w, h);
  g.fillStyle = ink;
  g.textAlign = side === 'recto' ? 'right' : 'left';
  g.font = `italic ${w * 0.05}px Georgia, serif`;
  g.fillText(label, side === 'recto' ? w * 0.9 : w * 0.1, h * 0.1);
  g.strokeStyle = 'rgba(0,0,0,.12)';
  g.lineWidth = 2;
  g.strokeRect(w * 0.08, h * 0.06, w * 0.84, h * 0.88);
  g.font = `${w * 0.022}px Georgia, serif`;
  g.fillText(label, side === 'recto' ? w * 0.9 : w * 0.1, h * 0.96);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function placeholderCover(title, { cloth = '#23412f', foil = '#d8b25a', w = 1024 } = {}) {
  const h = Math.round(w * (1.38 + 0.056) / (1 + 0.028));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = cloth;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = foil;
  g.lineWidth = 6;
  g.strokeRect(w * 0.1, h * 0.08, w * 0.8, h * 0.84);
  g.fillStyle = foil;
  g.textAlign = 'center';
  g.font = `${w * 0.09}px Georgia, serif`;
  g.fillText(title, w / 2, h * 0.42);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
