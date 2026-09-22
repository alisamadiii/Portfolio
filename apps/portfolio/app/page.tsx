import Link from "next/link";

import { company, logos, urls } from "@workspace/ui/lib/company";

import { AnimatedQuote } from "@/components/animated-quote";
import { apps, clients, nonprofits, type Tile } from "@/lib/work";

// Curated for now — just the live products.
const websites: Tile[] = [
  { name: "Agency", img: logos.default, href: urls.agency },
  { name: "Client Hub", img: logos.purple, href: urls.cms },
];

// One entry per social platform (company.social lists two X accounts).
const socials = company.social.filter(
  (s, i, all) => all.findIndex((x) => x.label === s.label) === i
);

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-16 px-6 py-24">
      <header>
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
            <img
              src="/ali-samadi.jpg"
              alt="Ali Samadi"
              width={96}
              height={96}
              className="size-24 rounded-[23%] border border-black/10 object-cover [corner-shape:squircle] supports-[corner-shape:squircle]:rounded-[46%] dark:border-white/15"
            />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Ali Samadi
              </h1>
              <p className="text-muted-foreground mt-1 text-lg">
                Software Developer
              </p>
            </div>
          </div>

          <div className="flex gap-1">
            {socials.map(({ icon: Icon, href, label }) => (
              <Link
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="text-muted-foreground hover:text-foreground flex size-9 items-center justify-center transition-colors"
              >
                <Icon className="size-5" />
              </Link>
            ))}
          </div>
        </div>

        <AnimatedQuote />
      </header>

      <Section title="Websites I'm building" items={websites} />
      <Section title="Apps" items={apps} />
      <Section title="Web Clients" items={clients} />
      <Section title="Nonprofit Projects" items={nonprofits} />
    </main>
  );
}

function Section({ title, items }: { title: string; items: Tile[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-muted-foreground mb-5 text-xs font-medium tracking-[0.2em] uppercase">
        {title}
      </h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item, i) => (
          <li key={item.name}>
            <AppTile item={item} index={i} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// Darken a #rrggbb hex by `amt` (0–1) for a subtle gradient.
function darken(hex: string, amt = 0.32) {
  const n = parseInt(hex.replace("#", ""), 16);
  const f = 1 - amt;
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r} ${g} ${b})`;
}

function AppTile({ item, index }: { item: Tile; index: number }) {
  // Colored monogram tiles get a diagonal gradient + faint dot pattern.
  const tileStyle = item.bg
    ? {
        backgroundImage: `linear-gradient(135deg, ${item.bg} 0%, ${darken(item.bg)} 100%)`,
      }
    : undefined;
  // Staggered entrance: blur + rise + fade, per-tile delay.
  const enter =
    "motion-opacity-in-0 motion-blur-in-[6px] motion-translate-y-in-[16px] motion-duration-500 motion-ease-out";
  const delay = { animationDelay: `${index * 70}ms` };

  const inner = (
    <div
      className="relative aspect-square w-full overflow-hidden rounded-[21%] bg-white shadow-[0_4px_14px_rgb(0_0_0/0.14)] ring-1 ring-black/10 ring-inset transition duration-300 [corner-shape:squircle] supports-[corner-shape:squircle]:rounded-[42%] group-hover:-translate-y-1 group-hover:shadow-[0_12px_30px_rgb(0_0_0/0.22)] dark:bg-neutral-900 dark:ring-white/15"
      style={tileStyle}
    >
      {item.bg && (
        // Barely-visible square grid over the gradient.
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgb(255 255 255 / 0.1) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.1) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
          }}
        />
      )}
      {item.img ? (
        // Full-bleed icon art (websites' colored brand icons + native app icons).
        <img
          src={item.img}
          alt={item.name}
          className="absolute inset-0 size-full object-cover"
        />
      ) : item.Icon ? (
        // Client logo glyph, centered on a white tile.
        <item.Icon className="text-foreground absolute inset-1/2 size-[44%] -translate-x-1/2 -translate-y-1/2" />
      ) : (
        <span
          className="text-foreground absolute inset-0 flex items-center justify-center text-2xl font-bold tracking-tight"
          style={item.fg ? { color: item.fg } : undefined}
        >
          {item.label ?? item.name.charAt(0)}
        </span>
      )}
    </div>
  );

  const label = (
    <p className="text-muted-foreground/50 mt-2 line-clamp-2 text-center text-[0.7rem] leading-tight">
      {item.name}
    </p>
  );

  if (!item.href) {
    return (
      <div className={`group block ${enter}`} style={delay} title={item.name}>
        {inner}
        {label}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      title={item.name}
      style={delay}
      className={`group block ${enter}`}
    >
      {inner}
      {label}
    </Link>
  );
}
