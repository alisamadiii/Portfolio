"use client";

import { handleCmsError, SUBSCRIPTION_REQUIRED_EVENT } from "@/lib/trpc-errors";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { useSessionEvents, type MessageRun } from "@/hooks/use-session-events";
import {
  useSessionTranscript,
  type TranscriptMessage,
} from "@/hooks/use-session-transcript";
import {
  filterSkills,
  SlashSkillsMenu,
  useSlashMenuSelection,
  type SessionSkill,
} from "@/components/canvas/slash-skills-menu";

import {
  useCanvasEditor,
  type PickedElement,
} from "@/components/canvas/canvas-editor-context";
import {
  ArrowUp,
  Check,
  ChevronRight,
  CircleCheck,
  Copy,
  Loader2,
  MousePointerClick,
  PaintbrushSparkle,
  Settings,
  Square,
  TriangleAlert,
  Users,
  X,
} from "@/components/icon";

/**
 * Right-sidebar chat for live-preview AI sessions. The client talks to Claude
 * while watching the canvas preview update via HMR; the panel renders the
 * Claude CLI's stream Claude-style — thinking shimmer, tool activity lines,
 * streamed reply text — then a commit/status row per exchange.
 */

const pilotUrl = (process.env.NEXT_PUBLIC_CONTENT_PILOT_URL ?? "").replace(
  /\/+$/,
  ""
);

/**
 * Page + clicked-element context prepended to the AI prompt (never shown in the
 * transcript). The viewed page is always attached; a picked element adds its
 * exact source ref so the AI edits the right file without scanning the repo.
 */
function buildContext(
  page: { path: string; url: string | null } | null,
  picked: PickedElement | null
): string | undefined {
  const lines: string[] = [];
  const pageRef = picked?.pageUrl || page?.url || page?.path;
  if (pageRef) lines.push(`The client is editing this page: ${pageRef}`);
  if (picked) {
    if (picked.sourceRef)
      lines.push(`They clicked an element — source: ${picked.sourceRef}`);
    if (picked.elementText)
      lines.push(`Element content: "${picked.elementText}"`);
    lines.push(
      "Focus the change on that element; do not search the rest of the repo unless needed."
    );
  }
  return lines.length ? lines.join("\n") : undefined;
}

const shortText = (value: string, max = 40) =>
  value.length > max ? value.slice(0, max).trimEnd() + "…" : value;

/** Compact display for a long URL: host + a trimmed path. */
const shortenUrl = (url: string) => {
  try {
    const u = new URL(url);
    const tail = (u.pathname + u.search).replace(/\/$/, "");
    return u.host + (tail.length > 20 ? tail.slice(0, 20) + "…" : tail);
  } catch {
    return url.length > 42 ? url.slice(0, 42) + "…" : url;
  }
};

/**
 * Render message text, turning long URLs into short underlined links. Link
 * color adapts to the bubble: white on the orange user bubble, blue on the
 * gray assistant bubble.
 */
const linkify = (text: string, onPrimary = false): React.ReactNode[] =>
  text.split(/(https?:\/\/[^\s]+)/g).map((part, index) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noreferrer"
        title={part}
        className={cn(
          "underline [overflow-wrap:anywhere]",
          onPrimary
            ? "decoration-primary-foreground/50 font-medium underline-offset-2"
            : "text-blue-600 dark:text-blue-400"
        )}
      >
        {shortenUrl(part)}
      </a>
    ) : (
      <span key={index}>{part}</span>
    )
  );

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

/** Compact token total for a turn, e.g. "1.2k tokens" / "840 tokens". */
const formatTokens = (input: number | null, output: number | null) => {
  const total = (input ?? 0) + (output ?? 0);
  if (!total) return null;
  const label = total >= 1000 ? `${(total / 1000).toFixed(1)}k` : `${total}`;
  return `${label} tokens`;
};

/** Small time + copy (+ token count) row shown under a persisted bubble. */
function MessageMeta({
  createdAt,
  content,
  align,
  tokens,
}: {
  createdAt: string;
  content: string;
  align: "start" | "end";
  /** Turn's token usage, shown beside copy (assistant side only). */
  tokens?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className={cn(
        "text-muted-foreground/60 flex items-center gap-1 px-1 text-[10.5px]",
        align === "end" ? "flex-row-reverse self-end" : "self-start"
      )}
    >
      <span className="tabular-nums">{formatTime(createdAt)}</span>
      <button
        type="button"
        aria-label="Copy message"
        className="hover:text-foreground rounded p-0.5 transition-colors"
        onClick={() => {
          navigator.clipboard?.writeText(content).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </button>
      {tokens && <span className="tabular-nums">{tokens}</span>}
    </div>
  );
}

export function SessionChatPanel() {
  const {
    repoId,
    session,
    editToken,
    capacityMessage,
    previewError,
    previewTimedOut,
    retryStart,
    currentPage,
    pickedElement,
    clearPickedElement,
  } = useCanvasEditor();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const sessionQueryKey = trpc.cms.previewSession.get.queryOptions({
    repoId,
  }).queryKey;
  const invalidateSession = () =>
    queryClient.invalidateQueries({ queryKey: sessionQueryKey });

  const [capacityBlocked, setCapacityBlocked] = useState<string | null>(null);
  const startMutation = useMutation(
    trpc.cms.previewSession.start.mutationOptions({
      onSuccess: () => {
        setCapacityBlocked(null);
        invalidateSession();
      },
      onError: (error) => {
        // All preview slots busy → educate in-panel instead of a bare toast.
        if (error.data?.code === "TOO_MANY_REQUESTS") {
          setCapacityBlocked(error.message);
        } else {
          // PAYMENT_REQUIRED opens the purchase dialog.
          toast.error(handleCmsError(error, error.message));
        }
      },
    })
  );
  const closeMutation = useMutation(
    trpc.cms.previewSession.close.mutationOptions({
      onSuccess: () => {
        invalidateSession();
        toast.success("Session discarded");
      },
      onError: (error) => toast.error(error.message),
    })
  );
  // Transcript straight from content-pilot — shared with the header's
  // session actions via the same query key.
  const transcriptQuery = useSessionTranscript(session?.id, editToken);

  const { runs } = useSessionEvents({
    sessionId: session?.id ?? null,
    editToken,
    onMessageDone: () => {
      void transcriptQuery.refetch();
    },
    onSessionChange: invalidateSession,
  });

  const cancelMutation = useMutation(
    trpc.cms.previewSession.cancel.mutationOptions({
      onSuccess: () => void transcriptQuery.refetch(),
      onError: (error) => toast.error(error.message),
    })
  );

  const sendMutation = useMutation({
    mutationFn: async ({
      content,
      context,
    }: {
      content: string;
      context?: string;
    }) => {
      const res = await fetch(
        `${pilotUrl}/api/v1/sessions/${session!.id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${editToken}`,
          },
          body: JSON.stringify(context ? { content, context } : { content }),
        }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Could not send your request.");
      }
    },
    onSuccess: () => {
      clearPickedElement();
      void transcriptQuery.refetch();
    },
  });

  const [input, setInput] = useState("");

  // v0-style composer: the textarea grows with its content (capped), and
  // shrinks back when the input is cleared or restored programmatically.
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // Picking an element in design mode means the user is about to describe a
  // change to it — drop the cursor straight into the composer so they can type.
  useEffect(() => {
    if (pickedElement) textareaRef.current?.focus();
  }, [pickedElement]);

  // "/" skills menu: the client repo's .claude/skills, listed by content-pilot
  // from the workspace clone. A selected skill just becomes "/name " in the
  // message — the Agent SDK resolves it from the repo itself.
  const skillsQuery = useQuery({
    queryKey: ["preview-session-skills", session?.id],
    enabled: Boolean(session?.id && editToken && pilotUrl),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SessionSkill[]> => {
      const res = await fetch(
        `${pilotUrl}/api/v1/sessions/${session!.id}/skills`,
        { headers: { Authorization: `Bearer ${editToken}` } }
      );
      if (!res.ok) return [];
      const body = (await res.json()) as { skills?: SessionSkill[] };
      return body.skills ?? [];
    },
  });
  const skills = skillsQuery.data ?? [];
  const slashMatch = /^\/(\S*)$/.exec(input);
  const slashQuery = slashMatch?.[1] ?? null;
  const slashItems =
    slashQuery !== null ? filterSkills(skills, slashQuery) : [];
  const slashOpen = slashQuery !== null && slashItems.length > 0;
  const { selectedIndex, move } = useSlashMenuSelection(
    slashItems.length,
    slashQuery ?? ""
  );
  const pickSkill = (name: string) => {
    setInput(`/${name} `);
  };

  // Optimistic sends: the user bubble appears instantly; each entry is dropped
  // once the transcript refetch returns a matching user message (or the send
  // fails). Synthetic ids are negative so they never collide with real ones.
  const [pendingSends, setPendingSends] = useState<
    { key: number; content: string; at: number }[]
  >([]);
  const rawMessages = transcriptQuery.data?.messages ?? [];
  const messages: TranscriptMessage[] = [
    ...rawMessages,
    ...pendingSends
      .filter(
        (pending) =>
          !rawMessages.some(
            (message) =>
              message.role === "user" &&
              message.content === pending.content &&
              new Date(message.createdAt).getTime() >= pending.at - 5_000
          )
      )
      .map((pending) => ({
        id: -pending.key,
        role: "user" as const,
        content: pending.content,
        status: "queued" as const,
        commitSha: null,
        error: null,
        createdAt: new Date(pending.at).toISOString(),
        inputTokens: null,
        outputTokens: null,
      })),
  ];
  // Prune matched entries so the list doesn't rescan forever.
  useEffect(() => {
    setPendingSends((current) =>
      current.filter(
        (pending) =>
          !rawMessages.some(
            (message) =>
              message.role === "user" &&
              message.content === pending.content &&
              new Date(message.createdAt).getTime() >= pending.at - 5_000
          )
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcriptQuery.dataUpdatedAt]);

  const busy = messages.some(
    (message) =>
      message.role === "user" &&
      (message.status === "queued" || message.status === "running")
  );

  // Pin the transcript to the bottom as messages/activity stream in.
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastRun = [...runs.values()].pop();
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, lastRun?.activities.length, lastRun?.text, busy]);

  // Messages queue server-side while the preview boots (and revive a paused
  // session), so the composer only locks for broken/finished sessions.
  const TERMINAL_STATUSES = ["needs_config", "failed", "closed", "published", "expired"];
  const canSend = Boolean(
    session && !TERMINAL_STATUSES.includes(session.status)
  );
  // While the AI is working we don't queue more tasks — the send button turns
  // into a pause control (below) instead.
  const pause = () => {
    if (!session || cancelMutation.isPending) return;
    cancelMutation.mutate({ repoId, sessionId: session.id });
  };

  const send = () => {
    const content = input.trim();
    if (!content || sendMutation.isPending || !canSend || busy) return;
    // AI chat is plan-gated: no edit token means the server refused the mint
    // (402) — open the purchase dialog instead of posting with a dead token.
    if (!editToken) {
      window.dispatchEvent(
        new CustomEvent(SUBSCRIPTION_REQUIRED_EVENT, {
          detail: { feature: "cms" },
        })
      );
      return;
    }
    const key = Date.now();
    // Optimistic: bubble + cleared input immediately; restored on failure.
    setPendingSends((current) => [...current, { key, content, at: key }]);
    setInput("");
    sendMutation.mutate(
      { content, context: buildContext(currentPage, pickedElement) },
      {
        onError: (error) => {
          setPendingSends((current) =>
            current.filter((pending) => pending.key !== key)
          );
          setInput(content);
          toast.error(error.message);
        },
      }
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header — the chat is the editor's primary surface, never closable. */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        <span className="text-[13px] font-semibold">Edit with AI</span>
        <SessionStatusPill session={session} />
      </div>

      {!session ? (
        previewError ? (
          <ErrorPane
            message={previewError}
            retrying={startMutation.isPending}
            onRetry={retryStart}
          />
        ) : (capacityMessage ?? capacityBlocked) ? (
          <CapacityPane
            message={capacityMessage ?? capacityBlocked ?? ""}
            retrying={startMutation.isPending}
            onRetry={() => {
              setCapacityBlocked(null);
              retryStart();
            }}
          />
        ) : (
          // Auto-start fires on project open — no start button, just boot state.
          <BootPane status="starting" />
        )
      ) : previewTimedOut ? (
        <ErrorPane
          message="The preview is taking longer than expected to start. It may be having trouble booting."
          retrying={startMutation.isPending}
          onRetry={retryStart}
        />
      ) : session.status === "needs_config" ? (
        <NeedsConfigPane
          message={session.error}
          retrying={startMutation.isPending || closeMutation.isPending}
          onRetry={async () => {
            // The stuck session is terminal — clear it, then start fresh so the
            // supervisor re-reads the (now fixed) app-folder setting.
            await closeMutation.mutateAsync({
              repoId,
              sessionId: session.id,
            });
            startMutation.mutate({ repoId });
          }}
        />
      ) : session.status === "failed" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <TriangleAlert className="size-6 text-red-500" />
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            {session.error ?? "The preview could not start."}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              closeMutation.mutate({ repoId, sessionId: session.id })
            }
          >
            Close session
          </Button>
        </div>
      ) : (
        <>
          {/* Booting/waking states keep the transcript + composer usable —
              messages queue server-side and run once the preview is ready. */}
          {session.status !== "ready" && (
            <StatusBanner status={session.status} />
          )}
          {/* Transcript */}
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto p-3 pb-34"
          >
            {messages.length === 0 && (
              <p className="text-muted-foreground px-1 py-6 text-center text-[13px] leading-relaxed">
                Describe a change and watch it happen live in the preview —
                nothing goes on your site until you publish.
              </p>
            )}
            <div className="flex flex-col gap-3">
              {messages.map((message, index) => {
                if (message.role === "user") {
                  return (
                    <UserExchange
                      key={message.id}
                      message={message}
                      run={runs.get(message.id)}
                    />
                  );
                }
                // Usage is stored on the user message that drove this reply
                // (the row right before it) — surface it beside the copy icon.
                const prev = messages[index - 1];
                const tokens =
                  prev?.role === "user"
                    ? formatTokens(prev.inputTokens, prev.outputTokens)
                    : null;
                return (
                  <div key={message.id} className="flex flex-col gap-1">
                    <AssistantBubble text={message.content} />
                    <MessageMeta
                      createdAt={message.createdAt}
                      content={message.content}
                      align="start"
                      tokens={tokens}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t p-2.5">
            {pickedElement && (
              <div className="bg-primary/10 text-primary mb-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px]">
                <MousePointerClick className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {pickedElement.elementText
                    ? `“${shortText(pickedElement.elementText)}”`
                    : "Selected element"}
                  <span className="text-primary/60">
                    {" · "}
                    {pickedElement.pagePath}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label="Clear selection"
                  className="hover:bg-primary/20 shrink-0 rounded p-0.5"
                  onClick={clearPickedElement}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
            <div className="relative">
              {slashOpen && (
                <SlashSkillsMenu
                  query={slashQuery ?? ""}
                  skills={skills}
                  selectedIndex={selectedIndex}
                  onSelect={pickSkill}
                />
              )}
              {/* overflow-hidden clips the textarea's square corners to the
                  card radius; the slash menu sits outside so it isn't cut. */}
              <div className="bg-card focus-within:ring-primary overflow-hidden rounded-2xl border shadow-sm transition-shadow focus-within:ring-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (slashOpen) {
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      move(-1);
                      return;
                    }
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      move(1);
                      return;
                    }
                    if (event.key === "Enter" || event.key === "Tab") {
                      event.preventDefault();
                      const picked = slashItems[selectedIndex];
                      if (picked) pickSkill(picked.name);
                      return;
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setInput("");
                      return;
                    }
                  }
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder='e.g. "Change the hero headline to…"'
                rows={1}
                className="max-h-40 min-h-[44px] w-full resize-none border-0 bg-transparent px-3 pt-2.5 pb-0 text-[13px] shadow-none focus-visible:ring-0 dark:bg-transparent"
              />
              <div className="flex items-center justify-end px-2 pb-2">
                <Button
                  size="icon"
                  aria-label={busy ? "Pause" : "Send"}
                  title={busy ? "Pause the AI" : "Send"}
                  className="size-7 shrink-0 rounded-full"
                  disabled={
                    busy
                      ? cancelMutation.isPending || !session
                      : !input.trim() || sendMutation.isPending || !canSend
                  }
                  onClick={busy ? pause : send}
                >
                  {busy ? (
                    cancelMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Square className="size-3 fill-current" />
                    )
                  ) : sendMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ArrowUp className="size-3.5" />
                  )}
                </Button>
              </div>
              </div>
            </div>
            <p className="text-muted-foreground/70 mt-2 px-1 text-[11px] leading-relaxed">
              Please avoid sharing confidential or private details for now.
              While we test on the free plan, messages may be reviewed by
              Google. Once we move to the paid plan, your content stays
              completely private.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

const bootLabel = (status: string) =>
  status === "installing"
    ? "Preparing your site…"
    : status === "restarting"
      ? "Restarting the preview…"
      : status === "paused"
        ? "Waking your preview…"
        : "Starting your preview…";

/** Slim in-session banner — the transcript and composer stay usable below. */
function StatusBanner({ status }: { status: string }) {
  return (
    <div className="text-muted-foreground flex shrink-0 items-center gap-2 border-b bg-amber-500/5 px-3 py-1.5 text-[12px]">
      <Loader2 className="size-3 animate-spin" />
      <span className="shimmer-text font-medium">{bootLabel(status)}</span>
      <span className="text-muted-foreground/60">
        You can type now — requests run as soon as it's up.
      </span>
    </div>
  );
}

function CapacityPane({
  message,
  retrying,
  onRetry,
}: {
  message: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <Users className="size-5" />
      </div>
      <h3 className="text-[15px] font-semibold tracking-tight">
        Preview slots are full
      </h3>
      <p className="text-muted-foreground max-w-[250px] text-[13px] leading-relaxed">
        {message} Other site owners are editing live right now — a slot frees up
        as soon as one of them finishes.
      </p>
      <Button size="sm" disabled={retrying} onClick={onRetry}>
        {retrying ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <PaintbrushSparkle className="size-4" />
        )}
        Try again
      </Button>
    </div>
  );
}

/**
 * The preview needs one-time setup only an admin can do (pointing it at the
 * right app folder for repos that keep several projects). Framed as "ask your
 * admin", not an error — once the admin fixes it, "Try again" starts fresh.
 */
function NeedsConfigPane({
  message,
  retrying,
  onRetry,
}: {
  message: string | null;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <Settings className="size-5" />
      </div>
      <h3 className="text-[15px] font-semibold tracking-tight">
        One-time setup needed
      </h3>
      <p className="text-muted-foreground max-w-[250px] text-[13px] leading-relaxed">
        {message ??
          "This project needs a small configuration before live editing works."}{" "}
        Please ask your site administrator to set it up — it only takes a
        minute, and you can try again right after.
      </p>
      <Button size="sm" disabled={retrying} onClick={onRetry}>
        {retrying ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <PaintbrushSparkle className="size-4" />
        )}
        Try again
      </Button>
    </div>
  );
}

/** Preview service unreachable, or boot ran past the timeout — retryable. */
function ErrorPane({
  message,
  retrying,
  onRetry,
}: {
  message: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <TriangleAlert className="size-6 text-red-500" />
      <p className="text-muted-foreground max-w-[250px] text-[13px] leading-relaxed">
        {message}
      </p>
      <Button size="sm" variant="outline" disabled={retrying} onClick={onRetry}>
        {retrying ? <Loader2 className="size-4 animate-spin" /> : null}
        Try again
      </Button>
    </div>
  );
}

function BootPane({ status }: { status: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <Loader2 className="text-primary size-5 animate-spin" />
      <p className="text-muted-foreground text-[13px]">{bootLabel(status)}</p>
      <p className="text-muted-foreground/70 max-w-[230px] text-[12px] leading-relaxed">
        First start can take a minute or two while the preview is built.
      </p>
    </div>
  );
}

/** One user request + its live Claude activity / final status. */
function UserExchange({
  message,
  run,
}: {
  message: TranscriptMessage;
  run: MessageRun | undefined;
}) {
  const inFlight = message.status === "queued" || message.status === "running";
  const [showDetails, setShowDetails] = useState(false);
  const steps = run?.activities ?? [];
  // Persistent progress state: keep a live indicator through long silent gaps
  // (e.g. the post-edit verify step, which streams no events for 15-20s) so the
  // run never *looks* finished while it's still working. Hidden only while the
  // assistant answer is actively streaming (the bubble itself shows motion).
  const streamingText = Boolean(run?.text && !run?.done);
  const showProgress = inFlight && !streamingText;
  const progressLabel =
    message.status === "queued"
      ? "Queued…"
      : run?.thinking
        ? "Thinking…"
        : run?.done
          ? "Saving changes…"
          : "Working…";
  return (
    <div className="flex flex-col gap-1.5">
      {/* User bubble, right-aligned */}
      <div className="bg-primary text-primary-foreground ml-8 max-w-[85%] min-w-0 self-end rounded-2xl rounded-br-md px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
        {linkify(message.content, true)}
      </div>
      <MessageMeta
        createdAt={message.createdAt}
        content={message.content}
        align="end"
      />

      {/* Live activity while the run is in flight (Claude-style). */}
      {inFlight && (
        <div className="mr-6 flex flex-col gap-1">
          {run?.activities.map((activity, index) =>
            activity.kind === "tool" ? (
              <div
                key={index}
                className="text-muted-foreground flex items-center gap-1.5 px-1 text-[12px]"
              >
                <Check className="size-3 opacity-60" />
                <span className="truncate">{activity.label}</span>
              </div>
            ) : (
              <div
                key={index}
                className="text-muted-foreground flex items-center gap-1.5 px-1 text-[12px]"
              >
                <CircleCheck className="size-3 text-emerald-500" />
                Saved to preview
              </div>
            )
          )}
          {/* Streaming assistant text */}
          {(run?.text || run?.done?.reply) && (
            <AssistantBubble
              text={run.done?.reply || run.text}
              streaming={!run.done}
            />
          )}
          {/* Persistent progress line — survives long silent gaps between
              steps so the run never looks done while it's still working. */}
          {showProgress && (
            <div className="flex items-center gap-1.5 px-1 text-[12px]">
              <Loader2 className="text-muted-foreground size-3 shrink-0 animate-spin" />
              <span className="shimmer-text">{progressLabel}</span>
            </div>
          )}
        </div>
      )}

      {/* Terminal status row (transcript is authoritative once refetched). */}
      {message.status === "failed" && (
        <div className="mr-6 flex items-start gap-1.5 px-1 text-[12px] text-red-500">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" />
          <span>{message.error ?? "This request failed."}</span>
        </div>
      )}

      {/* Details: after the run finishes, the live steps collapse into a
          toggle so the whole history stays reviewable (files read/edited). */}
      {!inFlight && steps.length > 0 && (
        <div className="mr-6 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setShowDetails((open) => !open)}
            className="text-muted-foreground/70 hover:text-foreground flex items-center gap-1 self-start px-1 text-[11px] transition-colors"
          >
            <ChevronRight
              className={cn(
                "size-3 transition-transform",
                showDetails && "rotate-90"
              )}
            />
            {showDetails ? "Hide details" : `Details · ${steps.length} steps`}
          </button>
          {showDetails && (
            <div className="border-border/60 ml-2 flex flex-col gap-1 border-l pl-2.5">
              {steps.map((activity, index) =>
                activity.kind === "tool" ? (
                  <div
                    key={index}
                    className="text-muted-foreground flex items-center gap-1.5 text-[12px]"
                  >
                    <Check className="size-3 shrink-0 opacity-60" />
                    <span className="[overflow-wrap:anywhere]">
                      {activity.label}
                    </span>
                  </div>
                ) : (
                  <div
                    key={index}
                    className="text-muted-foreground flex items-center gap-1.5 text-[12px]"
                  >
                    <CircleCheck className="size-3 shrink-0 text-emerald-500" />
                    Saved to preview ({activity.sha.slice(0, 7)})
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AssistantBubble({
  text,
  streaming,
}: {
  text: string;
  streaming?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-muted mr-6 max-w-[85%] min-w-0 self-start rounded-2xl rounded-bl-md px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]",
        streaming && "after:ml-0.5 after:animate-pulse after:content-['▍']"
      )}
    >
      {linkify(text)}
    </div>
  );
}

function SessionStatusPill({
  session,
}: {
  session: { status: string } | null;
}) {
  if (!session) return null;
  const ready = session.status === "ready";
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-medium",
        ready
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          ready ? "bg-emerald-500" : "animate-pulse bg-amber-500"
        )}
      />
      {ready
        ? "Live preview"
        : session.status === "needs_config"
          ? "Needs setup"
          : session.status === "paused"
            ? "Waking"
            : "Starting"}
    </span>
  );
}
