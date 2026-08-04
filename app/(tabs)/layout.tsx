import TabBar from '@/components/TabBar';

/**
 * Shell shared by the five tab destinations: a full-height, non-scrolling
 * stage the screens fill edge to edge, plus the floating tab bar on top.
 *
 * Auth screens land outside this group so they render without the tab bar.
 *
 * @param props - The active tab's page.
 * @returns The tab shell.
 */
export default function TabsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="bg-bg relative h-dvh overflow-hidden">
      <main className="relative h-full">{children}</main>
      <TabBar />
    </div>
  );
}
