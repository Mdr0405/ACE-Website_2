'use server';

import { createClient } from '@/lib/supabase/server';
import { isCourseValue, resolveRecruitmentCluster } from '@/lib/recruitment';

export type ApplicationState = { error: string | null; submitted: boolean };

export async function submitRecruitmentApplication(
  _previous: ApplicationState,
  formData: FormData
): Promise<ApplicationState> {
  const cluster = resolveRecruitmentCluster(String(formData.get('cluster') ?? ''));
  const fullName = String(formData.get('fullName') ?? '').trim();
  const course = String(formData.get('course') ?? '');
  const year = Number(formData.get('year'));
  const registrationNumber = String(formData.get('registrationNumber') ?? '').trim();

  if (!cluster) return { error: 'Choose a cluster from the recruitment page.', submitted: false };
  if (fullName.length < 2 || fullName.length > 120) return { error: 'Enter your full name (2–120 characters).', submitted: false };
  if (registrationNumber.length != 9) return { error: 'Enter your registration number (9 characters).', submitted: false };
  if (!isCourseValue(course)) return { error: 'Choose your course.', submitted: false };
  if (!Number.isInteger(year) || year < 1 || year > 4) return { error: 'Choose your year of study.', submitted: false };

  const supabase = await createClient();
  const { data: form, error: formError } = await supabase.from('RecruitmentForm')
    .select('isOpen').eq('Cluster', cluster).maybeSingle();
  if (formError || !form) return { error: 'This form is unavailable right now.', submitted: false };
  if (!form.isOpen) return { error: 'Applications for this cluster are closed.', submitted: false };

  const { error } = await supabase.from('RecruitmentApplication').insert({
    Cluster: cluster, fullName, registrationNumber, course, year,
  });
  if (error) return { error: 'Could not submit your application. Please try again.', submitted: false };
  return { error: null, submitted: true };
}
