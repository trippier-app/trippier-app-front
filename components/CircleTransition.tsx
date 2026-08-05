'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface Origin {
  x: number;
  y: number;
}

/** Disc colour — match the destination's background so the reveal is seamless. */
type Tone = 'black' | 'white';

/**
 * How a route change is masked. `circle` sweeps a disc over everything, for a
 * jump to a screen that shares nothing with this one. `fade` masks nothing and
 * lets both screens play their own part, for a move between two screens built
 * on the same map.
 */
export type TransitionMode = 'circle' | 'fade';

interface NavigateOptions {
  origin?: Origin;
  tone?: Tone;
  mode?: TransitionMode;
}

interface TransitionValue {
  navigate: (href: string, options?: NavigateOptions) => void;
  /** Where the current transition stands, so screens can play their part. */
  phase: Phase;
  mode: TransitionMode;
}

const TransitionContext = createContext<TransitionValue | null>(null);

type Phase = 'idle' | 'covering' | 'revealing';

const COVER_MS = 420;
/** Time the leaving screen gets to fade out and pull its camera back. */
const FADE_MS = 360;
const REVEAL_MS = 480;
const EASE = [0.4, 0, 0.2, 1] as const;

/**
 * Radius that reaches the farthest viewport corner from a point, so the disc
 * is guaranteed to cover the screen whatever the origin.
 *
 * @param origin - Centre of the disc, in viewport coordinates.
 * @returns The covering radius in pixels.
 */
function coveringRadius({ x, y }: Origin): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return Math.max(
    Math.hypot(x, y),
    Math.hypot(w - x, y),
    Math.hypot(x, h - y),
    Math.hypot(w - x, h - y),
  );
}

/**
 * Provides a route change masked by an expanding black disc.
 *
 * The disc has to outlive the navigation, so it lives above the router
 * outlet: it finishes closing, the route changes underneath, and it opens
 * again on the destination once that has painted.
 *
 * @param props - The subtree the transition covers.
 * @returns The provider and its overlay.
 */
export default function CircleTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const [origin, setOrigin] = useState<Origin>({ x: 0, y: 0 });
  const [radius, setRadius] = useState(0);
  const [tone, setTone] = useState<Tone>('black');
  const [mode, setMode] = useState<TransitionMode>('circle');
  const targetPath = useRef<string | null>(null);

  const navigate = useCallback(
    (href: string, options?: NavigateOptions) => {
      if (href === pathname) {
        return;
      }
      const point = options?.origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      targetPath.current = href;
      setOrigin(point);
      setRadius(coveringRadius(point));
      setTone(options?.tone ?? 'black');
      const nextMode = options?.mode ?? 'circle';
      setMode(nextMode);
      setPhase('covering');
      window.setTimeout(() => router.push(href), nextMode === 'fade' ? FADE_MS : COVER_MS);
    },
    [pathname, router],
  );

  // The destination has painted when the pathname catches up with the target;
  // that is the cue to peel the disc back.
  useEffect(() => {
    if (phase === 'covering' && targetPath.current === pathname) {
      targetPath.current = null;
      setPhase('revealing');
    }
  }, [pathname, phase]);

  // Kept apart from the effect above: putting the timer there would let the
  // state change it triggers re-run the effect, whose cleanup would cancel
  // the timer — the overlay would then hang open and swallow every click.
  useEffect(() => {
    if (phase !== 'revealing') {
      return;
    }
    const timer = window.setTimeout(() => setPhase('idle'), REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const value = useMemo<TransitionValue>(
    () => ({ navigate, phase, mode }),
    [navigate, phase, mode],
  );

  return (
    <TransitionContext.Provider value={value}>
      {children}
      {phase === 'idle' || mode === 'fade' ? null : (
        <div
          // Only the closing disc swallows clicks; while it peels back the
          // destination is already there and must answer straight away.
          className={cn(
            'fixed inset-0 z-[100] overflow-hidden',
            phase === 'covering' ? 'pointer-events-auto' : 'pointer-events-none',
          )}
          aria-hidden>
          <motion.span
            className={cn('absolute rounded-pill', tone === 'white' ? 'bg-white' : 'bg-black')}
            style={{
              left: origin.x,
              top: origin.y,
              width: radius * 2,
              height: radius * 2,
              x: '-50%',
              y: '-50%',
            }}
            initial={{ scale: phase === 'covering' ? 0 : 1 }}
            animate={{ scale: phase === 'covering' ? 1 : 0 }}
            transition={{
              duration: (phase === 'covering' ? COVER_MS : REVEAL_MS) / 1000,
              ease: EASE,
            }}
          />
        </div>
      )}
    </TransitionContext.Provider>
  );
}

/**
 * Reads the transition context.
 *
 * @returns The masked-navigation helper.
 */
export function useCircleTransition(): TransitionValue {
  const value = useContext(TransitionContext);
  if (!value) {
    throw new Error('useCircleTransition must be used inside a CircleTransition');
  }
  return value;
}
