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

  const sentNotification = useMutation(trpc.contact.send.mutationOptions());

  if (user.isPending) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="ring-destructive/20 gap-0 py-0">
        <CardHeader className="border-destructive/15 bg-destructive/4 border-b px-5.5 py-4.5">
          <CardTitle className="text-destructive font-bold">
            Delete Account
          </CardTitle>
        </CardHeader>
        <CardContent className="card-body space-y-4.5">
          <p className="text-secondary-foreground text-sm">
            This action is permanent and cannot be undone. Here&apos;s what will
            happen when you delete your account:
          </p>

          <ul className="grid gap-4.5 sm:grid-cols-2 sm:gap-x-7">
            <li>
              <p className="text-[13.5px] font-bold">Active Subscriptions</p>
              <p className="text-muted-foreground text-[13px]">
                Any active subscriptions will be automatically paused/cancelled
                in our payment system.
              </p>
            </li>

            <li>
              <p className="text-[13.5px] font-bold">Account Data</p>
              <p className="text-muted-foreground text-[13px]">
                Your profile, settings, and all personal data will be
                permanently deleted from our database.
              </p>
            </li>

            <li>
              <p className="text-[13.5px] font-bold">Purchase History</p>
              <p className="text-muted-foreground text-[13px]">
                Your order history and purchase records will not be removed, but
                you can still access them via email receipts.
              </p>
            </li>

            <li>
              <p className="text-[13.5px] font-bold">Browser Data</p>
              <p className="text-muted-foreground text-[13px]">
                All cookies, local storage, and session storage will be cleared
                from your browser.
              </p>
            </li>
          </ul>
        </CardContent>
        <CardFooter className="border-destructive/15 bg-destructive/4 flex items-center justify-end border-t px-5.5 py-3.5">
          <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger
              render={
                <Button
                  variant="destructive"
                  className="bg-status-danger-bg text-destructive hover:bg-status-danger-bg/70 rounded-full px-6"
                  disabled={sentNotification.isPending}
                  size="lg"
                />
              }
            >
              Request Account Deletion
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
                <AlertDialogCancel
                  render={
                    <Button
                      variant="outline"
                      disabled={sentNotification.isPending}
                      size="lg"
                    />
                  }
                >
                  Cancel
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={() =>
                    sentNotification.mutate(
                      {
                        subject: "🔴 Account Deletion Request",
                        // The reason field is optional, but the router requires
                        // a message — fall back to an explicit placeholder.
                        message: comment.trim() || "No reason provided.",
                        source: "Portal — Account Deletion",
                        metadata: {
                          priority: "URGENT",
                          projectType: "PORTFOLIO",
                        },
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
