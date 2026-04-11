"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Spinner } from "@workspace/ui/components/spinner";
import { Textarea } from "@workspace/ui/components/textarea";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

export const DangerSettings = () => {
  const [comment, setComment] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const user = useCurrentUser();

  const trpc = useTRPC();
  const sentNotification = useMutation(
    trpc.notification.send.mutationOptions()
  );

  if (user.isPending) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This action is permanent and cannot be undone. Here&apos;s what will
            happen when you delete your account:
          </p>

          <ul className="space-y-3 text-sm">
            <li>
              <p className="font-medium">Active Subscriptions</p>
              <p className="text-muted-foreground">
                Any active subscriptions will be automatically paused/cancelled
                in our payment system
              </p>
            </li>

            <li>
              <p className="font-medium">Account Data</p>
              <p className="text-muted-foreground">
                Your profile, settings, and all personal data will be
                permanently deleted from our database
              </p>
            </li>

            <li>
              <p className="font-medium">Purchase History</p>
              <p className="text-muted-foreground">
                Your order history and purchase records will not be removed from
                our system, but you can still access them via email receipts
              </p>
            </li>

            <li>
              <p className="font-medium">Browser Data</p>
              <p className="text-muted-foreground">
                All cookies, local storage, and session storage will be cleared
                from your browser
              </p>
            </li>
          </ul>
        </CardContent>
        <CardFooter className="justify-end">
          <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={sentNotification.isPending}
                size="lg"
              >
                Request Account Deletion
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader className="mb-4">
                <AlertDialogTitle>Request Account Deletion</AlertDialogTitle>
              </AlertDialogHeader>
              <Textarea
                placeholder="Can you please provide a reason for the deletion? (Optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <AlertDialogFooter className="grid grid-cols-2 gap-2">
                <AlertDialogCancel asChild>
                  <Button
                    variant="outline"
                    disabled={sentNotification.isPending}
                    size="lg"
                  >
                    Cancel
                  </Button>
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={() =>
                    sentNotification.mutate(
                      {
                        priority: "URGENT",
                        subject: "🔴 Account Deletion Request",
                        message: comment,
                        projectType: "PORTAL",
                      },
                      {
                        onSuccess: () => {
                          setIsOpen(false);
                          toast.success(
                            "Account deletion request sent successfully. We will review your request and get back to you as soon as possible through your email address."
                          );
                        },
                        onError: (error) => {
                          toast.error(error.message);
                        },
                      }
                    )
                  }
                  isLoading={sentNotification.isPending}
                  size="lg"
                >
                  Request Account Deletion
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
};
