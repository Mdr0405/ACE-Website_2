'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Download } from 'lucide-react';
import type { Tables } from '@/lib/supabase/database.types';
import { COURSE_OPTIONS, parseQuestions } from '@/lib/recruitment';
import { saveRecruitmentForm, type FormSaveState } from '../actions';

const initialState: FormSaveState = { error: null, saved: false };
const inputClass = 'mt-2 w-full rounded-none border border-border bg-background px-4 py-3 text-base outline-none focus:border-primary focus-visible:outline-2 focus-visible:outline-ring';
const smallBtn = 'h-9 border border-border px-3 text-sm font-semibold transition-colors hover:bg-foreground hover:text-background disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-current';

type Draft = { id: string; label: string; required: boolean; placeholder: string };

const newId = () => `q_${Math.random().toString(36).slice(2, 8)}`;

export default function RecruitmentFormEditor({ form }: { form: Tables<'RecruitmentForm'> }) {
  const [state, action, pending] = useActionState(saveRecruitmentForm, initialState);
  const [questions, setQuestions] = useState<Draft[]>(
    parseQuestions(form.questions).map((q) => ({
      id: q.id,
      label: q.label,
      required: q.required === true,
      placeholder: q.placeholder ?? '',
    }))
  );

  const update = (index: number, patch: Partial<Draft>) =>
    setQuestions((current) => current.map((q, i) => (i === index ? { ...q, ...patch } : q)));

  const move = (index: number, dir: -1 | 1) =>
    setQuestions((current) => {
      const target = index + dir;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const remove = (index: number) => {
    if (!window.confirm('Remove this question? Answers already submitted stay in the database and exports.')) return;
    setQuestions((current) => current.filter((_, i) => i !== index));
  };

  const add = () =>
    setQuestions((current) => [...current, { id: newId(), label: '', required: false, placeholder: '' }]);

  const clusterParam = encodeURIComponent(form.Cluster);

  return (
    <div>
      <Link href={`/admin/recruitment?cluster=${clusterParam}`}
        className="label text-muted-foreground transition-colors hover:text-foreground">← Recruitment overview</Link>
      <header className="mt-8 border-b border-border pb-8">
        <h1 className="text-4xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-6xl">{form.Cluster} recruitment form</h1>
        <p className="mt-4 text-lg text-muted-foreground">Edit the questions. Everything else on this form is read-only.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={`/admin/recruitment/export?cluster=${clusterParam}&format=csv`}
            className="inline-flex h-11 items-center gap-2 border border-border px-4 font-semibold transition-colors hover:bg-foreground hover:text-background">
            <Download className="size-4" /> Export CSV
          </a>
          <a href={`/admin/recruitment/export?cluster=${clusterParam}&format=xlsx`}
            className="inline-flex h-11 items-center gap-2 bg-primary px-4 font-semibold text-primary-foreground">
            <Download className="size-4" /> Export XLSX
          </a>
        </div>
      </header>

      <div className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
        <form action={action} className="space-y-7">
          <input type="hidden" name="cluster" value={form.Cluster} />
          <input type="hidden" name="questions" value={JSON.stringify(questions)} />

          {/* Standard columns: display only */}
          <div>
            <h2 className="text-xl font-semibold">Form details</h2>
            <dl className="mt-4 divide-y divide-border border-y border-border">
              <ReadOnlyRow label="Title" value={form.title} />
              <ReadOnlyRow label="Description" value={form.description} />
              <ReadOnlyRow label="Name label" value={form.nameLabel} />
              <ReadOnlyRow label="Registration label" value={form.registrationLabel} />
              <ReadOnlyRow label="Course label" value={form.courseLabel} />
              <ReadOnlyRow label="Year label" value={form.yearLabel} />
              <ReadOnlyRow label="Accepting responses" value={form.isOpen ? 'Yes' : 'No'} />
            </dl>
          </div>

          {/* Editable questions */}
          <div className="border-t border-border pt-6">
            <h2 className="text-xl font-semibold">Questions</h2>
            <p className="mt-2 text-sm text-muted-foreground">Answers are saved as text, keyed by each question&apos;s id.</p>
          </div>

          {questions.length === 0 && <p className="text-muted-foreground">No questions yet.</p>}

          {questions.map((q, i) => (
            <div key={q.id} className="border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="label text-muted-foreground">Question {i + 1}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={smallBtn} aria-label="Move up">↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === questions.length - 1} className={smallBtn} aria-label="Move down">↓</button>
                  <button type="button" onClick={() => remove(i)} className={`${smallBtn} text-destructive`}>Remove</button>
                </div>
              </div>
              <Field label="Question text" id={`label-${q.id}`}>
                <input id={`label-${q.id}`} value={q.label} maxLength={200}
                  onChange={(event) => update(i, { label: event.target.value })} className={inputClass} />
              </Field>
              <Field label="Placeholder (optional)" id={`ph-${q.id}`}>
                <input id={`ph-${q.id}`} value={q.placeholder} maxLength={200}
                  onChange={(event) => update(i, { placeholder: event.target.value })} className={inputClass} />
              </Field>
              <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={q.required}
                  onChange={(event) => update(i, { required: event.target.checked })} />
                Required
              </label>
            </div>
          ))}

          <button type="button" onClick={add} className={`${smallBtn} h-11 w-full`}>+ Add question</button>

          {state.error && <p role="alert" className="border-t border-destructive pt-3 text-destructive">{state.error}</p>}
          {state.saved && <p role="status" className="text-primary">Questions saved.</p>}
          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" disabled={pending}
              className="inline-flex h-12 min-w-40 items-center justify-center bg-primary px-5 font-semibold text-primary-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-wait disabled:opacity-60">
              {pending ? 'Saving…' : 'Save questions'}
            </button>
            <Link href={`/events/recruitment/apply?cluster=${clusterParam}`}
              className="inline-flex h-12 items-center gap-2 font-semibold text-muted-foreground transition-colors hover:text-foreground">
              Open public form <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </form>

        <aside aria-label="Form preview" className="border-t border-border pt-6 lg:sticky lg:top-24 lg:self-start">
          <p className="label text-muted-foreground">Live preview (unsaved changes included)</p>
          <h2 className="mt-5 text-3xl font-bold tracking-[-0.03em]">{form.title}</h2>
          <p className="mt-3 text-muted-foreground">{form.description}</p>
          <div className="mt-8 space-y-5">
            <PreviewField label={form.nameLabel} value="Your name" />
            <PreviewField label={form.registrationLabel} value="9-character registration number" />
            <PreviewField label={form.courseLabel} value={COURSE_OPTIONS[0].label} />
            <PreviewField label={form.yearLabel} value="Year 1" />
            {questions.map((q) => (
              <PreviewField
                key={q.id}
                label={`${q.label || '(empty question)'}${q.required ? ' *' : ''}`}
                value={q.placeholder || 'Your answer'}
                tall
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="mt-4"><label htmlFor={id} className="text-sm font-semibold">{label}</label>{children}</div>;
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function PreviewField({ label, value, tall }: { label: string; value: string; tall?: boolean }) {
  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <div className={`mt-2 border border-border px-4 py-3 text-muted-foreground ${tall ? 'min-h-24' : ''}`}>{value}</div>
    </div>
  );
}