import { ColumnDef } from "@tanstack/react-table";
import { format, formatDistanceToNow } from "date-fns";
import { Braces } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { design } from "@workspace/ui/lib/design";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { FormattedJSON } from "@/components/json-format";

function getProjectColor(metadata: unknown): string | undefined {
  const project = (metadata as { project?: string })?.project;
  if (project === "MOTION") return design.motion.color;
  if (project === "AGENCY") return design.agency.color;
  return undefined;
}

export const paymentColumns: ColumnDef<
  RouterOutputs["products"]["getAll"][number]
>[] = [
  {
    id: "project",
    header: "",
    cell: ({ row }) => {
      const color = getProjectColor(row.original.metadata);
      return (
        <span
          className="block size-3 rounded-full"
          style={{ backgroundColor: color ?? design.default.color }}
        />
      );
    },
    size: 40,
  },
  {
    header: "Product ID",
    accessorKey: "productId",
    cell: ({ row }) => {
      return <Badge>{row.original.id}</Badge>;
    },
  },
  {
    header: "Name",
    accessorKey: "name",
  },
  {
    header: "Price",
    accessorKey: "price",
    cell: ({ row }) => {
      return (
        <Badge className="bg-blue-500">${row.original.priceAmount / 100}</Badge>
      );
    },
  },
  {
    header: "Is Recurring",
    accessorKey: "isRecurring",
    cell: ({ row }) => {
      return <Badge>{row.original.isRecurring ? "Yes" : "No"}</Badge>;
    },
  },
  {
    header: "Created At",
    accessorKey: "createdAt",
    cell: ({ row }) => {
      if (!row.original.createdAt) return null;
      return <div>{format(row.original.createdAt, "MM/dd/yyyy hh:mm a")}</div>;
    },
  },
  {
    header: "Updated At",
    accessorKey: "updatedAt",
    cell: ({ row }) => {
      if (!row.original.updatedAt) return null;
      return <div>{formatDistanceToNow(row.original.updatedAt)} ago</div>;
    },
  },
  {
    id: "action",
    cell: ({ row }) => {
      return (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" data-sticky-element>
              <Braces />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Product Details</DialogTitle>
            </DialogHeader>
            <FormattedJSON data={row.original} />
          </DialogContent>
        </Dialog>
      );
    },
  },
];
