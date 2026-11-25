import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sanitize } from '@/lib/sanitize';
import { t } from '@/i18n';

/** Безопасный вывод HTML из данных (объяснения, примеры уроков). */
export function Html({ html, as: Tag = 'span', className, style }: { html: string; as?: 'span' | 'div' | 'li' | 'p'; className?: string; style?: CSSProperties }) {
  const clean = useMemo(() => sanitize(html), [html]);
  return <Tag className={className} style={style} dangerouslySetInnerHTML={{ __html: clean }} />;
}

export function PageHead({ icon, title, sub, acc = 'vocab' }: { icon: string; title: string; sub?: string; acc?: string }) {
  return (
    <div className="ph" data-acc={acc}>
      <span className="pic" aria-hidden="true">{icon}</span>
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
    </div>
  );
}

export function Bar({ value, style, label }: { value: number; style?: CSSProperties; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="bar" style={style} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <motion.i initial={false} animate={{ width: pct + '%' }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} />
    </div>
  );
}

export function Ring({ pct, label, color }: { pct: number; label: ReactNode; color?: string }) {
  const r = 36, c = 2 * Math.PI * r;
  return (
    <div className="ring">
      <svg width="84" height="84" aria-hidden="true">
        <circle className="bg" cx="42" cy="42" r={r} />
        <circle className="fg" cx="42" cy="42" r={r} style={{ stroke: color, strokeDasharray: c, strokeDashoffset: c * (1 - Math.min(1, Math.max(0, pct))) }} />
      </svg>
      <b>{label}</b>
    </div>
  );
}

export const Chip = ({ children, title }: { children: ReactNode; title?: string }) => <span className="chip" title={title}>{children}</span>;
export const Pill = ({ children, kind }: { children: ReactNode; kind?: string }) => <span className={`pill ${kind || ''}`}>{children}</span>;
export const Skel = ({ w }: { w?: string }) => <div className="skel" style={w ? { width: w } : undefined} />;

export function BackLink({ to, children }: { to: string; children?: ReactNode }) {
  return <Link className="btn alt sm" to={to}>← {children ?? t('Назад')}</Link>;
}

/** Контейнер-ряд кнопок */
export const Row = ({ children, style, className = '' }: { children: ReactNode; style?: CSSProperties; className?: string }) => (
  <div className={`row ${className}`} style={style}>{children}</div>
);
export const Spacer = () => <span className="sp" />;
