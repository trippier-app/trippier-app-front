import { redirect } from 'next/navigation';

/**
 * The app has no landing page of its own — there is no onboarding, the user
 * lands straight on the map.
 */
export default function Home() {
  redirect('/discover');
}
