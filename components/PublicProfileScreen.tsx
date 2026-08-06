'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CountryMap from '@/components/CountryMap';
import { MapCorners } from '@/components/MapView';
import { useI18n, useT } from '@/components/I18nProvider';
import { ArrowLeft, Layers, User } from '@/components/icons';
import { cn } from '@/lib/cn';
import {
  follow,
  readPublicProfile,
  unfollow,
  type MapVisibility,
  type PublicProfile,
} from '@/lib/social';

const TABBAR_RESERVED = 88;
const FRAME = 12;
const PANEL_FRACTION = 1 / 3;
const WIDE_MQ = '(min-width: 768px)';

/** Which label names each state a map can be exposed in. */
const VISIBILITY_KEY: Record<
  MapVisibility,
  'visibility_public' | 'visibility_friends' | 'visibility_selected' | 'visibility_private'
> = {
  PUBLIC: 'visibility_public',
  FRIENDS: 'visibility_friends',
  SELECTED: 'visibility_selected',
  PRIVATE: 'visibility_private',
};

/**
 * Another user's page: their country map and whichever of their maps the
 * signed-in reader is allowed to see.
 *
 * Nothing here decides what is visible — the back-end already dropped what
 * the reader may not have, so an empty map list means exactly that.
 *
 * @param props - The user being looked at and the resolved map style.
 * @returns The public profile screen.
 */
export default function PublicProfileScreen({
  userId,
  mapStyleUrl,
  countriesUrl,
}: {
  userId: number;
  mapStyleUrl: string | null;
  countriesUrl: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const { locale } = useI18n();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(WIDE_MQ);
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    readPublicProfile(userId)
      .then(found => {
        if (!cancelled) {
          setProfile(found);
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
  }, [userId]);

  const toggleFollow = useCallback(async () => {
    if (!profile?.relationship) {
      return;
    }
    setBusy(true);
    try {
      const relationship = profile.relationship.following
        ? await unfollow(userId)
        : await follow(userId);
      setProfile(current => (current ? { ...current, relationship } : current));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [profile, userId]);

  if (failed) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-mute font-mono text-[12.5px]">{t('public_profile_error')}</p>
      </section>
    );
  }

  if (!profile) {
    return <div className="h-full" />;
  }

  const memberSince = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(profile.user.createdAt));

  const mapBox = wide
    ? {
        top: FRAME,
        bottom: FRAME,
        right: FRAME,
        left: `calc(${PANEL_FRACTION * 100}% + ${2 * FRAME}px)`,
      }
    : undefined;

  const doneCount = profile.countries.filter(country => country.status === 'DONE').length;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {wide ? (
        <>
          <div className="absolute overflow-hidden" style={mapBox}>
            <CountryMap
              styleUrl={mapStyleUrl}
              countriesUrl={countriesUrl}
              statuses={profile.countries}
            />
            <MapCorners />
          </div>
          <div
            aria-hidden
            className="shadow-e1 pointer-events-none absolute rounded-xl"
            style={mapBox}
          />
        </>
      ) : (
        <div className="absolute inset-x-0 top-0 h-[42%]">
          <CountryMap
            styleUrl={mapStyleUrl}
            countriesUrl={countriesUrl}
            statuses={profile.countries}
          />
        </div>
      )}

      <section
        aria-label={profile.user.name ?? t('shared_unnamed')}
        className={cn(
          'no-scrollbar absolute z-20 overflow-y-auto',
          wide ? 'bg-surface2 shadow-e2 rounded-xl' : 'inset-x-0 bottom-0 top-[42%]',
        )}
        style={
          wide
            ? { top: FRAME, bottom: FRAME, left: FRAME, width: `${PANEL_FRACTION * 100}%` }
            : undefined
        }>
        <div className="flex flex-col gap-3 px-3 pt-4" style={{ paddingBottom: TABBAR_RESERVED }}>
          <button
            type="button"
            aria-label={t('public_profile_back')}
            onClick={() => router.back()}
            className="bg-surface shadow-e1 text-ink hover:bg-surface3 flex size-9 items-center justify-center rounded-pill transition-colors">
            <ArrowLeft size={18} />
          </button>

          <header className="bg-surface shadow-e1 flex items-center gap-4 rounded-xl p-5">
            <span className="bg-emerald text-on-emerald flex size-14 shrink-0 items-center justify-center rounded-pill text-[20px] font-bold">
              {profile.user.name ? profile.user.name.charAt(0).toUpperCase() : <User size={22} />}
            </span>
            <div className="min-w-0">
              <h1 className="text-ink truncate text-[22px] font-bold tracking-tight">
                {profile.user.name ?? t('shared_unnamed')}
              </h1>
              <p className="text-mute mt-0.5 truncate font-mono text-[12px]">
                {t('profile_member_since')} {memberSince}
              </p>
            </div>
          </header>

          {profile.relationship ? (
            <button
              type="button"
              onClick={() => void toggleFollow()}
              disabled={busy}
              className={cn(
                'rounded-xl py-3.5 text-[14.5px] font-semibold tracking-[-0.1px] transition-colors disabled:opacity-50',
                profile.relationship.following
                  ? 'bg-surface shadow-e1 text-ink hover:bg-surface2'
                  : 'bg-emerald hover:bg-emerald-deep text-on-emerald',
              )}>
              {profile.relationship.friends
                ? t('follow_friends')
                : profile.relationship.following
                  ? t('follow_stop')
                  : profile.relationship.followedBy
                    ? t('follow_back')
                    : t('follow_start')}
            </button>
          ) : null}

          <div className="bg-surface shadow-e1 flex flex-col gap-1 rounded-xl p-5">
            <span className="bg-emerald h-1.5 w-8 rounded-pill" />
            <span className="text-ink mt-1 text-[26px] font-bold tracking-tight">{doneCount}</span>
            <span className="text-mute font-mono text-[11.5px]">{t('profile_countries_done')}</span>
          </div>

          <section>
            <h2 className="text-ink px-1 text-[17px] font-bold tracking-tight">
              {t('public_profile_maps')}
            </h2>
            <div className="mt-2 flex flex-col gap-2">
              {profile.maps.length === 0 ? (
                <p className="text-mute px-1 font-mono text-[12px]">
                  {t('public_profile_no_maps')}
                </p>
              ) : null}
              {profile.maps.map(map => (
                <div
                  key={map.id}
                  className="bg-surface shadow-e1 flex items-center gap-3 rounded-lg px-3 py-3">
                  <span className="bg-emerald-soft text-emerald-deep flex size-9 shrink-0 items-center justify-center rounded-pill text-[15px]">
                    {map.icon ?? <Layers size={16} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-ink block truncate text-[14px] font-semibold tracking-tight">
                      {map.title}
                    </span>
                    <span className="text-mute mt-0.5 block font-mono text-[11px]">
                      {t(map.poiCount === 1 ? 'shared_places_one' : 'shared_places', {
                        count: map.poiCount,
                      })}{' '}
                      · {t(VISIBILITY_KEY[map.visibility])}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
