"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { products, type Product } from "@/lib/products";
import { ProductSpread } from "@/components/products/product-spread";

const EXTRA_PROJECTS_META = [
  {
    slug: "ks-2026",
    name: "Kuruksastra 2026",
    kind: "Website · Cultural fest",
    icon: "https://picsum.photos/seed/ks2026/200/200",
    siteUrl: "https://kstesting.vercel.app/",
    siteSub: "kuruksastra.in",
  },
  {
    slug: "nexus-2026",
    name: "Nexus (2026)",
    kind: "Website · Cultural fest",
    icon: "https://picsum.photos/seed/nexus2026/200/200",
    siteUrl: "https://acenexus.vercel.app/",
    siteSub: "nexus.in",
  },
  {
    slug: "nexus-2025",
    name: "Nexus (2025)",
    kind: "Website · Cultural fest",
    icon: "https://picsum.photos/seed/nexus2025/200/200",
    siteUrl: "https://acenexus.vercel.app/",
    siteSub: "nexus.in",
  },
  {
    slug: "carpe-2",
    name: "Carpedieum 2025",
    kind: "Website · Cultural fest",
    icon: "https://picsum.photos/seed/carpe2/200/200",
    siteUrl: "https://carpedium25old.vercel.app/",
    siteSub: "carpediem.kuruksastra.in",
  },
];

function buildClonedProduct(
  template: Product,
  meta: (typeof EXTRA_PROJECTS_META)[number]
): Product {
  const isKS2026 = meta.slug === "ks-2026";
  const isNexus2025 = meta.slug === "nexus-2025";
  const isCarpedieum2025 = meta.slug === "carpe-2";
  const is25thEdition =
    meta.slug === "nexus-2025" || meta.slug === "carpe-2";

  const transformText = (text: string) => {
    let updated = text.replace(/Carpediem/gi, meta.name);
    if (isKS2026) {
      updated = updated.replace(
        /4[\s\u00A0]*(?:[-–—−]|to)[\s\u00A0]*5[\s\u00A0]*oct(?:ober)?(?:[\s,]*\d{4})?/gi,
        "3-5 April"
      );
    }
    if (isCarpedieum2025) {
      updated = updated.replace(
        /4[\s\u00A0]*(?:[-–—−]|to)[\s\u00A0]*5[\s\u00A0]*oct(?:ober)?(?:[\s,]*\d{4})?/gi,
        "4th and 5th October"
      );
    }
    if (isNexus2025) {
      updated = updated.replace(/Aranya/gi, "INDOVATION");
    }
    if (is25thEdition) {
      updated = updated.replace(/\b26th\b/gi, "25th");
    }
    return updated;
  };

  return {
    ...template,
    slug: meta.slug,
    name: meta.name,
    kind: meta.kind,
    icon: meta.icon,
    tagline: transformText(template.tagline),
    summary: transformText(template.summary),
    stamps: template.stamps.map((stamp) => {
      if (
        is25thEdition &&
        (/edition/i.test(stamp.label) || /26th/i.test(stamp.value))
      ) {
        return {
          ...stamp,
          value: "25th",
        };
      }
      if (
        isKS2026 &&
        (/fest\s*dates/i.test(stamp.label) ||
          /4[\s\u00A0]*[-–—−][\s\u00A0]*5/.test(stamp.value))
      ) {
        return {
          ...stamp,
          value: "3-5",
          suffix: "April",
          note: "Three days",
        };
      }
      if (
        isCarpedieum2025 &&
        (/fest\s*dates/i.test(stamp.label) ||
          /4[\s\u00A0]*[-–—−][\s\u00A0]*5/.test(stamp.value))
      ) {
        return {
          ...stamp,
          value: "4-5",
          suffix: "Oct",
        };
      }
      return {
        ...stamp,
        label: transformText(stamp.label),
        value: transformText(stamp.value),
        suffix: stamp.suffix ? transformText(stamp.suffix) : stamp.suffix,
        note: stamp.note ? transformText(stamp.note) : stamp.note,
      };
    }),
    stampsSource: {
      ...template.stampsSource,
      text: transformText(template.stampsSource.text),
    },
    links: meta.siteUrl
      ? [
          {
            ...template.links[0],
            href: meta.siteUrl,
            label: template.links[0]?.label || "Visit site",
            sub: meta.siteSub ?? template.links[0]?.sub,
          },
          ...template.links.slice(1),
        ]
      : template.links.map((link, idx) =>
          idx === 0 ? { ...link, href: "#", sub: "Coming soon" } : link
        ),
    features: {
      title: transformText(template.features.title),
      intro: transformText(template.features.intro),
      items: template.features.items.map((item) => ({
        name: transformText(item.name),
        body: transformText(item.body),
      })),
    },
    facts: template.facts.map(([k, v, mono]) => {
      if (isKS2026 && /date|fest/i.test(k) && /oct|\d/i.test(v)) {
        return [transformText(k), "3-5 April", mono];
      }
      if (isCarpedieum2025 && /date|fest/i.test(k) && /oct|\d/i.test(v)) {
        return [transformText(k), "4th and 5th October", mono];
      }
      return [transformText(k), transformText(v), mono];
    }),
  };
}

export default function ProductsPage() {
  const carpediemTemplate =
    products.find(
      (p) =>
        p.slug.toLowerCase().includes("carpe") ||
        p.name.toLowerCase().includes("carpe")
    ) ?? products[products.length - 1];

  const extraProducts: Product[] = EXTRA_PROJECTS_META.map((meta) =>
    buildClonedProduct(carpediemTemplate, meta)
  );

  const allProducts: Product[] = [...products, ...extraProducts];
  const totalShipped = allProducts.length;

  const scrollContainerRef = useRef<HTMLUListElement | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [stepPx, setStepPx] = useState(364);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setScrollLeft(el.scrollLeft);

    const firstCard = el.querySelector("li");
    if (firstCard) {
      const gap = window.innerWidth < 768 ? 16 : 24;
      setStepPx(firstCard.getBoundingClientRect().width + gap);
    }
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener("resize", handleScroll);
    return () => window.removeEventListener("resize", handleScroll);
  }, [handleScroll]);

  return (
    <div className="pb-24 sm:pb-36">
      <header className="mx-auto grid max-w-[1600px] gap-8 px-5 pb-10 pt-10 sm:px-8 sm:pb-12 sm:pt-14 lg:grid-cols-12 lg:items-start">
        {/* Top Left: "Products" heading and intro paragraph */}
        <div className="lg:col-span-8">
          <h1
            data-reveal
            className="font-display text-[clamp(3rem,8vw,7.5rem)] leading-none"
          >
            <span className="reveal-line">
              <span>Products</span>
            </span>
          </h1>
          <p
            data-fade
            className="mt-6 max-w-md text-lg leading-snug text-muted-foreground"
          >
            Software ACE members have designed, built and shipped for SASTRA
            students.
          </p>
        </div>

        {/* Recruitment button in the top-right header area */}
        <div
          data-fade
          className="lg:col-span-4 lg:flex lg:flex-col lg:items-end lg:self-end"
        >
          <div className="w-full max-w-sm border border-foreground/20 bg-zinc-950/90 p-5 sm:w-auto sm:min-w-[290px]">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="size-2 rounded-full bg-primary" />
              <span>Join ACE · Open roles</span>
            </div>
            <p className="mt-2 text-sm leading-snug text-foreground/80">
              Want to build and ship products like these with us?
            </p>
            <Link
              href="/recruitment"
              className="group mt-4 inline-flex h-12 w-full items-center justify-between gap-6 border border-foreground/25 bg-background px-5 text-sm font-semibold text-foreground transition-colors duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground"
            >
              <span>Recruitment</span>
              <ArrowUpRight className="size-4 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Horizontal stacked-deck scroll container */}
        <div data-fade className="min-w-0 lg:col-span-12">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
            <p className="font-mono text-sm tabular">
              {totalShipped}{" "}
              <span className="text-muted-foreground">shipped</span>
            </p>
            <span className="font-mono text-[11px] text-muted-foreground sm:text-xs">
              Swipe / scroll horizontally to fan out cards →
            </span>
          </div>

          {totalShipped > 1 && (
            <nav aria-label="Products on this page" className="mt-4">
              <ul
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="relative flex snap-x snap-mandatory flex-nowrap items-center gap-4 overflow-x-auto py-5 pr-[20vw] [scrollbar-color:hsl(var(--border))_transparent] [scrollbar-width:thin] md:snap-none md:gap-6 md:py-6 md:pr-[45vw] [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-thumb]:bg-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-primary [&::-webkit-scrollbar-track]:bg-border/40 [&::-webkit-scrollbar]:h-[3px]"
              >
                {allProducts.map((item, idx) => {
                  const indexLabel = `${String(idx + 1).padStart(2, "0")}/${String(totalShipped).padStart(2, "0")}`;
                  const cardIcon =
                    item.icon ||
                    `https://picsum.photos/seed/${item.slug}/200/200`;

                  const naturalStart = idx * stepPx;
                  const distanceFromDock = Math.max(
                    0,
                    naturalStart - scrollLeft
                  );
                  const stackDepth = Math.min(4, distanceFromDock / stepPx);

                  const scale = 1 - stackDepth * 0.03;
                  const rotateDeg = stackDepth === 0 ? 0 : -stackDepth * 1.2;
                  const translateY = stackDepth * 3;

                  return (
                    <li
                      key={item.slug}
                      style={
                        {
                          "--peek": "8px",
                          position: "sticky",
                          left: `calc(${idx} * var(--peek))`,
                          zIndex: idx + 1,
                          transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotateDeg}deg)`,
                          transformOrigin: "center left",
                        } as React.CSSProperties
                      }
                      className="aspect-square size-[min(74vw,300px)] shrink-0 snap-center transition-transform duration-150 ease-out md:size-[340px] md:snap-align-none md:[--peek:18px]"
                    >
                      <a
                        href={`#${item.slug}`}
                        className="group relative flex aspect-square size-full flex-col items-center justify-between overflow-hidden rounded-full border border-foreground/25 bg-zinc-950 p-5 text-center shadow-[0_12px_36px_rgba(0,0,0,0.85)] transition-all duration-300 hover:border-primary/80 hover:bg-zinc-900 md:p-10"
                      >
                        {/* Top index pill */}
                        <span className="rounded-full border border-foreground/20 bg-background/80 px-2.5 py-0.5 font-mono text-[10px] tabular text-foreground/80 transition-colors group-hover:border-primary/50 group-hover:text-primary md:text-[11px]">
                          {indexLabel}
                        </span>

                        {/* Circular logo + title + category */}
                        <div className="flex flex-col items-center">
                          <div className="inline-flex items-center justify-center overflow-hidden rounded-full border border-foreground/25 bg-background p-1.5 transition-colors duration-300 group-hover:border-primary/50 md:p-2">
                            <img
                              src={cardIcon}
                              alt={`${item.name} logo`}
                              width={88}
                              height={88}
                              className="block size-12 rounded-full object-contain transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 md:size-20"
                            />
                          </div>

                          {/* Product Name */}
                          <h2 className="mt-2 font-display text-lg leading-tight text-foreground md:mt-3 md:text-2xl">
                            {item.name}
                          </h2>

                          {/* Product Category / Subtitle */}
                          <p className="mt-0.5 line-clamp-1 max-w-[175px] text-[11px] text-foreground/70 md:mt-1 md:max-w-none md:text-sm">
                            {item.kind}
                          </p>
                        </div>

                        {/* Button that morphs from rectangle to rounded pill on hover */}
                        <div className="inline-flex items-center gap-1.5 rounded-none bg-primary px-4 py-1.5 text-[11px] font-semibold text-primary-foreground transition-all duration-75 ease-out group-hover:rounded-full group-hover:bg-foreground group-hover:text-background group-hover:duration-300 md:gap-2 md:px-5 md:py-2 md:text-sm">
                          <span>View project</span>
                          <ArrowDownRight className="size-3.5 transition-transform duration-75 ease-out group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:duration-300 md:size-4" />
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>
      </header>

      {/* CHANGED: Passed a 4-image slideshow array (`previewImages`) to every ProductSpread so each description's preview rotates every 2 seconds */}
      <div className="space-y-28 sm:space-y-40">
        {allProducts.map((product, i) => (
          <ProductSpread
            key={product.slug}
            product={product}
            inverted={i === 0}
            previewImages={[
              `https://picsum.photos/seed/${product.slug}-site-1/900/500`,
              `https://picsum.photos/seed/${product.slug}-site-2/900/500`,
              `https://picsum.photos/seed/${product.slug}-site-3/900/500`,
              `https://picsum.photos/seed/${product.slug}-site-4/900/500`,
            ]}
          />
        ))}
      </div>

      {/* Close: how a project gets here */}
      <section
        aria-labelledby="yours-heading"
        className="mx-auto mt-28 max-w-[1600px] px-5 sm:mt-40 sm:px-8"
      >
        <div className="grid gap-10 border-t border-foreground pt-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2
              id="yours-heading"
              className="font-display text-[clamp(2.5rem,5.5vw,5rem)]"
            >
              Shipped something with ACE?
            </h2>
          </div>
          <div className="lg:col-span-4 lg:col-start-9 lg:self-end">
            <p className="text-lg leading-snug text-muted-foreground">
              If you built it as an ACE member and people can use it today, it
              belongs here. Send us the link and who built it.
            </p>
            <Link
              href="/#contact"
              className="group mt-6 inline-flex h-12 w-full items-center justify-between gap-8 border border-foreground/25 px-5 font-semibold transition-colors hover:bg-foreground hover:text-background sm:w-auto"
            >
              Tell us about it
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}