"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

const asOf = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** One product, laid out like an award site's project page: name, proof, what it does, the facts. */
// CHANGED: Added `previewImages?: string[]` and automatic 2-second image slideshow rotation for every product spread
export function ProductSpread({
  product,
  inverted = false,
  previewImage,
  previewImages,
}: {
  product: Product;
  inverted?: boolean;
  previewImage?: string;
  previewImages?: string[];
}) {
  const id = product.slug;

  const slides =
    previewImages && previewImages.length > 0
      ? previewImages
      : previewImage
        ? [
            previewImage,
            `https://picsum.photos/seed/${product.slug}-site-2/900/500`,
            `https://picsum.photos/seed/${product.slug}-site-3/900/500`,
            `https://picsum.photos/seed/${product.slug}-site-4/900/500`,
          ]
        : [
            `https://picsum.photos/seed/${product.slug}-site-1/900/500`,
            `https://picsum.photos/seed/${product.slug}-site-2/900/500`,
            `https://picsum.photos/seed/${product.slug}-site-3/900/500`,
            `https://picsum.photos/seed/${product.slug}-site-4/900/500`,
          ];

  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // CHANGED: Cycle to the next image every 2 seconds (2000ms) unless hovered
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  return (
    <article id={id} aria-labelledby={`${id}-name`} className="scroll-mt-24">
      {/* Name and proof */}
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8">
        <div className="grid gap-12 border-t border-foreground pt-8 sm:pt-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-8" style={{ containerType: "inline-size" }}>
            {product.icon && (
              <div className="mb-6 inline-block border border-foreground p-1.5">
                {product.icon.startsWith("http") ? (
                  <img
                    src={product.icon}
                    alt=""
                    width={80}
                    height={80}
                    className="block size-16 object-contain sm:size-20"
                  />
                ) : (
                  <Image
                    src={product.icon}
                    alt=""
                    width={80}
                    height={80}
                    className="block size-16 object-contain sm:size-20"
                  />
                )}
              </div>
            )}
            <h2
              id={`${id}-name`}
              data-reveal
              className="font-display text-foreground"
              // Fit the name to its column: Archivo 800 at 112% runs about 0.7em a character.
              style={{ fontSize: `min(12.5rem, calc(100cqi / ${(product.name.length * 0.7).toFixed(2)}))` }}
            >
              <span className="reveal-line">
                <span>{product.name}</span>
              </span>
            </h2>
            <p data-fade className="mt-6 text-[clamp(1.5rem,3vw,2.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
              {product.tagline}
            </p>
            <p data-fade style={{ ["--d" as string]: ".1s" }} className="mt-5 max-w-[46ch] text-lg leading-snug text-muted-foreground">
              {product.summary}
            </p>
          </div>

          <aside data-fade style={{ ["--d" as string]: ".15s" }} className="lg:col-span-4 lg:self-end">
            <dl className="grid border border-foreground" style={{ gridTemplateColumns: `repeat(${product.stamps.length}, minmax(0, 1fr))` }}>
              {product.stamps.map((stamp, i) => (
                <div key={stamp.label} className={cn("p-5", i > 0 && "border-l border-foreground")}>
                  <dt className="label text-muted-foreground">{stamp.label}</dt>
                  <dd className="mt-3">
                    <span className="font-mono text-5xl leading-none tabular whitespace-nowrap">{stamp.value}</span>
                    {stamp.suffix && <span className="ml-1.5 font-mono text-sm tabular text-muted-foreground">{stamp.suffix}</span>}
                    {stamp.note && <span className="mt-2 block text-sm text-muted-foreground">{stamp.note}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-muted-foreground">
              {product.stampsSource.text} <span className="font-mono tabular">{asOf(product.stampsSource.asOf)}</span>
            </p>

            <div className="mt-6 grid gap-2">
              {product.links.map((link, i) => {
                const isPlaceholder = !link.href || link.href === "#";

                if (isPlaceholder) {
                  return (
                    <span
                      key={`${link.label}-${i}`}
                      aria-disabled="true"
                      className="inline-flex h-14 w-full cursor-not-allowed items-center justify-between gap-6 border border-foreground/25 px-6 font-semibold text-muted-foreground opacity-60"
                    >
                      <span className="flex min-w-0 items-center">
                        <span className="truncate">{link.label}</span>
                        {link.sub && (
                          <span className="ml-3 hidden shrink-0 border-l border-current pl-3 text-sm font-normal sm:inline">
                            {link.sub}
                          </span>
                        )}
                      </span>
                      <ArrowUpRight className="size-5 shrink-0" />
                    </span>
                  );
                }

                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "group inline-flex h-14 w-full items-center justify-between gap-6 px-6 font-semibold transition-[background-color,color,transform] duration-300 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-ring active:scale-[0.98]",
                      i === 0
                        ? "bg-primary text-primary-foreground hover:bg-foreground hover:text-background"
                        : "border border-foreground/25 hover:bg-foreground hover:text-background"
                    )}
                  >
                    <span className="flex min-w-0 items-center">
                      <span className="truncate">{link.label}</span>
                      {link.sub && (
                        <span className="ml-3 hidden shrink-0 border-l border-current pl-3 text-sm font-normal sm:inline">{link.sub}</span>
                      )}
                    </span>
                    <ArrowUpRight className="size-5 shrink-0 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
                  </a>
                );
              })}
            </div>
          </aside>
        </div>

        {/* CHANGED: Auto-rotating 2-second image carousel with smooth crossfade and slide indicators */}
        {slides.length > 0 && (
          <figure data-fade style={{ ["--d" as string]: ".2s" }} className="mt-8 sm:mt-10">
            <div
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              className="max-w-xl overflow-hidden border border-foreground bg-zinc-950"
            >
              <div className="flex items-center justify-between border-b border-foreground/20 px-3.5 py-2">
                <div className="flex items-center gap-1.5">
                  {slides.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      type="button"
                      aria-label={`Show preview slide ${dotIdx + 1}`}
                      onClick={() => setActiveSlide(dotIdx)}
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        dotIdx === activeSlide
                          ? "w-5 bg-primary"
                          : "w-2 bg-foreground/30 hover:bg-foreground/60"
                      )}
                    />
                  ))}
                </div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {product.links[0]?.sub || product.name} ·{" "}
                  {String(activeSlide + 1).padStart(2, "0")}/
                  {String(slides.length).padStart(2, "0")}
                </span>
              </div>
              <div className="relative h-56 w-full overflow-hidden bg-zinc-900 sm:h-64">
                {slides.map((src, idx) => (
                  <img
                    key={src}
                    src={src}
                    alt={`${product.name} preview ${idx + 1}`}
                    loading={idx === 0 ? "eager" : "lazy"}
                    className={cn(
                      "absolute inset-0 size-full object-cover transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      idx === activeSlide
                        ? "scale-100 opacity-100"
                        : "pointer-events-none scale-[1.03] opacity-0"
                    )}
                  />
                ))}
              </div>
            </div>
          </figure>
        )}
      </div>

      {/* What it does: on the inked band for the first product, on the ground for the rest */}
      <section
        aria-labelledby={`${id}-features`}
        className={cn("mt-16 sm:mt-20", inverted && "bg-foreground py-14 text-background sm:py-20")}
      >
        <div className="mx-auto grid max-w-[1600px] gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <h3 id={`${id}-features`} className="font-display text-[clamp(2.25rem,4.4vw,3.75rem)]">
              {product.features.title}
            </h3>
            <p className={cn("mt-5 max-w-[34ch] leading-relaxed", inverted ? "text-background/75" : "text-muted-foreground")}>{product.features.intro}</p>
          </div>
          <dl className={cn("border-t lg:col-span-8", inverted ? "border-background/25" : "border-border")}>
            {product.features.items.map((f) => (
              <div
                key={f.name}
                className={cn("group relative grid gap-3 border-b py-6", inverted ? "border-background/25" : "border-border", " sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-baseline sm:gap-8 sm:py-8")}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -top-px h-px origin-left scale-x-0 bg-primary transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
                />
                <dt className="font-display text-[clamp(1.75rem,3.2vw,2.75rem)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2">
                  {f.name}
                </dt>
                <dd className={cn("max-w-[40ch] leading-relaxed", inverted ? "text-background/75" : "text-muted-foreground")}>{f.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* The facts */}
      <div className="mx-auto mt-16 grid max-w-[1600px] gap-8 px-5 sm:mt-20 sm:px-8 lg:grid-cols-12">
        <h3 id={`${id}-facts`} className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl lg:col-span-4">
          Details
        </h3>
        <dl aria-labelledby={`${id}-facts`} className="grid border-t border-border sm:grid-cols-2 sm:gap-x-8 lg:col-span-8">
          {product.facts.map(([k, v, mono]) => (
            <div key={k} className="flex items-baseline justify-between gap-6 border-b border-border py-4">
              <dt className="label shrink-0 text-muted-foreground">{k}</dt>
              <dd className={cn("min-w-0 break-words text-right font-semibold", mono && "font-mono font-normal tabular")}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}