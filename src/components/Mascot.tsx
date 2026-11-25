import { memo, useMemo, type CSSProperties, type ReactNode } from 'react';
import type { MishaState } from '@/types';
import { mishaLine } from '@/lib/mascot';
import { useProgress } from '@/store/progress';
import { outfit as calcOutfit } from '@/lib/plan';

export function useOutfit() {
  const xp = useProgress((s) => s.xp);
  const ach = useProgress((s) => s.achievements);
  return useMemo(() => calcOutfit(xp, ach), [xp, ach]);
}

const BASE = import.meta.env.BASE_URL + 'misha/';
export const asset = (name: string) => BASE + name;

/** Покадровые стрипы: n кадров в ряд, ar = ширина/высота одного кадра. */
const STRIPS = {
  idle: { src: 'idle.webp', n: 4, ar: 225 / 328 },
  jump: { src: 'jump.webp', n: 6, ar: 238 / 328 },
  walk: { src: 'walk.webp', n: 8, ar: 222 / 268 },
} as const;
type StripName = keyof typeof STRIPS;

export function Strip({ name, className = '', style, still }: { name: StripName; className?: string; style?: CSSProperties; still?: boolean }) {
  const s = STRIPS[name];
  return (
    <div
      className={`strip strip-${name} ${still ? 'still' : ''} ${className}`}
      aria-hidden="true"
      style={{ aspectRatio: String(s.ar), backgroundImage: `url(${asset(s.src)})`, backgroundSize: `${s.n * 100}% 100%`, ...style }}
    />
  );
}

type Pose = 'hello' | 'think' | 'happy' | 'honey' | 'cheer' | 'speak' | 'sad' | 'wink' | 'sleep';
const POSE: Record<MishaState, Pose> = { hello: 'hello', think: 'think', happy: 'happy', sad: 'sad', cheer: 'cheer', board: 'hello', celebrate: 'happy', explain: 'speak' };
const ALT: Record<MishaState, string> = { hello: 'Миша', think: 'Миша думает', happy: 'Миша радуется', sad: 'Миша грустит', cheer: 'Миша поддерживает', board: 'Миша', celebrate: 'Миша празднует', explain: 'Миша объясняет' };

interface MascotProps {
  state?: MishaState;
  still?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Явно выбрать позу из листа (honey, wink, sleep, speak…). */
  pose?: Pose;
}
/**
 * Миша: спрайты из нарисованных текстур.
 * hello — стоит и моргает/дышит (стрип idle), celebrate — прыгает от радости (стрип jump),
 * остальные состояния — позы с лёгким «дыханием». still отключает анимацию.
 */
export const Mascot = memo(function Mascot({ state = 'hello', still, className = '', style, pose }: MascotProps) {
  const alt = ALT[state];
  let inner: ReactNode;
  if (!pose && state === 'hello') inner = <Strip name="idle" still={still} />;
  else if (!pose && state === 'celebrate' && !still) inner = <Strip name="jump" />;
  else inner = <img className={`pose ${still ? 'still' : ''} pose-${state}`} src={asset(`pose-${pose ?? POSE[state]}.webp`)} alt="" decoding="async" draggable={false} />;
  return <div className={`misha ${className}`} style={style} role="img" aria-label={alt}>{inner}</div>;
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

/** Экран ожидания: Миша шагает по тропе со следами лап. */
export function MishaLoader({ text, className = '' }: { text?: ReactNode; className?: string }) {
  return (
    <div className={`mloader ${className}`} role="status" aria-live="polite" data-testid="misha-loader">
      <div className="mloader-walk">
        <Strip name="walk" />
        <div className="mloader-trail" aria-hidden="true"><i /><i /><i /><i /></div>
      </div>
      {text && <div className="mloader-t">{text}</div>}
    </div>
  );
}

/** Крупная реакция на ответ квиза. */
export function Reaction({ kind, className = '', style }: { kind: 'correct' | 'good' | 'oops' | 'almost'; className?: string; style?: CSSProperties }) {
  return <img className={`react react-${kind} ${className}`} style={style} src={asset(`react-${kind}.webp`)} alt="" decoding="async" draggable={false} />;
}

/** Праздничная сцена с трофеем и баннером «Ура!» (надпись добавляется кодом — переводится). */
export function TrophyHero({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="trophy" data-testid="trophy">
      <img src={asset('trophy.webp')} alt="" decoding="async" draggable={false} />
      <div className="trophy-t"><b>{title}</b>{sub && <span>{sub}</span>}</div>
    </div>
  );
}
