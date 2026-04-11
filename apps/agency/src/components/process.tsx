import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReveal } from "../hooks/use-reveal";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  { num: "01", title: "Discovery", desc: "Understanding your goals, audience, and competitive landscape through deep research." },
  { num: "02", title: "Strategy", desc: "Defining the roadmap, architecture, and creative direction for maximum impact." },
  { num: "03", title: "Execution", desc: "Bringing the vision to life with meticulous design and robust engineering." },
  { num: "04", title: "Launch & Scale", desc: "Deploying, monitoring, and iterating to ensure sustained growth and performance." },
];

export function Process() {
  const labelRef = useReveal<HTMLDivElement>();
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const steps = el.querySelectorAll(".process-step");
    gsap.set(steps, { opacity: 0, y: 24 });

    gsap.to(steps, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: "power3.out",
      stagger: 0.12,
      scrollTrigger: { trigger: el, start: "top 80%" },
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => {
        if (t.trigger === el) t.kill();
      });
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-5 py-28 lg:px-8 lg:py-36">
      <div ref={labelRef} className="mb-16 lg:pl-[clamp(1rem,5vw,6rem)]">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          <span className="text-primary">04</span> &mdash; Our Process
        </div>
      </div>
      <div ref={gridRef} className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.num} className="process-step bg-surface p-8 lg:p-10">
            <div className="mb-4 font-mono text-[11px] tracking-[0.15em] text-primary">{s.num}</div>
            <h3 className="mb-2 text-[17px] font-semibold tracking-tight text-text">{s.title}</h3>
            <p className="text-[14px] leading-relaxed text-muted">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
