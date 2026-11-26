"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/context/AuthContext';
import { Loader } from '@/components/ui/loader';
import type { Tables } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { participationLabel } from '@/lib/event-display';
import { fetchTeamMemberships } from '@/lib/team-membership';

export type ParticipantWithPoints = Tables<'PublicUserProfile'> & {
  points: number | null;
};

interface EventDetailClientProps {
  initialEvent: Tables<'Event'> | null;
  initialParticipants: ParticipantWithPoints[];
  eventId: string;
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }) + ' IST';
};

export default function EventDetailClient({ initialEvent, initialParticipants, eventId }: EventDetailClientProps) {
  const supabaseClient = createClient();
  const { user: authUser, supabase, loading: authLoading } = useAuth();

  const [event] = useState<Tables<'Event'> | null>(initialEvent);
  const [participants] = useState<ParticipantWithPoints[]>(initialParticipants);
  const [isRegistered, setIsRegistered] = useState(false);
  const isEventCompleted = event?.status === 'DONE';
  const canRegister = event?.status === 'OPEN';
  const leaderboardData = isEventCompleted ? participants : [];

  // Is the signed-in member already registered?
  useEffect(() => {
    if (!authUser || !supabase || authLoading) return;
    supabase
      .from('Registration')
      .select('id')
      .eq('userId', authUser.id)
      .eq('eventId', eventId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error) return;
        if (data) return setIsRegistered(true);
        // Not the lead: a teammate may have registered them by register number.
        const teams = await fetchTeamMemberships(supabase, authUser.id, eventId);
        setIsRegistered(teams.length > 0);
      });
  }, [authUser, supabase, authLoading, eventId]);

  const imageContainerClass = isEventCompleted ? "aspect-video" : "aspect-4/5";

  const renderActionButton = () => {
    const base = "inline-flex h-14 w-full items-center justify-between gap-8 px-6 font-semibold sm:w-auto sm:min-w-64";
    if (isEventCompleted) {
      return <span className={`${base} border border-border text-muted-foreground`}>This event has wrapped up</span>;
    }
    if (!canRegister) {
      return <span className={`${base} border border-border text-muted-foreground`}>Registration closed</span>;
    }
    if (isRegistered) {
      return (
        <Link
          href={`/events/${event!.id}/register`}
          className={`group ${base} border border-foreground transition-colors hover:bg-foreground hover:text-background`}
        >
          You&rsquo;re registered
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
        </Link>
      );
    }
    return (
      <Link
        href={`/events/${event!.id}/register`}
        className={`group ${base} bg-primary text-primary-foreground transition-colors hover:bg-foreground hover:text-background`}
      >
        Register for this event
        <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
      </Link>
    );
  };

  const renderParticipantsList = () => {
    const dataToShow = isEventCompleted ? leaderboardData : participants;
    const title = isEventCompleted ? "Leaderboard" : "Participants";

    return (
      <div className="p-6 md:p-8">
        <h2 className="text-2xl font-semibold mb-4 text-primary">{title}</h2>
        {dataToShow.length > 0 ? (
          <ul className="space-y-3">
            {dataToShow.map((participant, index) => (
              <li key={participant.id || index} className="bg-muted p-4 rounded-lg shadow-sm flex justify-between items-center">
                <Link
                  href={`/user/${participant.id}`}
                  className="font-semibold text-card-foreground hover:underline">
                  {participant.name || 'Anonymous User'}
                </Link>
                {isEventCompleted && (
                  <span className="font-bold text-lg text-primary">
                    {typeof participant.points === 'number' ? `${participant.points} pts` : '-'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            {isEventCompleted ? "No participants data available." : "No participants yet. Be the first to register!"}
          </p>
        )}
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl text-muted-foreground">Event not found.</p>
      </div>
    );
  }

  const poster = event.imgUrl
    ? /^https?:\/\//.test(event.imgUrl)
      ? event.imgUrl
      : supabaseClient.storage.from('event-images').getPublicUrl(event.imgUrl).data.publicUrl
    : null;
  const typeName = ({ CONTEST: "Contest", WORKSHOP: "Workshop", TALK: "Talk" } as Record<string, string>)[event.type] ?? event.type;
  const statusName = ({ OPEN: "Open for registration", CLOSED: "Registration closed", DONE: "Completed", CANCELLED: "Cancelled" } as Record<string, string>)[event.status] ?? event.status;

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] px-5 pb-24 pt-10 sm:px-8 sm:pb-36 sm:pt-16">
      <Link href="/events" className="group inline-flex items-center gap-2 label text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" /> All events
      </Link>

      <header className="mt-10 border-b border-border pb-10">
        <h1 data-reveal className="max-w-[18ch] text-[clamp(2.75rem,7vw,7rem)] font-extrabold leading-[0.9] tracking-[-0.045em] [font-stretch:112%]">
          <span className="reveal-line">
            <span>{event.name.trim()}</span>
          </span>
        </h1>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            {poster ? (
              <div data-clip className="relative overflow-hidden bg-muted">
                <Image
                  src={poster}
                  alt={`${event.name.trim()} poster`}
                  width={900}
                  height={1125}
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  priority
                  className="h-auto w-full"
                />
              </div>
            ) : (
              <div className="grid aspect-[4/5] place-items-center bg-muted p-10 text-center font-display text-5xl">{event.name.trim()}</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <dl className="grid border-t border-border sm:grid-cols-2">
            {[
              ["Date & time", formatDate(event.startTime)],
              ["Venue", event.location],
              ["Format", typeName],
              ["Participation", participationLabel(event)],
              ["Status", statusName],
            ].map(([k, v]) => (
              <div key={k} className="border-b border-border py-5 sm:odd:pr-6 sm:last:odd:col-span-2">
                <dt className="label text-muted-foreground">{k}</dt>
                <dd className="mt-2 text-lg font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          <div data-fade className="mt-10 max-w-[65ch] whitespace-pre-line text-lg leading-relaxed text-foreground/85">
            {event.description || 'No description available yet.'}
          </div>

          {(event.Cluster || event.organizer_info) && (
            <div className="mt-10 border-t border-border pt-6">
              <p className="label text-muted-foreground">Organised by</p>
              {event.Cluster && <p className="mt-3 text-base leading-relaxed">{event.Cluster}</p>}
              {event.organizer_info && <p className="mt-3 whitespace-pre-line text-base leading-relaxed">{event.organizer_info}</p>}
            </div>
          )}

          <div className="mt-12">{renderActionButton()}</div>
        </div>
      </div>

    </div>
  );
}
