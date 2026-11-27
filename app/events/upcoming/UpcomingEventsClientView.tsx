"use client";

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { CalendarDays, MapPin, Info, Users, DollarSign } from 'lucide-react';
import { PageHeader } from "@/components/layout/page-header";
import { motion } from 'framer-motion';
import type { Tables, Enums } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatEventDate } from '@/lib/utils/date';
import { FeedbackModal } from '@/components/events/FeedbackModal';
import { toast } from 'sonner';
import { participationLabel } from '@/lib/event-display';

type SupabaseEvent = Tables<'Event'> & {
  type: Enums<'EventType'>;
  registrationFee?: number | null;
  isFeeRequired?: boolean | null;
  endTime?: string | null;
};

export type MyRegistration = { kind: 'self' } | { kind: 'team'; teamName: string; leadName: string | null };
export type MyRegistrations = Record<string, MyRegistration>;

const UpcomingEventItem = ({ event, mine }: { event: SupabaseEvent; mine?: MyRegistration }) => {
  const supabaseClient = createClient();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabaseClient.auth.getUser();
      if (data.user) {
        setCurrentUser(data.user);
      }
    };
    getUser();
  }, []);

  const formatEventDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    const dateOnly = formatEventDate(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;

    return `${dateOnly}, ${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const formattedStartTime = event.startTime ? formatEventDateTime(event.startTime) : undefined;

  // NEW: check if the event has ended (feedback only after end)
  const isEventOver = () => {
    if (!event.endTime) return false;
    return new Date() > new Date(event.endTime);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <>
      <article data-fade className="group flex h-full flex-col">
        <Link href={`/events/${event.id}`} className="block">
          <div data-clip className="relative aspect-[4/5] overflow-hidden bg-muted">
            {event.imgUrl ? (
              <Image
                src={supabaseClient.storage.from('event-images').getPublicUrl(event.imgUrl).data.publicUrl}
                alt={`${event.name ?? 'Event'} poster`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
              />
            ) : (
              <div className="grid h-full place-items-center p-8 text-center font-display text-4xl">{event.name}</div>
            )}
            {event.type && <span className="absolute left-3 top-3 bg-background px-2 py-1 label">{event.type}</span>}
          </div>
        </Link>

        <div className="flex grow flex-col border-b border-border py-6">
          {formattedStartTime && <p className="font-mono text-sm tabular text-primary">{formattedStartTime}</p>}
          <h3 className="mt-3 text-3xl font-extrabold leading-[0.95] tracking-[-0.04em] [font-stretch:110%]">
            <Link href={`/events/${event.id}`} className="hover:text-primary">
              {event.name ?? 'Upcoming event'}
            </Link>
          </h3>
          {event.description && <p className="mt-4 line-clamp-3 text-muted-foreground">{event.description.split('\n')[0]}</p>}
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
            {event.location && (
              <div>
                <dt className="label text-muted-foreground">Venue</dt>
                <dd className="mt-1 font-semibold">{event.location}</dd>
              </div>
            )}
            {event.participationMode === 'TEAM' && (
              <div>
                <dt className="label text-muted-foreground">Who</dt>
                <dd className="mt-1 font-semibold">{participationLabel(event)}</dd>
              </div>
            )}
            {event.registrationFee && event.registrationFee > 0 ? (
              <div>
                <dt className="label text-muted-foreground">Fee</dt>
                <dd className="mt-1 font-mono font-semibold tabular">₹{event.registrationFee}</dd>
              </div>
            ) : null}
            {(event.Cluster || event.organizer_info) && (
              <div className="col-span-2">
                <dt className="label text-muted-foreground">Led by</dt>
                <dd className="mt-1 whitespace-pre-line text-muted-foreground">
                  {[event.Cluster, event.organizer_info].filter(Boolean).join('\n')}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-6">
            {isEventOver() ? (
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    toast.error('Sign in to give feedback.');
                    return;
                  }
                  setShowFeedbackModal(true);
                }}
                className="inline-flex h-12 w-full items-center justify-center border border-foreground/30 font-semibold transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
              >
                Give feedback
              </button>
            ) : mine ? (
              <>
                {mine.kind === 'team' && (
                  <p className="mb-3 border-l border-primary pl-3 text-sm">
                    <span className="font-semibold">Team {mine.teamName}</span>
                    {mine.leadName && <span className="text-muted-foreground"> · added by {mine.leadName}</span>}
                  </p>
                )}
                <Link
                  href={`/events/${event.id}/register`}
                  className="group/cta inline-flex h-12 w-full items-center justify-between border border-foreground px-5 font-semibold transition-colors hover:bg-foreground hover:text-background"
                >
                  {mine.kind === 'team' ? 'Your team is registered' : 'You’re registered'}
                  <ArrowRight className="size-5 transition-transform group-hover/cta:translate-x-1" />
                </Link>
              </>
            ) : (
              <Link
                href={`/events/${event.id}/register`}
                className="group/cta inline-flex h-12 w-full items-center justify-between bg-primary px-5 font-semibold text-primary-foreground transition-colors hover:bg-foreground hover:text-background"
              >
                Register now
                <ArrowRight className="size-5 transition-transform group-hover/cta:translate-x-1" />
              </Link>
            )}
          </div>
        </div>
      </article>

      {/* FEEDBACK MODAL */}
      {showFeedbackModal && currentUser && (
        <FeedbackModal
          eventId={event.id}
          userId={currentUser.id}
          eventName={event.name || 'Event'}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}
    </>
  );
};

export default function UpcomingEventsClientView({ events, mine = {} }: { events: SupabaseEvent[]; mine?: MyRegistrations }) {
  const pageVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
  };

  const titleVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 } },
  };

  const gridVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.4,
        staggerChildren: 0.15,
        when: "beforeChildren",
      },
    },
  };

  const noEventsVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.5 } },
  };

  return (
    <motion.div
      className="mx-auto max-w-[1600px] px-5 pb-24 sm:px-8 sm:pb-36"
      initial="hidden"
      animate="visible"
      variants={pageVariants}
    >
      <PageHeader title="Upcoming" description="Open events you can register for now. Pick one to see the details and save your seat." />

      {events && events.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-2 lg:grid-cols-3"
          variants={gridVariants}
          initial="hidden"
          animate="visible"
        >
          {events.map((event) => (
            <UpcomingEventItem key={event.id} event={event} mine={mine[event.id]} />
          ))}
        </motion.div>
      ) : (
        <div className="grid gap-10 border-y border-border py-16 lg:grid-cols-12 lg:py-24">
          <p className="text-[clamp(2rem,4.5vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.04em] [font-stretch:110%] lg:col-span-7">
            Nothing is open for registration right now.
          </p>
          <div className="lg:col-span-4 lg:col-start-9 lg:self-end">
            <p className="text-lg leading-snug text-muted-foreground">
              New events land here first. Sign in so your registrations and attendance are tracked when they do.
            </p>
            <Link
              href="/events"
              className="group mt-6 inline-flex h-14 items-center gap-8 bg-primary px-6 font-semibold text-primary-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              Browse past events
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  );
}
