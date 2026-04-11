import { useReveal } from "../hooks/use-reveal";
import { useMagnetic } from "../hooks/use-magnetic";

const Check = () => (
  <svg className="mt-0.5 flex-shrink-0 text-primary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" /></svg>
);

export function Pricing() {
  const labelRef = useReveal<HTMLDivElement>();
  const magneticRef = useMagnetic<HTMLAnchorElement>();

  return (
    <section id="pricing" className="mx-auto max-w-7xl px-5 py-28 lg:px-8 lg:py-36">
      <div ref={labelRef} className="mb-16 lg:pl-[clamp(1rem,5vw,6rem)]">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          <span className="text-primary">05</span> &mdash; Pricing
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_1.3fr]">
        {/* Starter */}
        <div className="pricing-card flex flex-col rounded-2xl border border-border bg-surface p-8 shadow-diffuse lg:p-10">
          <div className="mb-1 text-lg font-bold tracking-tight text-text">Starter</div>
          <div className="mb-6 font-mono text-[2.5rem] font-bold tracking-tighter text-text">$149<span className="text-base font-normal text-muted">/mo</span></div>
          <ul className="flex-1 space-y-3">
            {["5-page website build", "Managed hosting", "Domain management", "Contact form with email forwarding"].map((f) => (
              <li key={f} className="flex items-start gap-3 text-[14px] text-muted"><Check />{f}</li>
            ))}
          </ul>
          <a href="https://portal.alisamadii.com/agency" className="mt-8 block w-full rounded-full border border-border py-3.5 text-center text-[13px] font-medium text-text transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground active:-translate-y-px active:scale-[0.98]">Get started</a>
        </div>

        {/* Custom */}
        <div className="pricing-card relative flex flex-col overflow-hidden rounded-2xl border border-primary/20 bg-surface p-8 shadow-diffuse lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent" />
          <div className="relative">
            <span className="mb-5 inline-block rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">Most Popular</span>
            <div className="mb-1 text-lg font-bold tracking-tight text-text">Custom</div>
            <div className="mb-6 font-mono text-[2.5rem] font-bold tracking-tighter text-text">Let's talk</div>
            <ul className="flex-1 space-y-3">
              {[
                "Everything in Starter",
                "User authentication system",
                "Admin panel & content management",
                "Database provisioning & management",
                "Web app development",
                "AWS SES email integration",
                "SEO, analytics, maintenance & priority support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-[14px] text-muted"><Check />{f}</li>
              ))}
            </ul>
            <a
              ref={magneticRef}
              href="https://cal.com/alisamadii"
              target="_blank"
              rel="noopener"
              className="magnetic-btn mt-8 block w-full rounded-full bg-primary py-3.5 text-center text-[13px] font-semibold text-primary-foreground transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,184,148,0.25)] active:-translate-y-px active:scale-[0.98]"
            >
              Get started
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
