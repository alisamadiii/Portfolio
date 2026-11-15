"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isYesterday } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  FileText,
  ImagePlus,
  Mail,
  MessageSquare,
  PanelRight,
  Phone,
  Send,
  Star,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@workspace/trpc/client";
import {
  formatPhone,
  leadChannels,
  smsSegments,
  threadItems,
  toE164,
  type InboxChannel,
} from "@workspace/trpc/lib/inbox-shared";
import { placeholderValues, resolveTemplate } from "@workspace/trpc/lib/templates-shared";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";
import { cn } from "@workspace/ui/lib/utils";

import { useAgency } from "@/components/agency/use-agency";
import { Button, IconButton } from "@/components/ds/ui/button";
import { Input } from "@/components/ds/ui/field";
import { EmptyState } from "@/components/ds/ui/misc";
import { SegmentedTabs } from "@/components/ds/ui/tabs";
import { TemplateTextarea } from "@/components/templates/template-textarea";
import { useProject } from "@/hooks/use-project";

import { initials, leadName } from "./inbox-list";
import { SmsNumberDialog } from "./sms-number-dialog";

type Thread = RouterOutputs["agency"]["inbox"]["thread"];
type Message = Thread["messages"][number];

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MEDIA_MAX = 5 * 1024 * 1024;
type Attachment = { name: string; type: string; data: string; preview: string };

const readAttachment = (file: File) =>
  new Promise<Attachment>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      resolve({ name: file.name, type: file.type, data: url.slice(url.indexOf(",") + 1), preview: url });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const dayLabel = (d: Date) => (isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "MMM d, yyyy"));

const STATUS_LABEL: Record<string, string> = {
  queued: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  received: "",
};

export function InboxThread({
  leadId,
  panelOpen,
  onTogglePanel,
  onBack,
}: {
  leadId: number;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onBack: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId, role } = useAgency();
  const canEdit = role !== "view-only";

  const thread = useQuery(
    trpc.agency.inbox.thread.queryOptions({ projectId, leadId }, { refetchInterval: 5_000 })
  );
  const sms = useQuery(trpc.agency.sms.status.queryOptions({ projectId }));

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: trpc.agency.inbox.list.pathKey() });

  // Opening a thread reads its new replies.
  const markRead = useMutation(trpc.agency.inbox.markRead.mutationOptions({ onSuccess: invalidateList }));
  const unread = thread.data?.messages.filter((m) => m.direction === "in" && !m.readAt).length ?? 0;
  useEffect(() => {
    if (unread > 0) markRead.mutate({ projectId, leadId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread, leadId, projectId]);

  const star = useMutation(
    trpc.agency.inbox.star.mutationOptions({
      onSuccess: () => {
        void invalidateList();
        void queryClient.invalidateQueries({ queryKey: trpc.agency.inbox.thread.pathKey() });
      },
      onError: (e) => toast.error(e.message),
    })
  );

  // Keep the newest message in view as the thread grows.
  const scroller = useRef<HTMLDivElement>(null);
  const count = thread.data?.messages.length ?? 0;
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, leadId]);

  if (thread.error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-[13px] text-dim">{thread.error.message}</div>
    );
  }
  if (!thread.data) {
    return <div className="flex flex-1 items-center justify-center p-8 text-[13px] text-dim">Loading…</div>;
  }

  const { lead, messages } = thread.data;
  const name = leadName(lead);
  const channels = leadChannels(lead);
  const phone = toE164(lead.phone);
  const items = threadItems(lead, messages);

  return (
    <div className="flex min-h-0 w-full flex-col">
      <header className="flex items-center gap-3 border-b border-line px-3 py-2.5 sm:px-4">
        <IconButton aria-label="Back to conversations" className="lg:hidden" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </IconButton>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tile text-xs font-semibold text-ink-3">
          {initials(name)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-semibold text-ink">{name}</span>
          <span className="truncate text-[13px] text-dim">
            {[phone && formatPhone(phone), lead.email].filter(Boolean).join(" · ") || "No phone or email"}
          </span>
        </div>
        {phone && (
          <a
            href={`tel:${phone}`}
            aria-label={`Call ${name}`}
            className="inline-flex size-9 items-center justify-center rounded-control text-ink-3 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
          >
            <Phone className="size-4" />
          </a>
        )}
        <IconButton
          aria-label={lead.starred ? "Unstar" : "Star"}
          aria-pressed={lead.starred}
          disabled={!canEdit || star.isPending}
          onClick={() => star.mutate({ projectId, leadId, starred: !lead.starred })}
        >
          <Star className={cn("size-4", lead.starred && "fill-warning text-warning")} />
        </IconButton>
        <IconButton
          aria-label={panelOpen ? "Hide lead details" : "Show lead details"}
          aria-pressed={panelOpen}
          onClick={onTogglePanel}
          className={cn(panelOpen && "bg-selected")}
        >
          <PanelRight className="size-4" />
        </IconButton>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto bg-canvas px-3 py-4 sm:px-6">
        <ol className="mx-auto flex max-w-[760px] flex-col gap-3">
          {items.map((item) =>
            item.kind === "day" ? (
              <li key={item.key} className="flex justify-center py-1">
                <span className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 py-1 text-xs text-dim">
                  <Calendar className="size-3.5" />
                  {dayLabel(item.at)}
                </span>
              </li>
            ) : item.kind === "submission" ? (
              <li key={item.key} className="flex justify-center">
                <div className="flex w-full max-w-[460px] flex-col gap-1.5 rounded-card border border-line bg-surface px-4 py-3">
                  <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
                    <FileText className="size-4 text-coral-text" />
                    {item.source === "manual"
                      ? "Added by hand"
                      : item.source === "booking"
                        ? "Booked an appointment"
                        : `Submitted ${item.formName ? `"${item.formName}"` : "a form"}`}
                    <span className="ml-auto text-xs font-normal text-faint">{format(item.at, "p")}</span>
                  </span>
                  {item.message && (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-3">{item.message}</p>
                  )}
                </div>
              </li>
            ) : (
              <MessageBubble key={item.key} message={item.message} />
            )
          )}
        </ol>
      </div>

      {canEdit ? (
        channels.length === 0 ? (
          <div className="border-t border-line">
            <EmptyState
              icon={<MessageSquare className="size-5" />}
              title="No way to reach this lead"
              text="Add a phone number or email in the lead details to start a conversation."
            />
          </div>
        ) : (
          <Composer
            key={lead.id}
            thread={thread.data}
            channels={channels}
            smsReady={Boolean(sms.data?.number)}
            canManageSms={Boolean(sms.data?.canManage)}
            emailReplies={Boolean(sms.data?.emailReplies)}
          />
        )
      ) : (
        <p className="border-t border-line px-4 py-3 text-center text-[13px] text-dim">
          You have view-only access to this project.
        </p>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const out = message.direction === "out";
  const failed = message.status === "failed";
  const at = new Date(message.createdAt);
  return (
    <li className={cn("flex flex-col gap-1", out ? "items-end" : "items-start")}>
      <div
        className={cn(
          "flex max-w-[min(520px,85%)] flex-col gap-2 rounded-card px-3.5 py-2.5 text-sm leading-relaxed",
          out ? "bg-coral-soft text-ink" : "border border-line bg-surface text-ink",
          failed && "border border-danger/40"
        )}
      >
        {message.subject && <span className="font-semibold">{message.subject}</span>}
        {message.mediaUrls?.map((url) => (
          <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Attached image" className="max-h-64 w-auto object-contain" loading="lazy" />
          </a>
        ))}
        {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
      </div>
      <span className="flex items-center gap-1.5 px-1 text-xs text-faint">
        {message.channel === "sms" ? <MessageSquare className="size-3" /> : <Mail className="size-3" />}
        {format(at, "p")}
        {out && message.sentByName && <span>· {message.sentByName.split(/\s+/)[0]}</span>}
        {out && !failed && STATUS_LABEL[message.status] && <span>· {STATUS_LABEL[message.status]}</span>}
      </span>
      {failed && (
        <span className="flex max-w-[min(520px,85%)] items-start gap-1.5 px-1 text-xs text-danger">
          <TriangleAlert className="mt-px size-3.5 shrink-0" />
          {message.error || "Not delivered."}
        </span>
      )}
    </li>
  );
}

function Composer({
  thread,
  channels,
  smsReady,
  canManageSms,
  emailReplies,
}: {
  thread: Thread;
  channels: InboxChannel[];
  smsReady: boolean;
  canManageSms: boolean;
  emailReplies: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId } = useAgency();
  const { lead, messages } = thread;

  // Answer the way the conversation last went, else text first.
  const lastChannel = [...messages].reverse().find((m) => channels.includes(m.channel))?.channel;
  const [channel, setChannel] = useState<InboxChannel>(lastChannel ?? channels[0]!);
  const [body, setBody] = useState("");
  // Answering an email keeps its subject ("Re: …"), so it threads for the lead.
  const lastSubject = [...messages].reverse().find((m) => m.channel === "email" && m.subject)?.subject;
  const [subject, setSubject] = useState(lastSubject ? `Re: ${lastSubject.replace(/^(re:\s*)+/i, "")}` : "");
  const [media, setMedia] = useState<Attachment[]>([]);
  const [numberDialog, setNumberDialog] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const templates = useQuery(trpc.agency.templates.list.queryOptions({ projectId }));
  const snippets = (templates.data ?? []).filter((t) => t.kind === "text");
  const businessInfo = useQuery(trpc.agency.businessInfo.get.queryOptions({ projectId }));
  const websiteUrl = useProject()?.websiteUrl ?? null;
  const myName = useCurrentUser().data?.user?.name ?? null;
  const resolve = (text: string) =>
    resolveTemplate(text, placeholderValues({ lead, businessInfo: businessInfo.data, websiteUrl, myName })).text;

  const send = useMutation(
    trpc.agency.inbox.send.mutationOptions({
      onSuccess: (message) => {
        if (message.status === "failed") toast.error(message.error ?? "Couldn't send.");
        else {
          setBody("");
          setMedia([]);
        }
        void queryClient.invalidateQueries({ queryKey: trpc.agency.inbox.thread.pathKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.agency.inbox.list.pathKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.agency.leads.pathKey() });
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const picked = [...files].slice(0, 3 - media.length);
    for (const file of picked) {
      if (!MEDIA_TYPES.includes(file.type)) return toast.error("Send JPG, PNG, GIF or WebP images.");
      if (file.size > MEDIA_MAX) return toast.error("Images must be 5 MB or smaller.");
    }
    const read = await Promise.all(picked.map(readAttachment));
    setMedia((current) => [...current, ...read].slice(0, 3));
  };

  const isSms = channel === "sms";
  const segments = smsSegments(body);
  const tooLong = isSms && body.length > 1600;
  const canSend = !send.isPending && !tooLong && (body.trim().length > 0 || (isSms && media.length > 0));

  const submit = () => {
    if (!canSend) return;
    send.mutate({
      projectId,
      leadId: lead.id,
      channel,
      body: body.trim(),
      ...(channel === "email" && subject.trim() && { subject: subject.trim() }),
      ...(isSms && media.length && { media: media.map(({ type, data }) => ({ type, data })) }),
    });
  };

  return (
    <div className="flex flex-col gap-2 border-t border-line p-3">
      {channels.length > 1 && (
        <div className="flex">
          <SegmentedTabs
            label="Send as"
            value={channel}
            onChange={(id) => setChannel(id as InboxChannel)}
            items={[
              { id: "sms", label: "Text" },
              { id: "email", label: "Email" },
            ]}
          />
        </div>
      )}

      {isSms && !smsReady ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-inner bg-subtle px-3.5 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-ink">Texting isn&apos;t set up yet</span>
            <span className="text-[13px] text-dim">
              {canManageSms
                ? "Get a phone number for this project to text leads and receive their replies."
                : "Ask us to turn on texting for your business."}
            </span>
          </div>
          {canManageSms && (
            <>
              <Button size="sm" variant="primary" onClick={() => setNumberDialog(true)}>
                Get a number
              </Button>
              <SmsNumberDialog open={numberDialog} onOpenChange={setNumberDialog} />
            </>
          )}
        </div>
      ) : (
        <>
          {channel === "email" && (
            <Input
              value={subject}
              maxLength={200}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              aria-label="Email subject"
            />
          )}
          {media.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {media.map((m, i) => (
                <span key={`${m.name}-${i}`} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.preview} alt={m.name} className="size-16 rounded-inner border border-line object-cover" />
                  <button
                    type="button"
                    aria-label={`Remove ${m.name}`}
                    onClick={() => setMedia((current) => current.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-white"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <TemplateTextarea
            value={body}
            onValueChange={setBody}
            snippets={snippets}
            resolve={resolve}
            rows={3}
            aria-label={isSms ? "Text message" : "Email message"}
            placeholder={`${isSms ? "Text" : "Email"} ${leadName(lead)}${snippets.length ? " · / for snippets" : ""}`}
            className="min-h-[84px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <div className="flex items-center gap-2">
            {isSms && (
              <>
                <IconButton
                  aria-label="Attach an image"
                  disabled={media.length >= 3}
                  onClick={() => fileInput.current?.click()}
                >
                  <ImagePlus className="size-4" />
                </IconButton>
                <input
                  ref={fileInput}
                  type="file"
                  accept={MEDIA_TYPES.join(",")}
                  multiple
                  hidden
                  onChange={(e) => {
                    void addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <span className={cn("text-xs", tooLong ? "text-danger" : "text-faint")}>
                  {body.length}/1600
                  {segments.segments > 1 && ` · ${segments.segments} parts`}
                </span>
              </>
            )}
            {!isSms && (
              <span className="text-xs text-faint">
                {emailReplies ? "Replies show up here." : "Replies go to your email inbox."}
              </span>
            )}
            <Button
              variant="primary"
              size="sm"
              className="ml-auto"
              disabled={!canSend}
              onClick={submit}
              icon={<Send className="size-3.5" />}
            >
              {send.isPending ? "Sending…" : "Send"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
