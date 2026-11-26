'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Tables } from '@/lib/supabase/database.types';
import { COURSE_OPTIONS } from '@/lib/recruitment';
import { saveRecruitmentForm, type FormSaveState } from '../actions';

const initialState: FormSaveState = { error: null, saved: false };
const inputClass = 'mt-2 w-full rounded-none border border-border bg-background px-4 py-3 text-base outline-none focus:border-primary focus-visible:outline-2 focus-visible:outline-ring';

export default function RecruitmentFormEditor({ form }: { form: Tables<'RecruitmentForm'> }) {
  const [state, action, pending] = useActionState(saveRecruitmentForm, initialState);
  const [draft, setDraft] = useState({
    title: form.title,
    description: form.description,
    nameLabel: form.nameLabel,
    courseLabel: form.courseLabel,
    yearLabel: form.yearLabel,
  });
  const update = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <div>
      <Link href={`/admin/recruitment?cluster=${encodeURIComponent(form.Cluster)}`}
        className="label text-muted-foreground transition-colors hover:text-foreground">← Recruitment overview</Link>
      <header className="mt-8 border-b border-border pb-8">
        <h1 className="text-4xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-6xl">{form.Cluster} recruitment form</h1>
        <p className="mt-4 text-lg text-muted-foreground">Edit the three required questions.</p>
      </header>

      <div className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <form action={action} className="space-y-7">
          <input type="hidden" name="cluster" value={form.Cluster} />
          <Field label="Form title" id="form-title">
            <input id="form-title" name="title" required maxLength={120} value={draft.title}
              onChange={(event) => update('title', event.target.value)} className={inputClass} />
          </Field>
          <Field label="Description" id="form-description">
            <textarea id="form-description" name="description" required maxLength={500} rows={3} value={draft.description}
              onChange={(event) => update('description', event.target.value)} className={inputClass} />
          </Field>
          <div className="border-t border-border pt-6">
            <h2 className="text-xl font-semibold">Question labels</h2>
            <p className="mt-2 text-sm text-muted-foreground">The answer fields stay as name, course, and year so the dashboard can group responses.</p>
          </div>
          {([
            ['nameLabel', 'Name question'],
            ['courseLabel', 'Course question'],
            ['yearLabel', 'Year question'],
          ] as const).map(([key, label]) => (
            <Field key={key} label={label} id={key}>
              <input id={key} name={key} required maxLength={80} value={draft[key]}
                onChange={(event) => update(key, event.target.value)} className={inputClass} />
            </Field>
          ))}
          {state.error && <p role="alert" className="border-t border-destructive pt-3 text-destructive">{state.error}</p>}
          {state.saved && <p role="status" className="text-primary">Form saved.</p>}
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={pending}
              className="inline-flex h-12 min-w-40 items-center justify-center bg-primary px-5 font-semibold text-primary-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-wait disabled:opacity-60">
              {pending ? 'Saving…' : 'Save form'}
            </button>
            <Link href={`/events/recruitment/apply?cluster=${encodeURIComponent(form.Cluster)}`}
              className="inline-flex h-12 items-center gap-2 font-semibold text-muted-foreground transition-colors hover:text-foreground">
              Open public form <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </form>

        <aside aria-label="Form preview" className="border-t border-border pt-6 lg:sticky lg:top-24 lg:self-start">
          <p className="label text-muted-foreground">Live preview</p>
          <h2 className="mt-5 text-3xl font-bold tracking-[-0.03em]">{draft.title || 'Form title'}</h2>
          <p className="mt-3 text-muted-foreground">{draft.description || 'Form description'}</p>
          <div className="mt-8 space-y-5">
            <PreviewField label={draft.nameLabel || 'Full name'} value="Your name" />
            <PreviewField label={draft.courseLabel || 'Course'} value={COURSE_OPTIONS[0].label} />
            <PreviewField label={draft.yearLabel || 'Year of study'} value="Year 1" />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="font-semibold">{label}</label>{children}</div>;
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <div className="mt-2 border border-border px-4 py-3 text-muted-foreground">{value}</div>
    </div>
  );
}
