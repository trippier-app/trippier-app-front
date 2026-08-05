'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { useCircleTransition } from '@/components/CircleTransition';
import { useI18n, useT } from '@/components/I18nProvider';
import { useMaps } from '@/components/MapsProvider';
import { Check, Layers, Plus, X } from '@/components/icons';
import { cn } from '@/lib/cn';
import { poiKey, type EnrichedPoi } from '@/lib/pois';

const SHEET_EASE = [0.4, 0, 0.2, 1] as const;

/**
 * Sheet listing the user's maps so a place can be saved into one — or into a
 * map created on the spot, since the first place someone saves is usually the
 * reason they want a map at all.
 *
 * @param props - The place to save and the dismiss callback.
 * @returns The sheet.
 */
export default function SaveToMapSheet({
  poi,
  onClose,
}: {
  poi: EnrichedPoi;
  onClose: () => void;
}) {
  const t = useT();
  const { locale } = useI18n();
  const { user } = useAuth();
  const { navigate } = useCircleTransition();
  const { maps, mapsHolding, createMap, savePoi, removePoi } = useMaps();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [busyId, setBusyId] = useState<number | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const holding = new Set(mapsHolding(poiKey(poi)));

  const toggle = async (mapId: number) => {
    setBusyId(mapId);
    setError(null);
    try {
      if (holding.has(mapId)) {
        await removePoi(mapId, poiKey(poi));
      } else {
        await savePoi(mapId, poi);
      }
    } catch {
      setError(t('maps_error'));
    } finally {
      setBusyId(null);
    }
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = title.trim();
    if (!name) {
      return;
    }
    setBusyId('new');
    setError(null);
    try {
      const created = await createMap(name);
      await savePoi(created.id, poi);
      setTitle('');
      setCreating(false);
    } catch {
      setError(t('maps_error'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-end justify-center bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}>
      <motion.section
        aria-label={t('maps_save_to')}
        onClick={event => event.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: SHEET_EASE }}
        className="bg-surface shadow-e3 flex max-h-[80%] w-full flex-col overflow-hidden rounded-t-xl sm:mb-3 sm:max-w-md sm:rounded-xl">
        <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2 className="text-ink text-[19px] font-bold tracking-tight">{t('maps_save_to')}</h2>
          <button
            type="button"
            aria-label={t('maps_close')}
            onClick={onClose}
            className="text-mute hover:text-ink flex size-8 items-center justify-center">
            <X size={17} />
          </button>
        </header>

        {user ? (
          <>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-2">
              {maps.length === 0 && !creating ? (
                <p className="text-mute px-3 py-6 text-center font-mono text-[12.5px]">
                  {t('maps_empty')}
                </p>
              ) : null}

              {maps.map(map => {
                const saved = holding.has(map.id);
                return (
                  <button
                    key={map.id}
                    type="button"
                    onClick={() => toggle(map.id)}
                    disabled={busyId !== null}
                    aria-pressed={saved}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors disabled:opacity-60',
                      saved ? 'bg-emerald-soft' : 'hover:bg-surface2',
                    )}>
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-md text-[15px]',
                        saved ? 'bg-emerald text-on-emerald' : 'bg-surface2 text-emerald-deep',
                      )}>
                      {map.icon || <Layers size={16} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-ink block truncate text-[14.5px] font-semibold tracking-tight">
                        {map.title}
                      </span>
                      <span className="text-mute block font-mono text-[11.5px]">
                        {t(map.pois.length === 1 ? 'maps_count_one' : 'maps_count', {
                          count: new Intl.NumberFormat(locale).format(map.pois.length),
                        })}
                      </span>
                    </span>
                    {saved ? <Check size={17} className="text-emerald-deep shrink-0" /> : null}
                  </button>
                );
              })}

              {creating ? (
                <form onSubmit={create} className="flex flex-col gap-2 px-3 py-3">
                  <label className="text-ink2 text-[12.5px] font-semibold" htmlFor="new-map-title">
                    {t('maps_name_label')}
                  </label>
                  <input
                    id="new-map-title"
                    value={title}
                    onChange={event => setTitle(event.target.value)}
                    placeholder={t('maps_name_placeholder')}
                    autoFocus
                    className="border-line bg-surface2 text-ink focus:border-emerald rounded-md border px-3 py-2.5 text-[14.5px] outline-none"
                  />
                  <div className="mt-1 flex gap-2">
                    <button
                      type="submit"
                      disabled={busyId !== null || !title.trim()}
                      className="bg-emerald text-on-emerald flex-1 rounded-pill py-2.5 text-[13.5px] font-semibold disabled:opacity-50">
                      {t('maps_create')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreating(false);
                        setTitle('');
                      }}
                      className="text-ink2 hover:bg-surface2 rounded-pill px-4 py-2.5 text-[13.5px] font-semibold">
                      {t('maps_cancel')}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="px-5 pb-2 font-mono text-[12px] text-red-600">
                {error}
              </p>
            ) : null}

            {creating ? null : (
              <div className="border-line border-t p-3">
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="text-emerald-deep hover:bg-surface2 flex w-full items-center justify-center gap-2 rounded-pill py-2.5 text-[14px] font-semibold">
                  <Plus size={16} />
                  {t('maps_new')}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-3 px-5 pt-2 pb-6">
            <p className="text-mute font-mono text-[12.5px]">{t('maps_sign_in_first')}</p>
            <button
              type="button"
              onClick={event => {
                const rect = event.currentTarget.getBoundingClientRect();
                onClose();
                navigate('/login', {
                  origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
                  tone: 'black',
                });
              }}
              className="bg-emerald text-on-emerald rounded-pill py-3 text-[14.5px] font-semibold">
              {t('account_sign_in')}
            </button>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}

/**
 * Wraps the sheet in its presence animation.
 *
 * @param props - The place to save, whether the sheet is open, and the
 *   dismiss callback.
 * @returns The animated sheet.
 */
export function SaveToMapSheetHost({
  poi,
  open,
  onClose,
}: {
  poi: EnrichedPoi;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? <SaveToMapSheet poi={poi} onClose={onClose} /> : null}
    </AnimatePresence>
  );
}
