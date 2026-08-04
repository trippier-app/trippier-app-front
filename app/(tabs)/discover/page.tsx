import DiscoverScreen from '@/components/DiscoverScreen';
import { mapStyleUrl } from '@/lib/server/map-config';

export const metadata = { title: 'Discover · Trippier' };

// The map style URL is read from the environment on every request; prerendering
// this page would freeze whatever the key was at build time.
export const dynamic = 'force-dynamic';

export default function DiscoverPage() {
  return <DiscoverScreen mapStyleUrl={mapStyleUrl()} />;
}
