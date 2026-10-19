"use client";

import { useState } from "react";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { Check, HelpCircle, X } from "@/components/icon";

/**
 * "Learn about AI" button in the chat header. Opens a plain-language guide to
 * what the editing AI can and cannot do, so clients know how to phrase
 * requests and why some things (reverting, repositioning an image) are manual.
 * Every limit here is a real guard in content-pilot, not a disclaimer.
 */
export function AiInfoDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto h-7 gap-1.5 px-2 text-muted-foreground text-[12px]"
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="size-3.5" />
        Learn about AI
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>How the AI editor works</DialogTitle>
            <DialogDescription>
              Describe the change you want in plain words. The AI finds the
              right spot in your site and edits it, and you watch the preview
              update live. Here is what it does well and where it needs a hand.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 text-[13px] leading-relaxed">
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 font-semibold">
                <Check className="size-4 text-emerald-500" />
                What it can do
              </h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>Change text, headings, buttons and labels anywhere.</li>
                <li>Add, remove or reorder sections and list items.</li>
                <li>Add new entries: a team member, a writing, a resource.</li>
                <li>Swap colors, spacing and styling on what you point to.</li>
                <li>
                  Place an image you upload. Click an element in the preview
                  first to tell the AI exactly where to work.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 font-semibold">
                <X className="size-4 text-red-500" />
                What it cannot do
              </h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">
                    Revert to earlier content.
                  </span>{" "}
                  The AI does not remember your old text, so it will not undo a
                  change from memory. Use the Changes button in the header, then
                  revert each file you want back.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Reposition inside an image.
                  </span>{" "}
                  It cannot see the photo, so it cannot nudge a face into frame
                  or crop it. Upload an already-cropped image instead.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Act on a vague wish.
                  </span>{" "}
                  "Make it pop" is not enough. Say what to change and where.
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Change site settings or billing.
                  </span>{" "}
                  It edits page content only, never your configuration.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">Getting the best result</h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>Click the element you mean before you type.</li>
                <li>One clear change per message beats a long list.</li>
                <li>
                  Name the page or section when the element is not on screen.
                </li>
              </ul>
            </section>
          </div>

          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => setOpen(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
