import { useReveal } from "../hooks/use-reveal";

const ITEMS = [
  {
    icon: <svg className="mx-auto md:mx-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>,
    label: "Email",
    value: "a@alisamadii.com",
    href: "mailto:a@alisamadii.com",
  },
  {
    icon: <svg className="mx-auto md:mx-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
    label: "Phone",
    value: "+1 (971) 382-8969",
    href: "tel:+19713828969",
  },
  {
    icon: <svg className="mx-auto md:mx-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>,
    label: "Location",
    value: "Portland, OR",
    href: "https://maps.google.com/?q=Portland,+OR",
    external: true,
  },
];

function ContactItem({ icon, label, value, href, external }: typeof ITEMS[number]) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="text-center md:text-left">
      <div className="mb-3 text-primary">{icon}</div>
      <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.15em] text-muted">{label}</div>
      <a href={href} {...(external ? { target: "_blank", rel: "noopener" } : {})} className="text-sm text-text transition-colors duration-300 hover:text-primary">{value}</a>
    </div>
  );
}

export function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-7xl border-t border-border-subtle px-5 py-28 lg:px-8 lg:py-36">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
        {ITEMS.map((item) => (
          <ContactItem key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}
