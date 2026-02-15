import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { animations } from "@/animations/registry";
import { useQuery } from "@tanstack/react-query";

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
import { DateFns, Lucide, Motion, ThreeLinesDashed } from "@workspace/ui/icons";

import { useTRPC } from "@workspace/trpc/client";

import { getPackagesFromCode } from "@/lib/utils";

export const LibrariesUsedDialog = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { slug } = useParams<{ slug: string }>();
  const animation = animations[slug as keyof typeof animations];

  const trpc = useTRPC();
  const filesQuery = useQuery(
    trpc.motion.getFiles.queryOptions(
      { sourceId: animation.id },
      { enabled: !!animation.id }
    )
  );

  const packages = getPackagesFromCode(
    filesQuery.data?.map((file) => file.content).join("\n") ?? ""
  );

  return (
    <Dialog>
      <DialogTrigger>{children}</DialogTrigger>
      <DialogContent
        overlayClassName="z-200"
        showCloseButton={false}
        className="sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>Libraries Used</DialogTitle>
          <DialogDescription>
            Here are the libraries used in the animation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {packages.map((p) =>
            p.link ? (
              <Link
                key={p.name}
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-muted shadow-card flex h-24 flex-col items-center justify-center rounded-xl transition-all duration-200 hover:brightness-98 active:scale-98"
              >
                <div className="flex size-12 items-center justify-center *:[svg]:size-full">
                  {LIBRARY_LOGOS?.[p.name as keyof typeof LIBRARY_LOGOS] || (
                    <ThreeLinesDashed />
                  )}
                </div>
                <code className="text-muted-foreground text-sm">{p.name}</code>
              </Link>
            ) : (
              <div
                key={p.name}
                className="bg-muted/50 shadow-card flex h-24 flex-col items-center justify-center rounded-xl"
              >
                <div className="flex size-12 items-center justify-center *:[svg]:size-full">
                  {LIBRARY_LOGOS?.[p.name as keyof typeof LIBRARY_LOGOS] || (
                    <ThreeLinesDashed />
                  )}
                </div>
                <code className="text-muted-foreground text-sm">{p.name}</code>
              </div>
            )
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const LIBRARY_LOGOS = {
  motion: <Motion />,
  "lucide-react": <Lucide />,
  "date-fns": <DateFns />,
};
