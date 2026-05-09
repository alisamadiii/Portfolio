import { animations } from "@/animations/registry";

export async function GET() {
  const lines: string[] = [
    "# Motion — Component & Animation Library",
    "> Production-grade animated React components. Source code only.",
    "> Built with Motion, Tailwind CSS, and TypeScript.",
    "> https://motion.alisamadii.com",
    "",
    "## Overview",
    "Motion is a collection of polished, copy-paste animated React components.",
    "Each component is self-contained with no wrapper libraries — just clean source code.",
    "Purchase once for lifetime access to all animations and future updates.",
    "",
    "## Tech Stack",
    "- React 19",
    "- Next.js (App Router)",
    "- motion/react (animation library)",
    "- Tailwind CSS v4",
    "- TypeScript",
    "- lucide-react (icons)",
    "",
    "## Components",
    "",
  ];

  for (const [slug, anim] of Object.entries(animations)) {
    lines.push(`### ${anim.name}`);
    lines.push(`- URL: https://motion.alisamadii.com/m/${slug}`);
    lines.push(`- Premium: ${anim.isPremium ? "Yes" : "No"}`);
    if (anim.description) {
      lines.push(`- Description: ${anim.description}`);
    }
    lines.push("");
  }

  lines.push("## Usage");
  lines.push("1. Browse components at https://motion.alisamadii.com");
  lines.push('2. Press "v" to view source code on any component page');
  lines.push("3. Copy the source code into your project");
  lines.push("4. Install required dependencies (shown in the install banner)");
  lines.push("");
  lines.push("## License");
  lines.push(
    "Source code is available for personal and commercial use after purchase."
  );
  lines.push("Free components are available without purchase.");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
