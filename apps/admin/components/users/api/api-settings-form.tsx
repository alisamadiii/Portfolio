"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { CardAgency } from "@workspace/ui/agency/card-agency";
import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";

import { agency, unwrap } from "@/lib/agency";
import { isValidOriginRule } from "@/lib/origin-rule";
import { QueryError } from "@/components/users/api/query-error";

const isUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

// The form works with plain strings (textarea = one origin per line) and maps
// to the API's null/array shape on submit. This is only inline pre-validation
// — the worker is authoritative and additionally verifies the bucket against
// R2 and the domain against SES.
const formSchema = z
  .object({
    emailDomain: z.string(),
    bucketName: z.string(),
    publicBaseUrl: z.string(),
    allowedOrigins: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.publicBaseUrl.trim() && !isUrl(data.publicBaseUrl.trim())) {
      ctx.addIssue({
        code: "custom",
        path: ["publicBaseUrl"],
        message: "Must be a valid URL",
      });
    }
    if (!data.bucketName.trim() !== !data.publicBaseUrl.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["bucketName"],
        message: "Bucket name and public base URL must be set together",
      });
    }
    const origins = parseOrigins(data.allowedOrigins);
    if (origins.length > 20) {
      ctx.addIssue({
        code: "custom",
        path: ["allowedOrigins"],
        message: "Max 20 origins",
      });
    }
    const invalid = origins.find((o) => !isValidOriginRule(o));
    if (invalid) {
      ctx.addIssue({
        code: "custom",
        path: ["allowedOrigins"],
        message: `"${invalid}" is not a valid domain or origin`,
      });
    }
  });

const parseOrigins = (raw: string) =>
  raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export function ApiSettingsForm() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // 200 with null capability fields when the user has no API settings yet —
  // the first save creates them (the worker's settings patch upserts).
  const {
    data: user,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["agency", "user", id],
    queryFn: async () => unwrap(await agency.admin.users.get(id)),
    enabled: !!id,
  });
  const hasSettings = !!(
    user &&
    (user.emailDomain || user.bucketName || user.allowedOrigins.length > 0)
  );

  const updateSettings = useMutation({
    mutationFn: async (params: {
      emailDomain: string | null;
      bucketName: string | null;
      publicBaseUrl: string | null;
      allowedOrigins: string[];
    }) => unwrap(await agency.admin.users.update(id, params)),
    onSuccess: () => {
      toast.success("API settings saved");
      queryClient.invalidateQueries({ queryKey: ["agency", "user", id] });
    },
    onError: (error) => {
      const hint = "causeHint" in error ? error.causeHint : undefined;
      toast.error(hint ? `${error.message} — ${hint}` : error.message);
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emailDomain: "",
      bucketName: "",
      publicBaseUrl: "",
      allowedOrigins: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        emailDomain: user.emailDomain ?? "",
        bucketName: user.bucketName ?? "",
        publicBaseUrl: user.publicBaseUrl ?? "",
        allowedOrigins: user.allowedOrigins.join("\n"),
      });
    }
  }, [user, form]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    updateSettings.mutate({
      emailDomain: values.emailDomain.trim() || null,
      bucketName: values.bucketName.trim() || null,
      publicBaseUrl: values.publicBaseUrl.trim() || null,
      allowedOrigins: parseOrigins(values.allowedOrigins),
    });
  };

  if (isError) {
    return (
      <CardAgency.Card>
        <CardAgency.Header title="API Settings" />
        <QueryError
          title="Failed to load API settings"
          error={error}
          onRetry={() => refetch()}
        />
      </CardAgency.Card>
    );
  }

  return (
    <CardAgency.Card>
      <CardAgency.Header title="API Settings" />
      {!isLoading && !hasSettings && (
        <p className="text-muted-foreground -mt-4 text-sm">
          No API settings yet — saving enables API access for this user.
        </p>
      )}
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <Controller
          control={form.control}
          name="emailDomain"
          render={({ field, fieldState }) => (
            <Field aria-invalid={fieldState.invalid}>
              <FieldLabel>Email domain</FieldLabel>
              <FieldContent>
                <Input
                  {...field}
                  placeholder="acme.com"
                  aria-invalid={fieldState.invalid}
                />
                <p className="text-muted-foreground text-xs">
                  Domain the user may send email as. Checked against SES on
                  save — unverified domains are rejected.
                </p>
              </FieldContent>
              <FieldError
                errors={fieldState.error ? [fieldState.error] : undefined}
              />
            </Field>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="bucketName"
            render={({ field, fieldState }) => (
              <Field aria-invalid={fieldState.invalid}>
                <FieldLabel>R2 bucket</FieldLabel>
                <FieldContent>
                  <Input
                    {...field}
                    placeholder="acme-media"
                    aria-invalid={fieldState.invalid}
                  />
                </FieldContent>
                <FieldError
                  errors={fieldState.error ? [fieldState.error] : undefined}
                />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="publicBaseUrl"
            render={({ field, fieldState }) => (
              <Field aria-invalid={fieldState.invalid}>
                <FieldLabel>Public base URL</FieldLabel>
                <FieldContent>
                  <Input
                    {...field}
                    placeholder="https://media.acme.com"
                    aria-invalid={fieldState.invalid}
                  />
                </FieldContent>
                <FieldError
                  errors={fieldState.error ? [fieldState.error] : undefined}
                />
              </Field>
            )}
          />
        </div>
        <p className="text-muted-foreground -mt-2 text-xs">
          Both checked on save: the bucket must exist in R2 and the URL must
          serve it.
        </p>

        <Controller
          control={form.control}
          name="allowedOrigins"
          render={({ field, fieldState }) => (
            <Field aria-invalid={fieldState.invalid}>
              <FieldLabel>Allowed origins</FieldLabel>
              <FieldContent>
                <Textarea
                  {...field}
                  rows={4}
                  placeholder={"acme.com\nhttp://localhost:5173"}
                  className="font-mono text-xs"
                  aria-invalid={fieldState.invalid}
                />
                <p className="text-muted-foreground text-xs">
                  One per line — a bare domain (any scheme/port/subdomain) or an
                  exact origin. Empty means the user&apos;s public keys are
                  dead.
                </p>
              </FieldContent>
              <FieldError
                errors={fieldState.error ? [fieldState.error] : undefined}
              />
            </Field>
          )}
        />

        <Button
          type="submit"
          className="self-start"
          isLoading={updateSettings.isPending}
          disabled={!form.formState.isDirty}
        >
          Save settings
        </Button>
      </form>
    </CardAgency.Card>
  );
}
