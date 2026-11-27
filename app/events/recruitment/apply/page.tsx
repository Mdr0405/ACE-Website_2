import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveRecruitmentCluster } from '@/lib/recruitment';
import ApplicationForm from './ApplicationForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Apply to ACE · Recruitment' };

export default async function RecruitmentApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ cluster?: string }>;
}) {
  const { cluster: rawCluster } = await searchParams;
  const cluster = resolveRecruitmentCluster(rawCluster ?? null);
  if (!cluster) notFound();

  const supabase = await createClient();
  const { data: form, error } = await supabase.from('RecruitmentForm')
    .select('*').eq('Cluster', cluster).maybeSingle();
  if (error) throw error;
  if (!form) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 pb-28 pt-12 sm:px-8 sm:pt-20">
      <Link href="/events/recruitment" className="label text-muted-foreground transition-colors hover:text-foreground">
        ← All clusters
      </Link>
      <header className="mt-8 border-b border-border pb-8">
        <p className="label text-primary">ACE recruitment · {cluster}</p>
        <h1 className="mt-4 text-4xl font-extrabold leading-[0.98] tracking-[-0.04em] sm:text-6xl">
          {form.title}
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{form.description}</p>
      </header>
      {form.isOpen ? (
        <ApplicationForm form={form} />
      ) : (
        <div className="border-b border-border py-10">
          <h2 className="text-2xl font-semibold">Applications are closed</h2>
          <p className="mt-3 text-muted-foreground">This cluster is not accepting responses right now.</p>
        </div>
      )}
    </div>
  );
}
