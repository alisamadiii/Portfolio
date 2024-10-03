import React from "react";

import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { allBuildFasts } from "@/.contentlayer/generated";
import Link from "next/link";
import { MenuIcon } from "lucide-react";

type Props = {
  slug: string;
};

export default function Menu({ slug }: Props) {
  return (
    <Drawer direction="left">
      <DrawerTrigger className="lg:hidden">
        <MenuIcon />
      </DrawerTrigger>
      <DrawerContent className="h-full w-1/2 rounded-none p-2">
        {allBuildFasts
          .sort((a, b) => {
            if (!a.order && !b.order) return 0;
            if (!a.order) return 1;
            if (!b.order) return -1;
            return Number(a.order) - Number(b.order);
          })
          .map((post) => (
            <Link
              href={`/build-fast/${post.slugAsParams}`}
              key={post.slugAsParams}
              className={cn("rounded-md p-1", {
                "bg-natural-300": post.slugAsParams === slug,
              })}
            >
              {post.title}
            </Link>
          ))}
      </DrawerContent>
    </Drawer>
  );
}
