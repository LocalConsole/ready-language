import { useSettings } from '@/store/settings';
import { pick } from './util';

/* ---------- звуки (WebAudio, без файлов) ---------- */
let AC: AudioContext | null = null;
const SEQ: Record<string, [number, number][]> = {
  ok: [[660, 0.08], [880, 0.12]],
  bad: [[220, 0.14], [165, 0.18]],
  win: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.2]],
  tap: [[440, 0.04]],
  flip: [[330, 0.05]],
};
export function playSound(kind: keyof typeof SEQ) {
  if (!useSettings.getState().sound) return;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    AC = AC || new Ctor();
    let t = AC.currentTime;
    for (const [f, d] of SEQ[kind] || []) {
      const o = AC.createOscillator();
      const g = AC.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g).connect(AC.destination);
      o.start(t);
      o.stop(t + d + 0.02);
      t += d;
    }
  } catch {
    /* звук недоступен — не критично */
  }
}

/* ---------- конфетти ---------- */
let canvasEl: HTMLCanvasElement | null = null;
export const registerConfetti = (c: HTMLCanvasElement | null) => {
  canvasEl = c;
};
export function confetti(n = 120) {
  const b = document.body.classList;
  if (b.contains('lite') || b.contains('reduce') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = canvasEl;
  if (!c) return;
  c.width = innerWidth;
  c.height = innerHeight;
  const x = c.getContext('2d');
  if (!x) return;
  const col = ['#c0392b', '#e0a526', '#2a7f8e', '#3c9d5d', '#fff'];
  const P = Array.from({ length: n }, () => ({
    x: Math.random() * c.width,
    y: -20 - Math.random() * c.height * 0.4,
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 4,
    r: 4 + Math.random() * 5,
    c: pick(col),
    a: Math.random() * 6,
    va: (Math.random() - 0.5) * 0.3,
  }));
  let f = 0;
  const tick = () => {
    x.clearRect(0, 0, c.width, c.height);
    for (const p of P) {
      p.x += p.vx;
      p.y += p.vy;
      p.a += p.va;
      p.vy += 0.04;
      x.save();
      x.translate(p.x, p.y);
      x.rotate(p.a);
      x.fillStyle = p.c;
      x.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      x.restore();
    }
    if (++f < 200) requestAnimationFrame(tick);
    else x.clearRect(0, 0, c.width, c.height);
  };
  tick();
}

/* ---------- озвучка (Web Speech API) ---------- */
let gen = 0;
const voices = () => (typeof speechSynthesis === 'undefined' ? [] : speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang)));
export function stopSpeak() {
  gen++;
  try {
    speechSynthesis.cancel();
  } catch {
    /* нет озвучки */
  }
}
export function speak(text: string, o: { rate?: number; dialog?: boolean } = {}): Promise<boolean> {
  return new Promise((res) => {
    if (typeof speechSynthesis === 'undefined') return res(false);
    speechSynthesis.cancel();
    const g = ++gen;
    const lines = o.dialog ? text.split('\n').filter(Boolean) : [text];
    const vs = voices();
    let i = 0;
    const next = () => {
      if (g !== gen || i >= lines.length) return res(true);
      let ln = lines[i++];
      let sp = 0;
      const m = ln.match(/^([A-Za-z ]+):\s*/);
      if (m) {
        ln = ln.slice(m[0].length);
        sp = /caller|student|woman|b$/i.test(m[1]) ? 1 : 0;
      }
      const u = new SpeechSynthesisUtterance(ln);
      u.lang = 'en-GB';
      u.rate = o.rate || 0.95;
      if (vs.length) u.voice = vs[sp % vs.length];
      u.onend = next;
      u.onerror = next;
      speechSynthesis.speak(u);
    };
    next();
    setTimeout(() => res(true), Math.min(180000, text.length * 120 + 5000));
  });
}
