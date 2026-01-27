import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  Copy,
  FileKey,
  FolderLock,
  Link,
  MoreHorizontal,
  Trash,
} from "lucide-react";
import { toast } from "sonner";

import { storage } from "@/project.config";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { formatBytes } from "@workspace/ui/lib/utils";

import { queryClient, useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";

export const columns: ColumnDef<RouterOutputs["admin"]["getFiles"][number]>[] =
  [
    {
      header: "Name",
      accessorKey: "name",
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-4 text-sm">
            {row.original.contentType.includes("image") &&
              row.original.isPublic && (
                <img
                  src={`${row.original.url}`}
                  alt={row.original.name}
                  className="size-7 shrink-0 rounded-md object-cover"
                />
              )}
            <p className="max-w-48 truncate text-sm">{row.original.name}</p>
            {!row.original.isPublic && (
              <div className="text-destructive ml-auto">
                <FolderLock size={16} />
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Size",
      accessorKey: "size",
      cell: ({ row }) => {
        return (
          <div className="text-muted-foreground text-xs">
            {formatBytes(row.original.size)}
          </div>
        );
      },
    },
    {
      header: "Type",
      accessorKey: "contentType",
      cell: ({ row }) => {
        return (
          <div className="text-muted-foreground text-xs">
            {row.original.contentType}
          </div>
        );
      },
    },
    {
      header: "Created At",
      accessorKey: "createdAt",
      cell: ({ row }) => {
        return (
          <div className="text-muted-foreground text-xs">
            {row.original.createdAt
              ? format(row.original.createdAt, "MMMM d, yyyy")
              : "N/A"}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        /* eslint-disable */
        const trpc = useTRPC();
        const deleteFilesMutation = storage.useDeleteFilesMutation();
        const generatePublicUrlMutation =
          storage.useGeneratePublicUrlMutation();

        return (
          <div className="flex items-center justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem
                  onClick={() =>
                    navigator.clipboard.writeText(`${row.original.url}`)
                  }
                >
                  <Link />
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    navigator.clipboard.writeText(row.original.url)
                  }
                >
                  <Copy />
                  Copy path
                </DropdownMenuItem>
                {!row.original.isPublic && (
                  <DropdownMenuItem
                    onClick={() =>
                      generatePublicUrlMutation.mutate(
                        {
                          url: row.original.url,
                          expiresIn: 10, // 10 seconds
                        },
                        {
                          onSuccess: (data) => {
                            window.open(data, "_blank");
                          },
                          onError: (error) => {
                            toast.error(error.message);
                          },
                        }
                      )
                    }
                  >
                    <FileKey /> Generate Public URL
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    deleteFilesMutation.mutate([row.original.url], {
                      onSuccess: () => {
                        queryClient.invalidateQueries({
                          queryKey: trpc.admin.getFiles.queryKey(),
                        });
                      },
                      onError: (error) => {
                        toast.error(error.message);
                      },
                    })
                  }
                >
                  <Trash /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
