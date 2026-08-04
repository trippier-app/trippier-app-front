'use client';

import {
  Calendar,
  Coffee,
  Compass,
  Crosshair,
  MapPin,
  Moon,
  Star,
  Wallet,
} from '@/components/icons';
import { cn } from '@/lib/cn';
import type { PoiType } from '@/lib/pois';

interface PoiRowProps {
  name: string;
  meta: string;
  type: PoiType;
  distanceMeters?: number;
  selected: boolean;
  onSelect: () => void;
  onZoom?: () => void;
}

/**
 * Icon depicting a POI category on the row thumb. Stays aligned with the map
 * pin glyphs so both readings of a category match.
 *
 * @param props - The POI category and the icon size.
 * @returns The icon for that category.
 */
function PoiTypeIcon({ type, size }: { type: PoiType; size: number }) {
  switch (type) {
    case 'see':
      return <Star size={size} />;
    case 'eat':
    case 'drink':
      return <Coffee size={size} />;
    case 'do':
      return <Compass size={size} />;
    case 'buy':
      return <Wallet size={size} />;
    case 'sleep':
      return <Moon size={size} />;
    case 'event':
      return <Calendar size={size} />;
    default:
      return <MapPin size={size} />;
  }
}

/**
 * Formats a distance for the row's trailing caption.
 *
 * @param meters - Distance from the search center, in metres.
 * @returns A short label such as "420 m" or "1.4 km".
 */
function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

/**
 * One place in the results drawer: category thumb, name, meta line, and a
 * button that flies the camera to it without leaving the list.
 *
 * @param props - The place to render and its callbacks.
 * @returns The row.
 */
export default function PoiRow({
  name,
  meta,
  type,
  distanceMeters,
  selected,
  onSelect,
  onZoom,
}: PoiRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
        selected ? 'bg-emerald-soft' : 'hover:bg-surface3',
      )}>
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="bg-surface2 text-emerald-deep flex size-10 shrink-0 items-center justify-center rounded-md">
          <PoiTypeIcon type={type} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-ink block truncate text-[15px] font-semibold tracking-tight">
            {name}
          </span>
          <span className="text-mute block truncate font-mono text-[11.5px]">
            {meta}
            {distanceMeters !== undefined ? ` · ${formatDistance(distanceMeters)}` : ''}
          </span>
        </span>
      </button>
      {onZoom ? (
        <button
          type="button"
          onClick={onZoom}
          aria-label={`Zoom to ${name}`}
          className="text-ink2 hover:bg-surface3 hover:text-ink flex size-9 shrink-0 items-center justify-center rounded-pill transition-colors">
          <Crosshair size={17} />
        </button>
      ) : null}
    </div>
  );
}
