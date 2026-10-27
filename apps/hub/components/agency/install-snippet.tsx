"use client";

import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";

import { useAgency } from "@/components/agency/use-agency";
import { Copy } from "@/components/icon";

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

function CopyBlock({ code }: { code: string }) {
  return (
    <div className="flex items-start gap-2">
      <code className="bg-muted flex-1 rounded-md p-3 text-[12.5px] break-all whitespace-pre-wrap">
        {code}
      </code>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          navigator.clipboard.writeText(code).then(() => toast.success("Copied."))
        }
      >
        <Copy className="size-4" />
      </Button>
    </div>
  );
}

// The one-line capture script, for whoever maintains the site's code.
export function InstallSnippet() {
  const { repoId, canInstall } = useAgency();
  if (!canInstall) return null;

  const snippet = `<script src="${API_URL}/leads.js" data-key="${repoId}" defer></script>`;

  return (
    <details className="bg-card rounded-lg border px-5 py-3 text-[14px]">
      <summary className="cursor-pointer font-semibold">Lead capture setup</summary>
      <div className="mt-3 space-y-3">
        <p className="text-muted-foreground">
          <span className="text-foreground font-medium">1. Add this tag to every page.</span>{" "}
          It remembers which ad or link brought the visitor, even if they
          browse around before submitting.
        </p>
        <CopyBlock code={snippet} />
        <p className="text-muted-foreground">
          <span className="text-foreground font-medium">
            2. Add <code>data-lead-form</code> to each form.
          </span>{" "}
          That attribute is the only required change: the script takes over the
          submit and sends every input along with the attribution. No code for
          individual fields is needed.
        </p>
        <CopyBlock code={EXAMPLE_FORM} />
        <p className="text-muted-foreground">
          Fields are recognized by each input&apos;s <code>name</code>{" "}
          attribute: <code>name</code>, <code>email</code>, <code>phone</code>{" "}
          and <code>message</code> (and common variants like{" "}
          <code>full_name</code>, <code>tel</code>, or{" "}
          <code>first_name</code> + <code>last_name</code>) fill the lead&apos;s
          contact details. Any other named input still comes through and shows
          on the lead as an extra field.
        </p>
        <p className="text-muted-foreground">
          Optional: <code>data-success=&quot;…&quot;</code> changes the
          thank-you text, <code>data-redirect=&quot;/thank-you&quot;</code>{" "}
          sends the visitor to a page instead, and the hidden{" "}
          <code>_hp</code> input quietly filters out bots.
        </p>
        <p className="text-muted-foreground">
          <span className="text-foreground font-medium">
            Advanced: keep your own validation &amp; messages.
          </span>{" "}
          The script dispatches three cancelable events on the form so your page
          can validate before the send and show its own result UI while the
          script still captures the lead. Call <code>preventDefault()</code> on an
          event to take over that step:
        </p>
        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
          <li>
            <code>lead:beforesubmit</code> — fires before the request; cancel it
            to run your own validation and block the send.
          </li>
          <li>
            <code>lead:success</code> — fires on success; cancel it to show your
            own thank-you instead of the built-in message.
          </li>
          <li>
            <code>lead:error</code> — fires on failure; cancel it to show your own
            error message.
          </li>
        </ul>
        <p className="text-muted-foreground">
          The attribution, the honeypot, and any <code>data-conversion</code>{" "}
          still work the same — the conversion fires on every real success even
          when you handle the UI yourself. Leave the events alone and the built-in
          behavior above runs unchanged.
        </p>
      </div>
    </details>
  );
}
