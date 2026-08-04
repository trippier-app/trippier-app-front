'use client';

import { cn } from '@/lib/cn';

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

/**
 * Filter chip used above the results list, ported from the mobile `Chip`.
 *
 * @param props - Label, active state and the click handler.
 * @returns The chip button.
 */
export default function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-pill px-3.5 py-2 text-[13px] font-semibold tracking-tight transition-colors',
        // Chips live on the white drawer sheet below md and on the surface2
        // side panel above it (the other container is display:none), so the
        // inactive fill flips with the breakpoint to keep its contrast.
        active
          ? 'bg-emerald text-on-emerald'
          : 'bg-surface2 text-ink2 hover:bg-surface3 hover:text-ink md:bg-surface',
      )}>
      {label}
    </button>
  );
}
