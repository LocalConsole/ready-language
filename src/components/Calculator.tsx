import { useRef, useState } from 'react';
import { evaluate } from '@/lib/calc';
import { t } from '@/i18n';

/** Калькулятор и график в стиле Desmos для SAT Math. Безопасный парсер вместо eval. */
export function Calculator() {
  const [expr, setExpr] = useState('');
  const [out, setOut] = useState('—');
  const cv = useRef<HTMLCanvasElement>(null);
  const calc = () => {
    try { setOut(String(Math.round(evaluate(expr, 0) * 1e8) / 1e8)); } catch { setOut(t('ошибка')); }
  };
  const graph = () => {
    const c = cv.current;
    if (!c) return;
    const x = c.getContext('2d');
    if (!x) return;
    const W = c.width, H = c.height;
    x.clearRect(0, 0, W, H);
    x.strokeStyle = '#999'; x.lineWidth = 1; x.beginPath();
    x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.moveTo(W / 2, 0); x.lineTo(W / 2, H); x.stroke();
    x.fillStyle = getComputedStyle(document.body).color; x.font = '10px sans-serif';
    for (let i = -10; i <= 10; i += 5) x.fillText(String(i), W / 2 + (i * W) / 20 + 2, H / 2 + 10);
    x.strokeStyle = '#c0392b'; x.lineWidth = 2; x.beginPath();
    let first = true;
    try {
      for (let px = 0; px <= W; px++) {
        const y = evaluate(expr, (px - W / 2) / (W / 20));
        if (!isFinite(y) || Math.abs(y) > 40) { first = true; continue; }
        const py = H / 2 - y * (H / 20);
        if (first) x.moveTo(px, py); else x.lineTo(px, py);
        first = false;
      }
      x.stroke();
      setOut('✓');
    } catch { setOut(t('ошибка')); }
  };
  return (
    <details className="card" style={{ padding: '.6rem' }} data-testid="calc">
      <summary>🧮 {t('Калькулятор и график')}</summary>
      <label htmlFor="ce">{t('Выражение или y = f(x) (x, ^, sqrt, sin, pi)')}</label>
      <input id="ce" type="text" value={expr} onChange={(e) => setExpr(e.target.value)} placeholder="2*x^2-3  |  15% * 240" />
      <div className="row" style={{ margin: '.4rem 0' }}>
        <button className="btn alt sm" data-testid="calc-eq" onClick={calc}>= {t('Вычислить')}</button>
        <button className="btn alt sm" onClick={graph}>📈 {t('График')}</button>
        <span className="chip" data-testid="calc-out">{out}</span>
      </div>
      <canvas ref={cv} width={300} height={200} aria-label={t('График')} style={{ width: '100%', maxWidth: 300, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--card)' }} />
    </details>
  );
}
