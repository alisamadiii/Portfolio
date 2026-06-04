"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, Key, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

import { queryClient, useTRPC } from "@workspace/trpc/client";

export const ClientApiKey = ({ clientId }: { clientId: string }) => {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.clients.get.queryOptions(clientId));

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.clients.get.queryKey(clientId),
    });

  const generate = useMutation(trpc.clients.generateApiKey.mutationOptions());
  const revoke = useMutation(trpc.clients.revokeApiKey.mutationOptions());
  const updateClient = useMutation(trpc.clients.update.mutationOptions());

  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [originValue, setOriginValue] = useState<string | null>(null);

  const apiKey = data?.client.apiKey;
  const currentOrigin = originValue ?? data?.client.apiKeyOrigin ?? "";

  const handleCopy = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = () => {
    generate.mutate(clientId, {
      onSuccess: () => {
        toast.success(apiKey ? "API key regenerated" : "API key created");
        setRevealed(true);
        invalidate();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleRevoke = () => {
    revoke.mutate(clientId, {
      onSuccess: () => {
        toast.success("API key revoked");
        setRevealed(false);
        invalidate();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 7)}${"•".repeat(24)}${apiKey.slice(-4)}`
    : null;

  if (isLoading) {
    return (
      <CardAgency.Card>
        <CardAgency.Header title="API Key" />
        <div className="h-20 animate-pulse rounded-md bg-muted" />
      </CardAgency.Card>
    );
  }

  return (
    <CardAgency.Card>
      <CardAgency.Header title="API Key">
        {apiKey && (
          <Badge variant="default" className="text-[10px]">
            Active
          </Badge>
        )}
      </CardAgency.Header>

      {!apiKey ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Key className="size-5 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">No API key</p>
            <p className="text-muted-foreground text-xs mt-1">
              Generate a key so this client can use the API.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleGenerate}
            isLoading={generate.isPending}
          >
            <Key className="size-3.5 mr-1.5" />
            Generate API Key
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2.5">
            <code className="flex-1 text-sm font-mono select-all">
              {revealed ? apiKey : maskedKey}
            </code>
            <button
              onClick={() => setRevealed(!revealed)}
              className="text-muted-foreground hover:text-foreground text-xs shrink-0"
            >
              {revealed ? "Hide" : "Reveal"}
            </button>
            <button
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              {copied ? (
                <Check className="size-3.5 text-green-500" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>

          <div className="flex gap-2">
            <RegenerateDialog
              onConfirm={handleGenerate}
              isPending={generate.isPending}
            />
            <RevokeDialog
              onConfirm={handleRevoke}
              isPending={revoke.isPending}
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <Label className="text-xs text-muted-foreground">
              Allowed Origin
            </Label>
            <p className="text-muted-foreground text-xs">
              Restrict this key to requests from a specific domain. Leave empty
              to allow any origin.
            </p>
            <div className="flex gap-2">
              <Input
                value={currentOrigin}
                onChange={(e) => setOriginValue(e.target.value)}
                placeholder="example.com"
                className="font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={
                  (originValue ?? data?.client.apiKeyOrigin ?? "") ===
                  (data?.client.apiKeyOrigin ?? "")
                }
                isLoading={updateClient.isPending}
                onClick={() =>
                  updateClient.mutate(
                    {
                      id: clientId,
                      apiKeyOrigin: currentOrigin.trim() || null,
                    },
                    {
                      onSuccess: () => {
                        toast.success("Allowed origin updated");
                        setOriginValue(null);
                        invalidate();
                      },
                      onError: (err) => toast.error(err.message),
                    }
                  )
                }
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </CardAgency.Card>
  );
};

const RegenerateDialog = ({
  onConfirm,
  isPending,
}: {
  onConfirm: () => void;
  isPending: boolean;
}) => (
  <Dialog>
    <DialogTrigger
      render={
        <Button variant="outline" size="sm" className="gap-1.5" />
      }
    >
      <RefreshCw className="size-3.5" />
      Regenerate
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Regenerate API key?</DialogTitle>
        <DialogDescription>
          This will invalidate the current key. The client will need to update
          their integration with the new key.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button onClick={onConfirm} isLoading={isPending}>
          Regenerate
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const RevokeDialog = ({
  onConfirm,
  isPending,
}: {
  onConfirm: () => void;
  isPending: boolean;
}) => (
  <Dialog>
    <DialogTrigger
      render={
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive"
        />
      }
    >
      <Trash2 className="size-3.5" />
      Revoke
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Revoke API key?</DialogTitle>
        <DialogDescription>
          This will permanently disable the key. API requests using this key will
          stop working immediately.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button variant="destructive" onClick={onConfirm} isLoading={isPending}>
          Revoke
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
