import type { CSSProperties } from 'react';

/** Оригинальные иконки лесной темы: мёд, пень, ягоды, шишка, подарок, лапа, огонь. */
type P = { size?: number; style?: CSSProperties; className?: string };
const S = ({ size = 32, style, className, children }: P & { children: React.ReactNode }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} style={style} className={className} aria-hidden="true" focusable="false">{children}</svg>
);
const st = { stroke: '#5A3A1E', strokeWidth: 2.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

export const Honey = (p: P) => (
  <S {...p}>
    <path d="M14 18h20v18a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6z" fill="#FFB52E" {...st} />
    <rect x="12" y="12" width="24" height="7" rx="3" fill="#F6E3B4" {...st} />
    <path d="M18 8h12" {...st} /><path d="M19 27q5 4 10 0" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M18 24v4M30 25v3" stroke="#fff" strokeOpacity=".6" strokeWidth="2.4" strokeLinecap="round" />
  </S>
);
export const Stump = (p: P) => (
  <S {...p}>
    <path d="M9 18v16c0 4 7 7 15 7s15-3 15-7V18" fill="#A5703A" {...st} />
    <ellipse cx="24" cy="18" rx="15" ry="7" fill="#E8C48A" {...st} />
    <ellipse cx="24" cy="18" rx="8" ry="3.6" fill="none" stroke="#B98342" strokeWidth="2" /><ellipse cx="24" cy="18" rx="3" ry="1.2" fill="none" stroke="#B98342" strokeWidth="2" />
  </S>
);
export const Berries = (p: P) => (
  <S {...p}>
    <circle cx="17" cy="30" r="8" fill="#5B5BC8" {...st} /><circle cx="31" cy="30" r="8" fill="#6A6AD8" {...st} /><circle cx="24" cy="19" r="8" fill="#4E4EB8" {...st} />
    <path d="M24 11q2-6 8-6" fill="none" stroke="#2D7A3A" strokeWidth="3" strokeLinecap="round" /><path d="M20 15q-6-2-8 3q5 1 8-3z" fill="#3F9B4D" {...st} />
    <circle cx="14.5" cy="27.5" r="1.8" fill="#fff" opacity=".7" /><circle cx="28.5" cy="27.5" r="1.8" fill="#fff" opacity=".7" />
  </S>
);
export const Cone = (p: P) => (
  <S {...p}>
    <path d="M24 5c9 4 14 14 12 24-1.5 8-6 14-12 14S13.500 37 12 29C10 19 15 9 24 5z" fill="#B07A43" {...st} />
    <path d="M14 17q10 5 20 0M12.500 25q11.500 6 23 0M14 33q10 5 20 0" fill="none" stroke="#7D4F27" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M24 5v-2" {...st} />
  </S>
);
export const Gift = (p: P) => (
  <S {...p}>
    <rect x="8" y="20" width="32" height="20" rx="3" fill="#E0605A" {...st} /><rect x="6" y="14" width="36" height="9" rx="3" fill="#F07A6E" {...st} />
    <path d="M24 14v26" stroke="#FFD369" strokeWidth="5" /><path d="M24 14c-4-9-12-7-9-2s9 2 9 2zM24 14c4-9 12-7 9-2s-9 2-9 2z" fill="#FFD369" {...st} />
  </S>
);
export const Paw = (p: P) => (
  <S {...p}>
    <g fill="currentColor"><ellipse cx="24" cy="31" rx="10" ry="8.500" /><ellipse cx="11" cy="21" rx="4.200" ry="5.400" transform="rotate(-18 11 21)" /><ellipse cx="19" cy="11.500" rx="4.200" ry="5.600" /><ellipse cx="29" cy="11.500" rx="4.200" ry="5.600" /><ellipse cx="37" cy="21" rx="4.200" ry="5.400" transform="rotate(18 37 21)" /></g>
  </S>
);
export const Flame = (p: P) => (
  <S {...p}>
    <path d="M24 4c2 8 12 12 12 24a12 12 0 0 1-24 0c0-5 3-8 5-11 1 3 3 4 4 4 0-6-1-11 3-17z" fill="#FF8A1F" stroke="#C25A00" strokeWidth="2.200" strokeLinejoin="round" />
    <path d="M24 22c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 3-5 4-8 1 1 2 1 2-3z" fill="#FFD369" />
  </S>
);
export const LessonIcons = [Honey, Stump, Berries, Cone, Gift];
