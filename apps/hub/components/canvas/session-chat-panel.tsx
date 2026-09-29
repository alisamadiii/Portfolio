"use client";

import { useEffect, useRef, useState } from "react";
import { useRepo } from "@/contexts/repo-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { useSessionEvents, type MessageRun } from "@/hooks/use-session-events";
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
  Check,
  CircleCheck,
  Loader2,
  MousePointerClick,
  PaintbrushSparkle,
  Send,
  Settings,
  TriangleAlert,
  UploadCloud,
  Users,
  X,
} from "@/components/icon";

/**
 * Right-sidebar chat for live-preview AI sessions. The client talks to Claude
 * while watching the canvas preview update via HMR; the panel renders the
 * Claude CLI's stream Claude-style — thinking shimmer, tool activity lines,
 * streamed reply text — then a commit/status row per exchange.
 */

type TranscriptMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  status: "queued" | "running" | "done" | "failed" | "rejected";
  commitSha: string | null;
  error: string | null;
  createdAt: string;
};

type Transcript = {
  id: string;
  status: string;
  messages: TranscriptMessage[];
};

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

export function SessionChatPanel({ onClose }: { onClose: () => void }) {
  const {
    owner,
    repo,
    session,
    editToken,
    capacityMessage,
    retryStart,
    currentPage,
    pickedElement,
    clearPickedElement,
  } = useCanvasEditor();
  const { myRole } = useRepo();
  const canPublish = (myRole ?? "full-access") === "full-access";
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const sessionQueryKey = trpc.cms.previewSession.get.queryOptions({
    owner,
    repo,
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
          toast.error(error.message);
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
  const publishMutation = useMutation(
    trpc.cms.previewSession.publish.mutationOptions({
      onSuccess: (result) => {
        invalidateSession();
        toast.success(
          result.merged
            ? "Published! Your site is deploying now."
            : "Nothing to publish — session closed."
        );
      },
      onError: (error) => toast.error(error.message),
    })
  );

  // Transcript straight from content-pilot (edit token, CORS'd) — the hub
  // stores nothing session-shaped. SSE message-done events drive refetches;
  // the interval is only a fallback for a dropped stream.
  const transcriptQuery = useQuery({
    queryKey: ["preview-session-transcript", session?.id],
    enabled: Boolean(session?.id && editToken && pilotUrl),
    refetchInterval: 60_000,
    queryFn: async (): Promise<Transcript> => {
      const res = await fetch(`${pilotUrl}/api/v1/sessions/${session!.id}`, {
        headers: { Authorization: `Bearer ${editToken}` },
      });
      if (!res.ok) throw new Error(`transcript ${res.status}`);
      return (await res.json()) as Transcript;
    },
  });

  const { runs } = useSessionEvents({
    sessionId: session?.id ?? null,
    editToken,
    onMessageDone: () => {
      void transcriptQuery.refetch();
    },
    onSessionChange: invalidateSession,
  });

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
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

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
  const send = () => {
    const content = input.trim();
    if (!content || sendMutation.isPending || !canSend) return;
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
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        <span className="text-[13px] font-semibold">Edit with AI</span>
        <SessionStatusPill session={session} />
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          aria-label="Close panel"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      {!session ? (
        (capacityMessage ?? capacityBlocked) ? (
          <CapacityPane
            message={capacityMessage ?? capacityBlocked ?? ""}
            retrying={startMutation.isPending}
            onRetry={() => {
              setCapacityBlocked(null);
              retryStart();
            }}
            onUseClassic={onClose}
          />
        ) : (
          // Auto-start fires on project open — no start button, just boot state.
          <BootPane status="starting" />
        )
      ) : session.status === "needs_config" ? (
        <NeedsConfigPane
          message={session.error}
          retrying={startMutation.isPending || closeMutation.isPending}
          onRetry={async () => {
            // The stuck session is terminal — clear it, then start fresh so the
            // supervisor re-reads the (now fixed) app-folder setting.
            await closeMutation.mutateAsync({
              owner,
              repo,
              sessionId: session.id,
            });
            startMutation.mutate({ owner, repo });
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
              closeMutation.mutate({ owner, repo, sessionId: session.id })
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
              {messages.map((message) =>
                message.role === "user" ? (
                  <UserExchange
                    key={message.id}
                    message={message}
                    run={runs.get(message.id)}
                  />
                ) : (
                  <AssistantBubble key={message.id} text={message.content} />
                )
              )}
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
            <div className="relative flex items-end gap-1.5">
              {slashOpen && (
                <SlashSkillsMenu
                  query={slashQuery ?? ""}
                  skills={skills}
                  selectedIndex={selectedIndex}
                  onSelect={pickSkill}
                />
              )}
              <Textarea
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
                rows={2}
                className="bg-muted/60 max-h-32 min-h-16 min-w-0 flex-1 resize-none rounded-xl px-3 py-2 text-[13px] shadow-none"
              />
              <Button
                size="icon"
                aria-label="Send"
                className="size-9 shrink-0 rounded-xl"
                disabled={!input.trim() || sendMutation.isPending || !canSend}
                onClick={send}
              >
                {sendMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>

            {/* Session actions */}
            <div className="mt-2 flex items-center gap-1.5">
              {canPublish && (
                <Button
                  className="flex-1"
                  disabled={
                    busy ||
                    publishMutation.isPending ||
                    (session.status !== "ready" && session.status !== "paused")
                  }
                  onClick={() => setConfirmPublish(true)}
                >
                  {publishMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UploadCloud className="size-4" />
                  )}
                  Publish
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                disabled={busy || closeMutation.isPending}
                onClick={() => setConfirmDiscard(true)}
              >
                Discard
              </Button>
            </div>
          </div>

          <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Publish these changes?</AlertDialogTitle>
                <AlertDialogDescription>
                  Everything you see in the preview goes live on your website.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep editing</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    // Close immediately — the chat-UI Publish button shows the
                    // loading spinner (publishMutation.isPending) from here on.
                    setConfirmPublish(false);
                    publishMutation.mutate({
                      owner,
                      repo,
                      sessionId: session.id,
                    });
                  }}
                >
                  Publish
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard this session?</AlertDialogTitle>
                <AlertDialogDescription>
                  The preview closes and the changes from this session are
                  thrown away. Your live site is not affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep editing</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    closeMutation.mutate({
                      owner,
                      repo,
                      sessionId: session.id,
                    })
                  }
                >
                  Discard
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
      {bootLabel(status)}
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
  onUseClassic,
}: {
  message: string;
  retrying: boolean;
  onRetry: () => void;
  onUseClassic: () => void;
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
      <div className="mt-2 border-t pt-3">
        <p className="text-muted-foreground/80 max-w-[250px] text-[12px] leading-relaxed">
          No need to wait — you can still request changes the classic way: close
          this panel and click any text or image on your site to send it.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={onUseClassic}
        >
          <MousePointerClick className="size-4" />
          Edit the classic way
        </Button>
      </div>
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
  return (
    <div className="flex flex-col gap-1.5">
      {/* User bubble, right-aligned */}
      <div className="bg-primary text-primary-foreground ml-8 min-w-0 self-end rounded-2xl rounded-br-md px-3 py-2 text-[13px] leading-relaxed break-words whitespace-pre-wrap">
        {message.content}
      </div>

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
          {run?.thinking && (
            <div className="text-muted-foreground flex items-center gap-1.5 px-1 text-[12px]">
              <span className="animate-pulse">Thinking…</span>
            </div>
          )}
          {!run?.thinking && !run?.text && message.status === "queued" && (
            <div className="text-muted-foreground flex items-center gap-1.5 px-1 text-[12px]">
              <Loader2 className="size-3 animate-spin" />
              Queued…
            </div>
          )}
          {!run?.thinking &&
            !run?.text &&
            message.status === "running" &&
            !run?.activities.length && (
              <div className="text-muted-foreground flex items-center gap-1.5 px-1 text-[12px]">
                <Loader2 className="size-3 animate-spin" />
                Working…
              </div>
            )}
          {/* Streaming assistant text */}
          {(run?.text || run?.done?.reply) && (
            <AssistantBubble
              text={run.done?.reply || run.text}
              streaming={!run.done}
            />
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
        "bg-muted mr-6 min-w-0 self-start rounded-2xl rounded-bl-md px-3 py-2 text-[13px] leading-relaxed break-words whitespace-pre-wrap",
        streaming && "after:ml-0.5 after:animate-pulse after:content-['▍']"
      )}
    >
      {text}
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
