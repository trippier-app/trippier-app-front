'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useCircleTransition } from '@/components/CircleTransition';
import CountryMap from '@/components/CountryMap';
import CountrySheet from '@/components/CountrySheet';
import { MapCorners } from '@/components/MapView';
import SharedMatches from '@/components/SharedMatches';
import { useI18n, useT } from '@/components/I18nProvider';
import { Check, LogOut, User } from '@/components/icons';
import { cn } from '@/lib/cn';
import {
  clearCountry,
  listCountries,
  setCountry,
  type CountryStatus,
  type CountryVisit,
} from '@/lib/social';

const TABBAR_RESERVED = 88;
const FRAME = 12;
const PANEL_FRACTION = 1 / 3;
const WIDE_MQ = '(min-width: 768px)';

/**
 * Formats the month an account was opened.
 *
 * @param iso - Creation date as the back-end serialises it.
 * @param locale - Locale to render the month in.
 * @returns A month-and-year string, or null when the date is missing.
 */
function formatMemberSince(iso: string | undefined, locale: string): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

interface ProfileScreenProps {
  /** MapTiler style URL resolved server-side; null when the key is unset. */
  mapStyleUrl: string | null;
  /** TileJSON of the administrative polygons; null when the key is unset. */
  countriesUrl: string | null;
}

/**
 * The account's own screen, laid out like Discover: the details and the
 * people met along the way in the left panel, the country map beside them.
 *
 * Clicking a country frames it and opens its sheet, where the two states are
 * offered as one switch — they are exclusive, so picking one clears the other.
 *
 * @param props - The resolved map style.
 * @returns The profile screen.
 */
export default function ProfileScreen({ mapStyleUrl, countriesUrl }: ProfileScreenProps) {
  const t = useT();
  const router = useRouter();
  const { locale } = useI18n();
  const { user, pending, signOut } = useAuth();
  const { navigate } = useCircleTransition();
  const [countries, setCountries] = useState<CountryStatus[]>([]);
  const [openCountry, setOpenCountry] = useState<{ code: string; name: string } | null>(null);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(WIDE_MQ);
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    let cancelled = false;
    listCountries()
      .then(found => {
        if (!cancelled) {
          setCountries(found);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

  const byCode = useMemo(
    () => new Map(countries.map(country => [country.countryCode, country.status])),
    [countries],
  );

  const changeCountry = useCallback((code: string, target: CountryVisit | null) => {
    setCountries(current => {
      const without = current.filter(country => country.countryCode !== code);
      return target ? [...without, { countryCode: code, status: target }] : without;
    });
    const request = target ? setCountry(code, target) : clearCountry(code);
    request.catch(() => {
      void listCountries()
        .then(setCountries)
        .catch(() => undefined);
    });
  }, []);

  const goToLogin = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    navigate('/login', {
      origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      tone: 'black',
    });
  };

  if (pending) {
    return <div className="h-full" />;
  }

  if (!user) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="bg-emerald-soft text-emerald-deep flex size-16 items-center justify-center rounded-xl">
          <User size={26} />
        </span>
        <h1 className="text-ink text-[26px] font-bold tracking-tight">
          {t('profile_title')}
          <span className="bg-emerald ml-1 inline-block size-1.5 rounded-pill align-middle" />
        </h1>
        <p className="text-mute max-w-xs font-mono text-[12.5px]">
          {t('profile_signed_out_caption')}
        </p>
        <button
          type="button"
          onClick={goToLogin}
          className="bg-emerald hover:bg-emerald-deep text-on-emerald mt-2 rounded-pill px-6 py-3 text-[14.5px] font-semibold tracking-[-0.1px] transition-colors">
          {t('account_sign_in')}
        </button>
      </section>
    );
  }

  const memberSince = formatMemberSince(user.createdAt, locale);
  const doneCount = countries.filter(country => country.status === 'DONE').length;
  const wantCount = countries.length - doneCount;

  const mapBox = wide
    ? {
        top: FRAME,
        bottom: FRAME,
        right: FRAME,
        left: `calc(${PANEL_FRACTION * 100}% + ${2 * FRAME}px)`,
      }
    : undefined;

  const panel = (
    <div className="flex flex-col gap-3">
      <header className="bg-surface shadow-e1 flex items-center gap-4 rounded-xl p-5">
        <span className="bg-emerald text-on-emerald flex size-14 shrink-0 items-center justify-center rounded-pill text-[20px] font-bold">
          {(user.name || user.email).charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="text-ink truncate text-[22px] font-bold tracking-tight">
            {user.name || user.email}
          </h1>
          <p className="text-mute mt-0.5 truncate font-mono text-[12.5px]">{user.email}</p>
        </div>
      </header>

      <div className="flex gap-3">
        <StatCard tone="done" value={doneCount} label={t('profile_countries_done')} />
        <StatCard tone="want" value={wantCount} label={t('profile_countries_want')} />
      </div>

      <dl className="bg-surface shadow-e1 flex flex-col rounded-xl px-5">
        <Row
          label={t('profile_email_status')}
          value={user.verified === false ? t('profile_unverified') : t('profile_verified')}
          good={user.verified !== false}
        />
        {memberSince ? <Row label={t('profile_member_since')} value={memberSince} /> : null}
      </dl>

      <SharedMatches onOpenUser={userId => router.push(`/u/${userId}`)} />

      <button
        type="button"
        onClick={() => void signOut()}
        className="bg-surface shadow-e1 text-ink hover:bg-surface2 mt-1 flex items-center justify-center gap-2 rounded-xl py-4 text-[14.5px] font-semibold tracking-[-0.1px] transition-colors">
        <LogOut size={16} />
        {t('account_sign_out')}
      </button>
    </div>
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      {wide ? (
        <>
          <div className="absolute overflow-hidden" style={mapBox}>
            <CountryMap
              styleUrl={mapStyleUrl}
              countriesUrl={countriesUrl}
              statuses={countries}
              selectedCode={openCountry?.code ?? null}
              onSelect={(code, name) => setOpenCountry({ code, name })}
            />
            <MapCorners />
          </div>
          <div
            aria-hidden
            className="shadow-e1 pointer-events-none absolute rounded-xl"
            style={mapBox}
          />
          {openCountry ? (
            <div className="pointer-events-none absolute z-30" style={mapBox}>
              <CountrySheet
                code={openCountry.code}
                name={openCountry.name}
                status={byCode.get(openCountry.code) ?? null}
                onChange={status => changeCountry(openCountry.code, status)}
                onClose={() => setOpenCountry(null)}
              />
            </div>
          ) : null}
        </>
      ) : (
        <div className="absolute inset-x-0 top-0 h-[42%]">
          {openCountry ? (
            <CountrySheet
              code={openCountry.code}
              name={openCountry.name}
              status={byCode.get(openCountry.code) ?? null}
              onChange={status => changeCountry(openCountry.code, status)}
              onClose={() => setOpenCountry(null)}
            />
          ) : null}
          <CountryMap
            styleUrl={mapStyleUrl}
            countriesUrl={countriesUrl}
            statuses={countries}
            selectedCode={openCountry?.code ?? null}
            onSelect={(code, name) => setOpenCountry({ code, name })}
          />
        </div>
      )}

      <section
        aria-label={t('profile_title')}
        className={cn(
          'no-scrollbar absolute z-20 overflow-y-auto',
          wide ? 'bg-surface2 shadow-e2 rounded-xl' : 'inset-x-0 bottom-0 top-[42%]',
        )}
        style={
          wide
            ? { top: FRAME, bottom: FRAME, left: FRAME, width: `${PANEL_FRACTION * 100}%` }
            : undefined
        }>
        <div className="px-3 pt-4" style={{ paddingBottom: TABBAR_RESERVED }}>
          {panel}
        </div>
      </section>
    </div>
  );
}

/**
 * One of the two country counters, tinted like the hatching it stands for.
 *
 * @param props - Which state it counts, the count and its label.
 * @returns The card.
 */
function StatCard({ tone, value, label }: { tone: 'done' | 'want'; value: number; label: string }) {
  return (
    <div className="bg-surface shadow-e1 flex flex-1 flex-col gap-1 rounded-xl p-5">
      <span
        className={cn('h-1.5 w-8 rounded-pill', tone === 'done' ? 'bg-emerald' : 'bg-[#e8833a]')}
      />
      <span className="text-ink mt-1 text-[26px] font-bold tracking-tight">{value}</span>
      <span className="text-mute font-mono text-[11.5px]">{label}</span>
    </div>
  );
}

/**
 * One label-and-value line of the account detail list.
 *
 * @param props - The label, its value and whether the value reads as good.
 * @returns The row.
 */
function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="border-line flex items-center justify-between gap-4 border-b py-4 last:border-b-0">
      <dt className="text-mute font-mono text-[12px]">{label}</dt>
      <dd className="text-ink flex items-center gap-1.5 text-[13.5px] font-semibold tracking-tight">
        {good ? (
          <span className="bg-emerald-soft text-emerald-deep flex size-4 items-center justify-center rounded-pill">
            <Check size={11} />
          </span>
        ) : null}
        {value}
      </dd>
    </div>
  );
}
