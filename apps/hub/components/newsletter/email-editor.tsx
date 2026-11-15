"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation } from "@tanstack/react-query";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { useTRPC } from "@workspace/trpc/client";

import { useNewsletter } from "./use-newsletter";

// useSend's own block editor (vendored in packages/email-editor). Content is
// stored as its JSON; useSend renders the HTML when saving, so campaigns stay
// compatible with the useSend dashboard. Client-only (tiptap).
const Editor = dynamic(() => import("@workspace/email-editor").then((m) => m.Editor), {
  ssr: false,
  loading: () => <Skeleton className="h-[50vh] w-full rounded-card" />,
});

const VARIABLES = ["email", "firstName", "lastName", "usesend_unsubscribe_url"];
const MAX_IMAGE = 4 * 1024 * 1024;

type Doc = Record<string, unknown>;

export function EmailEditor({
  initialContent,
  onChange,
  readOnly,
}: {
  initialContent: string | null;
  onChange: (content: string) => void;
  readOnly?: boolean;
}) {
  const trpc = useTRPC();
  const { projectId } = useNewsletter();
  const uploadUrl = useMutation(trpc.newsletter.imageUploadUrl.mutationOptions());
  const [initial] = useState<Doc | undefined>(() => {
    try {
      return initialContent ? (JSON.parse(initialContent) as Doc) : undefined;
    } catch {
      return undefined;
    }
  });

  const uploadImage = useCallback(
    async (file: File) => {
      if (file.size > MAX_IMAGE) throw new Error("Images up to 4 MB.");
      const type = file.type as "image/png" | "image/jpeg" | "image/gif" | "image/webp";
      const { uploadUrl: url, imageUrl } = await uploadUrl.mutateAsync({
        projectId,
        name: file.name,
        type,
      });
      // Presigned storage URL: plain fetch, no auth header.
      const res = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!res.ok) throw new Error("Upload failed.");
      return imageUrl;
    },
    [projectId, uploadUrl]
  );

  return (
    <div className={readOnly ? "pointer-events-none opacity-80" : undefined}>
      <div className="overflow-hidden rounded-card border border-line">
        <Editor
          initialContent={initial}
          variables={VARIABLES}
          uploadImage={uploadImage}
          onUpdate={(editor) => onChange(JSON.stringify(editor.getJSON()))}
        />
      </div>
      <p className="mt-2 text-xs text-faint">
        Type / for blocks (buttons, images, columns). Use {"{{firstName}}"} to personalize. Keep the
        unsubscribe footer: emails can&apos;t be sent without it.
      </p>
    </div>
  );
}

/**
 * Debounced autosave of partial patches. `queue` merges and schedules a save, `flush` runs any pending one
 * now (before sending), `saving` drives the "Saving…" label.
 */
export function useAutosave<T extends object>(save: (value: T) => Promise<unknown>, delay = 1000) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    pending.current = null;
    if (!next) return;
    setSaving(true);
    try {
      await saveRef.current(next.value);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  const queue = useCallback(
    (value: T) => {
      // Merge with what's still pending so a field save never drops content.
      pending.current = { value: { ...pending.current?.value, ...value } as T };
      setSaving(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush().catch(() => {}), delay);
    },
    [delay, flush]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current) void saveRef.current(pending.current.value);
    },
    []
  );

  return { queue, flush, saving, error };
}

export function SaveStatus({ saving, error }: { saving: boolean; error: string | null }) {
  if (error) return <span className="text-xs text-danger">Not saved: {error}</span>;
  return <span className="text-xs text-faint">{saving ? "Saving…" : "Saved"}</span>;
}
