// app/(marketing)/_sections/docs.tsx
import {
  ArrowRight,
  FileCode,
  FileText,
  Image,
  MessageSquare,
  Search,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

const docsFeatures = [
  {
    icon: Search,
    title: "Full-Text Search",
    description:
      "Orama-powered search indexes every doc page for instant results.",
  },
  {
    icon: FileCode,
    title: "MDX with Syntax Highlighting",
    description: "Write docs in MDX with full code block highlighting.",
  },
  {
    icon: FileText,
    title: "Raw MDX Endpoints",
    description:
      "Every page exposes its raw MDX so AI tools can consume your docs.",
  },
  {
    icon: MessageSquare,
    title: "AI Tool Buttons",
    description: '"Open in ChatGPT / Claude / Scira AI" buttons on every page.',
  },
  {
    icon: ArrowRight,
    title: "/llms-full.txt",
    description:
      "Entire documentation served as plain text at a single endpoint.",
  },
  {
    icon: Image,
    title: "OG Image Generation",
    description: "Automatic Open Graph images per doc page for social sharing.",
  },
];

export function DocsSection() {
  return (
    <section className="bg-muted/30 border-t py-24">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 rounded-full px-3 py-1 text-xs"
          >
            Documentation
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Docs That Serve Humans and AI
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Fumadocs-powered documentation with full-text search and LLM-ready
            endpoints on every page.
          </p>
        </div>

        {/* Grid */}
        <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docsFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardHeader className="pb-2">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10">
                    <Icon className="size-4 text-amber-500" />
                  </div>
                  <CardTitle className="text-sm">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
