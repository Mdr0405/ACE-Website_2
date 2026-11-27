"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Cluster } from "@/lib/ace-content";
import { ClusterArt } from "./cluster-art";

const pad = (n: number) => String(n).padStart(2, "0");
const firstSentence = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim();
const EXPO = "ease-[cubic-bezier(0.16,1,0.3,1)]";

/**
 * The cluster reel on the blue field.
 *
 * With motion, the section pins and vertical scroll drives a horizontal track
 * at every screen size. Reduced motion gets a native swipe track with snap points.
 * The headline is the first frame, followed by the clusters and recruitment.
 */
export function ClusterReel({ items, intro }: { items: Cluster[]; intro: ReactNode }) {
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const moveRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const geo = useRef({ dist: 0, stageW: 0, centers: [] as number[], x: 0 });

  const [pin, setPin] = useState(false);
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const lit = hover ?? active;

  // Keep the vertical-to-horizontal scroll on phones too.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const sync = () => setPin(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const panels = () => Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-panel]") ?? []);

  // Pinned mode: measure, then map the scroll offset inside the pin to a horizontal offset.
  useEffect(() => {
    const pinEl = pinRef.current, stage = stageRef.current, move = moveRef.current;
    if (!pin || !pinEl || !stage || !move) return;
    let raf = 0;

    const measure = () => {
      const g = geo.current;
      g.stageW = stage.clientWidth;
      g.dist = Math.max(0, move.scrollWidth - g.stageW);
      const base = move.getBoundingClientRect().left;
      g.centers = panels().map((p) => {
        const r = p.getBoundingClientRect();
        return r.left - base + r.width / 2;
      });
      pinEl.style.height = `${window.innerHeight + g.dist}px`;
      update();
    };

    const update = () => {
      raf = 0;
      const g = geo.current;
      const p = g.dist ? Math.min(1, Math.max(0, -pinEl.getBoundingClientRect().top / g.dist)) : 0;
      g.x = p * g.dist;
      move.style.transform = `translate3d(${-g.x}px,0,0)`;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;
      const focus = g.x + g.stageW * 0.5;
      let best = 0;
      g.centers.forEach((c, i) => {
        if (Math.abs(c - focus) < Math.abs(g.centers[best] - focus)) best = i;
      });
      setActive(best);
    };

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    ro.observe(move);
    window.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      pinEl.style.height = "";
      move.style.transform = "";
    };
  }, [pin]);

  // Native mode: the snapped panel is the active one.
  useEffect(() => {
    const list = listRef.current;
    if (pin || !list) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = list.scrollWidth - list.clientWidth;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${max > 0 ? list.scrollLeft / max : 0})`;
      const ps = panels();
      const start = list.scrollLeft + parseFloat(getComputedStyle(list).paddingLeft);
      let best = 0;
      ps.forEach((p, i) => {
        if (Math.abs(p.offsetLeft - start) < Math.abs(ps[best].offsetLeft - start)) best = i;
      });
      // The last panels can never reach the snap edge; the end of the track means the last cluster.
      setActive(max > 0 && list.scrollLeft >= max - 2 ? ps.length - 1 : best);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    list.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => { cancelAnimationFrame(raf); list.removeEventListener("scroll", onScroll); };
  }, [pin]);

  const goTo = useCallback((i: number) => {
    const list = listRef.current, pinEl = pinRef.current;
    if (!list || !pinEl) return;
    if (pin) {
      const g = geo.current;
      const x = Math.min(g.dist, Math.max(0, g.centers[i] - g.stageW / 2));
      const y = pinEl.getBoundingClientRect().top + window.scrollY + x;
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.4 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    } else {
      const p = panels()[i];
      if (p) list.scrollTo({ left: p.offsetLeft - parseFloat(getComputedStyle(list).paddingLeft), behavior: "smooth" });
    }
  }, [pin]);

  const c = items[active];

  return (
    <div ref={pinRef} className="relative">
      <div
        ref={stageRef}
        className={pin ? "sticky top-0 flex h-svh flex-col overflow-clip pt-20 pb-4 sm:pt-24 sm:pb-6 lg:pb-8" : "relative py-16 sm:py-24"}
      >
        <div
          ref={moveRef}
          className={pin ? "flex min-h-0 flex-1 items-stretch will-change-transform" : ""}
        >
          {/* Frame one: the headline */}
          <div className={pin ? "flex w-screen shrink-0 flex-col justify-between px-5 sm:px-8 lg:w-[min(58vw,60rem)] lg:pl-8 lg:pr-16 xl:pl-[max(2rem,calc((100vw-1600px)/2+2rem))]" : "mx-auto mb-14 max-w-[1600px] px-5 sm:mb-16 sm:px-8"}>
            {intro}
          </div>

          <ol
            ref={listRef}
            aria-label="Clusters"
            className={
              pin
                ? "flex items-stretch"
                : "flex snap-x snap-mandatory scroll-px-5 items-stretch overflow-x-auto overscroll-x-contain px-5 [scrollbar-width:none] sm:scroll-px-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
            }
          >
            {items.map((it, i) => {
              const on = i === lit;
              return (
                <li
                  key={it.title}
                  data-panel
                  className={`relative shrink-0 snap-start border-l border-signal-foreground/30 ${
                    pin ? "w-[82vw] max-w-[24rem] lg:w-[clamp(19rem,25vw,27rem)] lg:max-w-none" : "w-[82vw] max-w-[24rem] sm:w-[22rem]"
                  }`}
                >
                  <Link
                    href="/clusters"
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={(e) => {
                      setHover(i);
                      // Keyboard focus drives the pinned reel to the focused panel.
                      if (pin && e.currentTarget.matches(":focus-visible")) goTo(i);
                    }}
                    onBlur={() => setHover(null)}
                    className="group relative flex h-full flex-col overflow-hidden px-4 pb-4 pt-4 outline-offset-[-3px] focus-visible:outline-2 focus-visible:outline-signal-foreground sm:px-5 sm:pb-6 sm:pt-5 lg:px-7 lg:pb-8"
                  >
                    {/* Ink wipe: the panel inverts on hover and focus */}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-0 bg-signal-foreground transition-[clip-path] duration-700 ${EXPO} [clip-path:inset(100%_0_0_0)] group-hover:[clip-path:inset(0_0_0_0)] group-focus-visible:[clip-path:inset(0_0_0_0)]`}
                    />
                    <div className="relative flex items-start justify-between transition-colors duration-500 group-hover:text-signal group-focus-visible:text-signal">
                      <span className="font-mono text-xs tabular tracking-[0.06em]" aria-hidden="true">
                        {pad(i + 1)} / {pad(items.length)}
                      </span>
                      <ArrowUpRight className={`size-6 transition-transform duration-500 ${EXPO} group-hover:-translate-y-1 group-hover:translate-x-1`} />
                    </div>

                    <div
                      className={`relative my-3 transition-[opacity,transform,color] duration-700 sm:my-6 ${EXPO} ${
                        pin ? "flex min-h-0 flex-1 items-center justify-center" : "aspect-square"
                      } ${pin && !on ? "scale-[0.94] opacity-40" : "opacity-100"} group-hover:scale-100 group-hover:text-signal group-hover:opacity-100 group-focus-visible:text-signal`}
                    >
                      <ClusterArt
                        title={it.title}
                        active={on}
                        className={`art-inherit aspect-square h-full max-h-full w-auto max-w-full [--art-bg:hsl(var(--signal))] group-hover:[--art-bg:hsl(var(--signal-foreground))] group-focus-visible:[--art-bg:hsl(var(--signal-foreground))] ${
                          pin ? "" : "w-full"
                        }`}
                      />
                    </div>

                    <div className="relative transition-colors duration-500 group-hover:text-signal group-focus-visible:text-signal">
                      <h3 className="text-[clamp(1.5rem,6vw,2.75rem)] font-bold leading-[0.95] tracking-[-0.04em] [font-stretch:110%] [text-wrap:balance] lg:text-[clamp(1.75rem,2.5vw,2.75rem)]">
                        <span className={`inline-block transition-transform duration-700 ${EXPO} group-hover:translate-x-2`}>
                          {it.title}
                        </span>
                      </h3>
                      <p className="mt-2 max-w-[34ch] text-sm leading-snug sm:mt-3 sm:text-[0.95rem]">
                        {firstSentence(it.description)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}

            {/* Closing frame: the recruitment slab */}
            <li
              className={`relative shrink-0 snap-start ${
                pin ? "w-[82vw] max-w-[24rem] px-3 lg:w-[clamp(22rem,34vw,36rem)] lg:max-w-none lg:px-8 xl:pr-[max(2rem,calc((100vw-1600px)/2+2rem))]" : "w-[82vw] max-w-[24rem] sm:w-[22rem]"
              }`}
            >
              <Link
                href="/events/recruitment"
                className="group flex h-full min-h-[18rem] flex-col justify-between bg-signal-foreground p-4 text-signal transition-colors duration-500 hover:bg-white hover:text-signal-foreground focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-signal-foreground sm:p-6 lg:min-h-[22rem] lg:p-8"
              >
                <span className="font-mono text-xs tabular tracking-[0.06em]" aria-hidden="true">
                  {pad(items.length)} / {pad(items.length)}
                </span>
                <span>
                  <span className="block text-[clamp(2.25rem,4vw,4.25rem)] font-extrabold leading-[0.9] tracking-[-0.04em] [font-stretch:112%]">
                    Found
                    <br />
                    yours?
                  </span>
                  <span className="mt-4 flex items-center justify-between border-t border-current/30 pt-4 text-base font-semibold sm:mt-6 sm:pt-5 sm:text-lg">
                    Apply in recruitment
                    <ArrowRight className={`size-6 transition-transform duration-500 ${EXPO} group-hover:translate-x-1.5`} />
                  </span>
                </span>
              </Link>
            </li>
          </ol>
        </div>

        {/* Index rail: position, the cluster in view, and a jump to any cluster */}
        <div className={`mx-auto mt-8 w-full max-w-[1600px] px-5 sm:px-8 ${pin ? "mt-3 sm:mt-6" : ""}`}>
          <div className="grid grid-cols-1 items-center gap-x-8 gap-y-1 border-t border-signal-foreground/30 pt-3 sm:grid-cols-[minmax(0,16rem)_1fr]">
            <p className="flex items-baseline gap-4 overflow-hidden whitespace-nowrap">
              <span className="font-mono text-sm tabular tracking-[0.06em]" aria-hidden="true">
                {pad(active + 1)} / {pad(items.length)}
              </span>
              <span key={c.title} className="cluster-rail-name truncate text-base font-semibold tracking-[-0.01em]">
                {c.title}
              </span>
            </p>
            <div className="relative flex" role="group" aria-label="Jump to a cluster">
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-signal-foreground/25" />
              <span
                ref={fillRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-1/2 h-px origin-left scale-x-0 bg-signal-foreground"
              />
              {items.map((it, i) => (
                <button
                  key={it.title}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show ${it.title}`}
                  aria-current={i === active ? "true" : undefined}
                  className="group/tick relative flex h-11 flex-1 items-center justify-center outline-offset-[-2px]"
                >
                  <span
                    className={`block w-px bg-signal-foreground transition-[height] duration-500 ${EXPO} ${
                      i === active ? "h-5" : "h-2 group-hover/tick:h-4"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
