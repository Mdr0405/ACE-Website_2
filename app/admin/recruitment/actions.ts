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
  const requested = resolveRecruitmentCluster(String(formData.get('cluster') ?? ''));
  const { supabase, cluster, isCore } = await requireAdmin();
  if (!requested || (!isCore && requested !== resolveRecruitmentCluster(cluster))) {
    return fail('This form is not available to your admin account.');
  }

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
    if (!label || label.length > 200) return fail('Every question needs text (max 200 characters).');
    if (placeholder.length > 200) return fail('Placeholder is too long (max 200 characters).');

    seen.add(id);
    questions.push({
      id,
      label,
      type: 'text',
      required: q.required === true,
      ...(placeholder ? { placeholder } : {}),
    });
  }

  // Only the questions column (plus updatedAt) is written
  const { error } = await supabase.from('RecruitmentForm').update({
    questions, updatedAt: new Date().toISOString(),
  }).eq('Cluster', requested).select('Cluster').single();
  if (error) return fail('Could not save the questions. Try again.');

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