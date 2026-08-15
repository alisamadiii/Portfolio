"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronRight, Code, FileCode, Plus } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";

import { CreateForm } from "@/components/code-editor/create-form";
import { Content } from "@/components/content-admin";

export default function CodePage() {
  const trpc = useTRPC();
  const sourcesQuery = useQuery(trpc.sources.list.queryOptions());

  return (
    <Content>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight">Code</h1>
          <span className="text-num text-muted-foreground text-xs">
            {sourcesQuery.data?.length ?? ""}
          </span>
        </div>
        <Dialog>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus /> New source
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New source</DialogTitle>
            </DialogHeader>
            <CreateForm />
          </DialogContent>
        </Dialog>
      </div>

      {sourcesQuery.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sourcesQuery.data?.map((source) => (
            <Link
              key={source.id}
              href={`/code/${source.id}`}
              className="group bg-card hover:border-ring/40 flex flex-col gap-2 rounded-2xl border p-5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Code className="text-muted-foreground size-4" />
                <span className="text-num truncate text-sm font-medium">
                  {source.title}
                </span>
                <ChevronRight className="text-muted-foreground ml-auto size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              {source.description && (
                <p className="text-muted-foreground line-clamp-2 text-xs">
                  {source.description}
                </p>
              )}
              <div className="text-muted-foreground mt-auto flex items-center justify-between pt-2 text-xs">
                <span className="text-num flex items-center gap-1">
                  <FileCode className="size-3" />
                  {source.files.length} files
                </span>
                {source.updatedAt && (
                  <span className="text-num">
                    {format(source.updatedAt, "MMM d, yyyy")}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Content>
  );
}
