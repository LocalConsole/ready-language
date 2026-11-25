import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mascot } from './Mascot';
import { Gift, LessonIcons, Paw } from './Icons';
import { t } from '@/i18n';
import type { Lesson, MishaState } from '@/types';

const XS = [50, 27, 66, 33, 60, 30, 64];

export interface MapNode { lesson: Lesson; state: 'done' | 'next' | 'todo'; score?: number }

/** Извилистая лесная тропа со следами лап: узлы-иконки, рядом с текущим уроком стоит Миша. */
export function ForestMap({ nodes, mood = 'hello', prefix = 'map-node', gap = 96 }: { nodes: MapNode[]; mood?: MishaState; prefix?: string; gap?: number }) {
  const H = nodes.length * gap + 30;
  const pts = nodes.map((_, i) => [XS[i % XS.length] * 3, 48 + i * gap] as const);
  let d = '';
  pts.forEach(([x, y], i) => {
    if (!i) d = `M${x} ${y}`;
    else { const [px, py] = pts[i - 1]; d += ` C${px} ${py + gap * 0.6} ${x} ${y - gap * 0.6} ${x} ${y}`; }
  });
  const prints: { x: number; y: number; r: number }[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    for (let k = 1; k < 4; k++) {
      const f = k / 4, e = f * f * (3 - 2 * f);
      prints.push({ x: x0 + (x1 - x0) * e + (k % 2 ? -9 : 9), y: y0 + (y1 - y0) * f, r: ((x1 - x0) > 0 ? 25 : -25) + (k % 2 ? -10 : 10) });
    }
  }
  const cur = nodes.findIndex((n) => n.state === 'next');
  return (
    <div className="fmap" style={{ height: H }} data-testid="forest-map">
      <svg viewBox={`0 0 300 ${H}`} preserveAspectRatio="none" className="fmap-path" aria-hidden="true">
        <path d={d} fill="none" stroke="var(--trail)" strokeWidth="26" strokeLinecap="round" />
        <path d={d} fill="none" stroke="var(--trail-edge)" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" transform="translate(0 0)" opacity=".0" />
      </svg>
      {prints.map((p, i) => <Paw key={i} size={13} className="fmap-paw" style={{ left: `${(p.x / 300) * 100}%`, top: p.y, transform: `translate(-50%,-50%) rotate(${p.r}deg)` }} />)}
      {nodes.map((n, i) => {
        const Ic = LessonIcons[i % LessonIcons.length];
        const [x, y] = pts[i];
        const last = i === nodes.length - 1 && n.state === 'todo' && nodes.length > 4;
        return (
          <motion.div key={n.lesson.id} className="fmap-slot" style={{ left: `${(x / 300) * 100}%`, top: y }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 18 }}>
            <Link to={'/lesson/' + n.lesson.id} className={`fnode ${n.state}`} data-testid={`${prefix}-${n.lesson.id}`} aria-label={`${t(n.lesson.title)}${n.state === 'done' ? ' ✓' : ''}`}>
              {n.state === 'done' ? <span className="fnode-check">✓</span> : null}
              {last ? <Gift size={34} /> : <Ic size={34} />}
            </Link>
            <div className="fnode-t">{t(n.lesson.title)}</div>
          </motion.div>
        );
      })}
      {cur >= 0 && (
        <div className="fmap-misha" style={{ top: pts[cur][1] - 40, [pts[cur][0] > 150 ? 'left' : 'right']: 2 } as React.CSSProperties}>
          <Mascot state={mood} style={{ width: 92 }} />
        </div>
      )}
    </div>
  );
}
