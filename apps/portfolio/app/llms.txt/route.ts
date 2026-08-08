import { allPosts } from "content-collections";

import { clientProjects } from "@/lib/clients";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export async function GET() {
  const lines: string[] = [
    `# ${SITE_NAME} — Portfolio`,
    `> ${SITE_DESCRIPTION}`,
    `> ${SITE_URL}`,
    "",
    "## About",
    "Ali Samadi is a full-stack developer building web apps, animations, and client projects",
    "with React, Next.js, TypeScript, and Tailwind CSS.",
    "",
    "## Writing",
    "",
  ];

  for (const post of allPosts) {
    lines.push(`- [${post.title}](${SITE_URL}/blog/${post._meta.path}): ${post.description}`);
  }

  lines.push("");
  lines.push("## Client Work");
  lines.push("");
  for (const client of clientProjects) {
    lines.push(`- [${client.name}](${SITE_URL}/client/${client.slug})`);
  }

  lines.push("");
  lines.push("## Other Sites");
  lines.push("- [Motion — Component & Animation Library](https://motion.alisamadii.com)");
  lines.push("- [Ali Samadi Agency](https://agency.alisamadii.com)");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
