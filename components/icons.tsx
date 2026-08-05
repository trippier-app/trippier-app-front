/**
 * Feather-style icon set, ported 1:1 from the mobile app's
 * `src/components/icons` so both surfaces draw the same glyphs.
 */

export interface IconProps {
  size?: number;
  stroke?: number;
  className?: string;
}

interface BaseIconProps extends IconProps {
  children: React.ReactNode;
}

/**
 * Base wrapper used by every icon — sets the viewBox, stroke geometry and
 * inherits the current text colour.
 *
 * @param props - Size, stroke width, class name and the SVG children.
 * @returns The configured `<svg>` element.
 */
function BaseIcon({ size = 20, stroke = 1.8, className, children }: BaseIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}>
      {children}
    </svg>
  );
}

/** Compass — the Discover tab. */
export function Compass(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx={12} cy={12} r={10} />
      <path d="M16 8l-2 6-6 2 2-6 6-2z" />
    </BaseIcon>
  );
}

/** Route — the Plan tab. */
export function Route(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 19V6a2 2 0 0 1 2-2h7" />
      <path d="M9 4v15" />
      <circle cx={17} cy={7} r={2.6} />
      <path d="M17 12.5V19" />
    </BaseIcon>
  );
}

/** Users — the Friends tab. */
export function Users(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx={9} cy={7} r={4} />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </BaseIcon>
  );
}

/** Grid — the Tools tab. */
export function Grid(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x={4} y={4} width={6.5} height={6.5} rx={2} />
      <rect x={13.5} y={4} width={6.5} height={6.5} rx={2} />
      <rect x={4} y={13.5} width={6.5} height={6.5} rx={2} />
      <rect x={13.5} y={13.5} width={6.5} height={6.5} rx={2} />
    </BaseIcon>
  );
}

/** User — the You tab. */
export function User(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx={12} cy={7} r={4} />
    </BaseIcon>
  );
}

/** Magnifier — the search bar's leading glyph. */
export function Search(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx={11} cy={11} r={8} />
      <path d="m21 21-4.3-4.3" />
    </BaseIcon>
  );
}

/** Map pin — the results hint pill and the map markers. */
export function MapPin(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx={12} cy={10} r={3} />
    </BaseIcon>
  );
}

/** Cross — dismisses the expanded results drawer. */
export function X(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </BaseIcon>
  );
}

/** Left arrow — collapses the drawer back to the map. */
export function ArrowLeft(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </BaseIcon>
  );
}

/** Star — POI category "see". */
export function Star(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </BaseIcon>
  );
}

/** Coffee — POI categories "eat" and "drink". */
export function Coffee(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
    </BaseIcon>
  );
}

/** Wallet — POI category "buy". */
export function Wallet(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
      <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </BaseIcon>
  );
}

/** Moon — POI category "sleep". */
export function Moon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </BaseIcon>
  );
}

/** Calendar — POI category "event". */
export function Calendar(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x={3} y={4} width={18} height={18} rx={2} />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </BaseIcon>
  );
}

/** Crosshair — recenters the camera on the user. */
export function Crosshair(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx={12} cy={12} r={10} />
      <path d="M22 12h-4M6 12H2M12 6V2M12 22v-4" />
    </BaseIcon>
  );
}

/** Bookmark — the POI detail "Save to trip" action. */
export function Bookmark(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </BaseIcon>
  );
}

/** Chevron down — the Sources accordion's expand affordance. */
export function ChevronDown(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </BaseIcon>
  );
}

/** Clock — the Contact section's opening-hours row. */
export function Clock(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx={12} cy={12} r={10} />
      <path d="M12 6v6l4 2" />
    </BaseIcon>
  );
}

/** External link — the universal "open in browser" affordance. */
export function ExternalLink(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
    </BaseIcon>
  );
}

/** Globe — website and source rows. */
export function Globe(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx={12} cy={12} r={10} />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </BaseIcon>
  );
}

/** Phone — the Contact section's phone row. */
export function Phone(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.91.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </BaseIcon>
  );
}

/** Log in — the account menu's sign-in entry. */
export function LogIn(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5M15 12H3" />
    </BaseIcon>
  );
}

/** Log out — the account menu's sign-out entry. */
export function LogOut(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </BaseIcon>
  );
}

/** Repeat — the account menu's switch-account entry. */
export function Repeat(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </BaseIcon>
  );
}

/** Layers — the account menu's saved-maps entry. */
export function Layers(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </BaseIcon>
  );
}

/** Globe alt — the account menu's language entry. */
export function Languages(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 8h11M9 4h1.5" />
      <path d="M11 4c0 6-3.5 10-7 12" />
      <path d="M8 11c1.5 3.5 4 5.5 6 6.5" />
      <path d="M13 21l4.5-10 4.5 10M15 17.5h5" />
    </BaseIcon>
  );
}

/** Check — transient "link copied" feedback on the share action. */
export function Check(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20 6 9 17l-5-5" />
    </BaseIcon>
  );
}

/** Share (three-node graph) — the POI detail header action. */
export function Share(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx={18} cy={5} r={3} />
      <circle cx={6} cy={12} r={3} />
      <circle cx={18} cy={19} r={3} />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </BaseIcon>
  );
}
