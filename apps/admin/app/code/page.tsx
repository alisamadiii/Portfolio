"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Code, FileCode, Image } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Spinner } from "@workspace/ui/components/spinner";

import { useTRPC } from "@workspace/trpc/client";

import { CreateForm } from "@/components/code-editor/create-form";

export default function CodePage() {
  const trpc = useTRPC();
  const sourcesQuery = useQuery(trpc.source.read.queryOptions());

  return (
    <div className="container max-w-6xl pt-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Code</h1>

      {sourcesQuery.isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sourcesQuery.data?.map((source) => (
            <Card key={source.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Code className="h-4 w-4" />
                  {source.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {source.description && (
                  <p className="text-muted-foreground text-sm">
                    {source.description}
                  </p>
                )}
                <div className="text-muted-foreground flex gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <FileCode className="h-3 w-3" />
                    {source.files.length} files
                  </span>
                  <span className="flex items-center gap-1">
                    <Image className="h-3 w-3" />
                    {source.media.length} media
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/code/${source.id}`}>Edit</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Separator className="my-8" />
      <CreateForm />
    </div>
  );
}
