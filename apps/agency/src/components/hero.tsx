import { useMagnetic } from "../hooks/use-magnetic";
import { useScramble } from "../hooks/use-scramble";

export function Hero() {
  const magneticRef = useMagnetic<HTMLAnchorElement>();
  const scrambleRef = useScramble("We Build\nDigital\nExperiences");

  return (
    <section id="hero" className="relative mx-auto grid min-h-[100dvh] max-w-7xl grid-cols-1 px-5 lg:grid-cols-[1.4fr_1fr] lg:gap-16 lg:px-8">
      <div className="flex flex-col justify-center pt-32 pb-16 lg:pt-0 lg:pb-0 lg:pl-[clamp(1rem,5vw,6rem)]">
        <div className="mb-10 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          <span className="text-primary">01</span> &mdash; Creative Agency
        </div>
        <h1
          ref={scrambleRef}
          className="whitespace-pre-line text-4xl font-extrabold leading-[0.92] tracking-[-0.035em] text-text md:text-[3.25rem] xl:text-[3.75rem]"
        >
          We Build{"\n"}Digital{"\n"}Experiences
        </h1>
        <p className="mt-7 max-w-[65ch] text-base leading-relaxed text-muted">
          We are a creative agency specializing in brand identity, web development, and digital strategy that drives results.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            ref={magneticRef}
            href="https://cal.com/alisamadii"
            target="_blank"
            rel="noopener"
            className="magnetic-btn inline-flex rounded-full bg-primary px-7 py-3 text-[13px] font-semibold text-primary-foreground transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,184,148,0.15)] active:-translate-y-px active:scale-[0.97]"
          >
            Start a Project
          </a>
          <a
            href="https://portal.alisamadii.com/agency"
            className="inline-flex border-b border-border pb-0.5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted transition-colors duration-300 hover:border-text hover:text-text"
          >
            I am a customer
          </a>
        </div>
      </div>
      <div className="relative hidden items-center lg:flex">
        <div className="relative w-full overflow-hidden rounded-3xl shadow-diffuse">
          <img src="https://cdn.alisamadii.com/company/hero.webp" alt="Agency work showcase" className="aspect-[4/5] w-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg/60 via-transparent to-bg/20" />
        </div>
      </div>
    </section>
  );
}
