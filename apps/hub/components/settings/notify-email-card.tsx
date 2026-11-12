"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { useTRPC } from "@workspace/trpc/client";

import { Button } from "@/components/ds/ui/button";
import { Card, CardHeader } from "@/components/ds/ui/card";
import { Input } from "@/components/ds/ui/field";

/**
 * Where this project's embed-form submissions (lead / booking / contact) are
 * emailed. One value per project (hub_project.notifyEmail), editable from both
 * the website Emails tab and the agency settings. Empty = the project owner's
 * account email.
 */
export function NotifyEmailCard({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const user = useCurrentUser().data?.user ?? null;

  const gate = useQuery(trpc.emails.enabled.queryOptions({ projectId }));
  const [value, setValue] = useState("");
  const [dirty, setDirty] = useState(false);

  // Seed the input once the saved value loads.
  useEffect(() => {
    if (gate.data) setValue(gate.data.notifyEmail ?? "");
  }, [gate.data]);

  const save = useMutation(
    trpc.emails.setNotifyEmail.mutationOptions({
      onSuccess: (saved) => {
        toast.success("Notification email saved.");
        setValue(saved.notifyEmail ?? "");
        setDirty(false);
        queryClient.invalidateQueries({ queryKey: trpc.emails.enabled.pathKey() });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const saved = gate.data?.notifyEmail ?? "";

  return (
    <Card>
      <CardHeader title="Notification email" divided />
      <div className="flex flex-col gap-3 px-6 py-5">
      <p className="text-[13px] text-dim">
        Where lead form and contact submissions are sent. Leave empty to use the
        account email{user?.email ? ` (${user.email})` : ""}.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="email"
          value={value}
          placeholder={user?.email || "you@example.com"}
          className="max-w-sm"
          disabled={gate.isPending}
          onChange={(e) => {
            setValue(e.target.value);
            setDirty(true);
          }}
        />
        <Button
          variant="primary"
          disabled={save.isPending || gate.isPending || !dirty || value.trim() === saved}
          onClick={() => save.mutate({ projectId, email: value.trim() })}
        >
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      </div>
    </Card>
  );
}
