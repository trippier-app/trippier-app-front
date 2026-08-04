import PlaceholderScreen from '@/components/PlaceholderScreen';
import { User } from '@/components/icons';

export const metadata = { title: 'You · Trippier' };

export default function YouPage() {
  return (
    <PlaceholderScreen
      title="You"
      caption="Your saved places and settings. Signing in stays optional — the map works without it."
      Icon={User}
    />
  );
}
