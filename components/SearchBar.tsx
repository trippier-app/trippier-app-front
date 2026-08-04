'use client';

import { cn } from '@/lib/cn';

interface SearchBarProps {
  value: string;
  onValueChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}

/**
 * Floating pill search field, ported from the mobile app's `Search`.
 *
 * The leading slot is a fixed 42px box flush against the pill's left cap:
 * with the bar at SEARCH_X from the stage edges (top SEARCH_TOP), the slot's
 * footprint is exactly the one the POI detail screen's back button occupies, so
 * the two back arrows superpose perfectly across screens. Every dimension on
 * that path is in plain px — rem-based utilities would drift against the
 * button's px offsets whenever the root font size isn't 16px. Kept in
 * lockstep with PoiDetailScreen's HEADER_BTN geometry.
 *
 * @param props - Controlled value, change handler and optional slot content.
 * @returns The search bar.
 */
export default function SearchBar({
  value,
  onValueChange,
  onFocus,
  placeholder = 'Discover new places',
  leading,
  trailing,
  className,
}: SearchBarProps) {
  return (
    <div
      className={cn(
        'bg-surface shadow-e2 flex h-[52px] items-center gap-2 rounded-pill pr-2',
        className,
      )}>
      <span className="text-ink flex size-[42px] shrink-0 items-center justify-center">
        {leading}
      </span>
      <input
        type="search"
        value={value}
        onChange={event => onValueChange(event.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        aria-label={placeholder}
        className="text-ink placeholder:text-mute min-w-0 flex-1 bg-transparent text-[15px] outline-none"
      />
      {trailing ? <span className="flex shrink-0 items-center">{trailing}</span> : null}
    </div>
  );
}
