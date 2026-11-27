'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarPlus, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/components/context/AuthContext';
import { PaymentModal } from '@/components/PaymentModal';
import type { Tables } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';
import type { TeamMembership } from '@/lib/team-membership';
import {
  EVENT_TYPE_NAME,
  REG_NO_RE,
  type TeamMember,
  calendarUrl,
  feeOf,
  formatDay,
  formatStamp,
  formatTime,
  normaliseRegNo,
  participationLabel,
  posterUrl,
  teamSizesOf,
} from '@/lib/event-display';

type Profile = Pick<
  Tables<'UserProfile'>,
  'id' | 'name' | 'registrationNumber' | 'department' | 'year' | 'contactNumber'
>;
type Registration = Pick<Tables<'Registration'>, 'id' | 'registeredAt' | 'paymentStatus'>;
export type Team = { name: string; size: number; members: TeamMember[] };

export type RegistrationState =
  | { kind: 'signed-out' }
  | { kind: 'no-profile'; email: string }
  | {
      kind: 'member';
      email: string;
      profile: Profile;
      registration: Registration | null;
      team: Team | null;
      /** Set when another member's team lists this member's register number. */
      teammateOf?: TeamMembership | null;
    };

interface Props {
  event: Tables<'Event'>;
  taken: number;
  state: RegistrationState;
}

const MOBILE_RE = /^[6-9]\d{9}$/;
const EMPTY_MEMBER: TeamMember = { name: '', registrationNumber: '' };

/** Turns Postgres / trigger errors into copy a member can act on. */
function explain(message: string | undefined): string {
  if (!message) return 'Something went wrong. Check your connection and try again.';
  if (/full/i.test(message)) return 'This event just filled up. Every place is taken.';
  if (/closed/i.test(message)) return 'Registration closed for this event a moment ago.';
  if (/contactNumber/i.test(message)) return 'We could not save your mobile number. Try again, or update it in Settings.';
  return message;
}

type FieldErrors = {
  teamName?: string;
  members: { name?: string; registrationNumber?: string }[];
};

function validateTeam(teamName: string, members: TeamMember[], leadRegNo: string): FieldErrors {
  const errors: FieldErrors = { members: members.map(() => ({})) };
  const name = teamName.trim();
  if (!name) errors.teamName = 'Give your team a name.';
  else if (name.length > 60) errors.teamName = 'Keep the team name under 60 characters.';

  const seen = new Map<string, number>([[normaliseRegNo(leadRegNo), -1]]);
  members.forEach((m, i) => {
    if (!m.name.trim()) errors.members[i].name = 'Enter their name.';
    else if (m.name.trim().length > 100) errors.members[i].name = 'Name is too long.';
    const rn = normaliseRegNo(m.registrationNumber);
    if (!rn) errors.members[i].registrationNumber = 'Enter their register number.';
    else if (!REG_NO_RE.test(rn)) errors.members[i].registrationNumber = 'Use letters and digits only, 5 to 20 characters.';
    else if (seen.has(rn)) {
      errors.members[i].registrationNumber = seen.get(rn) === -1 ? 'That’s your register number. Add a teammate’s.' : `Same as member ${seen.get(rn)! + 2}.`;
    } else seen.set(rn, i);
  });
  return errors;
}

const hasErrors = (e: FieldErrors) => !!e.teamName || e.members.some((m) => m.name || m.registrationNumber);

export default function RegistrationForm({ event, taken, state }: Props) {
  const { supabase, login, loading: authLoading } = useAuth();
  const mobileId = useId();
  const errorId = useId();
  const teamNameId = useId();

  const member = state.kind === 'member' ? state : null;
  const sizes = teamSizesOf(event);
  const isTeam = sizes.length > 0;

  const [registration, setRegistration] = useState<Registration | null>(member?.registration ?? null);
  const teammateOf = member?.registration ? null : member?.teammateOf ?? null;
  const [team, setTeam] = useState<Team | null>(member?.team ?? null);
  const [mobile, setMobile] = useState(member?.profile.contactNumber ?? '');
  const [teamSize, setTeamSize] = useState<number>(sizes[0] ?? 1);
  const [teamName, setTeamName] = useState('');
  // Keep up to three teammates so switching size doesn't lose typed entries.
  const [members, setMembers] = useState<TeamMember[]>([EMPTY_MEMBER, EMPTY_MEMBER, EMPTY_MEMBER]);
  const [touched, setTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fee = feeOf(event);
  const poster = posterUrl(event);
  const capacity = event.maxCapacity ?? null;
  const seatsLeft = capacity != null ? Math.max(capacity - taken - (registration && !member?.registration ? 1 : 0), 0) : null;
  const isOpen = event.status === 'OPEN';
  const isFull = capacity != null && seatsLeft === 0 && !registration;
  const paid = registration?.paymentStatus === 'completed';
  const needsPayment = !!registration && fee > 0 && !paid;

  const savedMobile = member?.profile.contactNumber ?? '';
  const mobileValid = MOBILE_RE.test(mobile);
  const mobileError = (touched || attempted) && !mobileValid
    ? mobile.length === 0
      ? 'Enter your mobile number so organisers can reach you.'
      : 'Enter a 10-digit Indian mobile number, without +91 or spaces.'
    : null;

  const activeMembers = isTeam ? members.slice(0, teamSize - 1) : [];
  const teamErrors = isTeam ? validateTeam(teamName, activeMembers, member?.profile.registrationNumber ?? '') : { members: [] };
  const shownTeamErrors: FieldErrors = attempted ? teamErrors : { members: activeMembers.map(() => ({})) };

  const setMember = (i: number, patch: Partial<TeamMember>) =>
    setMembers((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const description = event.description?.trim() ?? '';
  const longDescription = description.length > 420 || description.split('\n').length > 7;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!member || submitting) return;
    setAttempted(true);
    setError(null);
    if ((isTeam && hasErrors(teamErrors)) || !mobileValid) {
      // Errors render on the next frame; then focus the first field with a problem.
      const form = e.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    const cleanMembers = activeMembers.map((m) => ({ name: m.name.trim(), registrationNumber: normaliseRegNo(m.registrationNumber) }));

    setSubmitting(true);
    try {
      if (mobile !== savedMobile) {
        const { error: profileError } = await supabase
          .from('UserProfile')
          .update({ contactNumber: mobile })
          .eq('id', member.profile.id);
        if (profileError) throw new Error(`contactNumber: ${profileError.message}`);
      }

      const { error: rpcError } = await supabase.rpc('register_for_event', {
        p_event_id: event.id,
        p_team_name: isTeam ? teamName.trim() : null,
        p_team_size: isTeam ? teamSize : null,
        p_members: isTeam ? cleanMembers : null,
      });

      if (rpcError) {
        const missingFn = rpcError.code === 'PGRST202' || /could not find the function/i.test(rpcError.message);
        if (missingFn && !isTeam) {
          // Database not migrated yet: individual events can still use the direct insert.
          const { error: insertError } = await supabase.from('Registration').insert({ eventId: event.id, userId: member.profile.id });
          if (insertError && insertError.code !== '23505') throw new Error(insertError.message);
        } else if (missingFn) {
          throw new Error('Team registration isn’t switched on yet. Please contact the organisers.');
        } else if (rpcError.code !== '23505') {
          // 23505 = already registered (double submit, another tab): fall through and load it.
          throw new Error(rpcError.message);
        }
      }

      const { data: row } = await supabase
        .from('Registration')
        .select('id, registeredAt, paymentStatus')
        .eq('eventId', event.id)
        .eq('userId', member.profile.id)
        .maybeSingle();
      if (!row) throw new Error();

      if (isTeam) {
        const { data: saved } = await supabase
          .from('RegistrationTeam')
          .select('teamName, teamSize, members')
          .eq('registrationId', row.id)
          .maybeSingle();
        setTeam(
          saved
            ? { name: saved.teamName, size: saved.teamSize, members: (saved.members as TeamMember[]) ?? [] }
            : { name: teamName.trim(), size: teamSize, members: cleanMembers }
        );
      }

      setRegistration(row as Registration);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (fee > 0 && row.paymentStatus !== 'completed') {
        toast.success('Place held. Complete the payment to confirm it.');
        setShowPayment(true);
      } else {
        toast.success(isTeam ? `Team ${teamName.trim()} is registered.` : `You're registered for ${event.name.trim()}.`);
      }
    } catch (err) {
      setError(explain(err instanceof Error ? err.message : undefined));
    } finally {
      setSubmitting(false);
    }
  }

  const facts: [string, React.ReactNode][] = [
    ['Date', <span key="d" className="font-mono tabular">{formatDay(event.startTime)}</span>],
    [
      'Time',
      <span key="t" className="font-mono tabular">
        {formatTime(event.startTime)}
        {event.endTime ? ` – ${formatTime(event.endTime)}` : ''} IST
      </span>,
    ],
    ['Venue', event.location || 'To be announced'],
    ['Format', EVENT_TYPE_NAME[event.type] ?? event.type],
    ['Participation', participationLabel(event)],
    ['Fee', fee > 0 ? <span key="f" className="font-mono tabular">₹{fee}</span> : 'Free'],
  ];
  if (seatsLeft != null) {
    facts.push([
      isTeam ? 'Team places left' : 'Seats left',
      <span key="s" className={cn('font-mono tabular', seatsLeft <= 10 && seatsLeft > 0 && 'text-primary')}>
        {seatsLeft} <span className="text-muted-foreground">/ {capacity}</span>
      </span>,
    ]);
  }

  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-10 sm:px-8 sm:pb-36 sm:pt-16">
      <Link
        href={`/events/${event.id}`}
        className="group inline-flex min-h-11 items-center gap-2 label text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> Event page
      </Link>

      <header className="mt-6 border-b border-border pb-8 sm:mt-8 sm:pb-10">
        <h1 className="max-w-[20ch] text-balance text-[clamp(2.25rem,5.5vw,5rem)] font-extrabold leading-[0.92] tracking-[-0.04em] [font-stretch:110%]">
          {registration || teammateOf ? (
            <>
              <span className="text-primary">You&rsquo;re in.</span> {event.name.trim()}
            </>
          ) : (
            <>Register for {event.name.trim()}</>
          )}
        </h1>
      </header>

      <div className="mt-10 grid gap-12 lg:mt-12 lg:grid-cols-12 lg:gap-8">
        {/* Poster */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            {poster ? (
              <div className="relative mx-auto max-w-md overflow-hidden bg-muted lg:max-w-none">
                <Image
                  src={poster}
                  alt={`${event.name.trim()} poster`}
                  width={900}
                  height={1125}
                  sizes="(min-width: 1024px) 40vw, (min-width: 640px) 28rem, 100vw"
                  priority
                  className="h-auto w-full"
                />
              </div>
            ) : (
              <div className="grid aspect-[4/5] place-items-center bg-muted p-10 text-center text-4xl font-extrabold tracking-[-0.04em] [font-stretch:110%]">
                {event.name.trim()}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          {/* Confirmation */}
          {registration && (
            <section aria-live="polite" className="mb-12 bg-foreground p-6 text-background sm:p-8">
              <p className="text-2xl font-semibold tracking-[-0.02em]">
                {needsPayment
                  ? `${isTeam ? 'Your team’s place' : 'Your seat'} is held. Payment is pending.`
                  : `${isTeam ? 'Your team’s place' : 'Your seat'} is confirmed.`}
              </p>
              <p className="mt-2 text-background/70">
                Registered <span className="font-mono tabular">{formatStamp(registration.registeredAt)}</span>
                {fee > 0 && paid && ' · Paid'}
              </p>
              {team && member && (
                <div className="mt-6 border-t border-background/20 pt-4">
                  <p className="label text-background/60">Team</p>
                  <p className="mt-1 text-lg font-semibold">{team.name}</p>
                  <ol className="mt-3 space-y-1.5 text-sm">
                    {[{ name: member.profile.name, registrationNumber: member.profile.registrationNumber, lead: true }, ...team.members].map((m, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-4">
                        <span className="min-w-0 truncate">
                          {m.name}
                          {'lead' in m && <span className="text-background/60"> · lead</span>}
                        </span>
                        <span className="shrink-0 font-mono tabular text-background/70">{m.registrationNumber}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                {needsPayment ? (
                  <button
                    type="button"
                    onClick={() => setShowPayment(true)}
                    className="group inline-flex h-12 items-center justify-between gap-6 bg-primary px-5 font-semibold text-primary-foreground transition-colors hover:bg-background hover:text-foreground"
                  >
                    Pay <span className="font-mono tabular">₹{fee}</span>
                    <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                  </button>
                ) : (
                  <a
                    href={calendarUrl(event)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex h-12 items-center justify-between gap-6 bg-primary px-5 font-semibold text-primary-foreground transition-colors hover:bg-background hover:text-foreground"
                  >
                    Add to calendar
                    <CalendarPlus className="size-5" />
                  </a>
                )}
                <Link
                  href={`/events/${event.id}`}
                  className="group inline-flex h-12 items-center justify-between gap-6 border border-background/30 px-5 font-semibold transition-colors hover:bg-background hover:text-foreground"
                >
                  Back to the event
                  <ArrowUpRight className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </section>
          )}

          {/* Confirmation for a member their teammate registered */}
          {teammateOf && member && (
            <TeammateConfirmation event={event} membership={teammateOf} selfName={member.profile.name} fee={fee} />
          )}

          {/* Event facts */}
          <dl className="grid grid-cols-2 border-t border-border">
            {facts.map(([k, v], i) => (
              <div
                key={k}
                className={cn(
                  'border-b border-border py-4 sm:py-5',
                  i % 2 === 0 && 'pr-4 sm:pr-6',
                  k === 'Venue' && 'col-span-2 sm:col-span-1',
                  // Venue spans both columns on phones, so the parity flips; a lone last cell takes the full row.
                  i === facts.length - 1 && facts.length % 2 === 0 && 'col-span-2 sm:col-span-1',
                  i === facts.length - 1 && facts.length % 2 === 1 && 'sm:col-span-2'
                )}
              >
                <dt className="label text-muted-foreground">{k}</dt>
                <dd className="mt-1.5 text-base font-semibold sm:text-lg">{v}</dd>
              </div>
            ))}
          </dl>

          {description && (
            <div className="mt-8">
              <h2 className="label text-muted-foreground">About the event</h2>
              <div
                id="event-description"
                className={cn(
                  'mt-3 max-w-[65ch] whitespace-pre-line leading-relaxed text-foreground/85',
                  longDescription && !detailsOpen && 'line-clamp-6'
                )}
              >
                {description}
              </div>
              {longDescription && (
                <button
                  type="button"
                  aria-expanded={detailsOpen}
                  aria-controls="event-description"
                  onClick={() => setDetailsOpen((v) => !v)}
                  className="mt-2 min-h-11 text-sm font-semibold text-primary underline decoration-1 underline-offset-4 hover:text-foreground"
                >
                  {detailsOpen ? 'Show less' : 'Read the full details'}
                </button>
              )}
            </div>
          )}

          {(event.Cluster || event.organizer_info) && (
            <div className="mt-8 border-t border-border pt-5">
              <p className="label text-muted-foreground">Organised by</p>
              {event.Cluster && <p className="mt-2 leading-relaxed">{event.Cluster}</p>}
              {event.organizer_info && <p className="mt-2 whitespace-pre-line leading-relaxed">{event.organizer_info}</p>}
            </div>
          )}

          {/* Form / gate */}
          {!registration && !teammateOf && (
            <section aria-labelledby="form-heading" className="mt-14 border-t border-foreground pt-8">
              <h2 id="form-heading" className="text-2xl font-semibold tracking-[-0.02em]">
                {isOpen && !isFull ? (isTeam && state.kind === 'member' ? 'Your team' : 'Your details') : 'Registration'}
              </h2>

              {!isOpen ? (
                <Notice
                  title={event.status === 'CANCELLED' ? 'This event was cancelled.' : 'Registration is closed.'}
                  body="Watch the upcoming list for the next one."
                  action={{ href: '/events/upcoming', label: 'See upcoming events' }}
                />
              ) : isFull ? (
                <Notice
                  title={isTeam ? 'Every team place is taken.' : 'Every seat is taken.'}
                  body="If a place opens up, the organisers will announce it on ACE's channels."
                  action={{ href: '/events/upcoming', label: 'See other events' }}
                />
              ) : state.kind === 'signed-out' ? (
                <div className="mt-4">
                  <p className="max-w-[52ch] text-muted-foreground">
                    Only signed-in ACE members can register. Sign in with your SASTRA Google account; your name, register
                    number and email are filled in from your profile{isTeam ? ', and you register your team as its lead' : ''}.
                  </p>
                  <button
                    type="button"
                    onClick={() => login()}
                    disabled={authLoading}
                    className="group mt-6 inline-flex h-14 w-full items-center justify-between gap-8 bg-primary px-6 font-semibold text-primary-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-60 sm:w-auto sm:min-w-72"
                  >
                    Sign in to register
                    <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              ) : state.kind === 'no-profile' ? (
                <Notice
                  title="We couldn't find your member profile."
                  body={`You're signed in as ${state.email}, but no ACE profile is linked to it yet. Sign out and back in; if it still doesn't appear, contact the ACE core team.`}
                />
              ) : (
                <form onSubmit={handleSubmit} noValidate className="mt-2">
                  <p className="max-w-[52ch] text-muted-foreground">
                    {isTeam
                      ? 'You register the team as its lead. Your details come from your SASTRA profile; add your teammates below. They don’t need to sign in.'
                      : 'Name, register number and email come from your SASTRA profile and can’t be edited here.'}
                  </p>

                  {isTeam && (
                    <div className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2">
                      <div role="radiogroup" aria-labelledby={`${teamNameId}-size`} className="sm:col-span-2">
                        <p id={`${teamNameId}-size`} className="label text-muted-foreground">
                          Team size
                        </p>
                        {sizes.length === 1 ? (
                          <p className="mt-2 text-lg font-semibold">
                            <span className="font-mono tabular">{sizes[0]}</span> members, including you
                          </p>
                        ) : (
                          <>
                            <div className="mt-2 flex">
                              {sizes.map((n) => (
                                <label
                                  key={n}
                                  className="relative -ml-px flex h-12 min-w-24 cursor-pointer items-center justify-center gap-1.5 border border-foreground/25 px-4 font-semibold transition-colors first:ml-0 hover:border-foreground has-[:checked]:z-10 has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
                                >
                                  <input
                                    type="radio"
                                    name="teamSize"
                                    value={n}
                                    checked={teamSize === n}
                                    onChange={() => setTeamSize(n)}
                                    className="sr-only"
                                  />
                                  <span className="font-mono tabular">{n}</span> members
                                </label>
                              ))}
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">Including you.</p>
                          </>
                        )}
                      </div>
                      <TextField
                        id={teamNameId}
                        label="Team name"
                        value={teamName}
                        onChange={setTeamName}
                        error={shownTeamErrors.teamName}
                        maxLength={60}
                        className="sm:col-span-2"
                      />
                    </div>
                  )}

                  {isTeam && <h3 className="mt-12 text-lg font-semibold tracking-[-0.01em]">You · team lead</h3>}

                  <div className={cn('grid gap-x-8 gap-y-7 sm:grid-cols-2', isTeam ? 'mt-5' : 'mt-8')}>
                    <LockedField label="Name" value={member!.profile.name} className="sm:col-span-2" />
                    <LockedField label="Register number" value={member!.profile.registrationNumber} mono />
                    <LockedField label="Email" value={member!.email} />

                    <div className="sm:col-span-2">
                      <label htmlFor={mobileId} className="label text-muted-foreground">
                        Mobile number
                      </label>
                      <div
                        className={cn(
                          'mt-1 flex items-baseline gap-3 border-b transition-colors focus-within:border-primary',
                          mobileError ? 'border-destructive' : 'border-foreground/30'
                        )}
                      >
                        <span aria-hidden="true" className="font-mono text-lg tabular text-muted-foreground">
                          +91
                        </span>
                        <input
                          id={mobileId}
                          name="mobile"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          maxLength={10}
                          placeholder="10-digit number"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          onBlur={() => setTouched(true)}
                          aria-invalid={!!mobileError}
                          aria-describedby={mobileError ? `${mobileId}-err` : `${mobileId}-hint`}
                          className="w-full bg-transparent pb-3 pt-2 font-mono text-lg tabular outline-none placeholder:font-sans placeholder:text-muted-foreground/70 focus-visible:outline-none"
                        />
                      </div>
                      {mobileError ? (
                        <p id={`${mobileId}-err`} className="mt-2 text-sm text-destructive">
                          {mobileError}
                        </p>
                      ) : (
                        <p id={`${mobileId}-hint`} className="mt-2 text-sm text-muted-foreground">
                          {savedMobile
                            ? mobile === savedMobile
                              ? 'From your profile. Change it here if it’s out of date.'
                              : 'This will also update the number on your profile.'
                            : 'Saved to your profile, so you only enter it once.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {activeMembers.map((m, i) => (
                    <div key={i} role="group" aria-labelledby={`${teamNameId}-m${i}`} className="mt-12 border-t border-border pt-6">
                      <h3 id={`${teamNameId}-m${i}`} className="text-lg font-semibold tracking-[-0.01em]">
                        Member <span className="font-mono tabular">{i + 2}</span>
                      </h3>
                      <div className="mt-5 grid gap-x-8 gap-y-7 sm:grid-cols-2">
                        <TextField
                          id={`${teamNameId}-m${i}-name`}
                          label="Name"
                          value={m.name}
                          onChange={(v) => setMember(i, { name: v })}
                          error={shownTeamErrors.members[i]?.name}
                          maxLength={100}
                          autoComplete="off"
                        />
                        <TextField
                          id={`${teamNameId}-m${i}-reg`}
                          label="Register number"
                          value={m.registrationNumber}
                          onChange={(v) => setMember(i, { registrationNumber: v.toUpperCase() })}
                          error={shownTeamErrors.members[i]?.registrationNumber}
                          maxLength={24}
                          mono
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  ))}

                  {error && (
                    <p id={errorId} role="alert" className="mt-8 border-t border-destructive pt-3 text-destructive">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    aria-describedby={error ? errorId : undefined}
                    className="group mt-10 inline-flex h-14 w-full items-center justify-between gap-8 bg-primary px-6 font-semibold text-primary-foreground transition-[background-color,color,transform] duration-300 hover:bg-foreground hover:text-background active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:min-w-80"
                  >
                    {submitting ? (
                      <>
                        Registering…
                        <Loader2 className="size-5 animate-spin" />
                      </>
                    ) : (
                      <>
                        {fee > 0 ? (
                          <span>
                            Register and pay <span className="font-mono tabular">₹{fee}</span>
                          </span>
                        ) : (
                          'Confirm registration'
                        )}
                        <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                  <p className="mt-4 max-w-[52ch] text-sm text-muted-foreground">
                    The organisers of this event will see these details.
                  </p>
                </form>
              )}
            </section>
          )}
        </div>
      </div>

      {showPayment && registration && member && (
        <PaymentModal
          eventId={event.id}
          userId={member.profile.id}
          registrationId={registration.id}
          amount={fee}
          eventName={event.name.trim()}
          userName={member.profile.name}
          userEmail={member.email}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  mono,
  maxLength,
  autoComplete,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  mono?: boolean;
  maxLength?: number;
  autoComplete?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        autoComplete={autoComplete}
        spellCheck={false}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cn(
          'mt-1 w-full rounded-none border-0 border-b bg-transparent pb-3 pt-2 text-lg outline-none transition-colors focus:border-primary focus-visible:outline-none',
          mono && 'font-mono tabular',
          error ? 'border-destructive' : 'border-foreground/30'
        )}
      />
      {error && (
        <p id={`${id}-err`} className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function LockedField({ label, value, mono, className }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <p className="label text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-baseline justify-between gap-3 border-b border-border pb-3 pt-2">
        <span className={cn('min-w-0 break-words text-lg', mono && 'font-mono tabular')}>{value || '—'}</span>
        <Lock aria-label="From your profile" className="size-3.5 shrink-0 text-muted-foreground" />
      </p>
    </div>
  );
}

function TeammateConfirmation({
  event,
  membership,
  selfName,
  fee,
}: {
  event: Tables<'Event'>;
  membership: TeamMembership;
  selfName: string;
  fee: number;
}) {
  const paid = membership.paymentStatus === 'completed';
  const lead = membership.leadName ?? 'Your team lead';
  const roster = [
    { name: lead, note: 'lead' },
    ...(membership.memberNames ?? []).map((name) => ({ name, note: name === selfName ? 'you' : '' })),
  ];

  return (
    <section aria-live="polite" className="mb-12 bg-foreground p-6 text-background sm:p-8">
      <p className="text-2xl font-semibold tracking-[-0.02em]">
        {fee > 0 && !paid ? 'Your team’s place is held. Payment is pending.' : 'Your team’s place is confirmed.'}
      </p>
      <p className="mt-2 max-w-[52ch] text-background/70">
        {lead} registered team <span className="font-semibold text-background">{membership.teamName}</span> with your
        register number, so you don&rsquo;t need to register again.
        {fee > 0 && !paid && ` ${lead} pays the team fee from their account.`}
      </p>
      <div className="mt-6 border-t border-background/20 pt-4">
        <p className="label text-background/60">Team</p>
        <p className="mt-1 text-lg font-semibold">{membership.teamName}</p>
        <ol className="mt-3 space-y-1.5 text-sm">
          {roster.map((m, i) => (
            <li key={i} className="flex items-baseline justify-between gap-4">
              <span className="min-w-0 truncate">{m.name}</span>
              {m.note && <span className="shrink-0 text-background/60">{m.note}</span>}
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <a
          href={calendarUrl(event)}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex h-12 items-center justify-between gap-6 bg-primary px-5 font-semibold text-primary-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          Add to calendar
          <CalendarPlus className="size-5" />
        </a>
        <Link
          href={`/events/${event.id}`}
          className="group inline-flex h-12 items-center justify-between gap-6 border border-background/30 px-5 font-semibold transition-colors hover:bg-background hover:text-foreground"
        >
          Back to the event
          <ArrowUpRight className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
      <p className="mt-5 text-sm text-background/60">
        Not your team? Tell {lead} or an ACE admin so they can correct the register number.
      </p>
    </section>
  );
}

function Notice({ title, body, action }: { title: string; body: string; action?: { href: string; label: string } }) {
  return (
    <div className="mt-4">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-2 max-w-[52ch] text-muted-foreground">{body}</p>
      {action && (
        <Link
          href={action.href}
          className="group mt-6 inline-flex h-12 items-center justify-between gap-8 border border-foreground/25 px-5 font-semibold transition-colors hover:bg-foreground hover:text-background"
        >
          {action.label}
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
