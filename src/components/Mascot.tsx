import { memo, useMemo, type ReactNode } from 'react';
import type { MishaState } from '@/types';
import { mishaLine, mishaSvg } from '@/lib/mascot';
import { useProgress } from '@/store/progress';
import { outfit as calcOutfit } from '@/lib/plan';

export function useOutfit() {
  const xp = useProgress((s) => s.xp);
  const ach = useProgress((s) => s.achievements);
  return useMemo(() => calcOutfit(xp, ach), [xp, ach]);
}

interface MascotProps {
  state?: MishaState;
  still?: boolean;
  className?: string;
  style?: React.CSSProperties;
}
/** SVG Миши (разметка собирается кодом, внешних данных в ней нет — dangerouslySetInnerHTML безопасен). */
export const Mascot = memo(function Mascot({ state = 'hello', still, className = '', style }: MascotProps) {
  const o = useOutfit();
  const html = useMemo(() => mishaSvg(state, o, { still }), [state, o, still]);
  return <div className={`misha ${className}`} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
});

/** Миша слева, реплика справа. */
export function Say({ state = 'hello', children, width, still }: { state?: MishaState; children: ReactNode; width?: number; still?: boolean }) {
  return (
    <div className="say">
      <Mascot state={state} still={still} style={width ? { width } : undefined} />
      <div className="bubble">{children}</div>
    </div>
  );
}

/** Миша со случайной репликой для состояния (реплика не меняется между рендерами). */
export function Mood({ state = 'hello', text }: { state?: MishaState; text?: ReactNode }) {
  const line = useMemo(() => mishaLine(state), [state]);
  return <Say state={state}>{text ?? line}</Say>;
}
