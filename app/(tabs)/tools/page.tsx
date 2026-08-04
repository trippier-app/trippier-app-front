import PlaceholderScreen from '@/components/PlaceholderScreen';
import { Grid } from '@/components/icons';

export const metadata = { title: 'Tools · Trippier' };

export default function ToolsPage() {
  return (
    <PlaceholderScreen
      title="Tools"
      caption="Converters, offline packs and the small utilities that make a trip less admin."
      Icon={Grid}
    />
  );
}
