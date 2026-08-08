import { siteConfig } from "@/lib/site-config";

export async function GET() {
  const lines = [
    `# ${siteConfig.name}`,
    `> ${siteConfig.description}`,
    `> ${siteConfig.url}`,
    "",
    "## Pages",
    `- [Home](${siteConfig.url})`,
    "",
    "## Contact",
    ...(siteConfig.business.email ? [`- Email: ${siteConfig.business.email}`] : []),
    ...(siteConfig.business.telephone
      ? [`- Phone: ${siteConfig.business.telephone}`]
      : []),
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
