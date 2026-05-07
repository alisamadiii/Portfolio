"use client";

import Link from "next/link";
import { ArrowLeft, FolderOpen, GitBranch } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

interface Project {
  id: string;
  name: string;
  repoOwner: string;
  repoName: string;
  status: "active" | "paused" | "archived";
  updatedAt: string | Date;
}

export const ProjectSelector = ({ projects }: { projects: Project[] }) => {
  if (projects.length === 0) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4">
        <FolderOpen className="text-muted-foreground size-12" />
        <h2 className="text-lg font-semibold">No projects yet</h2>
        <p className="text-muted-foreground text-sm">
          Contact your developer to set up your first project.
        </p>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back to home
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Your Projects</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Select a project to open the editor
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.id} href={`/${project.id}`}>
            <Card className="hover:border-primary/50 cursor-pointer transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <Badge
                    variant={
                      project.status === "active"
                        ? "default"
                        : project.status === "paused"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {project.status}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-1.5">
                  <GitBranch className="size-3.5" />
                  {project.repoOwner}/{project.repoName}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
