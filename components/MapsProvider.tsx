'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import * as api from '@/lib/maps';
import type { UserMap } from '@/lib/maps';
import type { EnrichedPoi } from '@/lib/pois';

interface MapsValue {
  maps: UserMap[];
  pending: boolean;
  /** Ids of the maps a given place is already saved in. */
  mapsHolding: (poiId: string) => number[];
  createMap: (title: string, icon?: string) => Promise<UserMap>;
  deleteMap: (mapId: number) => Promise<void>;
  savePoi: (mapId: number, poi: EnrichedPoi) => Promise<void>;
  removePoi: (mapId: number, poiId: string) => Promise<void>;
}

const MapsContext = createContext<MapsValue | null>(null);

/**
 * Holds the signed-in user's maps.
 *
 * Every mutation replaces the map it touched with the record the back-end
 * returns, so the saved-place lists stay exactly what the server stored
 * rather than a guess made here.
 *
 * @param props - The subtree that gets access to the maps.
 * @returns The provider.
 */
export default function MapsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [maps, setMaps] = useState<UserMap[]>([]);
  const [pending, setPending] = useState(false);

  // State is settled from callbacks rather than the effect body: React
  // rejects a synchronous setState there, and neither loading the maps nor
  // dropping them on sign-out has a deadline.
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      queueMicrotask(() => {
        if (!cancelled) {
          setMaps([]);
          setPending(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    queueMicrotask(() => {
      if (!cancelled) {
        setPending(true);
      }
    });
    api
      .listMaps()
      .then(loaded => {
        if (!cancelled) {
          setMaps(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMaps([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPending(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const replace = useCallback((updated: UserMap) => {
    setMaps(current => current.map(map => (map.id === updated.id ? updated : map)));
  }, []);

  const createMap = useCallback(async (title: string, icon?: string) => {
    const created = await api.createMap(title, icon);
    setMaps(current => [...current, { ...created, pois: created.pois ?? [] }]);
    return created;
  }, []);

  const deleteMap = useCallback(async (mapId: number) => {
    await api.deleteMap(mapId);
    setMaps(current => current.filter(map => map.id !== mapId));
  }, []);

  const savePoi = useCallback(
    async (mapId: number, poi: EnrichedPoi) => {
      replace(await api.addPoiToMap(mapId, poi));
    },
    [replace],
  );

  const removePoi = useCallback(async (mapId: number, poiId: string) => {
    await api.removePoiFromMap(mapId, poiId);
    setMaps(current =>
      current.map(map =>
        map.id === mapId ? { ...map, pois: map.pois.filter(p => p.place_id !== poiId) } : map,
      ),
    );
  }, []);

  const mapsHolding = useCallback(
    (poiId: string) =>
      maps.filter(map => map.pois.some(poi => poi.place_id === poiId)).map(map => map.id),
    [maps],
  );

  const value = useMemo<MapsValue>(
    () => ({ maps, pending, mapsHolding, createMap, deleteMap, savePoi, removePoi }),
    [maps, pending, mapsHolding, createMap, deleteMap, savePoi, removePoi],
  );

  return <MapsContext.Provider value={value}>{children}</MapsContext.Provider>;
}

/**
 * Reads the maps context.
 *
 * @returns The user's maps and the actions on them.
 */
export function useMaps(): MapsValue {
  const value = useContext(MapsContext);
  if (!value) {
    throw new Error('useMaps must be used inside a MapsProvider');
  }
  return value;
}
