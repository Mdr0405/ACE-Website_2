import { notFound } from 'next/navigation';
import { isUuid } from '@/lib/api-auth';
import { requireAdmin } from '@/lib/admin';
import EventEditor from '../../EventEditor';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { supabase, cluster, isCore } = await requireAdmin();
  let eventQuery = supabase.from('Event').select('*').eq('id', id);
  if (!isCore) eventQuery = eventQuery.eq('Cluster', cluster);
  const { data: event, error } = await eventQuery.maybeSingle();
  if (error) throw error;
  if (!event) notFound();
  const { count } = await supabase.from('Registration').select('id', { count: 'exact', head: true }).eq('eventId', id);
  return <EventEditor event={event} adminCluster={cluster} registrationCount={count ?? 0} />;
}
