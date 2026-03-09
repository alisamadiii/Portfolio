// app/(marketing)/_sections/tech-stack.tsx
import { Badge } from "@workspace/ui/components/badge";

const categories = [
  {
    label: "Framework & Runtime",
    items: ["Next.js 16", "React 19", "Expo 55", "React Native", "Turborepo"],
  },
  {
    label: "Data & API",
    items: ["Drizzle ORM", "Neon PostgreSQL", "tRPC"],
  },
  {
    label: "Auth & Payments",
    items: ["Better Auth", "Polar"],
  },
  {
    label: "Storage & Email",
    items: ["Cloudflare R2 / AWS S3", "AWS SES", "React Email"],
  },
  {
    label: "UI & Styling",
    items: ["Tailwind CSS 4", "shadcn/ui", "Radix UI", "Vaul"],
  },
  {
    label: "DX & Tooling",
    items: [
      "TypeScript",
      "pnpm",
      "ESLint",
      "Prettier",
      "Syncpack",
      "Zod",
      "React Hook Form",
    ],
  },
  {
    label: "Docs",
    items: ["Fumadocs", "Content Collections", "MDX"],
  },
];

export function TechStackSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 rounded-full px-3 py-1 text-xs"
          >
            Tech Stack
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built With the Tools You Already Love
          </h2>
        </div>

        {/* Grid */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((cat) => (
            <div key={cat.label}>
              <h3 className="text-muted-foreground mb-3 text-sm font-semibold">
                {cat.label}
              </h3>
              <div className="flex flex-wrap gap-2">
                {cat.items.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="rounded-full px-3 py-1.5 text-sm font-medium"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
