import React, { useState } from "react";
import { toast } from "sonner";

import { storage } from "@/project.config";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";

import { useCurrentUser, useUpdateUser } from "@workspace/auth/hooks/use-user";

export const GeneralAvatar = () => {
  const [avatar, setAvatar] = useState<File | null>(null);

  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();

  const { uploadFiles } = storage.useUpload();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avatar</CardTitle>
      </CardHeader>
      <CardContent>
        <Label>
          <AvatarPreview avatar={avatar} userImage={user?.user.image ?? ""} />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatar(e.target.files?.[0] || null)}
            className="hidden"
          />
        </Label>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          onClick={async () => {
            if (!avatar || !user?.user.id) return;

            const result = await uploadFiles(
              [
                {
                  file: avatar,
                  name: user?.user.id,
                },
              ],
              {
                path: "public/users",
              }
            );

            updateUser.mutate(
              { image: result[0] + `?${Date.now()}` },
              {
                onSuccess: () => {
                  toast.success("Avatar updated successfully");
                },
                onError: (error) => {
                  toast.error(error.message);
                },
              }
            );
          }}
          disabled={updateUser.isPending || !avatar}
        >
          Save
        </Button>
      </CardFooter>
    </Card>
  );
};

const AvatarPreview = React.memo(
  ({ avatar, userImage }: { avatar: File | null; userImage: string }) => {
    return (
      <Avatar className="size-24">
        <AvatarImage src={avatar ? URL.createObjectURL(avatar) : userImage} />
        <AvatarFallback />
      </Avatar>
    );
  }
);

AvatarPreview.displayName = "AvatarPreview";
