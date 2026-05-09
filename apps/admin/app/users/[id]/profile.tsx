import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";

import { useTRPC } from "@workspace/trpc/client";

import { MetadataEditor } from "@/components/metadata-editor";
import { Devices } from "@/components/users/devices";
import { EmailAddresses } from "@/components/users/email-addresses";
import { Password } from "@/components/users/password";
import { PersonalInformation } from "@/components/users/personal-information";
import { SocialAccounts } from "@/components/users/social-accounts";

export const Profile = () => {
  const { id } = useParams<{ id: string }>();
  const trpc = useTRPC();
  const { data: user } = useQuery(
    trpc.users.get.queryOptions(id, { enabled: !!id })
  );

  const userMetadata =
    (user?.metadata as Record<string, string> | null) ?? {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <PersonalInformation />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Email addresses</CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-2">
          <EmailAddresses />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Social accounts</CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-2">
          <SocialAccounts />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <Password />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Devices</CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-2">
          <Devices />
        </CardContent>
      </Card>
      <StripeCustomerId userId={id} value={user?.stripeCustomerId ?? null} />
      <MetadataEditor
        userId={id}
        initialMetadata={userMetadata}
        invalidateQueryKey={trpc.users.get.queryKey(id)}
      />
    </div>
  );
};

function StripeCustomerId({
  userId,
  value,
}: {
  userId: string;
  value: string | null;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(value ?? "");

  const update = useMutation(
    trpc.users.adminUpdate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.users.get.queryKey(userId),
        });
        toast.success("Stripe Customer ID updated");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stripe Customer ID</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="cus_..."
            className="font-mono"
          />
          <Button
            disabled={update.isPending || draft === (value ?? "")}
            isLoading={update.isPending}
            onClick={() =>
              update.mutate({
                id: userId,
                stripeCustomerId: draft || null,
              })
            }
          >
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
