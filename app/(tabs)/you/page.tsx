import ProfileScreen from '@/components/ProfileScreen';
import { countriesTilesUrl, mapStyleUrl } from '@/lib/server/map-config';

export const metadata = { title: 'You · Trippier' };

export default function YouPage() {
  return <ProfileScreen mapStyleUrl={mapStyleUrl()} countriesUrl={countriesTilesUrl()} />;
}
