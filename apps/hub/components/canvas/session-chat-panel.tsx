"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { shrinkImage } from "@/lib/shrink-image";
import { handleCmsError, SUBSCRIPTION_REQUIRED_EVENT } from "@/lib/trpc-errors";
import {
  useSessionEvents,
  type CommitActivity,
  type MessageRun,
  type ToolActivity,
} from "@/hooks/use-session-events";
import {
  useSessionTranscript,
  type TranscriptMessage,
} from "@/hooks/use-session-transcript";

import {
  useCanvasEditor,
  type PickedElement,
  type SessionEndReason,
} from "@/components/canvas/canvas-editor-context";
import {
  AttachmentThumbs,
  AttachmentTray,
  MAX_ATTACHMENTS,
  UPLOAD_MESSAGES,
  type StagedAttachment,
} from "@/components/canvas/composer-attachments";
import { FileDiffButton } from "@/components/canvas/file-diff-dialog";
import { sessionChangesQueryKey } from "@/components/canvas/session-changes-dialog";
import { SkillChips } from "@/components/canvas/skill-chips";
import {
  filterSkills,
  SlashSkillsMenu,
  useSlashMenuSelection,
  type SessionSkill,
} from "@/components/canvas/slash-skills-menu";
import {
  ArrowUp,
  Check,
  ChevronRight,
  CircleCheck,
  Copy,
  Loader2,
  MousePointerClick,
  PaintbrushSparkle,
  Paperclip,
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
          "[overflow-wrap:anywhere] underline",
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

const compact = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`;

/**
 * Compact token total for a turn, e.g. "1.2k tokens" / "840 tokens". Cache
 * reads are counted inside input but cost a fraction, so a resumed run's
 * big number gets a "· 230k cached" qualifier.
 */
const formatTokens = (
  input: number | null,
  output: number | null,
  cached?: number | null
) => {
  const total = (input ?? 0) + (output ?? 0);
  if (!total) return null;
  const label = `${compact(total)} tokens`;
  return cached ? `${label} · ${compact(cached)} cached` : label;
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
    lastEnded,
    noteSessionEnded,
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
        noteSessionEnded("closed");
        invalidateSession();
        toast.success("Session discarded");
      },
      onError: (error) => toast.error(error.message),
    })
  );
  // Transcript straight from content-pilot — shared with the header's
  // session actions via the same query key.
  const transcriptQuery = useSessionTranscript(session?.id, editToken);

  const { runs, reconnect: reconnectEvents } = useSessionEvents({
    sessionId: session?.id ?? null,
    editToken,
    sessionStatus: session?.status ?? null,
    onMessageDone: () => {
      void transcriptQuery.refetch();
      // The Changes dialog is git-backed — a finished turn may have landed
      // a commit, so its file list is stale now.
      void queryClient.invalidateQueries({
        queryKey: sessionChangesQueryKey(session?.id),
      });
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
      attachments,
    }: {
      content: string;
      context?: string;
      attachments?: { id: string; description: string }[];
    }) => {
      const res = await fetch(
        `${pilotUrl}/api/v1/sessions/${session!.id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${editToken}`,
          },
          body: JSON.stringify({
            content,
            ...(context ? { context } : {}),
            ...(attachments?.length ? { attachments } : {}),
          }),
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
      // A message revives a paused session server-side; the event stream was
      // closed while it slept, so reopen it now (no-op when already live) and
      // fast-poll the status through the boot.
      reconnectEvents();
      invalidateSession();
    },
  });

  const [input, setInput] = useState("");

  // Chat image uploads: shrunk in the browser, posted straight to content-pilot
  // on selection, then sent by id with the message. The AI never sees the
  // pixels, only the required description, so the tray is part of composing.
  const [attachments, setAttachments] = useState<StagedAttachment[]>([]);
  const [attachNotice, setAttachNotice] = useState<string | null>(null);
  const [triedSend, setTriedSend] = useState(false);
  const patchAttachment = (key: string, patch: Partial<StagedAttachment>) =>
    setAttachments((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  // Object URLs: revoked on explicit removal / failed prep here, on transcript
  // match for sent ones (prune effect below), and on unmount for leftovers.
  const removeAttachment = (key: string) =>
    setAttachments((current) => {
      for (const item of current) {
        if (item.key === key) URL.revokeObjectURL(item.previewUrl);
      }
      return current.filter((item) => item.key !== key);
    });
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  useEffect(
    () => () => {
      for (const item of attachmentsRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    },
    []
  );
  const uploadMutation = useMutation({
    mutationFn: async (file: {
      blob: Blob;
      fileName: string;
      width: number;
      height: number;
    }) => {
      const form = new FormData();
      form.append("file", file.blob, file.fileName);
      form.append("width", String(file.width));
      form.append("height", String(file.height));
      form.append("originalName", file.fileName);
      // Raw fetch: the browser sets the multipart boundary; content-pilot is
      // not the hub backend, so no api instance here.
      const res = await fetch(
        `${pilotUrl}/api/v1/sessions/${session!.id}/uploads`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${editToken}` },
          body: form,
        }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Upload failed.");
      }
      return (await res.json()) as {
        id: string;
        width: number;
        height: number;
      };
    },
  });
  const addFiles = (files: File[]) => {
    if (!files.length || !session || !editToken) return;
    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      setAttachNotice(UPLOAD_MESSAGES.tooMany);
      return;
    }
    if (files.length > room) setAttachNotice(UPLOAD_MESSAGES.tooMany);
    for (const file of files.slice(0, room)) {
      const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setAttachments((current) => [
        ...current,
        {
          key,
          previewUrl: URL.createObjectURL(file),
          fileName: file.name,
          status: "preparing",
          description: "",
        },
      ]);
      void (async () => {
        const shrunk = await shrinkImage(file);
        if (!shrunk.ok) {
          removeAttachment(key);
          setAttachNotice(
            shrunk.reason === "too-large"
              ? UPLOAD_MESSAGES.tooLarge
              : shrunk.reason === "svg"
                ? UPLOAD_MESSAGES.svg
                : shrunk.reason === "heic"
                  ? UPLOAD_MESSAGES.heic
                  : shrunk.reason === "not-image"
                    ? UPLOAD_MESSAGES.notImage
                    : UPLOAD_MESSAGES.decode
          );
          return;
        }
        patchAttachment(key, {
          status: "uploading",
          fileName: shrunk.fileName,
        });
        try {
          const uploaded = await uploadMutation.mutateAsync({
            blob: shrunk.blob,
            fileName: shrunk.fileName,
            width: shrunk.width,
            height: shrunk.height,
          });
          patchAttachment(key, {
            status: "ready",
            id: uploaded.id,
            width: uploaded.width,
            height: uploaded.height,
          });
        } catch (error) {
          patchAttachment(key, {
            status: "error",
            error: (error as Error).message,
          });
        }
      })();
    }
  };
  const uploadsInFlight = attachments.some(
    (item) => item.status === "preparing" || item.status === "uploading"
  );
  const attachmentsBlocked =
    uploadsInFlight ||
    attachments.some(
      (item) =>
        item.status === "error" ||
        (item.status === "ready" && !item.description.trim())
    );
  // Pick + drop via react-dropzone; deliberately no drag-over styling.
  const dropzone = useDropzone({
    accept: { "image/*": [] },
    multiple: true,
    maxFiles: MAX_ATTACHMENTS,
    noClick: true,
    noKeyboard: true,
    onDrop: (accepted, rejected) => {
      if (rejected.length) {
        setAttachNotice(
          rejected.some((r) =>
            r.errors.some((e) => e.code === "too-many-files")
          )
            ? UPLOAD_MESSAGES.tooMany
            : UPLOAD_MESSAGES.notImage
        );
      }
      if (accepted.length) addFiles(accepted);
    },
  });

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
    {
      key: number;
      content: string;
      at: number;
      attachments: {
        id: string;
        previewUrl: string;
        originalName: string;
        width: number;
        height: number;
      }[];
    }[]
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
        attachments: pending.attachments.map(
          ({ id, originalName, width, height }) => ({
            id,
            originalName,
            width,
            height,
          })
        ),
      })),
  ];
  // Local previews for optimistic bubbles; once the transcript row lands the
  // bubble switches to the server copy and the object URL is revoked.
  const pendingPreviewById = new Map<string, string>();
  for (const pending of pendingSends) {
    for (const attachment of pending.attachments) {
      pendingPreviewById.set(attachment.id, attachment.previewUrl);
    }
  }
  // Prune matched entries so the list doesn't rescan forever.
  useEffect(() => {
    setPendingSends((current) => {
      const matched = (pending: (typeof current)[number]) =>
        rawMessages.some(
          (message) =>
            message.role === "user" &&
            message.content === pending.content &&
            new Date(message.createdAt).getTime() >= pending.at - 5_000
        );
      for (const pending of current) {
        if (!matched(pending)) continue;
        for (const attachment of pending.attachments) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      }
      return current.filter((pending) => !matched(pending));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcriptQuery.dataUpdatedAt]);
  const thumbSrc = (id: string) =>
    pendingPreviewById.get(id) ??
    `${pilotUrl}/api/v1/sessions/${session?.id}/uploads/${id}?token=${encodeURIComponent(editToken)}`;

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
  const TERMINAL_STATUSES = [
    "needs_config",
    "failed",
    "closed",
    "published",
    "expired",
  ];
  const canSend = Boolean(
    session && !TERMINAL_STATUSES.includes(session.status)
  );
  // While the AI is working we don't queue more tasks — the send button turns
  // into a pause control (below) instead.
  const pause = () => {
    if (!session || cancelMutation.isPending) return;
    cancelMutation.mutate({ repoId, sessionId: session.id });
  };

  // `text` = one-click sends (skill chips); otherwise the composer input.
  const send = (text?: string) => {
    const fromInput = text === undefined;
    const content = (text ?? input).trim();
    if (!content || sendMutation.isPending || !canSend || busy) return;
    // Images ride along only with a typed message; chip sends carry none.
    const ready = fromInput
      ? attachments.filter((item) => item.status === "ready")
      : [];
    if (fromInput && attachmentsBlocked) {
      setTriedSend(true);
      return;
    }
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
    // The bubble takes over the preview URLs until the transcript row lands.
    setPendingSends((current) => [
      ...current,
      {
        key,
        content,
        at: key,
        attachments: ready.map((item) => ({
          id: item.id!,
          previewUrl: item.previewUrl,
          originalName: item.fileName,
          width: item.width ?? 0,
          height: item.height ?? 0,
        })),
      },
    ]);
    // Chip sends leave a half-typed draft alone.
    if (fromInput) {
      setInput("");
      setAttachments([]);
      setTriedSend(false);
      setAttachNotice(null);
    }
    sendMutation.mutate(
      {
        content,
        context: buildContext(currentPage, pickedElement),
        attachments: ready.map((item) => ({
          id: item.id!,
          description: item.description.trim(),
        })),
      },
      {
        onError: (error) => {
          setPendingSends((current) =>
            current.filter((pending) => pending.key !== key)
          );
          if (fromInput) {
            setInput(content);
            setAttachments(ready);
          }
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
          <BootPane status="starting" ended={lastEnded} />
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
                      thumbSrc={thumbSrc}
                      sessionId={session?.id ?? ""}
                      editToken={editToken}
                    />
                  );
                }
                // Usage is stored on the user message that drove this reply
                // (the row right before it) — surface it beside the copy icon.
                const prev = messages[index - 1];
                const tokens =
                  prev?.role === "user"
                    ? formatTokens(
                        prev.inputTokens,
                        prev.outputTokens,
                        prev.cacheReadTokens
                      )
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
          <div className="mb-8 shrink-0 border-t p-2.5">
            {session?.provider === "gemini" &&
              session?.geminiTier === "free" && (
                <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-[11.5px] leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Free AI plan: the provider may use your edits to improve
                    their AI, and there is a limit of about 250,000 tokens (around 180,000 words) per
                    minute, so keep each request short and focused. Ask your
                    developer about upgrading for private, higher-capacity AI.
                  </span>
                </div>
              )}
            <SkillChips
              skills={skills}
              disabled={busy || !canSend || sendMutation.isPending}
              onRun={(name) => send(`/${name}`)}
            />
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
              <div
                {...dropzone.getRootProps({ tabIndex: -1 })}
                className="bg-card focus-within:ring-primary overflow-hidden rounded-lg border shadow-sm transition-shadow focus-within:ring-2"
              >
                <input {...dropzone.getInputProps()} />
                <AttachmentTray
                  items={attachments}
                  onRemove={removeAttachment}
                  onDescribe={(key, description) =>
                    patchAttachment(key, { description })
                  }
                  showMissing={triedSend}
                  notice={attachNotice}
                  onDismissNotice={() => setAttachNotice(null)}
                />
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onPaste={(event) => {
                    const files = Array.from(event.clipboardData?.files ?? []);
                    if (!files.length) return;
                    event.preventDefault();
                    const images = files.filter((file) =>
                      file.type.startsWith("image/")
                    );
                    if (images.length !== files.length) {
                      setAttachNotice(UPLOAD_MESSAGES.notImage);
                    }
                    if (images.length) addFiles(images);
                  }}
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
                  placeholder={
                    attachments.length
                      ? "Tell the AI what to do with the image"
                      : 'e.g. "Change the hero headline to…" or "Remove the first FAQ on the About page"'
                  }
                  rows={1}
                  className="max-h-40 min-h-[44px] w-full resize-none border-0 bg-transparent px-3 pt-2.5 pb-0 text-[13px] shadow-none focus-visible:ring-0 dark:bg-transparent"
                />
                <div className="flex items-center justify-between px-2 pb-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Attach images"
                    title="Attach images"
                    className="text-muted-foreground hover:text-foreground size-7 shrink-0 rounded-full"
                    disabled={
                      !canSend ||
                      !editToken ||
                      attachments.length >= MAX_ATTACHMENTS
                    }
                    onClick={dropzone.open}
                  >
                    <Paperclip className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    aria-label={busy ? "Pause" : "Send"}
                    title={busy ? "Pause the AI" : "Send"}
                    className="size-7 shrink-0 rounded-full"
                    disabled={
                      busy
                        ? cancelMutation.isPending || !session
                        : !input.trim() ||
                          sendMutation.isPending ||
                          !canSend ||
                          uploadsInFlight
                    }
                    onClick={busy ? pause : () => send()}
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
              {/* Soft phrasing tip: edit-like wording (change / add / remove …
                  plus the page) lets content-pilot hand the AI the right file
                  up front — faster and cheaper. Any phrasing still works. */}
              <p className="text-muted-foreground mt-1.5 px-1 text-[11px] leading-snug">
                Tip: say what to change and where — change, add, remove, update…
                and the page name. Or click an element in the preview to point
                the AI at it.
              </p>
            </div>
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

function BootPane({
  status,
  ended,
}: {
  status: string;
  /** The previous session just ended this way — a fresh one is booting. */
  ended?: SessionEndReason | null;
}) {
  const switched = ended && typeof ended === "object" ? ended.switched : null;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <Loader2 className="text-primary size-5 animate-spin" />
      <p className="text-muted-foreground text-[13px]">
        {ended === "published"
          ? "Published! Starting a fresh preview…"
          : ended === "closed"
            ? "Starting a fresh preview…"
            : switched
              ? `Switching to "${switched}"…`
              : bootLabel(status)}
      </p>
      <p className="text-muted-foreground/70 max-w-[230px] text-[12px] leading-relaxed">
        {switched
          ? "Your next edits will go to that branch."
          : ended
            ? "Your next edits will start from the site as it is now."
            : "First start can take a minute or two while the preview is built."}
      </p>
    </div>
  );
}

/** One user request + its live Claude activity / final status. */
function UserExchange({
  message,
  run,
  thumbSrc,
  sessionId,
  editToken,
}: {
  message: TranscriptMessage;
  run: MessageRun | undefined;
  thumbSrc: (id: string) => string;
  sessionId: string;
  editToken: string;
}) {
  const inFlight = message.status === "queued" || message.status === "running";
  const [showDetails, setShowDetails] = useState(false);
  const steps = run?.activities ?? [];
  // The turn's commit — what every step's diff button is drawn against. No
  // commit (failed / rejected / nothing changed) means nothing landed, so no
  // buttons.
  const commit = steps.find(
    (activity): activity is CommitActivity => activity.kind === "commit"
  );
  const sha = message.commitSha ?? run?.done?.commitSha ?? commit?.sha ?? null;
  const stepProps = { sha, files: commit?.files ?? [], sessionId, editToken };
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
      <div className="bg-primary text-primary-foreground ml-8 max-w-[85%] min-w-0 self-end rounded-lg rounded-br-sm px-3 py-2 text-[13px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
        <AttachmentThumbs
          attachments={message.attachments ?? []}
          srcFor={thumbSrc}
        />
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
          {run?.activities.map((activity, index) => (
            <StepRow key={index} activity={activity} {...stepProps} />
          ))}
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
              {steps.map((activity, index) => (
                <StepRow
                  key={index}
                  activity={activity}
                  showSha
                  {...stepProps}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One activity line. Edit/Write rows and the commit row get a diff button once
 * the turn has a commit: per file for edits, every changed file for the
 * commit (which also covers bulk replace_in_files steps).
 */
function StepRow({
  activity,
  sha,
  files,
  sessionId,
  editToken,
  showSha,
}: {
  activity: ToolActivity | CommitActivity;
  sha: string | null;
  files: string[];
  sessionId: string;
  editToken: string;
  showSha?: boolean;
}) {
  if (activity.kind === "commit") {
    return (
      <div className="text-muted-foreground flex items-center gap-1.5 px-1 text-[12px]">
        <CircleCheck className="size-3 shrink-0 text-emerald-500" />
        <span>
          Saved to preview
          {showSha ? ` (${activity.sha.slice(0, 7)})` : ""}
        </span>
        <FileDiffButton
          sessionId={sessionId}
          editToken={editToken}
          to={activity.sha}
          files={activity.files.map((path) => ({ path }))}
          title="Changes in this step"
        />
      </div>
    );
  }
  const editable =
    (activity.name === "Edit" || activity.name === "Write") &&
    Boolean(activity.path && sha);
  return (
    <div className="text-muted-foreground flex items-center gap-1.5 px-1 text-[12px]">
      <Check className="size-3 shrink-0 opacity-60" />
      <span className="min-w-0 truncate [overflow-wrap:anywhere]">
        {activity.label}
      </span>
      {editable && sha && activity.path && (
        <FileDiffButton
          sessionId={sessionId}
          editToken={editToken}
          to={sha}
          files={[{ path: activity.path }]}
          title={activity.label}
        />
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
        "bg-muted mr-6 max-w-[85%] min-w-0 self-start rounded-lg rounded-bl-sm px-3 py-2 text-[13px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap",
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
