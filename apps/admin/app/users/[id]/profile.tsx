import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

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
      <MetadataEditor
        userId={id}
        initialMetadata={userMetadata}
        invalidateQueryKey={trpc.users.get.queryKey(id)}
      />
    </div>
  );
};
