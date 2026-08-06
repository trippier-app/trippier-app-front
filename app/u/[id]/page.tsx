import { notFound } from 'next/navigation';
import PublicProfileScreen from '@/components/PublicProfileScreen';
import { countriesTilesUrl, mapStyleUrl } from '@/lib/server/map-config';

export const metadata = { title: 'Profil · Trippier' };

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    notFound();
  }
  return (
    <div className="bg-bg relative h-dvh overflow-hidden">
      <main className="relative h-full">
        <PublicProfileScreen
          userId={userId}
          mapStyleUrl={mapStyleUrl()}
          countriesUrl={countriesTilesUrl()}
        />
      </main>
    </div>
  );
}
