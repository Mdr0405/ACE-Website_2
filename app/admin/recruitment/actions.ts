'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { resolveRecruitmentCluster } from '@/lib/recruitment';

export type FormSaveState = { error: string | null; saved: boolean };

export async function saveRecruitmentForm(
  _previous: FormSaveState,
  formData: FormData
): Promise<FormSaveState> {
  const requested = resolveRecruitmentCluster(String(formData.get('cluster') ?? ''));
  const { supabase, cluster, isCore } = await requireAdmin();
  if (!requested || (!isCore && requested !== cluster)) return { error: 'This form is not available to your admin account.', saved: false };

  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const nameLabel = String(formData.get('nameLabel') ?? '').trim();
  const courseLabel = String(formData.get('courseLabel') ?? '').trim();
  const yearLabel = String(formData.get('yearLabel') ?? '').trim();
  if (!title || title.length > 120 || !description || description.length > 500 ||
      [nameLabel, courseLabel, yearLabel].some((label) => !label || label.length > 80)) {
    return { error: 'Complete the title, description, and three question labels within their limits.', saved: false };
  }

  const { error } = await supabase.from('RecruitmentForm').update({
    title, description, nameLabel, courseLabel, yearLabel, updatedAt: new Date().toISOString(),
  }).eq('Cluster', requested).select('Cluster').single();
  if (error) return { error: 'Could not save the form. Try again.', saved: false };
  revalidatePath('/admin/recruitment');
  revalidatePath('/admin/recruitment/form');
  revalidatePath('/events/recruitment/apply');
  return { error: null, saved: true };
}

export async function setRecruitmentFormOpen(formData: FormData): Promise<void> {
  const requested = resolveRecruitmentCluster(String(formData.get('cluster') ?? ''));
  const { supabase, cluster, isCore } = await requireAdmin();
  if (!requested || (!isCore && requested !== cluster)) throw new Error('Not authorised to manage this form.');
  const isOpen = formData.get('isOpen') === 'true';
  const { error } = await supabase.from('RecruitmentForm').update({
    isOpen, updatedAt: new Date().toISOString(),
  }).eq('Cluster', requested).select('Cluster').single();
  if (error) throw new Error('Could not change the form status.');
  revalidatePath('/admin/recruitment');
  revalidatePath('/events/recruitment');
  revalidatePath('/events/recruitment/apply');
}
