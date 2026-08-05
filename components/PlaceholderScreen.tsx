'use client';

import { useT } from '@/components/I18nProvider';
import { Grid, Route, User, Users, type IconProps } from '@/components/icons';
import type { Dict } from '@/lib/i18n';

export type PlaceholderTab = 'plan' | 'friends' | 'tools' | 'you';

interface TabContent {
  titleKey: keyof Dict;
  captionKey: keyof Dict;
  Icon: (props: IconProps) => React.ReactElement;
}

const TABS: Record<PlaceholderTab, TabContent> = {
  plan: { titleKey: 'placeholder_plan_title', captionKey: 'placeholder_plan_caption', Icon: Route },
  friends: {
    titleKey: 'placeholder_friends_title',
    captionKey: 'placeholder_friends_caption',
    Icon: Users,
  },
  tools: {
    titleKey: 'placeholder_tools_title',
    captionKey: 'placeholder_tools_caption',
    Icon: Grid,
  },
  you: { titleKey: 'placeholder_you_title', captionKey: 'placeholder_you_caption', Icon: User },
};

/**
 * Holding screen for a tab whose content hasn't been built yet. Styled like
 * the rest of the app so an empty tab still looks deliberate.
 *
 * The tab is named rather than handed its icon, because the pages rendering
 * this are server components and a component function cannot cross that
 * boundary.
 *
 * @param props - Which tab to render.
 * @returns The placeholder screen.
 */
export default function PlaceholderScreen({ tab }: { tab: PlaceholderTab }) {
  const t = useT();
  const { titleKey, captionKey, Icon } = TABS[tab];
  return (
    <section className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="bg-emerald-soft text-emerald-deep flex size-16 items-center justify-center rounded-xl">
        <Icon size={26} />
      </span>
      <h1 className="text-ink text-[26px] font-bold tracking-tight">
        {t(titleKey)}
        <span className="bg-emerald ml-1 inline-block size-1.5 rounded-pill align-middle" />
      </h1>
      <p className="text-mute max-w-xs font-mono text-[12.5px]">{t(captionKey)}</p>
    </section>
  );
}
