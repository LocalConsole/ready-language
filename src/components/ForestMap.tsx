import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mascot, asset } from './Mascot';
import { Gift, LessonIcons } from './Icons';
import { TRAIL_X, TILE_H, TILE_W } from '@/lib/trail';
import { t } from '@/i18n';
import type { Lesson, MishaState } from '@/types';

export interface MapNode { lesson: Lesson; state: 'done' | 'next' | 'todo'; score?: number }

const RATIO = TILE_H / TILE_W; // высота плитки в долях ширины
const STEP = 0.1; // расстояние между узлами в плитках
const START = 0.2; // первый узел (ниже улья на ветке)

/** Положение тропы (0..1 по ширине) на высоте u (в плитках). Нечётные плитки зеркальные — стыки бесшовные. */
function trailX(u: number) {
  const k = Math.floor(u);
  let f = u - k;
  if (k % 2) f = 1 - f;
  const p = Math.min(f, 0.9999) * (TILE_H / 16);
  const i = Math.floor(p);
  return TRAIL_X[i] + (TRAIL_X[i + 1] - TRAIL_X[i]) * (p - i);
}

/** Лесная карта на нарисованной текстуре: узлы-иконки стоят на тропе, рядом с текущим уроком — Миша. */
export function ForestMap({ nodes, mood = 'hello', prefix = 'map-node' }: { nodes: MapNode[]; mood?: MishaState; prefix?: string; gap?: number }) {
  const first = START - 0.08;
  const vis = nodes.length * STEP + 0.08; // видимая высота в плитках
  const tiles = Math.ceil(first + vis);
  const us = nodes.map((_, i) => START + i * STEP);
  const top = (u: number) => `${((u - first) / vis) * 100}%`;
  const cur = nodes.findIndex((n) => n.state === 'next');
  const cssVars = { '--tile-l': `url(${asset('map-light.webp')})`, '--tile-d': `url(${asset('map-dark.webp')})` } as React.CSSProperties;
  return (
    <div className="fmap" style={{ ...cssVars, aspectRatio: `${TILE_W} / ${TILE_H * vis}` }} data-testid="forest-map">
      <div className="fmap-tiles" style={{ marginTop: `${-first * RATIO * 100}%` }} aria-hidden="true">
        {Array.from({ length: tiles }, (_, k) => <div key={k} className={`fmap-tile ${k % 2 ? 'flip' : ''}`} />)}
      </div>
      {nodes.map((n, i) => {
        const Ic = LessonIcons[i % LessonIcons.length];
        const x = trailX(us[i]);
        const last = i === nodes.length - 1 && n.state === 'todo' && nodes.length > 4;
        return (
          <motion.div key={n.lesson.id} className="fmap-slot" style={{ left: `${x * 100}%`, top: top(us[i]) }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 18 }}>
            <Link to={'/lesson/' + n.lesson.id} className={`fnode ${n.state}`} data-testid={`${prefix}-${n.lesson.id}`} aria-label={`${t(n.lesson.title)}${n.state === 'done' ? ' ✓' : ''}`}>
              {n.state === 'done' ? <span className="fnode-check">✓</span> : null}
              {last ? <Gift size={34} /> : <Ic size={34} />}
            </Link>
            <div className="fnode-t">{t(n.lesson.title)}</div>
          </motion.div>
        );
      })}
      {cur >= 0 && (() => {
        const x = trailX(us[cur]);
        const side = x > 0.5 ? { right: `calc(${(1 - x) * 100}% + 74px)` } : { left: `calc(${x * 100}% + 74px)` };
        return <div className="fmap-misha" style={{ top: `calc(${top(us[cur])} - 70px)`, ...side }}><Mascot state={mood} style={{ width: 92 }} /></div>;
      })()}
    </div>
  );
}
