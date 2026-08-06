'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/components/I18nProvider';
import { Layers, MapPin, User } from '@/components/icons';
import { listSharedMatches, type SharedMatch } from '@/lib/social';

/**
 * The people holding places the signed-in user also saved.
 *
 * A match only surfaces when the map carrying the shared place is one the
 * caller may see, so the filtering is the back-end's and this only paints
 * whatever survives it.
 *
 * @param props - Handler opening a matched user's public page.
 * @returns The shared-places section.
 */
export default function SharedMatches({ onOpenUser }: { onOpenUser: (userId: number) => void }) {
  const t = useT();
  const [matches, setMatches] = useState<SharedMatch[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listSharedMatches()
      .then(found => {
        if (!cancelled) {
          setMatches(found);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mt-2">
      <h2 className="text-ink px-1 text-[17px] font-bold tracking-tight">
        {t('shared_title')}
        <span className="bg-emerald ml-1 inline-block size-1.5 rounded-pill align-middle" />
      </h2>
      <p className="text-mute mt-1 px-1 font-mono text-[11.5px]">{t('shared_caption')}</p>

      <div className="mt-3 flex flex-col gap-2">
        {matches === null && !failed ? (
          <p className="text-mute px-1 font-mono text-[12px]">{t('shared_loading')}</p>
        ) : null}

        {failed ? (
          <p className="text-mute px-1 font-mono text-[12px]">{t('shared_error')}</p>
        ) : null}

        {matches?.length === 0 ? (
          <p className="text-mute px-1 font-mono text-[12px]">{t('shared_empty')}</p>
        ) : null}

        {matches?.map(match => (
          <button
            key={match.user.id}
            type="button"
            onClick={() => onOpenUser(match.user.id)}
            className="bg-surface shadow-e1 hover:bg-surface2 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-start transition-colors">
            <span className="bg-emerald-soft text-emerald-deep flex size-9 shrink-0 items-center justify-center rounded-pill text-[13px] font-bold">
              {match.user.name ? match.user.name.charAt(0).toUpperCase() : <User size={16} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-ink block truncate text-[14px] font-semibold tracking-tight">
                {match.user.name ?? t('shared_unnamed')}
              </span>
              <span className="text-mute mt-0.5 flex items-center gap-2.5 font-mono text-[11px]">
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {t(match.sharedPoiCount === 1 ? 'shared_places_one' : 'shared_places', {
                    count: match.sharedPoiCount,
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Layers size={11} />
                  {t(match.maps.length === 1 ? 'shared_maps_one' : 'shared_maps', {
                    count: match.maps.length,
                  })}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
