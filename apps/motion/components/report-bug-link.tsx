"use client";

import Link from "next/link";

import { buttonVariants } from "@workspace/ui/components/button";
import { Bug } from "@workspace/ui/icons";

function getSystemInfo(): string {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "";
  }
  const lines: string[] = [
    "**System**",
    `- User Agent: ${navigator.userAgent}`,
    `- Platform: ${navigator.platform}`,
    `- Language: ${navigator.language}`,
    `- Screen: ${window.screen.width}x${window.screen.height}`,
    `- Viewport: ${window.innerWidth}x${window.innerHeight}`,
    `- Page: ${window.location.href}`,
  ];
  return lines.join("\n");
}

function buildIssueUrl(animationName: string, includeBody: boolean): string {
  const url = new URL("https://github.com/alisamadiii/Portfolio/issues/new");
  url.searchParams.set("title", animationName);
  if (includeBody) {
    const body = getSystemInfo();
    if (body) url.searchParams.set("body", body);
  }
  return url.toString();
}

export function ReportBugLink({ animationName }: { animationName: string }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.open(buildIssueUrl(animationName, true), "_blank", "noopener,noreferrer");
  };

  return (
    <Link
      href={buildIssueUrl(animationName, false)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={buttonVariants({
        variant: "outline",
        size: "icon-lg",
      })}
    >
      <Bug className="size-5.5" />
    </Link>
  );
}
