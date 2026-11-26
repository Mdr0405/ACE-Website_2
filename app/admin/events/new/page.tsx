import EventEditor from '../EventEditor';
import { requireAdmin } from '@/lib/admin';
import { resolveEventCluster } from '@/lib/admin-clusters';
import { notFound } from 'next/navigation';

export const metadata = { title: 'New event · Admin · ACE SASTRA' };

export default async function NewEventPage() {
  const { cluster } = await requireAdmin();
  if (cluster !== 'Core' && !resolveEventCluster(cluster)) notFound();
  return <EventEditor adminCluster={cluster} />;
}
