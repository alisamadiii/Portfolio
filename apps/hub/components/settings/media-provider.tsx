"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import {
  DEFAULT_MEDIA_PROVIDER,
  getMediaProvider,
  isMediaProviderId,
  MEDIA_PROVIDERS,
  mediaProviderValues,
  type MediaProviderId,
} from "@workspace/cms-core/media-providers";
import { useTRPC } from "@workspace/trpc/client";

type MediaProviderSettingsProps = {
  owner: string;
  repo: string;
};

export function MediaProviderSettings({
  owner,
  repo,
}: MediaProviderSettingsProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState<MediaProviderId>(
    DEFAULT_MEDIA_PROVIDER
  );
  const [config, setConfig] = useState<Record<string, string>>({});
  const [secretsSet, setSecretsSet] = useState<string[]>([]);

  // The form below is an edit buffer, so the query must never refetch and
  // clobber unsaved edits — it loads once per mount only.
  const settingsQuery = useQuery(
    trpc.cms.settings.getMediaSettings.queryOptions(
      { owner, repo },
      { staleTime: Infinity, refetchOnWindowFocus: false }
    )
  );
  const isLoading = settingsQuery.isPending;

  useEffect(() => {
    const payload = settingsQuery.data;
    if (!payload) return;
    const loadedProvider = payload.provider;
    setProvider(
      isMediaProviderId(loadedProvider) ? loadedProvider : DEFAULT_MEDIA_PROVIDER
    );
    setConfig(payload.config ?? {});
    setSecretsSet(payload.secretsSet ?? []);
  }, [settingsQuery.data]);

  useEffect(() => {
    if (settingsQuery.error) {
      toast.error(
        settingsQuery.error.message || "Failed to load media settings."
      );
    }
  }, [settingsQuery.error]);

  const providerDef = getMediaProvider(provider);

  const missingRequired = useMemo(
    () =>
      providerDef.configFields.some((field) => {
        if (!field.required) return false;
        if (config[field.key]?.trim()) return false;
        // Stored write-only secrets count as filled.
        return !(!field.public && secretsSet.includes(field.key));
      }),
    [providerDef, config, secretsSet]
  );

  const saveMutation = useMutation(
    trpc.cms.settings.setMediaSettings.mutationOptions({
      onSuccess: (payload) => {
        setConfig(payload.config ?? {});
        // Secrets that were just submitted are now stored.
        const storedSecrets = providerDef.configFields
          .filter(
            (field) =>
              !field.public &&
              (config[field.key]?.trim() || secretsSet.includes(field.key))
          )
          .map((field) => field.key);
        setSecretsSet(storedSecrets);
        queryClient.setQueryData(
          trpc.cms.settings.getMediaSettings.queryKey({ owner, repo }),
          {
            provider: payload.provider,
            config: payload.config,
            secretsSet: storedSecrets,
          }
        );
        toast.success("Media settings updated.");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update media settings.");
      },
    })
  );
  const isSaving = saveMutation.isPending;
  const canSave = !isLoading && !isSaving && !missingRequired;

  const handleSave = () => saveMutation.mutate({ owner, repo, provider, config });

  return (
    <Card className="bg-background shadow-xs mb-6 gap-4 rounded-xl border py-5 ring-0 md:py-6">
      <CardHeader className="px-5 md:px-6">
        <CardTitle className="text-sm font-semibold">Media storage</CardTitle>
        <CardDescription>
          Where media is stored and browsed. &quot;GitHub repository&quot;
          commits files into the repo (default). With ImageKit, editors sign in
          to their own ImageKit account inside the CMS, manage media there, and
          entries store the CDN URL. Note: the embedded ImageKit library needs
          third-party cookies enabled (it may not load in incognito windows or
          with strict privacy settings).
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 md:px-6">
        <form
          className="w-full"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSave) void handleSave();
          }}
        >
          <div className="grid w-full items-center gap-4">
            <div className="grid gap-2">
              <Label htmlFor="media-provider">Provider</Label>
              <Select
                value={provider}
                onValueChange={(value) => {
                  if (isMediaProviderId(value)) {
                    setProvider(value);
                    setConfig({});
                  }
                }}
                disabled={isLoading || isSaving}
              >
                <SelectTrigger id="media-provider" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mediaProviderValues.map((id) => (
                    <SelectItem key={id} value={id}>
                      {MEDIA_PROVIDERS[id].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {providerDef.configFields.map((field) => (
              <div key={field.key} className="grid gap-2">
                <Label htmlFor={`media-config-${field.key}`}>
                  {field.label}
                </Label>
                <Input
                  id={`media-config-${field.key}`}
                  type={field.type}
                  value={config[field.key] ?? ""}
                  placeholder={
                    !field.public && secretsSet.includes(field.key)
                      ? "•••••••• (stored — leave empty to keep)"
                      : field.placeholder
                  }
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      [field.key]: event.target.value,
                    }))
                  }
                  maxLength={500}
                  disabled={isLoading || isSaving}
                />
                {field.description && (
                  <p className="text-muted-foreground text-xs">
                    {field.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </form>
      </CardContent>
      <CardFooter className="px-5 md:px-6">
        <Button
          className="ml-auto"
          onClick={() => void handleSave()}
          disabled={!canSave}
        >
          Save media storage
          {isSaving && <Loader className="ml-2 h-4 w-4 animate-spin" />}
        </Button>
      </CardFooter>
    </Card>
  );
}
