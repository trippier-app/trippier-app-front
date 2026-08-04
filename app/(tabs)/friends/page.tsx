import PlaceholderScreen from '@/components/PlaceholderScreen';
import { Users } from '@/components/icons';

export const metadata = { title: 'Friends · Trippier' };

export default function FriendsPage() {
  return (
    <PlaceholderScreen
      title="Friends"
      caption="See where the people you follow have been, and share the maps you keep public."
      Icon={Users}
    />
  );
}
