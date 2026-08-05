'use client';

import { useI18n } from '@/components/I18nProvider';
import { cn } from '@/lib/cn';
import { providerLabel } from '@/lib/poiSources';
import type { PoiProvider } from '@/lib/pois';

interface SourceChipsProps {
  /** Providers the current stream is still waiting on. */
  pending: string[];
  /** Providers that gave up, kept on screen so a thin list is explainable. */
  failed: string[];
}

/**
 * Row of chips naming the sources behind the list as they report in.
 *
 * A streamed search paints its first frame in under a second and keeps
 * revising for another twenty, which reads as an unfinished list unless the
 * missing sources are named. Each pending source pulses until it lands, then
 * leaves the row; one that times out stays, greyed, so the user can tell a
 * quiet area from a source that is down.
 *
 * @param props - The pending and failed provider ids of the latest frame.
 * @returns The chip row, or nothing when every source has reported.
 */
export default function SourceChips({ pending, failed }: SourceChipsProps) {
  const { t } = useI18n();
  if (pending.length === 0 && failed.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-label={t('sources_group')}
      className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-4 pb-2.5">
      <span className="text-mute shrink-0 font-mono text-[11px]">
        {pending.length > 0 ? t('sources_waiting_label') : t('sources_failed_label')}
      </span>
      {pending.map(provider => (
        <SourceChip key={provider} provider={provider} />
      ))}
      {failed.map(provider => (
        <SourceChip key={provider} provider={provider} failed />
      ))}
    </div>
  );
}

interface SourceChipProps {
  provider: string;
  failed?: boolean;
}

/**
 * One source chip: a dot carrying the state and the provider's name.
 *
 * @param props - The provider id and whether it gave up.
 * @returns The chip.
 */
function SourceChip({ provider, failed }: SourceChipProps) {
  const { t } = useI18n();
  const label = providerLabel(provider as PoiProvider);
  return (
    <span
      title={
        failed ? t('sources_failed', { source: label }) : t('sources_waiting', { source: label })
      }
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-pill px-2.5 py-1 font-mono text-[11px] whitespace-nowrap',
        failed ? 'bg-surface3/60 text-mute2' : 'bg-surface3 text-ink2 md:bg-surface',
      )}>
      <span
        className={cn(
          'size-1.5 rounded-pill',
          failed ? 'bg-mute2' : 'bg-emerald animate-pulse motion-reduce:animate-none',
        )}
      />
      {label}
    </span>
  );
}
