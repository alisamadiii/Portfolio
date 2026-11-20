"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { isAdminUser } from "@/lib/authz-shared";
import { useCanvasEditor } from "@/components/canvas/canvas-editor-context";
import { Eye, EyeOff } from "@/components/icon";

const LIVE_STATUSES = ["starting", "installing", "ready", "restarting", "paused"];

/**
 * Environment variables for the live preview, opened from the header key
 * button. The keys come from the repo's `.env.example`; content-pilot stores
 * the values (encrypted) and restarts the dev server on save. Editable by the
 * project owner or an admin; everyone else sees the inputs disabled.
 */
export function EnvDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { session } = useCanvasEditor();
  const user = useCurrentUser().data?.user ?? null;
  const sessionId =
    session && LIVE_STATUSES.includes(session.status) ? session.id : null;

  const snapshot = useQuery(
    trpc.cms.repos.getSnapshot.queryOptions(
      { projectId },
      { enabled: !!projectId && open }
    )
  );
  const canEdit = isAdminUser(user) || !!snapshot.data?.isOwner;

  const envQueryOptions = trpc.cms.previewSession.getEnv.queryOptions(
    { projectId, sessionId: sessionId ?? "" },
    { enabled: open && !!sessionId && canEdit }
  );
  const env = useQuery(envQueryOptions);
  const variables = env.data?.variables;

  const [values, setValues] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!open || !variables) return;
    setValues(Object.fromEntries(variables.map((v) => [v.key, v.value])));
    setRevealed(new Set());
  }, [open, variables]);

  const save = useMutation(
    trpc.cms.previewSession.saveEnv.mutationOptions({
      onSuccess: async () => {
        toast.success("Saved. The preview is restarting.");
        onOpenChange(false);
        await queryClient.invalidateQueries({
          queryKey: envQueryOptions.queryKey,
        });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  // Only the keys the user touched are sent ('' removes a saved value).
  const changed = Object.fromEntries(
    (variables ?? [])
      .filter((v) => (values[v.key] ?? "") !== v.value)
      .map((v) => [v.key, values[v.key] ?? ""])
  );
  const dirty = Object.keys(changed).length > 0;

  const toggleReveal = (key: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const loading = !snapshot.data || (canEdit && !!sessionId && env.isPending);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Environment variables</DialogTitle>
          <DialogDescription>
            Used by the live preview. Values are stored encrypted.
          </DialogDescription>
        </DialogHeader>
        {!sessionId ? (
          <p className="text-muted-foreground py-6 text-center text-[13px]">
            Start the preview first, then set its environment variables here.
          </p>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <Spinner className="text-muted-foreground size-5" />
          </div>
        ) : !canEdit ? (
          <p className="text-muted-foreground py-6 text-center text-[13px]">
            Only the project owner can change these.
          </p>
        ) : env.error ? (
          <p className="text-destructive py-6 text-center text-[13px]">
            {env.error.message}
          </p>
        ) : !variables?.length ? (
          <p className="text-muted-foreground py-6 text-center text-[13px]">
            This site has no .env.example, so there&apos;s nothing to fill in.
          </p>
        ) : (
          <form
            id="env-variables"
            // Scrolls when there are many variables. Spans the dialog's full width
            // (-mx-6/px-6) with a little vertical padding, so the inputs' focus
            // rings aren't clipped by the scroll edge.
            className="-mx-6 max-h-[60vh] space-y-4 overflow-y-auto px-6 py-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canEdit || !dirty || !sessionId) return;
              save.mutate({ projectId, sessionId, values: changed });
            }}
          >
            {variables.map((variable) => {
              const inputId = `env-${variable.key}`;
              const shown = revealed.has(variable.key);
              return (
                <div key={variable.key} className="space-y-1.5">
                  <Label htmlFor={inputId} className="font-mono text-[12.5px]">
                    {variable.key}
                  </Label>
                  {variable.description && (
                    <p className="text-muted-foreground text-[12.5px]">
                      {variable.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Input
                      id={inputId}
                      type={shown ? "text" : "password"}
                      placeholder={variable.example}
                      value={values[variable.key] ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [variable.key]: e.target.value,
                        }))
                      }
                      disabled={!canEdit}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={shown ? "Hide value" : "Show value"}
                      onClick={() => toggleReveal(variable.key)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {shown ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </form>
        )}
        {canEdit && sessionId && !!variables?.length && (
          <DialogFooter>
            <Button
              type="submit"
              form="env-variables"
              isLoading={save.isPending}
              disabled={!dirty}
            >
              Save
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
