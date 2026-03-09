// app/(marketing)/_sections/cta.tsx
import { ArrowRight } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

export function CTASection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="bg-primary relative isolate overflow-hidden rounded-3xl px-6 py-20 text-center sm:px-16">
          {/* Background glow */}
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            aria-hidden="true"
          >
            <div className="absolute top-1/2 left-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
          </div>

          <h2 className="text-primary-foreground mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Stop Building Boilerplate.
            <br />
            Start Building Your Product.
          </h2>
          <p className="text-primary-foreground/80 mx-auto mt-6 max-w-xl text-lg">
            Get the complete monorepo template with authentication, payments,
            admin panel, mobile app, and documentation — all production-ready
            and fully typed.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="h-12 gap-2 px-8 text-base"
            >
              Get the Template
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
