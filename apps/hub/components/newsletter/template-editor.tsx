"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, LayoutTemplate } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { Padded } from "@/components/ds/layout/padded";
import { Card } from "@/components/ds/ui/card";
import { Field, Input } from "@/components/ds/ui/field";
import { EmptyState } from "@/components/ds/ui/misc";

import { EmailEditor, SaveStatus, useAutosave } from "./email-editor";
import { useNewsletter } from "./use-newsletter";

type Template = RouterOutputs["newsletter"]["templates"]["get"];

/** /newsletter/templates/[id]: name, default subject and the design. Autosaves. */
export function TemplatePage({ templateId }: { templateId: string }) {
  const trpc = useTRPC();
  const { projectId, base } = useNewsletter();
  const template = useQuery(trpc.newsletter.templates.get.queryOptions({ projectId, templateId }));

  if (template.error) {
    return (
      <Padded>
        <Card>
          <EmptyState
            icon={<LayoutTemplate className="size-5" />}
            title="Template not found"
            text={template.error.message}
            action={<Link href={`${base}?tab=templates`} className="text-[13px] font-medium text-coral-text">Back to templates</Link>}
          />
        </Card>
      </Padded>
    );
  }
  if (!template.data) return <Padded><Card className="h-40 animate-pulse" /></Padded>;
  return <TemplateEditor template={template.data} />;
}

function TemplateEditor({ template }: { template: Template }) {
  const trpc = useTRPC();
  const { projectId, base, canWrite } = useNewsletter();
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject);
  const update = useMutation(trpc.newsletter.templates.update.mutationOptions());
  const autosave = useAutosave<{ name?: string; subject?: string; content?: string }>((patch) =>
    update.mutateAsync({ projectId, templateId: template.id, ...patch })
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-2.5 sm:px-6">
        <Link href={`${base}?tab=templates`} className="inline-flex items-center gap-1.5 text-[13px] text-dim hover:text-ink">
          <ArrowLeft className="size-3.5" />
          Templates
        </Link>
        <span className="text-faint">/</span>
        <h1 className="min-w-0 truncate text-base font-semibold">{name || "Untitled"}</h1>
        <div className="ml-auto">
          <SaveStatus saving={autosave.saving} error={autosave.error} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-canvas px-4 pb-16 pt-6 sm:px-10">
        <div className="mx-auto flex max-w-[720px] flex-col gap-4">
          <Card className="grid gap-3 p-5 sm:grid-cols-2">
            <Field label="Template name">
              <Input
                value={name}
                disabled={!canWrite}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => name.trim() && name !== template.name && autosave.queue({ name })}
              />
            </Field>
            <Field label="Default subject" optional>
              <Input
                value={subject}
                disabled={!canWrite}
                onChange={(e) => setSubject(e.target.value)}
                onBlur={() => subject !== template.subject && autosave.queue({ subject })}
              />
            </Field>
          </Card>
          <EmailEditor
            initialContent={template.content ?? null}
            readOnly={!canWrite}
            onChange={(content) => autosave.queue({ content })}
          />
        </div>
      </div>
    </div>
  );
}
