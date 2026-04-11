import { motion } from "motion/react";
import { useMagnetic } from "../hooks/use-magnetic";

const Check = () => (
  <svg className="mt-0.5 flex-shrink-0 text-primary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5"/></svg>
);

export function Pricing() {
  const magnetic = useMagnetic<HTMLAnchorElement>();

  return (
    <section id="pricing" className="mx-auto max-w-7xl px-5 py-28 lg:px-8 lg:py-36">
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="mb-16 lg:pl-[clamp(1rem,5vw,6rem)]"
      >
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          <span className="text-primary">05</span> &mdash; Pricing
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_1.3fr]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="flex flex-col rounded-[2.5rem] border border-border bg-surface p-8 shadow-diffuse lg:p-10"
        >
          <div className="mb-1 text-lg font-bold tracking-tight text-text">Starter</div>
          <div className="mb-6 font-mono text-[2.5rem] font-bold tracking-tighter text-text">$149<span className="text-base font-normal text-muted">/mo</span></div>
          <ul className="flex-1 space-y-3">
            {["5-page website build", "Managed hosting", "Domain management", "Contact form with email forwarding"].map((f) => (
              <li key={f} className="flex items-start gap-3 text-[14px] text-muted"><Check />{f}</li>
            ))}
          </ul>
          <a href="https://portal.alisamadii.com/agency" className="mt-8 block w-full rounded-full border border-border py-3.5 text-center text-[13px] font-medium text-text transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground active:-translate-y-px active:scale-[0.98]">
            Get started
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
          className="relative flex flex-col overflow-hidden rounded-[2.5rem] border border-primary/20 bg-surface p-8 shadow-diffuse lg:p-10"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent" />
          <div className="relative">
            <span className="mb-5 inline-block rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">Most Popular</span>
            <div className="mb-1 text-lg font-bold tracking-tight text-text">Custom</div>
            <div className="mb-6 font-heading text-[2.5rem] font-bold italic tracking-tight text-text">Let's talk</div>
            <ul className="flex-1 space-y-3">
              {["Everything in Starter", "User authentication system", "Admin panel & content management", "Database provisioning & management", "Web app development", "AWS SES email integration", "SEO, analytics, maintenance & priority support"].map((f) => (
                <li key={f} className="flex items-start gap-3 text-[14px] text-muted"><Check />{f}</li>
              ))}
            </ul>
            <motion.a
              ref={magnetic.ref}
              style={magnetic.style}
              href="https://cal.com/alisamadii"
              target="_blank"
              rel="noopener"
              className="magnetic-btn mt-8 block w-full rounded-full bg-primary py-3.5 text-center text-[13px] font-semibold text-primary-foreground transition-all duration-300 hover:shadow-[0_8px_30px_rgba(252,132,100,0.2)] active:-translate-y-px active:scale-[0.98]"
            >
              Get started
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
