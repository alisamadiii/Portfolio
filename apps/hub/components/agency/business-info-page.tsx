"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";

import { useTRPC } from "@workspace/trpc/client";

import {
  BUSINESS_SECTIONS,
  sectionUrl,
  type BusinessField,
  type FixedField,
  type GroupField,
  type ListField,
  type PromptFill,
  type PromptSpec,
  type SingleField,
} from "@/components/agency/business-info-config";
import { useAgency } from "@/components/agency/use-agency";
import { Copy, Plus, Trash } from "@/components/icon";

type Draft = Record<string, string[]>;

/** Every storage key a field owns, with the row count to seed when empty. */
function fieldKeys(field: BusinessField): { key: string; initial: number }[] {
  switch (field.kind) {
    case "single":
      return [{ key: field.key, initial: 1 }];
    case "list":
      return [{ key: field.key, initial: field.initial }];
    case "fixed":
      return [{ key: field.key, initial: field.rowLabels.length }];
    case "group":
      return field.subfields.map((sub) => ({
        key: sub.key,
        initial: field.count,
      }));
  }
}

/** Editable draft for ONE section: saved values where present, else empties. */
function seedDraft(fields: BusinessField[], saved: Draft): Draft {
  const draft: Draft = {};
  for (const field of fields) {
    for (const { key, initial } of fieldKeys(field)) {
      const rows = saved[key] ?? [];
      draft[key] =
        rows.length >= initial
          ? [...rows]
          : [...rows, ...Array.from({ length: initial - rows.length }, () => "")];
    }
  }
  return draft;
}

/** Turn a stored list into the text that replaces a prompt token. */
function fillText(values: Draft, fill: PromptFill): string {
  const rows = (values[fill.key] ?? []).map((r) => r.trim()).filter(Boolean);
  if (rows.length === 0) return "";
  switch (fill.format) {
    case "lines":
      return rows.join("\n");
    case "numbered":
      return rows.map((r, i) => `${i + 1}. ${r}`).join("\n");
    default:
      return rows[0] ?? "";
  }
}

/** One Business Information section as its own page. */
export function BusinessInfoSection({ sectionKey }: { sectionKey: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { repoId } = useAgency();

  const section = BUSINESS_SECTIONS.find((s) => s.key === sectionKey)!;

  const info = useQuery(trpc.agency.businessInfo.get.queryOptions({ repoId }));
  const [draft, setDraft] = useState<Draft>({});
  const [dirty, setDirty] = useState(false);

  // Seed this section's editable lists once the saved values load.
  useEffect(() => {
    if (info.data) setDraft(seedDraft(section.fields, info.data));
  }, [info.data, section]);

  const save = useMutation(
    trpc.agency.businessInfo.set.mutationOptions({
      onSuccess: (saved) => {
        toast.success("Business information saved.");
        setDraft(seedDraft(section.fields, saved));
        setDirty(false);
        queryClient.invalidateQueries({
          queryKey: trpc.agency.businessInfo.pathKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  // Other sections' saved values + this section's live edits: prompts and
  // group titles read across sections through this.
  const values = useMemo(
    () => ({ ...(info.data ?? {}), ...draft }),
    [info.data, draft]
  );

  if (info.isPending) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (info.error)
    return <p className="text-destructive text-[14px]">{info.error.message}</p>;

  const setRow = (key: string, i: number, value: string) => {
    setDraft((prev) => {
      const rows = [...(prev[key] ?? [])];
      while (rows.length <= i) rows.push("");
      rows[i] = value;
      return { ...prev, [key]: rows };
    });
    setDirty(true);
  };
  const addRow = (key: string) => {
    setDraft((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ""] }));
    setDirty(true);
  };
  const removeRow = (key: string, i: number) => {
    setDraft((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((_, j) => j !== i),
    }));
    setDirty(true);
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-muted-foreground/70 font-mono text-[12px] font-semibold">
          {section.num}
        </p>
        <h3 className="mt-1 text-[19px] font-bold tracking-tight">
          {section.title}
        </h3>
        <p className="text-muted-foreground mt-1 max-w-2xl text-[14px]">
          {section.lead}
        </p>
        {section.description?.map((paragraph, i) => (
          <p
            key={i}
            className="text-muted-foreground/90 mt-3 max-w-2xl text-[13.5px] leading-relaxed"
          >
            {paragraph}
          </p>
        ))}
      </div>

      {section.prompts && section.prompts.length > 0 && (
        <div className="space-y-3">
          {section.prompts.map((prompt) => (
            <PromptCard key={prompt.title} prompt={prompt} values={values} />
          ))}
        </div>
      )}

      <div className="space-y-5">
        {section.fields.map((field, i) => (
          <Field
            key={i}
            field={field}
            draft={draft}
            values={values}
            onSet={setRow}
            onAdd={addRow}
            onRemove={removeRow}
          />
        ))}
      </div>

      <Button
        size="lg"
        disabled={!dirty || save.isPending}
        onClick={() =>
          // set replaces the whole map, so other sections' values ride along.
          save.mutate({ repoId, businessInfo: values })
        }
      >
        {save.isPending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function Field({
  field,
  draft,
  values,
  onSet,
  onAdd,
  onRemove,
}: {
  field: BusinessField;
  draft: Draft;
  values: Draft;
  onSet: (key: string, i: number, value: string) => void;
  onAdd: (key: string) => void;
  onRemove: (key: string, i: number) => void;
}) {
  switch (field.kind) {
    case "single":
      return <SingleInput field={field} draft={draft} onSet={onSet} />;
    case "list":
      return (
        <ListInput
          field={field}
          draft={draft}
          onSet={onSet}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      );
    case "fixed":
      return <FixedInput field={field} draft={draft} onSet={onSet} />;
    case "group":
      return (
        <GroupInput field={field} draft={draft} values={values} onSet={onSet} />
      );
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-foreground/80 mb-1.5 text-[13px] font-medium">
      {children}
    </p>
  );
}

function SingleInput({
  field,
  draft,
  onSet,
}: {
  field: SingleField;
  draft: Draft;
  onSet: (key: string, i: number, value: string) => void;
}) {
  const value = draft[field.key]?.[0] ?? "";
  return (
    <div>
      <FieldLabel>{field.label}</FieldLabel>
      {field.multiline ? (
        <Textarea
          value={value}
          placeholder={field.placeholder}
          rows={3}
          className="max-w-2xl"
          onChange={(e) => onSet(field.key, 0, e.target.value)}
        />
      ) : (
        <Input
          value={value}
          placeholder={field.placeholder}
          className="max-w-md"
          onChange={(e) => onSet(field.key, 0, e.target.value)}
        />
      )}
    </div>
  );
}

function ListInput({
  field,
  draft,
  onSet,
  onAdd,
  onRemove,
}: {
  field: ListField;
  draft: Draft;
  onSet: (key: string, i: number, value: string) => void;
  onAdd: (key: string) => void;
  onRemove: (key: string, i: number) => void;
}) {
  const rows = draft[field.key] ?? [];
  return (
    <div>
      <FieldLabel>{field.label}s</FieldLabel>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2">
            {field.multiline ? (
              <Textarea
                value={row}
                placeholder={field.placeholder}
                rows={2}
                className="max-w-2xl"
                onChange={(e) => onSet(field.key, i, e.target.value)}
              />
            ) : (
              <Input
                value={row}
                placeholder={field.placeholder}
                className="max-w-md"
                onChange={(e) => onSet(field.key, i, e.target.value)}
              />
            )}
            {rows.length > 1 && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="mt-0.5"
                onClick={() => onRemove(field.key, i)}
              >
                <Trash className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onAdd(field.key)}>
          <Plus className="size-4" /> Add {field.label.toLowerCase()}
        </Button>
      </div>
    </div>
  );
}

function FixedInput({
  field,
  draft,
  onSet,
}: {
  field: FixedField;
  draft: Draft;
  onSet: (key: string, i: number, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {field.rowLabels.map((label, i) => (
        <div key={i}>
          <FieldLabel>{label}</FieldLabel>
          {field.multiline ? (
            <Textarea
              value={draft[field.key]?.[i] ?? ""}
              rows={2}
              className="max-w-2xl"
              onChange={(e) => onSet(field.key, i, e.target.value)}
            />
          ) : (
            <Input
              value={draft[field.key]?.[i] ?? ""}
              className="max-w-md"
              onChange={(e) => onSet(field.key, i, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function GroupInput({
  field,
  draft,
  values,
  onSet,
}: {
  field: GroupField;
  draft: Draft;
  values: Draft;
  onSet: (key: string, i: number, value: string) => void;
}) {
  // Block titles come from the linked field's saved rows (first line only —
  // segment rows may carry a "name — why" explanation). The linked field can
  // live in another section, hence the merged values map.
  const titles = (field.titleFrom ? (values[field.titleFrom] ?? []) : [])
    .map((r) => r.split("\n")[0]?.trim() ?? "")
    .filter(Boolean);
  const blocks = Math.max(field.count, titles.length);

  return (
    <div className="space-y-4">
      {Array.from({ length: blocks }, (_, i) => (
        <div key={i} className="bg-card max-w-2xl rounded-2xl border p-4">
          <p className="text-[14px] font-semibold">
            {titles[i] ?? `${field.blockLabel} ${i + 1}`}
          </p>
          <div className="mt-3 space-y-3">
            {field.subfields.map((sub) => (
              <div key={sub.key}>
                <FieldLabel>{sub.label}</FieldLabel>
                {sub.multiline ? (
                  <Textarea
                    value={draft[sub.key]?.[i] ?? ""}
                    placeholder={sub.placeholder}
                    rows={2}
                    onChange={(e) => onSet(sub.key, i, e.target.value)}
                  />
                ) : (
                  <Input
                    value={draft[sub.key]?.[i] ?? ""}
                    placeholder={sub.placeholder}
                    onChange={(e) => onSet(sub.key, i, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PromptCard({ prompt, values }: { prompt: PromptSpec; values: Draft }) {
  const [open, setOpen] = useState(false);

  // Split the template on this prompt's own tokens only (the course prompts
  // contain other [bracketed] text that must stay untouched), then render
  // each token as its live value or a highlighted missing marker.
  const { parts, missing, resolved } = useMemo(() => {
    const tokens = Object.keys(prompt.fills);
    const splitter = new RegExp(
      `(\\[(?:${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\])`,
      "g"
    );
    type Part = { text: string; filled?: boolean; fill?: PromptFill };
    const parts: Part[] = prompt.template.split(splitter).map((part) => {
      const token = tokens.find((t) => part === `[${t}]`);
      if (!token) return { text: part };
      const fill = prompt.fills[token]!;
      const value = fillText(values, fill);
      return value ? { text: value, filled: true } : { text: part, fill };
    });
    const missing = Object.values(prompt.fills).filter(
      (fill) => !fillText(values, fill)
    );
    const resolved = parts.map((p) => p.text).join("");
    return { parts, missing, resolved };
  }, [prompt, values]);

  const copyPrompt = () => {
    navigator.clipboard
      .writeText(resolved)
      .then(() => toast.success("Prompt copied."))
      .catch(() => toast.error("Couldn't copy the prompt."));
  };

  return (
    <div className="bg-card max-w-2xl rounded-xl border">
      <div className="flex items-center justify-between gap-3 px-3.5 pt-3">
        <p className="text-muted-foreground text-[12px] font-semibold tracking-[0.04em] uppercase">
          {prompt.title}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "Show"}
          </Button>
          <Button variant="ghost" size="sm" onClick={copyPrompt}>
            <Copy className="size-3.5" /> Copy
          </Button>
        </div>
      </div>

      {missing.length > 0 && (
        <p className="text-muted-foreground px-3.5 pt-2 text-[12.5px]">
          Missing info:{" "}
          {missing.map((fill, i) => (
            <span key={fill.key}>
              {i > 0 && ", "}
              <Link
                href={sectionUrl(fill.section)}
                className="text-foreground underline underline-offset-2"
              >
                {fill.label}
              </Link>
            </span>
          ))}
          . Fill it in and the prompt updates itself.
        </p>
      )}

      <div className="relative px-3.5 pt-2 pb-3.5">
        <p
          className={`text-muted-foreground text-[13px] leading-relaxed whitespace-pre-wrap ${
            open ? "" : "max-h-24 overflow-hidden"
          }`}
        >
          {parts.map((part, i) =>
            part.fill ? (
              <mark
                key={i}
                className="rounded bg-amber-500/15 px-1 font-medium text-amber-700 dark:text-amber-400"
              >
                {part.text}
              </mark>
            ) : part.filled ? (
              <span key={i} className="text-foreground font-medium">
                {part.text}
              </span>
            ) : (
              <span key={i}>{part.text}</span>
            )
          )}
        </p>
        {!open && (
          <button
            type="button"
            className="from-card via-card/80 text-muted-foreground hover:text-foreground absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t to-transparent px-3.5 pt-10 pb-3 text-left text-[12.5px] font-medium"
            onClick={() => setOpen(true)}
          >
            Show full prompt
          </button>
        )}
      </div>
    </div>
  );
}
