import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { resolveRecruitmentCluster } from '@/lib/recruitment';
import RecruitmentFormEditor from './RecruitmentFormEditor';

export const metadata = { title: 'Edit recruitment form · Admin · ACE SASTRA' };

export default async function EditRecruitmentFormPage({
  searchParams,
}: {
  searchParams: Promise<{ cluster?: string }>;
}) {
  const { supabase, cluster: adminCluster, isCore } = await requireAdmin();
  const requested = resolveRecruitmentCluster((await searchParams).cluster ?? null);
  const cluster = isCore ? requested : resolveRecruitmentCluster(adminCluster);
  if (!cluster) notFound();

  const { data: form, error } = await supabase.from('RecruitmentForm')
    .select('*').eq('Cluster', cluster).maybeSingle();
  if (error) throw error;
  if (!form) notFound();
  return <RecruitmentFormEditor form={form} />;
}
