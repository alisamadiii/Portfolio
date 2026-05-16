"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";

import { useTRPC } from "@workspace/trpc/client";

export const CreateClientDialog = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const router = useRouter();
  const trpc = useTRPC();

  const { data: users, isLoading } = useQuery(
    trpc.users.list.queryOptions(
      { page: 1, limit: 10, search: search || undefined },
      { enabled: open && search.length > 0 }
    )
  );

  const createClient = useMutation(
    trpc.clients.create.mutationOptions({
      onSuccess: (client) => {
        toast.success("Client created");
        setOpen(false);
        setSearch("");
        setSelectedUserId(null);
        router.push(`/clients/${client.id}`);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const selectedUser = users?.find((u) => u.id === selectedUserId);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setSearch("");
          setSelectedUserId(null);
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
          <Plus className="size-4" />
          Create Client
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Client</DialogTitle>
          <DialogDescription>
            Search for a user to create a client record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-3 size-4" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedUserId(null);
              }}
              placeholder="Search by name or email..."
              className="pl-9"
            />
          </div>

          {isLoading && (
            <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Searching...
            </div>
          )}

          {users && users.length > 0 && !selectedUserId && (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className="hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors"
                >
                  <Avatar className="size-8">
                    <AvatarImage src={u.image ?? ""} />
                    <AvatarFallback>{u.name?.charAt(0) ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {u.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {users && users.length === 0 && search.length > 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No users found
            </p>
          )}

          {selectedUser && (
            <div className="bg-muted flex items-center gap-3 rounded-lg p-3">
              <Avatar className="size-10">
                <AvatarImage src={selectedUser.image ?? ""} />
                <AvatarFallback>
                  {selectedUser.name?.charAt(0) ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{selectedUser.name}</p>
                <p className="text-muted-foreground truncate text-sm">
                  {selectedUser.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUserId(null)}
              >
                Change
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={!selectedUserId || createClient.isPending}
            isLoading={createClient.isPending}
            onClick={() => {
              if (selectedUserId) {
                createClient.mutate({ userId: selectedUserId });
              }
            }}
          >
            Create Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
