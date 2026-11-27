import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { loadEventSummaries, requireAdmin, type EventSummary } from '@/lib/admin';
import { resolveEventCluster } from '@/lib/admin-clusters';
import { EVENT_TYPE_NAME, feeOf, formatDay, formatTime, participationLabel } from '@/lib/event-display';

const GROUPS: { status: EventSummary['status']; title: string; empty: string }[] = [
  { status: 'OPEN', title: 'Open for registration', empty: 'No event is taking registrations right now.' },
  { status: 'CLOSED', title: 'Registration closed', empty: 'Nothing waiting to run.' },
  { status: 'DONE', title: 'Completed', empty: 'No completed events yet.' },
  { status: 'CANCELLED', title: 'Cancelled', empty: '' },
];

export default async function AdminEventsPage() {
  const { cluster, isCore } = await requireAdmin();
  const events = await loadEventSummaries();
  const open = events.filter((e) => e.status === 'OPEN');
  const openRegistered = open.reduce((n, e) => n + e.registered, 0);

  return (
    <>
      <header className="grid gap-4 border-b border-border pb-8 lg:grid-cols-12 lg:items-end">
        <h1 className="text-[2.5rem] font-extrabold leading-[0.95] tracking-[-0.04em] [font-stretch:110%] sm:text-6xl lg:col-span-8">
          {isCore ? 'Event registrations' : `${cluster} events`}
        </h1>
        <div className="lg:col-span-4">
        <p className="text-muted-foreground">
          {open.length > 0 ? (
            <>
              <span className="font-mono tabular text-foreground">{openRegistered}</span> members registered across{' '}
              <span className="font-mono tabular text-foreground">{open.length}</span> open{' '}
              {open.length === 1 ? 'event' : 'events'}. Open an event for its full report, check-in and export.
            </>
          ) : (
            'Open an event for its full report, check-in and export.'
          )}
        </p>
        {(isCore || resolveEventCluster(cluster)) && <Link
          href="/admin/events/new"
          className="group mt-5 inline-flex h-12 items-center gap-3 bg-primary px-5 font-semibold text-primary-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          <Plus className="size-5" /> New event
        </Link>}
        </div>
      </header>

      {GROUPS.map((g) => {
        const list = events
          .filter((e) => e.status === g.status)
          // Upcoming work reads soonest-first; history reads latest-first.
          .sort((a, b) =>
            g.status === 'OPEN' || g.status === 'CLOSED'
              ? a.startTime.localeCompare(b.startTime)
              : b.startTime.localeCompare(a.startTime)
          );
        if (list.length === 0 && !g.empty) return null;
        return (
          <section key={g.status} aria-labelledby={`g-${g.status}`} className="mt-14">
            <h2 id={`g-${g.status}`} className="flex items-baseline gap-3 text-xl font-semibold tracking-[-0.02em]">
              {g.title}
              <span className="font-mono text-sm tabular text-muted-foreground">{list.length}</span>
            </h2>
            {list.length === 0 ? (
              <p className="mt-4 border-t border-border pt-4 text-muted-foreground">{g.empty}</p>
            ) : (
              <ul className="mt-4 border-t border-border">
                {list.map((e) => (
                  <EventRow key={e.id} e={e} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </>
  );
}

function EventRow({ e }: { e: EventSummary }) {
  const cap = e.maxCapacity ?? null;
  const fill = cap ? Math.min(e.registered / cap, 1) : null;
  const fee = feeOf(e);
  return (
    <li className="border-b border-border">
      <Link
        href={`/admin/events/${e.id}`}
        className="group grid gap-y-3 py-5 transition-colors hover:bg-muted/40 md:grid-cols-[10.5rem_minmax(0,1fr)_12rem_7rem_1.5rem] md:items-center md:gap-x-6 md:px-2"
      >
        <p className="font-mono text-sm tabular text-muted-foreground">
          {formatDay(e.startTime)}
          <span className="md:block"><span className="md:hidden"> · </span>{formatTime(e.startTime)}</span>
        </p>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-[-0.01em] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">
            {e.name.trim()}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {EVENT_TYPE_NAME[e.type] ?? e.type} · {participationLabel(e)} · {e.location || 'Venue TBA'}
            {fee > 0 && <> · <span className="font-mono tabular">₹{fee}</span></>}
          </p>
        </div>
        <div className="max-w-xs md:max-w-none">
          <p className="font-mono tabular">
            <span className="text-lg font-semibold">{e.registered}</span>
            <span className="text-muted-foreground">
              {cap ? ` / ${cap}` : ''} {e.participationMode === 'TEAM' ? (e.registered === 1 ? 'team' : 'teams') : 'registered'}
            </span>
          </p>
          {fill != null && (
            <div className="mt-2 h-0.5 w-full bg-border" aria-hidden="true">
              <div className="h-full bg-primary" style={{ width: `${fill * 100}%` }} />
            </div>
          )}
        </div>
        <p className="hidden font-mono text-sm tabular text-muted-foreground md:block">
          {e.status === 'OPEN' ? (fee > 0 ? `${e.paid} paid` : '') : `${e.attended} attended`}
        </p>
        <ArrowRight className="hidden size-5 justify-self-end text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground md:block" />
      </Link>
    </li>
  );
}
