import { useMutation } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

import { queryClient, useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { FormattedJSON } from "@/components/json-format";

export const paymentColumns: ColumnDef<
  RouterOutputs["payments"]["getProducts"][number]
>[] = [
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
    header: "Slug",
    accessorKey: "slug",
  },
  {
    header: "isPopular",
    accessorKey: "popular",
    cell: ({ row }) => {
      /* eslint-disable */
      const updateProduct = useMutation(
        useTRPC().payments.updateProduct.mutationOptions({
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: useTRPC().payments.getProducts.queryKey(),
            });
          },
        })
      );
      /* eslint-enable */

      return (
        <Select
          defaultValue={row.original.popular ? "true" : "false"}
          onValueChange={(value) => {
            console.log({
              product: {
                popular: value === "true",
              },
            });
            updateProduct.mutate({
              id: row.original.id,
              product: {
                popular: value === "true",
              },
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a popular" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
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
    header: "Interval Count",
    accessorKey: "trialIntervalCount",
  },
  {
    header: "Trial Interval",
    accessorKey: "trialInterval",
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
