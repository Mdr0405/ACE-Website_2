import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ClusterReel } from "@/components/landing/cluster-reel";
import { clusters } from "@/lib/ace-content";

export const ClustersSection = () => {
  return (
    <section
      id="clusters"
      aria-labelledby="clusters-title"
      className="relative bg-signal text-signal-foreground"
    >
      <ClusterReel
        items={clusters}
        intro={
          <>
            <h2
              id="clusters-title"
              data-reveal
              className="font-display text-[clamp(2.75rem,9vw,6.5rem)] lg:text-[clamp(4rem,7.2vw,8.75rem)]"
            >
              <span className="reveal-line">
                <span>{clusters.length} clusters.</span>
              </span>
              <span className="reveal-line">
                <span>Pick your</span>
              </span>
              <span className="reveal-line">
                <span>craft.</span>
              </span>
            </h2>
            <div data-fade className="mt-5 flex flex-col gap-4 sm:mt-8 sm:gap-6 lg:mt-0 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
              <p className="max-w-md text-base leading-snug sm:text-lg">
                Every member works inside a cluster, from web and AI to security, hardware, design and
                operations. Join more than one if your work keeps up.
              </p>
              <Link
                href="/events/recruitment"
                className="group inline-flex h-11 w-fit shrink-0 items-center gap-3 bg-signal-foreground px-4 font-semibold text-signal transition-colors hover:bg-white hover:text-signal-foreground sm:h-12 sm:gap-4 sm:px-5"
              >
                See recruitment
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </>
        }
      />
    </section>
  );
};
