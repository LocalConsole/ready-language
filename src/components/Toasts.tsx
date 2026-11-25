import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUI } from '@/store/ui';
import { registerConfetti } from '@/lib/fx';

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((x) => (
          <motion.div key={x.id} className="toast" role="status" initial={{ opacity: 0, y: -12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}>
            {x.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function ConfettiCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    registerConfetti(ref.current);
    return () => registerConfetti(null);
  }, []);
  return <canvas id="confetti" ref={ref} aria-hidden="true" />;
}
