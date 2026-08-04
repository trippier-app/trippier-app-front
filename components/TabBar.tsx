'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Compass, Grid, Route, User, Users, type IconProps } from '@/components/icons';

interface TabConfig {
  href: string;
  label: string;
  Icon: (props: IconProps) => React.ReactElement;
  labelWidth: number;
}

/** The five destinations, in the same order as the mobile tab navigator. */
const TABS: TabConfig[] = [
  { href: '/discover', label: 'Discover', Icon: Compass, labelWidth: 64 },
  { href: '/plan', label: 'Plan', Icon: Route, labelWidth: 30 },
  { href: '/friends', label: 'Friends', Icon: Users, labelWidth: 52 },
  { href: '/tools', label: 'Tools', Icon: Grid, labelWidth: 36 },
  { href: '/you', label: 'You', Icon: User, labelWidth: 26 },
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
 * The bar's content width is constant ({@link BAR_CONTENT_WIDTH}); the gap
 * between cells expands to absorb the difference between the active label and
 * the widest one, so the bar itself never resizes as tabs change.
 *
 * @param activeIdx - Index of the active tab, or -1 when none matches.
 * @returns Per-cell layout entries, in {@link TABS} order.
 */
function computeLayout(activeIdx: number): CellLayout[] {
  const activeW = activeIdx >= 0 ? activeWidthFor(TABS[activeIdx]) : INACTIVE_WIDTH;
  const slots = TABS.length - 1;
  const gap = (BAR_CONTENT_WIDTH - activeW - slots * INACTIVE_WIDTH) / slots;
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
  const pathname = usePathname();
  const activeIdx = TABS.findIndex(
    tab => pathname === tab.href || pathname.startsWith(`${tab.href}/`),
  );
  const cells = useMemo(() => computeLayout(activeIdx), [activeIdx]);

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center"
      style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + ${BOTTOM_OFFSET}px)` }}>
      <ul
        className="bg-surface shadow-e2 pointer-events-auto relative rounded-pill"
        style={{ width: BAR_TOTAL_WIDTH, height: BAR_HEIGHT }}>
        {activeIdx >= 0 ? (
          <motion.li
            aria-hidden
            className="bg-emerald absolute rounded-pill"
            style={{ left: BAR_PADDING, top: BAR_PADDING, height: PILL_HEIGHT }}
            animate={{ x: cells[activeIdx].left, width: cells[activeIdx].width }}
            transition={SPRING}
          />
        ) : null}

        {TABS.map(({ href, label, Icon, labelWidth }, index) => {
          const active = index === activeIdx;
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
