'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { Tables } from '@/lib/supabase/database.types';
import { COURSE_OPTIONS } from '@/lib/recruitment';
import { submitRecruitmentApplication, type ApplicationState } from './actions';

const initialState: ApplicationState = { error: null, submitted: false };
const inputClass = 'mt-2 h-12 w-full rounded-none border border-border bg-background px-4 text-base outline-none focus:border-primary focus-visible:outline-2 focus-visible:outline-ring';

export default function ApplicationForm({ form }: { form: Tables<'RecruitmentForm'> }) {
  const [state, action, pending] = useActionState(submitRecruitmentApplication, initialState);

  if (state.submitted) {
    return (
      <div role="status" className="border-b border-border py-12">
        <h2 className="text-3xl font-bold tracking-[-0.03em]">Application received</h2>
        <p className="mt-3 text-muted-foreground">Your response has been recorded for {form.Cluster}.</p>
        <Link href="/events/recruitment" className="mt-7 inline-flex h-12 items-center bg-foreground px-5 font-semibold text-background">
          Explore other clusters
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-8 py-10">
      <input type="hidden" name="cluster" value={form.Cluster} />
      <div>
        <label htmlFor="application-name" className="font-semibold">{form.nameLabel}</label>
        <input id="application-name" name="fullName" type="text" autoComplete="name" required maxLength={120} className={inputClass} />
      </div>
      <div>
        <label htmlFor="application-course" className="font-semibold">{form.courseLabel}</label>
        <select id="application-course" name="course" required defaultValue="" className={inputClass}>
          <option value="" disabled>Choose your course</option>
          {COURSE_OPTIONS.map((course) => <option key={course.value} value={course.value}>{course.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="application-year" className="font-semibold">{form.yearLabel}</label>
        <select id="application-year" name="year" required defaultValue="" className={inputClass}>
          <option value="" disabled>Choose your year</option>
          {[1, 2, 3, 4].map((year) => <option key={year} value={year}>Year {year}</option>)}
        </select>
      </div>
      {state.error && <p role="alert" className="border-t border-destructive pt-3 text-destructive">{state.error}</p>}
      <button type="submit" disabled={pending} className="inline-flex h-12 min-w-44 items-center justify-center bg-primary px-6 font-semibold text-primary-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-wait disabled:opacity-60">
        {pending ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  );
}
