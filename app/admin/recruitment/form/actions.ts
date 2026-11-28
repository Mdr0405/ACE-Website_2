'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { resolveRecruitmentCluster } from '@/lib/recruitment';

export type FormSaveState = { error: string | null; saved: boolean };

const fail = (error: string): FormSaveState => ({ error, saved: false });

export async function saveRecruitmentForm(
  _previous: FormSaveState,
  formData: FormData
): Promise<FormSaveState> {
  const { supabase, cluster: adminCluster, isCore } = await requireAdmin();

  const requested = resolveRecruitmentCluster(String(formData.get('cluster') ?? ''));
  const allowed = isCore ? requested : resolveRecruitmentCluster(adminCluster);
  if (!requested || !allowed || requested !== allowed) return fail('You cannot edit this cluster.');
  const cluster = allowed;

  let input: unknown;
  try {
    input = JSON.parse(String(formData.get('questions') ?? '[]'));
  } catch {
    return fail('Invalid questions data.');
  }
  if (!Array.isArray(input)) return fail('Invalid questions data.');
  if (input.length > 30) return fail('Maximum 30 questions.');

  const seen = new Set<string>();
  const questions: { id: string; label: string; type: 'text'; required: boolean; placeholder?: string }[] = [];

  for (const raw of input) {
    const q = (raw ?? {}) as Record<string, unknown>;
    const id = typeof q.id === 'string' ? q.id : '';
    const label = typeof q.label === 'string' ? q.label.trim() : '';
    const placeholder = typeof q.placeholder === 'string' ? q.placeholder.trim() : '';

    if (!/^[a-z0-9_]{1,40}$/.test(id)) return fail('A question has an invalid id.');
    if (seen.has(id)) return fail('Duplicate question id.');
    if (!label || label.length > 2000) return fail('Every question needs text (max 2000 characters).');
    if (placeholder.length > 2000) return fail('Placeholder is too long (max 2000 characters).');

    seen.add(id);
    questions.push({
      id,
      label,
      type: 'text',
      required: q.required === true,
      ...(placeholder ? { placeholder } : {}),
    });
  }

  // Only the questions column (plus updatedAt) is ever written
  const { data, error } = await supabase
    .from('RecruitmentForm')
    .update({ questions, updatedAt: new Date().toISOString() })
    .eq('Cluster', cluster)
    .select('Cluster');

  if (error) return fail('Could not save. Check your admin policies.');
  if (!data?.length) return fail('Nothing was updated. You may not have permission.');

  revalidatePath('/admin/recruitment', 'layout');
  revalidatePath('/events/recruitment/apply');
  return { error: null, saved: true };
}