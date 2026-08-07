import ProfileScreen from '@/components/ProfileScreen';
import { countriesTilesUrl, mapStyleUrl } from '@/lib/server/map-config';

export const metadata = { title: 'You · Trippier' };

/**
 * The map keys are read from the deployment's environment, which does not
 * exist while the image is built. Left to itself this page prerenders — it
 * takes no parameters and reads no request — and would bake in the null it
 * saw at build time. Discover and Maps are dynamic for reasons of their own,
 * which is why they escaped it.
 */
export const dynamic = 'force-dynamic';

export default function YouPage() {
  return <ProfileScreen mapStyleUrl={mapStyleUrl()} countriesUrl={countriesTilesUrl()} />;
}
