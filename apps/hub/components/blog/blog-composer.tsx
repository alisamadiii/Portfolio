"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConfig, ConfigProvider } from "@/contexts/config-context";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { ArrowLeft, ChevronDown, Loader2, X } from "@/components/icon";
import { toast } from "sonner";

import type { Config } from "@workspace/cms-core/types/config";
import type { Field } from "@workspace/cms-core/types/field";

import { Button } from "@workspace/ui/components/button";
import { Form } from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { repoPath } from "@/lib/paths";
import { draftKey, getDraft, saveDraftOrThrow } from "@/lib/store/drafts";
import { applySeoAutofill } from "@/lib/seo-autofill";
import {
  generateFilename,
  generateZodSchema,
  getPrimaryField,
  initializeState,
  safeAccess,
  sanitizeObject,
} from "@workspace/cms-core/schema";
import { joinPathSegments } from "@workspace/cms-core/utils/file";

import { editComponents } from "@/fields/registry";
import { TextArea, TextField as MuiTextField } from "@/components/ui/form-fields";
import { BLOG_FIELDS, buildBlogSchema } from "@/lib/engine/blog-schema";
import { isBlogCollection } from "@/lib/engine/blog-schema";
import type { ManifestCollection } from "@/lib/engine/collections";
import { PublishButton } from "@/components/publish/publish-button";

/** Look up a canonical blog field definition by name (for options/type). */
const fieldByName = (name: string): Field =>
  BLOG_FIELDS.find((f) => f.name === name)!;
const SEO_FIELDS = (fieldByName("seo").fields ?? []) as Field[];
const seoField = (name: string): Field =>
  SEO_FIELDS.find((f) => f.name === name)!;

/** A registry field editor bound to react-hook-form by dotted name. */
function FieldControl({
  schemaField,
  name,
  placeholder,
}: {
  schemaField: Field;
  name: string;
  placeholder?: string;
}) {
  const Comp = editComponents[schemaField.type] ?? editComponents.text;
  return (
    <Controller
      name={name}
      render={({ field }) => (
        <Comp field={{ ...schemaField, options: { ...schemaField.options, placeholder } }} {...field} />
      )}
    />
  );
}

/** MUI floating-label field bound to react-hook-form by dotted name. */
function MuiField({
  name,
  label,
  multiline,
  minRows,
  type,
  className,
}: {
  name: string;
  label: string;
  multiline?: boolean;
  minRows?: number;
  type?: string;
  className?: string;
}) {
  const Comp = multiline ? TextArea : MuiTextField;
  return (
    <Controller
      name={name}
      render={({ field, fieldState }) => (
        <Comp
          label={label}
          type={type}
          minRows={multiline ? minRows : undefined}
          className={className}
          value={field.value ?? ""}
          onChange={field.onChange}
          onBlur={field.onBlur}
          inputRef={field.ref}
          name={field.name}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message}
        />
      )}
    />
  );
}

function Labeled({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-muted-foreground text-xs font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Simple chip/enter tags input writing string[] into RHF. */
function TagsControl({ name }: { name: string }) {
  const [draft, setDraft] = useState("");
  return (
    <Controller
      name={name}
      render={({ field }) => {
        const tags: string[] = Array.isArray(field.value) ? field.value : [];
        const add = (raw: string) => {
          const value = raw.trim().replace(/,$/, "").trim();
          if (!value || tags.includes(value)) return;
          field.onChange([...tags, value]);
          setDraft("");
        };
        return (
          <div className="border-input flex flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-muted flex items-center gap-1 rounded px-2 py-0.5 text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => field.onChange(tags.filter((t) => t !== tag))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  add(draft);
                } else if (event.key === "Backspace" && !draft && tags.length) {
                  field.onChange(tags.slice(0, -1));
                }
              }}
              onBlur={() => add(draft)}
              placeholder={tags.length ? "" : "Add a tag…"}
              className="min-w-24 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        );
      }}
    />
  );
}

export function BlogComposer({
  mode,
  path,
}: {
  mode: "create" | "edit";
  path?: string;
}) {
  const { config } = useConfig();
  const router = useRouter();
  const trpc = useTRPC();

  const owner = config?.owner ?? "";
  const repo = config?.repo ?? "";
  const branch = config?.branch ?? "";
  const enabled = Boolean(owner && repo && branch);

  const isEdit = mode === "edit";
  const [saving, setSaving] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);

  const manifestQuery = useQuery(
    trpc.cms.manifest.get.queryOptions(
      { owner, repo, branch },
      { enabled, staleTime: 60_000 }
    )
  );

  const manifest = manifestQuery.data?.object;
  const blogCollection = (
    (manifest?.collections as ManifestCollection[]) ?? []
  ).find((collection) => isBlogCollection(collection));
  const schema = useMemo(
    () => (blogCollection ? buildBlogSchema(blogCollection) : null),
    [blogCollection]
  );

  // Existing entry (edit mode): schema-less read of the .md file.
  const entryQuery = useQuery(
    trpc.cms.entries.getContent.queryOptions(
      { owner, repo, branch, path: path ?? "" },
      { enabled: enabled && isEdit && Boolean(path) }
    )
  );
  const fetched =
    isEdit && entryQuery.data && "contentObject" in entryQuery.data
      ? entryQuery.data
      : null;

  const localDraft =
    isEdit && enabled && path ? getDraft(owner, repo, branch, path) : null;

  const contentObject = useMemo<Record<string, unknown> | null>(() => {
    if (!isEdit) return {};
    const values =
      (localDraft?.values as Record<string, unknown> | undefined) ??
      (fetched?.contentObject as Record<string, unknown> | undefined);
    return values ?? null;
  }, [isEdit, localDraft, fetched]);

  // v2 media bridge: field editors read config.object.media; v2 config is empty,
  // so synthesize a media schema from the manifest for image/rich-text uploads.
  const bridgedConfig = useMemo<Config | null>(() => {
    if (!config) return null;
    const existing = (config.object as any)?.media;
    if (Array.isArray(existing) && existing.length) return config;
    if (!manifest?.media) return config;
    return {
      ...config,
      object: {
        ...config.object,
        media: [
          {
            name: "media",
            input: manifest.media.input,
            output: manifest.media.output,
          },
        ],
      },
    } as Config;
  }, [config, manifest]);

  const loading =
    manifestQuery.isLoading || (isEdit && entryQuery.isLoading && !localDraft);

  if (!config || loading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!blogCollection || !schema) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground text-sm">No blog configured.</p>
        <Button variant="outline" className="mt-4" render={<Link href={repoPath(repo, "blog")}>Back to blog</Link>} />
      </div>
    );
  }

  if (isEdit && !contentObject) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground text-sm">Could not load this post.</p>
        <Button variant="outline" className="mt-4" render={<Link href={repoPath(repo, "blog")}>Back to blog</Link>} />
      </div>
    );
  }

  return (
    <ConfigProvider value={bridgedConfig}>
      <ComposerForm
        mode={mode}
        path={path}
        schema={schema}
        content={contentObject ?? {}}
        sha={fetched?.sha ?? localDraft?.sha ?? null}
        owner={owner}
        repo={repo}
        branch={branch}
        seoOpen={seoOpen}
        setSeoOpen={setSeoOpen}
        saving={saving}
        setSaving={setSaving}
        onCreated={(newPath) =>
          router.replace(
            `${repoPath(repo, "blog")}/edit/${newPath
              .split("/")
              .map(encodeURIComponent)
              .join("/")}`
          )
        }
      />
    </ConfigProvider>
  );
}

function ComposerForm({
  mode,
  path,
  schema,
  content,
  sha,
  owner,
  repo,
  branch,
  seoOpen,
  setSeoOpen,
  saving,
  setSaving,
  onCreated,
}: {
  mode: "create" | "edit";
  path?: string;
  schema: Record<string, any>;
  content: Record<string, unknown>;
  sha: string | null;
  owner: string;
  repo: string;
  branch: string;
  seoOpen: boolean;
  setSeoOpen: (open: boolean) => void;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  onCreated: (path: string) => void;
}) {
  const isEdit = mode === "edit";
  const zodSchema = useMemo(() => generateZodSchema(BLOG_FIELDS), []);
  const defaultValues = useMemo(
    () => initializeState(BLOG_FIELDS, sanitizeObject(content)),
    [content]
  );
  const form = useForm({
    resolver: zodResolver(
      zodSchema as unknown as Parameters<typeof zodResolver>[0]
    ),
    defaultValues,
    reValidateMode: "onSubmit",
  });

  // rich-text flushes editor→Markdown into form state through this hook on save.
  const beforeSubmitHooks = useRef<Map<string, () => void | Promise<void>>>(
    new Map()
  );
  const registerBeforeSubmitHook = useCallback(
    (key: string, hook: () => void | Promise<void>) => {
      beforeSubmitHooks.current.set(key, hook);
      return () => {
        beforeSubmitHooks.current.delete(key);
      };
    },
    []
  );

  const RichText = editComponents["rich-text"];
  const bodyField = fieldByName("body");

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    try {
      for (const hook of beforeSubmitHooks.current.values()) await hook();
      const values = applySeoAutofill(
        schema,
        form.getValues() as Record<string, unknown>
      );

      const primaryField = getPrimaryField(schema);
      const rawTitle = primaryField ? safeAccess(values, primaryField) : undefined;
      const title = typeof rawTitle === "string" ? rawTitle : undefined;

      let savePath = path ?? "";
      if (!isEdit) {
        const generated = generateFilename(schema.filename, schema, values);
        if (!generated || generated.startsWith(".")) {
          toast.error("Add a title first — it names the file.");
          return;
        }
        savePath = joinPathSegments([schema.path, generated]);
      }

      saveDraftOrThrow(draftKey(owner, repo, branch, savePath), {
        v: 1,
        path: savePath,
        schemaName: "blog",
        sha,
        isNew: !isEdit,
        values,
        savedAt: Date.now(),
        title,
      });
      form.reset(form.getValues());
      toast.success("Draft saved on this device");
      if (!isEdit) onCreated(savePath);
    } catch (error: any) {
      toast.error(error?.message || "Could not save the draft.");
    } finally {
      setSaving(false);
    }
  }, [
    branch,
    form,
    isEdit,
    onCreated,
    owner,
    path,
    repo,
    schema,
    setSaving,
    sha,
  ]);

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSaveDraft();
        }}
        className="mx-auto max-w-3xl pb-24"
      >
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 shrink-0"
            render={
              <Link href={repoPath(repo, "blog")}>
                <ArrowLeft className="size-4" />
                Blog
              </Link>
            }
          />
          <span className="text-muted-foreground text-sm">
            {isEdit ? "Edit post" : "New post"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button type="submit" variant="outline" size="sm" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save draft
            </Button>
            <PublishButton />
          </div>
        </div>

        {/* Hero cover image */}
        <div className="mb-6">
          <FieldControl schemaField={fieldByName("coverImage")} name="coverImage" />
          <div className="mt-3">
            <MuiField name="coverImageAlt" label="Cover image alt text" />
          </div>
        </div>

        {/* Title */}
        <Controller
          name="title"
          render={({ field }) => (
            <Input
              {...field}
              placeholder="Post title"
              className="mb-5 h-auto border-0 px-0 !text-4xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
            />
          )}
        />

        {/* Excerpt */}
        <div className="mb-8">
          <MuiField
            name="excerpt"
            label="Excerpt"
            multiline
            minRows={2}
          />
        </div>

        {/* Body — Markdown WYSIWYG (self-managed via form context + name) */}
        <div className="mb-10">
          <RichText
            name="body"
            field={bodyField}
            value={form.getValues("body") ?? ""}
            onChange={() => {}}
            registerBeforeSubmitHook={registerBeforeSubmitHook}
          />
        </div>

        {/* Meta card */}
        <div className="bg-muted/30 grid items-start gap-5 rounded-xl border p-5 sm:grid-cols-2">
          <Labeled label="Publish date">
            <FieldControl schemaField={fieldByName("date")} name="date" />
          </Labeled>
          <MuiField name="author" label="Author" />
          <div className="sm:col-span-2">
            <Labeled label="Tags">
              <TagsControl name="tags" />
            </Labeled>
          </div>
          <MuiField name="category" label="Category" />
          <MuiField name="slug" label="URL slug" />
          <Labeled label="Last updated">
            <FieldControl schemaField={fieldByName("updatedDate")} name="updatedDate" />
          </Labeled>
          <div className="flex items-center gap-3 pt-2">
            <FieldControl schemaField={fieldByName("featured")} name="featured" />
            <Label className="text-sm">Featured post</Label>
          </div>
        </div>

        {/* SEO & advanced */}
        <div className="mt-6 rounded-xl border">
          <button
            type="button"
            onClick={() => setSeoOpen(!seoOpen)}
            className="hover:bg-muted/40 flex w-full items-center gap-2 rounded-xl px-5 py-4 text-left"
          >
            <ChevronDown
              className={cn("size-4 transition-transform", seoOpen && "rotate-180")}
            />
            <span className="text-sm font-medium">SEO &amp; advanced</span>
            <span className="text-muted-foreground ml-2 text-xs">
              Overrides the title, description and social image for search
            </span>
          </button>
          {seoOpen && (
            <div className="grid items-start gap-5 border-t p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <MuiField name="seo.title" label="SEO title" />
              </div>
              <div className="sm:col-span-2">
                <MuiField name="seo.description" label="SEO description" multiline minRows={2} />
              </div>
              <Labeled label="Social share image">
                <FieldControl schemaField={seoField("ogImage")} name="seo.ogImage" />
              </Labeled>
              <MuiField name="seo.canonicalUrl" label="Canonical URL" />
            </div>
          )}
        </div>
      </form>
    </Form>
  );
}
