import PlaceholderScreen from '@/components/PlaceholderScreen';
import { Route } from '@/components/icons';

export const metadata = { title: 'Plan · Trippier' };

export default function PlanPage() {
  return (
    <PlaceholderScreen
      title="Plan"
      caption="Itineraries land here — stitch the places you saved into a day you can actually walk."
      Icon={Route}
    />
  );
}
