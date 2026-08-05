import MapsScreen from '@/components/MapsScreen';
import { mapStyleUrl } from '@/lib/server/map-config';

export const metadata = { title: 'My maps · Trippier' };

// Same reason as Discover: the map style URL is read from the environment on
// every request, and prerendering would freeze the key it had at build time.
export const dynamic = 'force-dynamic';

export default function MapsPage() {
  return <MapsScreen mapStyleUrl={mapStyleUrl()} />;
}
