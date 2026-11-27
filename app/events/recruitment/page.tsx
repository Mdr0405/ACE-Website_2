"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/components/context/AuthContext";
import { clusters } from "@/lib/ace-content";

const pad = (n: number) => String(n).padStart(2, "0");

const domains = [
  {
    title: "Web Development",
    imageUrl: "/images/Clusters/WD.png",
    cluster: "Web Development",
  },
  {
    title: "App Development",
    imageUrl: "/images/Clusters/AD.png",
    cluster: "App Development",
  },
  {
    title: "AI ML",
    imageUrl: "/images/Clusters/AIML.png",
    cluster: "AI/ML",
  },
  {
    title: "Cybersecurity",
    imageUrl: "/images/Clusters/cyber.png",
    cluster: "Cybersecurity",
  },
  {
    title: "IOT & Embedded Systems",
    imageUrl: "/images/Clusters/Iot.png",
    cluster: "IoT",
  },
  {
    title: "Networks",
    imageUrl: "/images/Clusters/Networks.png",
    cluster: "Networks",
  },
  {
    title: "Competitive Programming",
    imageUrl: "/images/Clusters/CP.png",
    cluster: "Competitive Programming",
  },
  {
    title: "OpCon & PR",
    imageUrl: "/images/Clusters/Opcon.png",
    cluster: "OpCon & PR",
  },
  {
    title: "Graphic Designing",
    imageUrl: "/images/Clusters/GD.png",
    cluster: "Graphic Designing",
  },
  {
    title: "Video Editing",
    imageUrl: "/images/Clusters/video.png",
    cluster: "Video Editing",
  },
  {
    title: "Content Writing",
    imageUrl: "/images/Clusters/CW.png",
    cluster: "Content Writing",
  },
].map((d) => ({
  ...d,
  // Reuse the description written for the Clusters page, when the titles match.
  description: clusters.find((c) => c.title === d.title)?.description,
}));

// Chamfered (cut-corner) shape used by the tiles. Top-right and bottom-left are cut.
const CHAMFER =
  "[clip-path:polygon(0_0,calc(100%-28px)_0,100%_28px,100%_100%,28px_100%,0_calc(100%-28px))]";

// Smaller cut for the apply button. Bottom-right is cut.
const BUTTON_CUT =
  "[clip-path:polygon(0_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%)]";

/**
 * Recruitment as a futuristic cluster console.
 *
 * Desktop and tablet: a grid of chamfered tiles that power up on hover
 * (glowing edge, scan beam, spinning ring).
 *
 * Phones have no hover, so the tiles become a swipeable deck. The card in the
 * centre is the "active" one and powers up the same way (edge glow, spinning
 * ring), and a tick rail below shows which card you are on and lets you jump.
 */
export default function RecruitPage() {
  const { supabase } = useAuth();
  const listRef = useRef<HTMLUListElement>(null);
  // Index of the centred card in the phone deck. null on larger screens.
  const [active, setActive] = useState<number | null>(null);
  const [formStatus, setFormStatus] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    let current = true;
    supabase.from('RecruitmentForm').select('Cluster, isOpen').then(({ data }) => {
      if (current && data) setFormStatus(Object.fromEntries(data.map((form) => [form.Cluster, form.isOpen])));
    });
    return () => { current = false; };
  }, [supabase]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const items = Array.from(list.children) as HTMLElement[];
    const mq = window.matchMedia("(max-width: 639px)");
    let io: IntersectionObserver | null = null;

    const setup = () => {
      io?.disconnect();
      io = null;
      if (!mq.matches) {
        setActive(null);
        return;
      }
      setActive((prev) => prev ?? 0);
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries)
            if (e.isIntersecting) setActive(items.indexOf(e.target as HTMLElement));
        },
        { root: list, threshold: 0.6 }
      );
      items.forEach((el) => io?.observe(el));
    };

    setup();
    mq.addEventListener("change", setup);
    return () => {
      io?.disconnect();
      mq.removeEventListener("change", setup);
    };
  }, []);

  const jump = (i: number) => {
    const el = listRef.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-24 sm:px-8 sm:pb-36">
      <style>{`
        @keyframes rc-scan { from { top: -5rem; } to { top: 100%; } }
        @keyframes rc-sheen { from { transform: translateX(0) skewX(-20deg); } to { transform: translateX(520%) skewX(-20deg); } }
        @keyframes rc-spin { to { transform: rotate(360deg); } }

        .rc-card { transition: filter 0.3s; }
        .rc-edge { background: hsl(var(--border)); transition: background-color 0.3s; }
        .rc-title { transition: text-shadow 0.3s; }
        .rc-emblem { transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1); }
        .rc-lines { opacity: 0; transition: opacity 0.3s; }
        .rc-beam { opacity: 0; }

        /* Lit state: keyboard focus, and the centred card in the phone deck. */
        .rc-card:focus-within,
        .rc-card[data-active="true"] { filter: drop-shadow(0 0 18px hsl(var(--primary) / 0.45)); }
        .rc-card:focus-within .rc-edge,
        .rc-card[data-active="true"] .rc-edge { background: hsl(var(--primary)); }
        .rc-card:focus-within .rc-title,
        .rc-card[data-active="true"] .rc-title { text-shadow: 0 0 28px hsl(var(--primary) / 0.55); }
        .rc-card:focus-within .rc-ring,
        .rc-card[data-active="true"] .rc-ring { animation: rc-spin 9s linear infinite; }
        .rc-card:focus-within .rc-emblem,
        .rc-card[data-active="true"] .rc-emblem { transform: scale(1.05); }

        /* Mouse hover (devices that can hover), plus the scan beam, which is desktop only. */
        @media (hover: hover) {
          .rc-card:hover { filter: drop-shadow(0 0 18px hsl(var(--primary) / 0.45)); }
          .rc-card:hover .rc-edge { background: hsl(var(--primary)); }
          .rc-card:hover .rc-title { text-shadow: 0 0 28px hsl(var(--primary) / 0.55); }
          .rc-card:hover .rc-ring { animation: rc-spin 9s linear infinite; }
          .rc-card:hover .rc-emblem { transform: scale(1.05); }
          .rc-card:hover .rc-lines,
          .rc-card:focus-within .rc-lines { opacity: 1; }
          .rc-card:hover .rc-beam,
          .rc-card:focus-within .rc-beam { opacity: 1; animation: rc-scan 2.6s linear infinite; }
        }

        @media (prefers-reduced-motion: reduce) {
          .rc-ring { animation: none !important; }
          .rc-beam { animation: none !important; opacity: 0 !important; }
        }
      `}</style>

      <PageHeader
        title="Recruitment"
        description={`ACE Club Recruitment Drive 2026. ${domains.length} clusters have ACE application forms. Pick one to check availability and apply.`}
      />

      {/* About ACE: why join, what you get, how to choose a cluster */}
      <section data-fade aria-label="About ACE" className="mb-16 sm:mb-20">
        <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
          <div className="border-t border-border pt-6">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] [font-stretch:112%]">
              Why ACE
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Classrooms teach you the theory. ACE is where you use it. We are students
              building real things together, across {domains.length} clusters that cover
              everything from web, apps and AI to security, networks, design and writing.
              Every cluster is led by dedicated members who are a few steps ahead of you.
              Here you learn by building, and you build with people who want you to finish.
            </p>
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] [font-stretch:112%]">
              What you get at ACE
            </h2>
            <ul className="mt-4 space-y-3 leading-relaxed text-muted-foreground">
              {[
                "Hands-on projects, not just lectures.",
                "Guidance from the members who lead your cluster.",
                "Friends who care about the same craft.",
                "A portfolio of things you actually built.",
                "Room to try a domain you have never touched.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="mt-2.5 size-2 shrink-0 bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] [font-stretch:112%]">
              How to choose your homies
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Your cluster is your crew, so choose it like you would choose people to spend a
              semester with. Start with the work: pick the domain you would happily keep
              building even when nobody is checking. Then look at the people: read what each
              cluster does and go where you will be pushed and supported in equal measure.
              Still torn? Pick the one you are most curious about. You can apply to more than
              one cluster if your eligibility allows it and your work keeps up.
            </p>
          </div>
        </div>

        <p className="mt-10 text-xl font-semibold leading-snug tracking-[-0.02em]">
          Pick a cluster below, fill in its form, and take the first step.
        </p>
      </section>

      {/* Status strip */}
      <div className="mb-6 flex items-center justify-between border-y border-border py-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <span className="flex items-center gap-3">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping bg-primary opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2 bg-primary" />
          </span>
          <span className="sm:hidden">Swipe to select</span>
          <span className="hidden sm:inline">Select a cluster</span>
        </span>
        <span className="tabular">
          {formStatus ? `${pad(domains.filter((domain) => formStatus[domain.cluster]).length)} open` : 'Checking forms'}
        </span>
      </div>

      {/* Phone only: cluster names to jump to a card. The current one is highlighted. */}
      <nav aria-label="Clusters index" className="mb-8 sm:hidden">
        <ul className="flex flex-wrap gap-x-6 gap-y-3">
          {domains.map((d, i) => (
            <li key={d.title}>
              <button
                type="button"
                onClick={() => jump(i)}
                aria-current={active === i}
                className={`text-lg font-semibold tracking-[-0.02em] transition-colors hover:text-primary ${
                  active === i ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {d.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div data-fade className="relative isolate">
        {/* Blueprint grid backdrop, fading out toward the bottom */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-5 -inset-y-4 -z-10 bg-[linear-gradient(to_right,hsl(var(--primary)/0.09)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.09)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_80%)] sm:-inset-x-8"
        />

        <ul
          ref={listRef}
          className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 [scrollbar-width:none] max-sm:-my-6 max-sm:py-6 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden"
        >
          {domains.map((d, i) => (
            <li
              key={d.title}
              data-active={active === i}
              className="rc-card w-[84%] shrink-0 snap-center sm:w-auto sm:shrink"
            >
              {/* Outer shape paints the 1px edge; inner shape paints the face. */}
              <div className={`rc-edge ${CHAMFER} h-full p-px`}>
                <div
                  className={`${CHAMFER} relative flex h-full min-h-[30rem] flex-col overflow-hidden bg-background p-6 sm:min-h-[32rem] sm:p-8`}
                >
                  {/* Scanlines and a sweeping beam. Desktop hover only, see the style block. */}
                  <span
                    aria-hidden
                    className="rc-lines pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_3px,hsl(var(--primary)/0.07)_3px,hsl(var(--primary)/0.07)_4px)]"
                  />
                  <span
                    aria-hidden
                    className="rc-beam pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-primary/15 to-transparent"
                  />

                  <div className="relative flex items-start justify-between">
                    {/* Emblem with a dashed ring that spins when the card is lit */}
                    <div className="relative size-32 sm:size-40">
                      <span
                        aria-hidden
                        className="rc-ring absolute inset-0 rounded-full border border-dashed border-primary/50"
                      />
                      <Image
                        src={d.imageUrl}
                        alt={`${d.title} cluster emblem`}
                        width={320}
                        height={320}
                        className="rc-emblem absolute inset-3 size-[calc(100%-1.5rem)] rounded-full object-cover ring-1 ring-primary/40"
                      />
                    </div>
                    <span className="font-mono text-xs tabular tracking-widest text-muted-foreground">
                      {pad(i + 1)}/{pad(domains.length)}
                    </span>
                  </div>

                  <h2 className="rc-title relative mt-auto pt-10 text-[clamp(1.9rem,2.8vw,2.75rem)] font-extrabold leading-[0.95] tracking-[-0.04em] [font-stretch:112%]">
                    {d.title}
                  </h2>

                  {d.description && (
                    <p className="relative mt-4 line-clamp-3 max-w-[44ch] leading-relaxed text-muted-foreground">
                      {d.description}
                    </p>
                  )}

                  {/* Cut-corner split button with a light sheen on hover */}
                  <Link
                    href={`/events/recruitment/apply?cluster=${encodeURIComponent(d.cluster)}`}
                    aria-label={formStatus?.[d.cluster] === false ? `View ${d.title} application status` : `Apply for ${d.title}`}
                    className={`${BUTTON_CUT} group/apply relative mt-8 inline-flex h-12 w-fit items-stretch overflow-hidden bg-primary font-semibold text-primary-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:bg-foreground focus-visible:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-white/40 opacity-0 group-hover/apply:animate-[rc-sheen_0.9s_ease-out] group-hover/apply:opacity-100 motion-reduce:hidden"
                    />
                    <span className="relative flex items-center px-5">
                      {formStatus?.[d.cluster] === false ? 'Applications closed' : 'Apply on ACE'}
                    </span>
                    <span className="relative flex w-12 items-center justify-center border-l border-current/30">
                      <ArrowUpRight className="size-5 transition-transform duration-200 group-hover/apply:-translate-y-0.5 group-hover/apply:translate-x-0.5" />
                    </span>
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>

      </div>

      <div
        data-fade
        className="mt-20 flex flex-col gap-6 border-t border-border pt-10 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="max-w-xl text-lg leading-snug">
          Want to know what each cluster does before you apply?
        </p>
        <Link
          href="/clusters"
          className="group inline-flex h-14 w-fit items-center gap-8 border border-border px-6 font-semibold transition-colors hover:bg-foreground hover:text-background"
        >
          See all clusters
          <ArrowUpRight className="size-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
