"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Lock } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Spinner } from "@workspace/ui/components/spinner";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { DataTable } from "@workspace/ui/custom/data-table";
import { RequestDialog } from "@workspace/ui/custom/request-dialog";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { getColumns, type Task } from "./columns";

const CLICKUP_FORM_URL =
  "https://forms.clickup.com/90141012131/f/2kyd5c53-274/29BFCEPFWYVA2TSXM4";

const TYPE_OPTIONS = [
  "Bug",
  "Content Update",
  "New Feature",
  "Design Change",
  "SEO",
  "Integration",
  "Security",
  "Other",
];

const selectTriggerClass = "h-10 rounded-full px-4 capitalize";

export default function RequestsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const isClient = !!user.data?.user.isClient;
  const tasksQuery = useQuery({
    ...trpc.clickup.getTasks.queryOptions(),
    enabled: isClient,
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const updateStatus = useMutation(
    trpc.clickup.updateTaskStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.clickup.getTasks.queryKey(),
        });
      },
    })
  );

  const tasks = tasksQuery.data?.tasks ?? [];

  const columns = useMemo(
    () =>
      getColumns({
        pendingTaskId: updateStatus.isPending
          ? updateStatus.variables?.taskId
          : undefined,
        onToggleIgnored: (task: Task) =>
          updateStatus.mutate({
            taskId: task.id,
            status:
              task.status.toLowerCase() === "ignored" ? "TO DO" : "IGNORED",
          }),
      }),
    [updateStatus]
  );

  const statusOptions = useMemo(
    () => [...new Set(tasks.map((t) => t.status))],
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }
    return result.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }, [tasks, statusFilter, typeFilter]);

  const formUrl =
    CLICKUP_FORM_URL && user.data
      ? `${CLICKUP_FORM_URL}?User%20Id%20(Don't%20update)=${encodeURIComponent(user.data.user.id)}&Priority=2&Type=Bug&Status=TO%20DO`
      : CLICKUP_FORM_URL;

  if (user.isPending) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (user.data && !isClient) {
    return (
      <div className="space-y-6">
        <h2 className="text-[27px] font-extrabold tracking-tight">
          Request a Change
        </h2>
        <div className="rounded-lg border border-dashed px-6 py-14 text-center">
          <div className="bg-muted text-muted-foreground mx-auto grid size-12.5 place-items-center rounded-[14px]">
            <Lock className="size-6" />
          </div>
          <h3 className="mt-4.5 text-[22px] font-extrabold tracking-tight">
            Available to active clients
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 mb-5.5 max-w-[420px] text-[14.5px] leading-relaxed">
            AI Requests lets you send website changes straight to our AI
            assistant — bugs, copy edits, new features. It unlocks once you have
            an active agency plan.
          </p>
          <RequestDialog>
            <Button size="lg" className="rounded-full px-6">
              Contact Support
            </Button>
          </RequestDialog>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-11">
      {/* Submit Request via ClickUp Form */}
      <section className="space-y-6">
        <div className="space-y-3.5">
          <h2 className="text-[27px] font-extrabold tracking-tight">
            Request a Change
          </h2>
          <div className="text-muted-foreground max-w-[680px] space-y-3 text-[14.5px] leading-relaxed">
            <p>
              Need something updated on your website? Report a bug, request a
              new feature, or ask for content changes. Describe what you need
              and our AI assistant will handle it automatically — no waiting, no
              back and forth.
            </p>
            <p>
              You can include screenshots or images to help explain what you
              need. Just attach them in the form.
            </p>
            <p>
              Changes are not applied instantly. Every day at 8:00 AM PST, our
              AI processes all pending requests and generates a preview. At 8:30
              AM, each change is manually reviewed — once approved, it goes live
              to production.
            </p>
          </div>
        </div>

        {formUrl ? (
          <Dialog>
            <DialogTrigger
              render={<Button size="lg" className="rounded-full px-6" />}
            >
              <Bot className="mr-2 size-5" />
              Submit a Request
            </DialogTrigger>
            <DialogContent className="md:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Submit a Request</DialogTitle>
                <DialogDescription>
                  Describe the change you want in plain language. Be specific —
                  mention which page, section, or element needs updating.
                  Include screenshots if possible.
                </DialogDescription>
              </DialogHeader>
              <iframe
                key={formUrl}
                src={formUrl}
                width="100%"
                height="600"
                className="rounded-md"
                style={{ border: "none" }}
              />
            </DialogContent>
          </Dialog>
        ) : (
          <p className="text-muted-foreground text-sm">
            Request form is not configured yet.
          </p>
        )}
      </section>

      {/* Request History */}
      <section className="space-y-4.5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-extrabold tracking-tight">
            Request History
          </h2>
          <div className="ml-auto flex items-center gap-2.5">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v ?? "all")}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v ?? "all")}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TooltipProvider delay={0}>
          <DataTable
            className="table-card"
            columns={columns}
            data={filteredTasks}
            isLoading={tasksQuery.isPending}
            error={tasksQuery.error}
          />
        </TooltipProvider>
      </section>
    </div>
  );
}
