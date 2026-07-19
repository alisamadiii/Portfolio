import React, { useState } from "react";
import { toast } from "sonner";

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
import { agency } from "@workspace/ui/lib/agency";

import { useCurrentUser, useUpdateUser } from "@workspace/auth/hooks/use-user";

export const GeneralAvatar = () => {
  const [avatar, setAvatar] = useState<File | null>(null);

  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();

  const [isUploading, setIsUploading] = useState(false);

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="card-head">
        <CardTitle className="font-bold">Avatar</CardTitle>
      </CardHeader>
      <CardContent className="card-body flex items-center gap-5">
        <Label className="cursor-pointer">
          <AvatarPreview avatar={avatar} userImage={user?.user.image ?? ""} />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatar(e.target.files?.[0] || null)}
            className="hidden"
          />
        </Label>
        <p className="text-muted-foreground text-[13.5px]">
          Square image, at least 256×256px. PNG or JPG.
        </p>
      </CardContent>
      <CardFooter className="card-band">
        <Button
          className="rounded-full px-6"
          onClick={async () => {
            if (!avatar || !user?.user.id) return;

            setIsUploading(true);
            const { data, error } = await agency().uploads.upload(avatar, {
              path: "users",
              filename: user.user.id,
              naming: "filename",
              overwrite: true,
            });
            setIsUploading(false);

            if (error) {
              toast.error(error.message);
              return;
            }

            updateUser.mutate(
              { image: data.publicUrl },
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
          disabled={updateUser.isPending || !avatar || isUploading}
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
      <Avatar className="border-border size-22 border">
        <AvatarImage src={avatar ? URL.createObjectURL(avatar) : userImage} />
        <AvatarFallback />
      </Avatar>
    );
  }
);

AvatarPreview.displayName = "AvatarPreview";
