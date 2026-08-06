'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useT } from '@/components/I18nProvider';
import { Compass, Grid, Route, User, Users, type IconProps } from '@/components/icons';
import type { Dict } from '@/lib/i18n';

interface TabConfig {
  href: string;
  labelKey: keyof Dict;
  Icon: (props: IconProps) => React.ReactElement;
  labelWidth: number;
}

/** The five destinations, in the same order as the mobile tab navigator. */
const TABS: TabConfig[] = [
  { href: '/discover', labelKey: 'tab_discover', Icon: Compass, labelWidth: 64 },
  { href: '/plan', labelKey: 'tab_plan', Icon: Route, labelWidth: 44 },
  { href: '/friends', labelKey: 'tab_friends', Icon: Users, labelWidth: 56 },
  { href: '/tools', labelKey: 'tab_tools', Icon: Grid, labelWidth: 62 },
  { href: '/you', labelKey: 'tab_you', Icon: User, labelWidth: 46 },
];

const PAD_X = 14;
const ICON_W = 20;
const ICON_GAP = 6;
const PILL_HEIGHT = 44;
const INACTIVE_WIDTH = PAD_X + ICON_W + PAD_X;
const BAR_PADDING = 6;
const MIN_GAP = 4;
/** Clearance between the bar and the bottom edge, on top of any safe area. */
const BOTTOM_OFFSET = 20;
/**
 * Wide-layout geometry, kept in lockstep with DiscoverScreen's FRAME,
 * PANEL_FRACTION and WIDE_MQ: on md+ the bar docks at the bottom of the
 * results panel, taking its full width.
 */
const FRAME = 12;
const PANEL_FRACTION = 1 / 3;
const WIDE_MQ = '(min-width: 48rem)';

/**
 * Width of a cell when it is the active one — icon plus its label.
 *
 * @param config - The tab.
 * @returns The active cell width in pixels.
 */
function activeWidthFor(config: TabConfig): number {
  return PAD_X + ICON_W + ICON_GAP + config.labelWidth + PAD_X;
}

const MAX_ACTIVE_WIDTH = Math.max(...TABS.map(activeWidthFor));
const BAR_CONTENT_WIDTH =
  MAX_ACTIVE_WIDTH + (TABS.length - 1) * INACTIVE_WIDTH + (TABS.length - 1) * MIN_GAP;
const BAR_TOTAL_WIDTH = BAR_CONTENT_WIDTH + 2 * BAR_PADDING;
const BAR_HEIGHT = PILL_HEIGHT + 2 * BAR_PADDING;

const SPRING = { type: 'spring', stiffness: 420, damping: 38 } as const;

interface CellLayout {
  left: number;
  width: number;
}

/**
 * Resolves the position and width of every cell for a given active tab.
 *
 * The gap between cells expands to absorb whatever width the labels leave
 * over, so the bar itself never resizes as tabs change. On mobile the
 * content width is the constant {@link BAR_CONTENT_WIDTH}; on wide layouts
 * it is the measured width of the panel-docked bar.
 *
 * @param activeIdx - Index of the active tab, or -1 when none matches.
 * @param contentWidth - Inner width the cells have to spread across.
 * @returns Per-cell layout entries, in {@link TABS} order.
 */
function computeLayout(activeIdx: number, contentWidth: number): CellLayout[] {
  const activeW = activeIdx >= 0 ? activeWidthFor(TABS[activeIdx]) : INACTIVE_WIDTH;
  const slots = TABS.length - 1;
  const gap = (contentWidth - activeW - slots * INACTIVE_WIDTH) / slots;
  const cells: CellLayout[] = [];
  let x = 0;
  for (let i = 0; i < TABS.length; i++) {
    const width = i === activeIdx ? activeW : INACTIVE_WIDTH;
    cells.push({ left: x, width });
    x += width + gap;
  }
  return cells;
}

/**
 * Subscribes to the tablet/desktop breakpoint; `false` on the server, which
 * only means the first client render after hydration corrects the layout.
 */
function subscribeToWide(onChange: () => void): () => void {
  const query = window.matchMedia(WIDE_MQ);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useIsWide(): boolean {
  return useSyncExternalStore(
    subscribeToWide,
    () => window.matchMedia(WIDE_MQ).matches,
    () => false,
  );
}

/**
 * Floating tab bar with a fixed total width, ported from the mobile app.
 *
 * Cells are absolutely positioned inside the bar: on a tab change they slide
 * to their new positions and the active one expands to fit its label, while
 * the emerald indicator slides and resizes with it. The bar's own footprint is
 * constant, so nothing around it shifts during the animation.
 *
 * @returns The bottom navigation bar.
 */
export default function TabBar() {
  const t = useT();
  const pathname = usePathname();
  const wide = useIsWide();
  const barRef = useRef<HTMLUListElement>(null);
  const [measuredW, setMeasuredW] = useState<number | null>(null);
  const activeIdx = TABS.findIndex(
    tab => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
  );

  // On wide layouts the bar stretches with the panel, so the cell layout has
  // to follow its real width instead of the constant.
  useEffect(() => {
    const bar = barRef.current;
    if (!wide || !bar) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => setMeasuredW(entry.contentRect.width));
    observer.observe(bar);
    return () => observer.disconnect();
  }, [wide]);

  const contentW =
    wide && measuredW !== null
      ? Math.max(BAR_CONTENT_WIDTH, measuredW - 2 * BAR_PADDING)
      : BAR_CONTENT_WIDTH;
  const cells = useMemo(() => computeLayout(activeIdx, contentW), [activeIdx, contentW]);

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed bottom-0 z-30 flex"
      style={
        wide
          ? {
              // Same FRAME gutter inside the panel as the rest of the app's
              // chrome: the bar floats at the list's end, not edge to edge.
              left: 2 * FRAME,
              width: `calc(${PANEL_FRACTION * 100}% - ${2 * FRAME}px)`,
              paddingBottom: 2 * FRAME,
            }
          : {
              left: 0,
              right: 0,
              justifyContent: 'center',
              paddingBottom: `calc(env(safe-area-inset-bottom) + ${BOTTOM_OFFSET}px)`,
            }
      }>
      <ul
        ref={barRef}
        className="bg-surface shadow-e2 pointer-events-auto relative rounded-pill"
        style={{ width: wide ? '100%' : BAR_TOTAL_WIDTH, height: BAR_HEIGHT }}>
        {activeIdx >= 0 ? (
          <motion.li
            aria-hidden
            className="bg-emerald absolute rounded-pill"
            style={{ left: BAR_PADDING, top: BAR_PADDING, height: PILL_HEIGHT }}
            animate={{ x: cells[activeIdx].left, width: cells[activeIdx].width }}
            transition={SPRING}
          />
        ) : null}

        {TABS.map(({ href, labelKey, Icon, labelWidth }, index) => {
          const active = index === activeIdx;
          const label = t(labelKey);
          return (
            <motion.li
              key={href}
              className="absolute"
              style={{ left: BAR_PADDING, top: BAR_PADDING, height: PILL_HEIGHT }}
              animate={{ x: cells[index].left, width: cells[index].width }}
              transition={SPRING}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                className={
                  active
                    ? 'text-on-emerald flex h-full items-center overflow-hidden'
                    : 'text-mute hover:text-ink flex h-full items-center overflow-hidden transition-colors'
                }
                style={{ paddingLeft: PAD_X, gap: ICON_GAP }}>
                <Icon size={ICON_W} stroke={active ? 2.1 : 1.8} className="shrink-0" />
                {/* Keeps its reserved width at all times and is clipped by the
                    cell when inactive, so the icon never gets squeezed. */}
                <motion.span
                  aria-hidden={!active}
                  animate={{ opacity: active ? 1 : 0 }}
                  transition={SPRING}
                  style={{ width: labelWidth }}
                  className="shrink-0 truncate text-[13px] leading-none font-semibold tracking-tight">
                  {label}
                </motion.span>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </nav>
  );
}
