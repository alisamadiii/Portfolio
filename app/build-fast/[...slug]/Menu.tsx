"use client";

import React, { useState } from "react";

import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { allBuildFasts } from "@/.contentlayer/generated";
import { MenuIcon } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  slug: string;
};

const folders = ["ui", "react-libraries"];

export default function Menu({ slug }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Drawer direction="left" open={open} onOpenChange={setOpen}>
      <DrawerTrigger className="lg:hidden">
        <MenuIcon />
      </DrawerTrigger>
      <DrawerContent className="h-full w-full max-w-[250px] rounded-none p-2">
        {allBuildFasts
          .filter((post) => post.folder === "build-fast")
          .sort((a, b) => {
            if (!a.order && !b.order) return 0;
            if (!a.order) return 1;
            if (!b.order) return -1;
            return Number(a.order) - Number(b.order);
          })
          .map((post) => (
            <DrawerClose
              key={post.slugAsParams}
              onClick={() => router.push(`/build-fast/${post.slugAsParams}`)}
              className={cn("rounded-md p-1 text-start", {
                "bg-neutral-200": post.slugAsParams === slug,
              })}
            >
              {post.title}
            </DrawerClose>
          ))}

        {folders.map((folder) => (
          <div key={folder} className="mb-4 flex flex-col gap-1">
            <span className="text-sm capitalize text-natural-500">
              {folder.replace("-", " ")}
            </span>
            {allBuildFasts
              .filter((post) => post.folder === folder)
              .map((post) => (
                <DrawerClose
                  key={post.slugAsParams}
                  onClick={() =>
                    router.push(`/build-fast/${post.slugAsParams}`)
                  }
                  className={cn("rounded-md p-1 text-start", {
                    "bg-neutral-200": post.slugAsParams === slug,
                  })}
                >
                  {post.title}
                </DrawerClose>
              ))}
          </div>
        ))}
      </DrawerContent>
    </Drawer>
  );
}
