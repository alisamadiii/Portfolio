import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReveal } from "../hooks/use-reveal";
import { useSpotlight } from "../hooks/use-spotlight";

gsap.registerPlugin(ScrollTrigger);

const SERVICES = [
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="m16 12-4-4-4 4" /><path d="M12 16V8" /></svg>,
    title: "Brand Identity",
    desc: "Crafting distinctive visual identities that resonate with your audience and set you apart from the competition.",
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
    title: "Web Development",
    desc: "Building performant, scalable web applications using cutting-edge technologies and modern frameworks.",
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>,
    title: "UI/UX Design",
    desc: "Designing intuitive interfaces with user-centered methodologies that drive engagement and conversions.",
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 0 1 9-9" /></svg>,
    title: "SEO & Analytics",
    desc: "Data-driven optimization strategies to boost visibility, traffic, and meaningful user engagement.",
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
    title: "Digital Marketing",
    desc: "Strategic campaigns across channels that amplify your message and deliver measurable results.",
  },
  {
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
    title: "Product Strategy",
    desc: "End-to-end product thinking — from discovery and validation to launch and iteration cycles.",
  },
];

function ServiceCard({ icon, title, desc, offset }: { icon: React.ReactNode; title: string; desc: string; offset: boolean }) {
  const { onMouseMove } = useSpotlight();

  return (
    <div
      onMouseMove={onMouseMove}
      className={`spotlight-card service-card rounded-2xl border border-border bg-surface p-8 shadow-diffuse transition-all duration-300 hover:-translate-y-1 lg:p-10 ${offset ? "md:mt-14" : ""}`}
    >
      <div className="mb-5 text-primary">{icon}</div>
      <h3 className="mb-2 text-[17px] font-semibold tracking-tight text-text">{title}</h3>
      <p className="max-w-[65ch] text-[14px] leading-relaxed text-muted">{desc}</p>
    </div>
  );
}

export function Services() {
  const labelRef = useReveal<HTMLDivElement>();
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const cards = el.querySelectorAll(".service-card");
    gsap.set(cards, { opacity: 0, y: 30 });

    gsap.to(cards, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: "power3.out",
      stagger: 0.1,
      scrollTrigger: { trigger: el, start: "top 80%" },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === el) t.kill();
      });
    };
  }, []);

  return (
    <section id="services" className="mx-auto max-w-7xl px-5 py-28 lg:px-8 lg:py-36">
      <div ref={labelRef} className="mb-16 lg:pl-[clamp(1rem,5vw,6rem)]">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          <span className="text-primary">03</span> &mdash; Our Services
        </div>
      </div>
      <div ref={gridRef} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {SERVICES.map((s, i) => (
          <ServiceCard key={s.title} {...s} offset={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}
