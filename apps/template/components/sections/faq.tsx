// app/(marketing)/_sections/faq.tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { Badge } from "@workspace/ui/components/badge";

const faqs = [
  {
    question: "What tech stack does this use?",
    answer:
      "Next.js 16, React 19, Expo 55, Drizzle ORM, Neon PostgreSQL, tRPC, Better Auth, Polar, Tailwind CSS 4, shadcn/ui, and Turborepo. Everything is TypeScript with end-to-end type safety.",
  },
  {
    question: "Do I need all 5 apps?",
    answer:
      "No. Remove any app you don't need — the monorepo structure makes it easy to keep only what you use. Each app is self-contained with its own configuration.",
  },
  {
    question: "Can I swap out Polar for Stripe?",
    answer:
      "Yes. The payment logic is isolated in @workspace/auth (Polar plugin) and @workspace/trpc (payments router). Replace these modules with any payment provider you prefer.",
  },
  {
    question: "Is the mobile app required?",
    answer:
      "No. The Expo app is standalone. Delete the apps/mobile directory if you're building a web-only product.",
  },
  {
    question: "What database can I use?",
    answer:
      "Ships with Neon PostgreSQL via Drizzle ORM. Since Drizzle supports PostgreSQL, MySQL, and SQLite, you can swap the driver and connection string to use a different database.",
  },
  {
    question: "How do I deploy?",
    answer:
      "Each app deploys independently. The Next.js apps are pre-configured for Vercel. The Expo app builds via EAS. You can also deploy to any Node.js hosting provider.",
  },
  {
    question: "Is this a SaaS boilerplate?",
    answer:
      "Yes. Auth, payments, subscriptions, admin panel, file uploads, email, and documentation — it's everything you need to launch a SaaS product. Real features, not TODO stubs.",
  },
];

export function FAQSection() {
  return (
    <section className="bg-muted/30 border-t py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 rounded-full px-3 py-1 text-xs"
          >
            FAQ
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        {/* Accordion */}
        <div className="mx-auto mt-12 max-w-2xl">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
