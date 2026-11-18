"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { codeToHtml } from "shiki";
import { toast } from "sonner";

import { cn } from "@workspace/ui/lib/utils";

import { useAgency } from "@/components/agency/use-agency";
import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { Copy } from "@/components/icon";
import { leadsPrompt } from "@/lib/embed-prompts";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "https://api.alisamadii.com").replace(/\/$/, "");

// A full working form, so whoever installs the script sees the whole contract:
// data-lead-form on the form, plain name attributes on the inputs.
const EXAMPLE_FORM = `<form data-lead-form="Contact" data-success="Thanks! We'll be in touch soon.">
  <input name="name" placeholder="Your name" required />
  <input name="email" type="email" placeholder="Email" required />
  <input name="phone" type="tel" placeholder="Phone" />
  <textarea name="message" placeholder="How can we help?"></textarea>
  <!-- honeypot: hidden from people, bots fill it in -->
  <input name="_hp" type="text" style="display:none" tabindex="-1" autocomplete="off" />
  <button type="submit">Send</button>
</form>`;

const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success("Copied."));

/**
 * A snippet to paste: dark block (Shiki github-dark on ink) with the copy
 * button in the corner. Plain mono until Shiki is ready, so nothing jumps.
 */
export function CopyBlock({ code, lang = "html" }: { code: string; lang?: string }) {
  const html = useQuery({
    queryKey: ["shiki", "github-dark", lang, code],
    queryFn: () => codeToHtml(code, { lang, theme: "github-dark" }),
    staleTime: Infinity,
    retry: false,
  });
  return (
    <div className="relative rounded-inner bg-ink">
      <div className="overflow-x-auto p-4 pr-14 font-mono text-[12.5px] leading-[1.6] text-white [&_pre]:!bg-transparent [&_pre]:whitespace-pre">
        {html.data ? (
          // Shiki escapes the snippet; the HTML is its own token spans.
          <div dangerouslySetInnerHTML={{ __html: html.data }} />
        ) : (
          <pre>{code}</pre>
        )}
      </div>
      <CopyCorner text={code} />
    </div>
  );
}

/** Copy button for the corner of a dark block. */
function CopyCorner({ text }: { text: string }) {
  return (
    <button
      type="button"
      aria-label="Copy"
      onClick={() => void copy(text)}
      className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-control border border-white/15 text-white/80 hover:bg-white/10 hover:text-white"
    >
      <Copy className="size-4" />
    </button>
  );
}

// A ready-made prompt for clients who edit their site with ChatGPT, Claude or
// Cursor: paste it with the site code and the AI installs the whole contract.
export function AiPromptBlock({ prompt }: { prompt: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="flex flex-col gap-2 border-t border-divider pt-4">
      <p className="text-sm font-semibold text-ink">Using an AI to edit your site?</p>
      <p className="text-[13px] text-dim">
        Copy this prompt, paste it with your site code, and it installs everything above.
      </p>
      <div className="relative rounded-inner bg-ink">
        <pre
          className={cn(
            "p-4 pr-14 font-mono text-[12.5px] leading-[1.6] whitespace-pre-wrap text-white/90",
            !expanded && "line-clamp-6"
          )}
        >
          {prompt}
        </pre>
        <CopyCorner text={prompt} />
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="self-start text-[13px] font-medium text-coral-text"
      >
        {expanded ? "Show less" : "Show full prompt"}
      </button>
      <Button
        variant="dark"
        size="sm"
        className="self-start"
        icon={<Copy className="size-3.5" />}
        onClick={() => void copy(prompt)}
      >
        Copy prompt
      </Button>
    </section>
  );
}

// The one-line capture script, for whoever maintains the site's code.
export function InstallSnippet() {
  const { projectId, canInstall } = useAgency();
  if (!canInstall) return null;

  const snippet = `<script src="${API_URL}/leads.js" data-key="${projectId}" defer></script>`;

  return (
    <Card className="text-sm">
      <CardHeader title="Lead capture setup" divided />
      <div className="space-y-3 px-6 py-5">
        <p className="text-dim">
          <span className="font-medium text-ink">1. Add this tag to every page.</span>{" "}
          It remembers which ad or link brought the visitor, even if they
          browse around before submitting.
        </p>
        <CopyBlock code={snippet} />
        <p className="text-dim">
          <span className="font-medium text-ink">
            2. Add <code>data-lead-form</code> to each form.
          </span>{" "}
          That attribute is the only required change: the script takes over the
          submit and sends every input along with the attribution. No code for
          individual fields is needed.
        </p>
        <CopyBlock code={EXAMPLE_FORM} />
        <p className="text-dim">
          Fields are recognized by each input&apos;s <code>name</code>{" "}
          attribute: <code>name</code>, <code>email</code>, <code>phone</code>{" "}
          and <code>message</code> (and common variants like{" "}
          <code>full_name</code>, <code>tel</code>, or{" "}
          <code>first_name</code> + <code>last_name</code>) fill the lead&apos;s
          contact details. Any other named input still comes through and shows
          on the lead as an extra field.
        </p>
        <p className="text-dim">
          Optional: <code>data-success=&quot;…&quot;</code> changes the
          thank-you text, <code>data-redirect=&quot;/thank-you&quot;</code>{" "}
          sends the visitor to a page instead, and the hidden{" "}
          <code>_hp</code> input quietly filters out bots.
        </p>
        <p className="text-dim">
          <span className="font-medium text-ink">
            Advanced: keep your own validation &amp; messages.
          </span>{" "}
          The script dispatches three cancelable events on the form so your page
          can validate before the send and show its own result UI while the
          script still captures the lead. Call <code>preventDefault()</code> on an
          event to take over that step:
        </p>
        <ul className="text-dim list-disc space-y-1 pl-5">
          <li>
            <code>lead:beforesubmit</code>: fires before the request; cancel it
            to run your own validation and block the send.
          </li>
          <li>
            <code>lead:success</code>: fires on success; cancel it to show your
            own thank-you instead of the built-in message.
          </li>
          <li>
            <code>lead:error</code>: fires on failure; cancel it to show your own
            error message. <code>event.detail</code> is{" "}
            <code>{"{ status, message }"}</code>: the server&apos;s reason (e.g.
            429 &quot;Too many requests.&quot;) to display.
          </li>
        </ul>
        <p className="text-dim">
          The attribution, the honeypot, and any <code>data-conversion</code>{" "}
          still work the same: the conversion fires on every real success even
          when you handle the UI yourself. Leave the events alone and the built-in
          behavior above runs unchanged.
        </p>
        <AiPromptBlock prompt={leadsPrompt({ apiUrl: API_URL, projectId })} />
      </div>
    </Card>
  );
}
