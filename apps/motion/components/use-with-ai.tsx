"use client";

import { useParams } from "next/navigation";
import { animations } from "@/animations/registry";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";

import { useTRPC } from "@workspace/trpc/client";

import { getPackagesFromCode, updateSourceCode } from "@/lib/utils";
import { useIsPurchased } from "@/hooks/use-is-purchased";

const AI_SERVICES = [
  {
    name: "ChatGPT",
    icon: "/ai/chatgpt.svg",
    url: "https://chatgpt.com",
  },
  {
    name: "Claude",
    icon: "/ai/claude.svg",
    url: "https://claude.ai/new",
  },
  {
    name: "v0",
    icon: "/ai/v0.svg",
    url: "https://v0.dev/chat",
  },
  {
    name: "Gemini",
    icon: "/ai/gemini.svg",
    url: "https://gemini.google.com",
  },
];

function buildPrompt({
  name,
  slug,
  files,
  packages,
}: {
  name: string;
  slug: string;
  files: { filename: string; content: string }[];
  packages: string[];
}) {
  const fileBlocks = files
    .map((f) => `// ── ${f.filename} ──\n${updateSourceCode(f.content)}`)
    .join("\n\n");

  return `I have a React animation component called "${name}" from the Motion library.

Here is the source code:

\`\`\`tsx
${fileBlocks}
\`\`\`

Dependencies: ${packages.length > 0 ? packages.join(", ") : "none (just React)"}

Help me integrate this component into my project. Explain what it does and how to customize it.`;
}

export function UseWithAI({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const animation = animations[slug as keyof typeof animations];
  const { isPurchased } = useIsPurchased();

  const needsPurchase = animation?.isPremium && !isPurchased;

  const trpc = useTRPC();
  const fileQuery = useQuery(
    trpc.sources.getFiles.queryOptions(
      { sourceId: animation?.id ?? "" },
      { enabled: !!animation?.id }
    )
  );

  const handleClick = (service: (typeof AI_SERVICES)[number]) => {
    if (needsPurchase) return;

    const files =
      fileQuery.data
        ?.filter((f) => f.content !== null)
        .map((f) => ({
          filename: f.filename,
          content: f.content as string,
        })) ?? [];

    if (files.length === 0) {
      toast.error("Source code not available");
      return;
    }

    const allCode = files.map((f) => f.content).join("\n");
    const packages = getPackagesFromCode(allCode).map((p) => p.name);

    const prompt = buildPrompt({
      name: animation.name,
      slug: slug,
      files,
      packages,
    });

    navigator.clipboard.writeText(prompt);
    toast.success(`Prompt copied — opening ${service.name}`);

    setTimeout(() => {
      window.open(service.url, "_blank");
    }, 300);
  };

  return (
    <Popover>
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-2">
        <p className="text-muted-foreground px-2 pt-1 pb-2 text-xs font-medium">
          Copy prompt &amp; open
        </p>
        {AI_SERVICES.map((service) => (
          <button
            key={service.name}
            onClick={() => handleClick(service)}
            disabled={!!needsPurchase}
            className="hover:bg-accent flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40"
          >
            <img
              src={service.icon}
              alt={service.name}
              className="size-5 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {service.name}
          </button>
        ))}
        {needsPurchase && (
          <p className="text-muted-foreground px-2 pt-2 pb-1 text-center text-[11px]">
            Purchase to use with AI
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
