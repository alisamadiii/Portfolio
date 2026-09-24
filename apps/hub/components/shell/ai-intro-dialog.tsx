"use client";

import { useEffect, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { HelpCircle, Sparkles } from "@/components/icon";

// Bump this suffix if the intro changes enough that everyone should see it again.
const SEEN_KEY = "cms-ai-intro-seen-v1";

// Walkthrough video (direct MP4). Leave empty to show the "coming soon" box.
const VIDEO_URL = "https://cdn.alisamadii.com/ai.mp4";

/**
 * First-open explainer for the AI editing flow. Auto-opens once per browser
 * (gated by localStorage); the header "?" button reopens it anytime.
 */
export function AiIntroDialog() {
  const [open, setOpen] = useState(false);

  // Auto-open on the very first visit only. Runs client-side after mount so it
  // never fights SSR.
  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) {
        setOpen(true);
      }
    } catch {
      // localStorage may be unavailable (private mode) — just don't auto-open.
    }
  }, []);

  const markSeen = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore — worst case it shows again next time
    }
  };

  const handleOpenChange = (next: boolean) => {
    // Closing it (any way) counts as seen so it won't auto-open again.
    if (!next) markSeen();
    setOpen(next);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="How AI editing works"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground"
      >
        <HelpCircle className="size-5" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-lg"
          overlayClassName="bg-slate-950/60"
          overlayChildren={<AiBackdrop />}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              A simpler way to edit your site
            </DialogTitle>
            <DialogDescription>
              Editing is now as easy as pointing and asking — no forms, no fields
              to fill in.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-hidden rounded-lg border bg-muted">
            {VIDEO_URL ? (
              // Native aspect ratio (1720x1080) so there are no black bars.
              <video
                src={VIDEO_URL}
                autoPlay
                muted
                loop
                playsInline
                className="aspect-[43/27] w-full"
              />
            ) : (
              <div className="text-muted-foreground flex aspect-[43/27] items-center justify-center text-sm">
                Walkthrough video coming soon
              </div>
            )}
          </div>

          <ol className="space-y-3 text-sm">
            <Step n={1} title="Click what you want to change">
              Hover over any text or image on your page and click it — a little
              box highlights what you picked.
            </Step>
            <Step n={2} title="Describe the change in plain words">
              Type what you&apos;d like, like texting a designer — for example
              &ldquo;shorten this paragraph&rdquo; or &ldquo;change this photo to
              our new team picture.&rdquo;
            </Step>
            <Step n={3} title="Hit Send — that&apos;s it">
              Our AI makes the edit for you and publishes it. You&apos;ll see it
              live on your site shortly after.
            </Step>
            <Step n={4} title="Bigger changes? Ask your developer">
              New sections, new pages, or redesigns are still handled by your
              developer — reach out and they&apos;ll take care of it.
            </Step>
          </ol>

          <DialogFooter>
            <Button
              onClick={() => {
                markSeen();
                setOpen(false);
              }}
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Animated AI backdrop behind the dialog — drifting aurora blobs plus a slow
// rotating conic sheen. Pure CSS (transform/opacity only), decorative, and
// disabled under prefers-reduced-motion.
function AiBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="aiov-sheen" />
      <div className="aiov-blob aiov-b1" />
      <div className="aiov-blob aiov-b2" />
      <div className="aiov-blob aiov-b3" />
      <div className="aiov-blob aiov-b4" />
      <style>{AIOV_CSS}</style>
    </div>
  );
}

const AIOV_CSS = `
.aiov-blob {
  position: absolute;
  width: 40rem;
  height: 40rem;
  border-radius: 9999px;
  filter: blur(90px);
  mix-blend-mode: screen;
  opacity: 0.55;
  will-change: transform;
}
.aiov-b1 { top: -12%; left: -8%; background: radial-gradient(circle at center, #6366f1, transparent 62%); animation: aiov-d1 16s ease-in-out infinite; }
.aiov-b2 { top: -6%; right: -10%; background: radial-gradient(circle at center, #a855f7, transparent 62%); animation: aiov-d2 20s ease-in-out infinite; }
.aiov-b3 { bottom: -14%; left: -6%; background: radial-gradient(circle at center, #22d3ee, transparent 62%); animation: aiov-d3 18s ease-in-out infinite; }
.aiov-b4 { bottom: -10%; right: -8%; background: radial-gradient(circle at center, #ec4899, transparent 62%); animation: aiov-d4 22s ease-in-out infinite; }
.aiov-sheen {
  position: absolute;
  inset: -30%;
  background: conic-gradient(from 0deg, transparent, rgba(99,102,241,0.15), transparent 30%, rgba(34,211,238,0.15), transparent 60%, rgba(236,72,153,0.15), transparent);
  filter: blur(40px);
  will-change: transform;
  animation: aiov-spin 40s linear infinite;
}
@keyframes aiov-d1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(12%,16%) scale(1.2); } }
@keyframes aiov-d2 { 0%,100% { transform: translate(0,0) scale(1.1); } 50% { transform: translate(-14%,12%) scale(0.9); } }
@keyframes aiov-d3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(16%,-12%) scale(1.25); } }
@keyframes aiov-d4 { 0%,100% { transform: translate(0,0) scale(1.05); } 50% { transform: translate(-12%,-16%) scale(0.95); } }
@keyframes aiov-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .aiov-blob, .aiov-sheen { animation: none; }
}
`;

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="bg-primary/10 text-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
        {n}
      </span>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}
