'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '@/components/I18nProvider';
import { Check, X } from '@/components/icons';
import { cn } from '@/lib/cn';
import { readCountryStats, type CountryStats, type CountryVisit } from '@/lib/social';

const EASE = [0.4, 0, 0.2, 1] as const;

/** The three positions of the switch, in the order they are offered. */
const STATES: (CountryVisit | null)[] = [null, 'WANT', 'DONE'];

const LABEL_KEY = {
  null: 'country_state_none',
  WANT: 'country_state_want',
  DONE: 'country_state_done',
} as const;

interface CountrySheetProps {
  code: string;
  name: string;
  /** What the signed-in user holds it at, or null when unflagged. */
  status: CountryVisit | null;
  onChange: (status: CountryVisit | null) => void;
  onClose: () => void;
}

/**
 * The sheet a country opens into: its name, how many people put it in each
 * state, and the switch moving the reader's own flag between them.
 *
 * The counters are read fresh each time the sheet opens and again after a
 * change, so the number the reader sees always includes their own vote.
 *
 * @param props - The country, the reader's flag and the two handlers.
 * @returns The country sheet.
 */
export default function CountrySheet({ code, name, status, onChange, onClose }: CountrySheetProps) {
  const t = useT();
  const [loaded, setLoaded] = useState<{ key: string; stats: CountryStats } | null>(null);
  const key = `${code}:${status ?? 'none'}`;

  useEffect(() => {
    let cancelled = false;
    readCountryStats(code)
      .then(found => {
        if (!cancelled) {
          setLoaded({ key, stats: found });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [code, key]);

  const stats = loaded?.key === key ? loaded.stats : null;

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-label={name}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.22, ease: EASE }}
        className="bg-surface shadow-e3 pointer-events-auto absolute inset-x-3 bottom-3 z-30 rounded-xl p-4">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-ink truncate text-[19px] font-bold tracking-tight">{name}</h2>
            <p className="text-mute mt-0.5 font-mono text-[11px]">{code}</p>
          </div>
          <button
            type="button"
            aria-label={t('country_close')}
            onClick={onClose}
            className="bg-surface2 text-ink2 hover:bg-surface3 flex size-8 shrink-0 items-center justify-center rounded-pill transition-colors">
            <X size={14} />
          </button>
        </header>

        <dl className="mt-3 flex gap-2">
          <Counter
            tone="done"
            value={stats?.done}
            label={t('country_marked_done')}
            pending={stats === null}
          />
          <Counter
            tone="want"
            value={stats?.want}
            label={t('country_marked_want')}
            pending={stats === null}
          />
        </dl>

        <div
          role="radiogroup"
          aria-label={t('country_state_label')}
          className="bg-surface2 mt-3 flex gap-1 rounded-pill p-1">
          {STATES.map(state => {
            const active = status === state;
            return (
              <button
                key={String(state)}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(state)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-pill py-2 text-[13px] font-semibold tracking-tight transition-colors',
                  active
                    ? state === 'DONE'
                      ? 'bg-emerald text-on-emerald'
                      : state === 'WANT'
                        ? 'bg-[#e8833a] text-white'
                        : 'bg-surface text-ink shadow-e1'
                    : 'text-mute hover:text-ink',
                )}>
                {active ? <Check size={12} /> : null}
                {t(LABEL_KEY[String(state) as keyof typeof LABEL_KEY])}
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * One of the two counters, tinted like the hatching it stands for.
 *
 * @param props - Which state it counts, the count and its label.
 * @returns The counter.
 */
function Counter({
  tone,
  value,
  label,
  pending,
}: {
  tone: 'done' | 'want';
  value: number | undefined;
  label: string;
  pending: boolean;
}) {
  return (
    <div className="bg-surface2 flex flex-1 flex-col gap-1 rounded-lg px-3 py-2.5">
      <span
        className={cn('h-1 w-6 rounded-pill', tone === 'done' ? 'bg-emerald' : 'bg-[#e8833a]')}
      />
      <dd className="text-ink text-[20px] font-bold tracking-tight">
        {pending ? '·' : (value ?? 0)}
      </dd>
      <dt className="text-mute font-mono text-[10.5px] leading-tight">{label}</dt>
    </div>
  );
}
