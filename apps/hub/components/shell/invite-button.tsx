"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { useUser } from "@/contexts/user-context";
import { isAdminUser } from "@/lib/authz-shared";
import { handleAddCollaborator } from "@/lib/actions/collaborator";
import { InviteCollaboratorsDialog } from "@/components/collaborators";

type AddCollaboratorState = {
  message?: string;
  error?: string;
  errors?: string[];
  data?: Array<{ id: number; email: string }>;
};

/**
 * Header Invite button — admin only. Reuses the collaborators invite dialog
 * and its server action; nothing renders for non-admin (client) users.
 */
export function InviteButton({ owner, repo }: { owner: string; repo: string }) {
  const { user } = useUser();
  const [state, action] = useActionState<AddCollaboratorState, FormData>(
    handleAddCollaborator,
    {}
  );
  const [emails, setEmails] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!state?.message) return;
    toast.success(state.message, { duration: 10000 });
    if (Array.isArray(state.errors) && state.errors.length > 0) {
      toast.error(state.errors.join("\n"), { duration: 10000 });
    }
    setEmails("");
    setOpen(false);
  }, [state]);

  if (!isAdminUser(user)) return null;

  return (
    <InviteCollaboratorsDialog
      owner={owner}
      repo={repo}
      state={state}
      action={action}
      open={open}
      onOpenChange={setOpen}
      value={emails}
      onValueChange={setEmails}
      disabled={false}
      triggerLabel="Invite"
      triggerVariant="outline"
      triggerSize="sm"
    />
  );
}
