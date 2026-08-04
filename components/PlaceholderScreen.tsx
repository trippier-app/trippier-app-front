import type { IconProps } from '@/components/icons';

interface PlaceholderScreenProps {
  title: string;
  caption: string;
  Icon: (props: IconProps) => React.ReactElement;
}

/**
 * Holding screen for a tab whose content hasn't been built yet. Styled like
 * the rest of the app so an empty tab still looks deliberate.
 *
 * @param props - Tab title, one-line caption and the tab's icon.
 * @returns The placeholder screen.
 */
export default function PlaceholderScreen({ title, caption, Icon }: PlaceholderScreenProps) {
  return (
    <section className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="bg-emerald-soft text-emerald-deep flex size-16 items-center justify-center rounded-xl">
        <Icon size={26} />
      </span>
      <h1 className="text-ink text-[26px] font-bold tracking-tight">
        {title}
        <span className="bg-emerald ml-1 inline-block size-1.5 rounded-pill align-middle" />
      </h1>
      <p className="text-mute max-w-xs font-mono text-[12.5px]">{caption}</p>
    </section>
  );
}
