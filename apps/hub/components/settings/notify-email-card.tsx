"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { useTRPC } from "@workspace/trpc/client";

/**
 * Where this project's embed-form submissions (lead / booking / contact) are
 * emailed. One value per project (hub_project.notifyEmail), editable from both
 * the website Emails tab and the agency settings. Empty = the project owner's
 * account email.
 */
export function NotifyEmailCard({ repoId }: { repoId: number }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const user = useCurrentUser().data?.user ?? null;

  const gate = useQuery(trpc.emails.enabled.queryOptions({ repoId }));
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
    <div className="bg-card rounded-lg border p-4">
      <h3 className="text-[16px] font-extrabold tracking-tight">
        Notification email
      </h3>
      <p className="text-muted-foreground mt-1 text-[13px]">
        Where lead form, booking and contact submissions are sent. Leave empty
        to use the account email{user?.email ? ` (${user.email})` : ""}.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
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
          isLoading={save.isPending}
          disabled={gate.isPending || !dirty || value.trim() === saved}
          onClick={() => save.mutate({ repoId, email: value.trim() })}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
