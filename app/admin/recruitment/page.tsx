import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, Pencil } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { COURSE_OPTIONS, RECRUITMENT_CLUSTERS, resolveRecruitmentCluster } from '@/lib/recruitment';
import { setRecruitmentFormOpen } from './actions';

export const metadata = { title: 'Recruitment · Admin · ACE SASTRA' };

const sampleCourses: Record<string, number> = {
  CSE: 14, 'CSE-AI': 8, IT: 7, 'CSE-CYBER': 5, 'CSE-IOT': 4, ICT: 3, OTHER: 1,
};
const sampleYears = [10, 18, 11, 3];

export default async function AdminRecruitmentPage({
  searchParams,
}: {
  searchParams: Promise<{ cluster?: string }>;
}) {
  const { supabase, cluster: adminCluster, isCore } = await requireAdmin();
  const clusterParam = (await searchParams).cluster;
  const requested = resolveRecruitmentCluster(clusterParam ?? null);
  if (isCore && !clusterParam) {
    const { data: forms, error } = await supabase.from('RecruitmentForm').select('Cluster, isOpen');
    if (error) throw error;
    const formByCluster = new Map(forms?.map((form) => [form.Cluster, form]));
    return (
      <div>
        <header className="border-b border-border pb-8">
          <h1 className="text-4xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-6xl">Recruitment forms</h1>
          <p className="mt-4 text-lg text-muted-foreground">Choose a cluster to view its form and application summary.</p>
        </header>
        <ul className="mt-8 border-t border-border">
          {RECRUITMENT_CLUSTERS.map((item) => (
            <li key={item} className="border-b border-border">
              <Link href={`/admin/recruitment?cluster=${encodeURIComponent(item)}`}
                className="flex min-h-20 items-center justify-between gap-4 py-4 text-lg font-semibold transition-colors hover:text-primary sm:px-2 sm:text-xl">
                <span>{item} recruitment form</span>
                <span className="flex shrink-0 items-center gap-2 text-sm font-normal text-muted-foreground">
                  {formByCluster.get(item)?.isOpen ? 'Open' : 'Closed'} <ArrowUpRight className="size-5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const cluster = isCore ? requested : resolveRecruitmentCluster(adminCluster);
  if (!cluster) notFound();

  const { data: form, error: formError } = await supabase.from('RecruitmentForm')
    .select('*').eq('Cluster', cluster).maybeSingle();
  if (formError) throw formError;
  if (!form) notFound();

  const responses: { course: string; year: number }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('RecruitmentApplication')
      .select('course, year').eq('Cluster', cluster)
      .order('submittedAt', { ascending: false }).range(from, from + 999);
    if (error) throw error;
    responses.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const sample = responses.length === 0;
  const total = sample ? 42 : responses.length;
  const courses = sample ? sampleCourses : Object.fromEntries(
    COURSE_OPTIONS.map((course) => [course.value, responses.filter((response) => response.course === course.value).length])
  );
  const years = sample ? sampleYears : [1, 2, 3, 4].map((year) => responses.filter((response) => response.year === year).length);

  return (
    <div>
      <header className="border-b border-border pb-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <h1 className="text-4xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-6xl">{cluster} recruitment form</h1>
            <p className="mt-4 text-lg text-muted-foreground">Application summary and form controls.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:max-w-[29rem] lg:justify-end" aria-label="Application form controls">
            <span className="label border border-border px-3 py-2 text-muted-foreground">
              {form.isOpen ? 'Form open' : 'Form closed'}
            </span>
            <Link href={`/admin/recruitment/form?cluster=${encodeURIComponent(cluster)}`}
              className="inline-flex h-12 items-center gap-3 bg-primary px-5 font-semibold text-primary-foreground transition-colors hover:bg-foreground hover:text-background">
              <Pencil className="size-4" /> View / edit form
            </Link>
            <form action={setRecruitmentFormOpen}>
              <input type="hidden" name="cluster" value={cluster} />
              <input type="hidden" name="isOpen" value={form.isOpen ? 'false' : 'true'} />
              <button type="submit" className="h-12 border border-foreground/25 px-5 font-semibold transition-colors hover:bg-foreground hover:text-background">
                {form.isOpen ? 'Close form' : 'Reopen form'}
              </button>
            </form>
            <Link href={`/events/recruitment/apply?cluster=${encodeURIComponent(cluster)}`}
              className="inline-flex h-12 items-center gap-2 px-3 font-semibold text-muted-foreground transition-colors hover:text-foreground">
              Public form <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      {isCore && (
        <nav aria-label="Recruitment cluster" className="scrollbar-hide -mx-5 flex gap-2 overflow-x-auto border-b border-border px-5 py-5 sm:-mx-8 sm:px-8">
          <Link href="/admin/recruitment" className="shrink-0 border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:border-foreground hover:text-foreground">All clusters</Link>
          {RECRUITMENT_CLUSTERS.map((item) => (
            <Link key={item} href={`/admin/recruitment?cluster=${encodeURIComponent(item)}`}
              aria-current={item === cluster ? 'page' : undefined}
              className={`shrink-0 border px-3 py-2 text-sm font-semibold transition-colors ${item === cluster ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}`}>
              {item}
            </Link>
          ))}
        </nav>
      )}

      {sample && (
        <p className="mt-8 border-t border-primary pt-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Sample data.</strong> These figures illustrate the dashboard until the first application is submitted. They are not applicant records.
        </p>
      )}

      <div className="grid gap-8 border-b border-border py-10 sm:grid-cols-2 sm:items-end">
        <div>
          <p className="font-mono text-[clamp(4.5rem,13vw,8rem)] font-bold leading-none tracking-[-0.04em] tabular">{total}</p>
          <p className="mt-2 text-lg font-semibold">{sample ? 'Sample applications' : 'Applications received'}</p>
        </div>
        <p className="max-w-sm text-muted-foreground sm:justify-self-end">
          The form asks for a name, course, and year of study. Course and year totals update from submitted responses.
        </p>
      </div>

      <div className="grid gap-12 py-12 lg:grid-cols-2 lg:gap-20">
        <Breakdown title="By course" rows={COURSE_OPTIONS.map((course) => ({ label: course.label, count: courses[course.value] ?? 0 }))} total={total} />
        <Breakdown title="By year" rows={years.map((count, index) => ({ label: `Year ${index + 1}`, count }))} total={total} />
      </div>

    </div>
  );
}

function Breakdown({ title, rows, total }: { title: string; rows: { label: string; count: number }[]; total: number }) {
  return (
    <section aria-label={title}>
      <h2 className="border-b border-border pb-4 text-xl font-semibold tracking-[-0.02em]">{title}</h2>
      <ul>
        {rows.map((row) => (
          <li key={row.label} className="border-b border-border py-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-semibold sm:text-base">{row.label}</span>
              <span className="font-mono text-sm tabular">{row.count}</span>
            </div>
            <div className="mt-3 h-1 bg-muted" aria-hidden="true">
              <div className="h-full bg-primary" style={{ width: `${total ? (row.count / total) * 100 : 0}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
