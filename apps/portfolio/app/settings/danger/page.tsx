"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@workspace/ui/components/input";
import { Spinner } from "@workspace/ui/components/spinner";

import { queryClient, useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

export default function DangerPage() {
  const user = useCurrentUser();
  const router = useRouter();
  const [confirm, setConfirm] = useState("");

  const deleteAccount = useMutation(
    useTRPC().payments.deleteCustomer.mutationOptions({
      onSuccess: () => {
        router.push("/");
        router.refresh();

        // Clear all queries
        queryClient.clear();

        // Delete all local storage and session storage items
        localStorage.clear();
        sessionStorage.clear();
      },
    })
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

            <li>
              <p className="font-medium">Redirect</p>
              <p className="text-muted-foreground">
                You will be automatically redirected to the home page and logged
                out
              </p>
            </li>
          </ul>
        </CardContent>
        <CardFooter className="justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Account</AlertDialogTitle>
              </AlertDialogHeader>
              <p className="text-muted-foreground text-sm">
                To confirm deletion, type{" "}
                <span className="text-destructive font-semibold">confirm</span>{" "}
                in the box below. This is a permanent action and cannot be
                undone.
              </p>
              <Input
                placeholder="Type confirm to proceed"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <AlertDialogFooter className="grid grid-cols-2 gap-2">
                <AlertDialogCancel asChild>
                  <Button variant="outline" disabled={deleteAccount.isPending}>
                    Cancel
                  </Button>
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={confirm !== "confirm"}
                  onClick={() =>
                    deleteAccount.mutate(user.data?.user.id ?? "", {
                      onError: (error) => {
                        toast.error(error.message);
                      },
                    })
                  }
                  isLoading={deleteAccount.isPending}
                >
                  Delete Account
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
