'use client';

import { useId, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ImagePlus, Loader2, X } from 'lucide-react';
import { useAuth } from '@/components/context/AuthContext';
import type { Tables, TablesInsert } from '@/lib/supabase/database.types';
import { EVENT_STATUS_NAME, EVENT_TYPE_NAME, TEAM_SIZE_OPTIONS, participationLabel, posterUrl } from '@/lib/event-display';
import { EVENT_CLUSTERS, resolveEventCluster, type AdminCluster, type EventCluster } from '@/lib/admin-clusters';
import { cn } from '@/lib/utils';

type Event = Tables<'Event'>;
type Mode = 'INDIVIDUAL' | 'TEAM';

const IST_OFFSET_MS = 330 * 60 * 1000;
/** ISO → "YYYY-MM-DDTHH:mm" wall time in IST, for <input type="datetime-local">. */
const toIstInput = (iso?: string | null) => (iso ? new Date(new Date(iso).getTime() + IST_OFFSET_MS).toISOString().slice(0, 16) : '');
/** IST wall time → ISO. */
const fromIstInput = (v: string) => new Date(`${v}:00+05:30`).toISOString();

const MAX_POSTER_BYTES = 5 * 1024 * 1024;

interface Props {
  event?: Event;
  adminCluster: AdminCluster;
  /** Registrations already taken; participation can't change once anyone has registered. */
  registrationCount?: number;
}

export default function EventEditor({ event, adminCluster, registrationCount = 0 }: Props) {
  const { supabase } = useAuth();
  const router = useRouter();
  const uid = useId();
  const editing = !!event;
  const modeLocked = editing && registrationCount > 0;

  const [name, setName] = useState(event?.name ?? '');
  const [type, setType] = useState<Event['type']>(event?.type ?? 'WORKSHOP');
  const [status, setStatus] = useState<Event['status']>(event?.status ?? 'OPEN');
  const [start, setStart] = useState(toIstInput(event?.startTime));
  const [end, setEnd] = useState(toIstInput(event?.endTime));
  const [location, setLocation] = useState(event?.location ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [cluster, setCluster] = useState<EventCluster | ''>(
    resolveEventCluster(event?.Cluster ?? null) ?? (adminCluster === 'Core' ? '' : resolveEventCluster(adminCluster) ?? '')
  );
  const [mode, setMode] = useState<Mode>((event?.participationMode as Mode) ?? 'INDIVIDUAL');
  const [teamSizes, setTeamSizes] = useState<number[]>(event?.teamSizes?.length ? [...event.teamSizes] : [2, 3, 4]);
  const [capacity, setCapacity] = useState(event?.maxCapacity != null ? String(event.maxCapacity) : '');
  const [paidEvent, setPaidEvent] = useState(!!event?.isFeeRequired && Number(event?.registrationFee ?? 0) > 0);
  const [fee, setFee] = useState(event?.registrationFee ? String(Number(event.registrationFee)) : '');
  const [imgPath, setImgPath] = useState<string | null>(event?.imgUrl ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const posterSrc = preview ?? (imgPath ? posterUrl({ imgUrl: imgPath }) : null);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Give the event a name.';
    if (!start) e.start = 'Set when it starts.';
    if (start && end && fromIstInput(end) <= fromIstInput(start)) e.end = 'End must be after the start.';
    if (!location.trim()) e.location = 'Add the venue, or “To be announced”.';
    if (!description.trim()) e.description = 'Describe the event so members know what they’re signing up for.';
    if (!cluster) e.cluster = 'Choose the organising cluster.';
    else if (adminCluster !== 'Core' && cluster !== adminCluster) e.cluster = 'Choose your own cluster.';
    if (mode === 'TEAM' && teamSizes.length === 0) e.teamSizes = 'Pick at least one team size.';
    if (capacity && !(Number.isInteger(Number(capacity)) && Number(capacity) > 0)) e.capacity = 'Use a whole number above 0, or leave it empty.';
    if (paidEvent && !(Number(fee) > 0)) e.fee = 'Enter the fee in rupees.';
    return e;
  }, [name, start, end, location, description, cluster, adminCluster, mode, teamSizes, capacity, paidEvent, fee]);
  const show = (k: string) => (attempted ? errors[k] : undefined);

  function pickFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('Choose an image file (PNG, JPG or WebP).');
    if (f.size > MAX_POSTER_BYTES) return toast.error('That image is over 5 MB. Export a smaller one.');
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function toggleSize(n: number) {
    setTeamSizes((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n].sort()));
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAttempted(true);
    setError(null);
    if (Object.keys(errors).length) {
      const form = e.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setSaving(true);
    try {
      let img = imgPath;
      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'event';
        const path = `${Date.now()}-${slug}.${ext}`;
        const { error: upErr } = await supabase.storage.from('event-images').upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw new Error(`Poster upload failed: ${upErr.message}`);
        img = path;
      }

      const payload: TablesInsert<'Event'> = {
        Cluster: cluster || null,
        name: name.trim(),
        type,
        status,
        startTime: fromIstInput(start),
        endTime: end ? fromIstInput(end) : null,
        location: location.trim(),
        description: description.trim(),
        imgUrl: img,
        maxCapacity: capacity ? Number(capacity) : null,
        isFeeRequired: paidEvent,
        registrationFee: paidEvent ? Number(fee) : 0,
        participationMode: mode,
        teamSizes: mode === 'TEAM' ? [...teamSizes].sort() : null,
      };

      const { data, error: dbErr } = editing
        ? await supabase.from('Event').update(payload).eq('id', event!.id).select('id').single()
        : await supabase.from('Event').insert(payload).select('id').single();
      if (dbErr) {
        if (/Cluster/.test(dbErr.message)) {
          throw new Error('The event cluster database migration has not been applied yet.');
        }
        if (/participationMode|teamSizes/.test(dbErr.message)) {
          throw new Error('The database doesn’t have team registration yet. Apply migration 20261120130000_team_registration.sql, then save again.');
        }
        throw new Error(dbErr.message);
      }

      toast.success(editing ? 'Event updated.' : 'Event created.');
      router.push(`/admin/events/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the event. Try again.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate>
      <Link
        href={editing ? `/admin/events/${event!.id}` : '/admin'}
        className="group inline-flex min-h-11 items-center gap-2 label text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> {editing ? 'Back to the report' : 'All events'}
      </Link>

      <header className="mt-4 border-b border-border pb-8">
        <h1 className="max-w-[24ch] text-balance text-4xl font-extrabold leading-[0.95] tracking-[-0.04em] [font-stretch:110%] sm:text-5xl">
          {editing ? `Edit ${event!.name.trim()}` : 'New event'}
        </h1>
      </header>

      <Section title="Basics">
        <Field id={`${uid}-name`} label="Event name" error={show('name')}>
          {(p) => <input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputCls(!!show('name'))} />}
        </Field>
        <Choice label="Format" name="type" value={type} onChange={(v) => setType(v as Event['type'])} options={Object.entries(EVENT_TYPE_NAME)} />
        <Field id={`${uid}-status`} label="Status" hint="Members can only register while the event is Open.">
          {(p) => (
            <select {...p} value={status} onChange={(e) => setStatus(e.target.value as Event['status'])} className={cn(inputCls(false), 'cursor-pointer')}>
              {Object.entries(EVENT_STATUS_NAME).map(([v, l]) => (
                <option key={v} value={v} className="bg-background">
                  {l}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id={`${uid}-desc`} label="Description" error={show('description')} hint="Line breaks are kept.">
          {(p) => <textarea {...p} rows={6} value={description} onChange={(e) => setDescription(e.target.value)} className={cn(inputCls(!!show('description')), 'mt-2 resize-y border px-3 py-2.5 text-base leading-relaxed')} />}
        </Field>
        <Field id={`${uid}-cluster`} label="Organised by" error={show('cluster')} hint={adminCluster === 'Core' ? 'Choose the cluster running this event.' : 'Your admin access is limited to this cluster.'}>
          {(p) => (
            <select
              {...p}
              value={cluster}
              onChange={(e) => setCluster(e.target.value as EventCluster)}
              disabled={adminCluster !== 'Core'}
              className={cn(inputCls(!!show('cluster')), 'cursor-pointer disabled:cursor-default disabled:opacity-70')}
            >
              {adminCluster === 'Core' && <option value="">Choose a cluster</option>}
              {(adminCluster === 'Core' ? EVENT_CLUSTERS : [resolveEventCluster(adminCluster)].filter((name): name is EventCluster => name !== null)).map((name) => (
                <option key={name} value={name} className="bg-background">{name}</option>
              ))}
            </select>
          )}
        </Field>
      </Section>

      <Section title="When and where">
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
          <Field id={`${uid}-start`} label="Starts (IST)" error={show('start')}>
            {(p) => <input {...p} type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={cn(inputCls(!!show('start')), 'font-mono tabular')} />}
          </Field>
          <Field id={`${uid}-end`} label="Ends (IST)" error={show('end')} hint="Optional. Feedback opens once it ends.">
            {(p) => <input {...p} type="datetime-local" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} className={cn(inputCls(!!show('end')), 'font-mono tabular')} />}
          </Field>
        </div>
        <Field id={`${uid}-loc`} label="Venue" error={show('location')}>
          {(p) => <input {...p} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={160} className={inputCls(!!show('location'))} />}
        </Field>
      </Section>

      <Section title="Poster">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative grid aspect-[4/5] w-40 shrink-0 place-items-center overflow-hidden bg-muted">
            {posterSrc ? (
              <Image src={posterSrc} alt="Poster preview" fill sizes="160px" className="object-cover" unoptimized={!!preview} />
            ) : (
              <ImagePlus className="size-6 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div>
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 border border-foreground/25 px-4 text-sm font-semibold transition-colors hover:bg-foreground hover:text-background has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring">
              <ImagePlus className="size-4" /> {posterSrc ? 'Replace poster' : 'Upload poster'}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
            {posterSrc && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setImgPath(null);
                }}
                className="ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" /> Remove
              </button>
            )}
            <p className="mt-3 max-w-[44ch] text-sm text-muted-foreground">Portrait (4:5) reads best on phones. PNG, JPG or WebP, up to 5 MB.</p>
          </div>
        </div>
      </Section>

      <Section title="Participation">
        <Choice
          label="Who registers"
          name="mode"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            ['INDIVIDUAL', 'Individual'],
            ['TEAM', 'Team'],
          ]}
          disabled={modeLocked}
          hint={
            modeLocked
              ? `Locked: ${registrationCount} ${registrationCount === 1 ? 'registration has' : 'registrations have'} already come in.`
              : mode === 'TEAM'
                ? 'One member registers the team as its lead and enters each teammate’s name and register number.'
                : 'Each member registers on their own.'
          }
        />
        {mode === 'TEAM' && (
          <div role="group" aria-labelledby={`${uid}-sizes`} aria-describedby={show('teamSizes') ? `${uid}-sizes-err` : `${uid}-sizes-hint`}>
            <p id={`${uid}-sizes`} className="label text-muted-foreground">
              Allowed team sizes
            </p>
            <div className="mt-2 flex">
              {TEAM_SIZE_OPTIONS.map((n) => (
                <label
                  key={n}
                  className={cn(
                    'relative -ml-px flex h-12 min-w-28 cursor-pointer items-center justify-center gap-2 border px-4 font-semibold transition-colors first:ml-0 hover:border-foreground has-[:checked]:z-10 has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                    show('teamSizes') ? 'border-destructive' : 'border-foreground/25'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={teamSizes.includes(n)}
                    onChange={() => toggleSize(n)}
                    aria-invalid={!!show('teamSizes')}
                    className="sr-only"
                  />
                  <span className="font-mono tabular">{n}</span> members
                </label>
              ))}
            </div>
            {show('teamSizes') ? (
              <p id={`${uid}-sizes-err`} className="mt-2 text-sm text-destructive">
                {show('teamSizes')}
              </p>
            ) : (
              <p id={`${uid}-sizes-hint`} className="mt-2 text-sm text-muted-foreground">
                Select every size you’ll accept. Members see “{participationLabel({ participationMode: 'TEAM', teamSizes: teamSizes.length ? teamSizes : null })}”.
              </p>
            )}
          </div>
        )}
      </Section>

      <Section title="Registration">
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
          <Field
            id={`${uid}-cap`}
            label={mode === 'TEAM' ? 'Capacity (teams)' : 'Capacity (people)'}
            error={show('capacity')}
            hint="Leave empty for no limit."
          >
            {(p) => (
              <input {...p} inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, '').slice(0, 5))} className={cn(inputCls(!!show('capacity')), 'font-mono tabular')} />
            )}
          </Field>
          <div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
              <input type="checkbox" checked={paidEvent} onChange={(e) => setPaidEvent(e.target.checked)} className="size-5 cursor-pointer accent-[hsl(var(--primary))]" />
              Paid event
            </label>
            {paidEvent && (
              <Field id={`${uid}-fee`} label={mode === 'TEAM' ? 'Fee per team (₹)' : 'Fee (₹)'} error={show('fee')} className="mt-3">
                {(p) => (
                  <input {...p} inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value.replace(/[^\d.]/g, '').slice(0, 7))} className={cn(inputCls(!!show('fee')), 'font-mono tabular')} />
                )}
              </Field>
            )}
          </div>
        </div>
      </Section>

      {error && (
        <p role="alert" className="mt-8 border-t border-destructive pt-3 text-destructive">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 z-10 -mx-5 mt-10 flex items-center justify-end gap-2 border-t border-border bg-background px-5 py-4 sm:-mx-8 sm:px-8">
        {attempted && Object.keys(errors).length > 0 && (
          <p className="mr-auto text-sm text-destructive">
            Fix the <span className="font-mono tabular">{Object.keys(errors).length}</span> highlighted {Object.keys(errors).length === 1 ? 'field' : 'fields'}.
          </p>
        )}
        <Link href={editing ? `/admin/events/${event!.id}` : '/admin'} className="inline-flex h-12 items-center px-4 font-semibold text-muted-foreground hover:text-foreground">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-12 min-w-40 items-center justify-center gap-2 bg-primary px-6 font-semibold text-primary-foreground transition-colors hover:bg-foreground hover:text-background active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Create event'}
        </button>
      </div>
    </form>
  );
}

const inputCls = (invalid: boolean) =>
  cn(
    'mt-1 w-full rounded-none border-0 border-b bg-transparent pb-3 pt-2 text-lg outline-none transition-colors focus:border-primary focus-visible:outline-none',
    invalid ? 'border-destructive' : 'border-foreground/30'
  );

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-b border-border py-10 lg:grid-cols-12 lg:gap-8">
      <h2 className="text-xl font-semibold tracking-[-0.02em] lg:col-span-3">{title}</h2>
      <div className="space-y-8 lg:col-span-8 lg:col-start-5">{children}</div>
    </section>
  );
}

type FieldProps = { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string };

function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: (p: FieldProps) => React.ReactNode;
}) {
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label text-muted-foreground">
        {label}
      </label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-err`} className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Choice({
  label,
  name,
  value,
  onChange,
  options,
  disabled,
  hint,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  disabled?: boolean;
  hint?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-labelledby={id} aria-describedby={hint ? `${id}-hint` : undefined}>
      <p id={id} className="label text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap">
        {options.map(([v, l]) => (
          <label
            key={v}
            className={cn(
              'relative -ml-px flex h-12 min-w-28 items-center justify-center border border-foreground/25 px-4 font-semibold transition-colors first:ml-0 has-[:checked]:z-10 has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-foreground'
            )}
          >
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} disabled={disabled} className="sr-only" />
            {l}
          </label>
        ))}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
