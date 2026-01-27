import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BadgeCheck, BadgeX, Mail, MoreHorizontal } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@workspace/ui/components/table";

import { useTRPC } from "@workspace/trpc/client";
import { useUpdateAdminUser } from "@workspace/auth/hooks/use-admin";

export const EmailAddresses = () => {
  const { id } = useParams<{ id: string }>();
  const trpc = useTRPC();
  const { data: user } = useQuery(
    trpc.admin.users.getById.queryOptions(id, {
      enabled: !!id,
    })
  );

  const updateAdminUser = useUpdateAdminUser();

  if (!user) return null;

  return (
    <Table>
      <TableBody>
        <TableRow className="text-muted-foreground">
          <TableCell className="flex items-center gap-2">
            <Mail size={14} /> {user.email}{" "}
            <span>
              {user.emailVerified ? (
                <BadgeCheck
                  size={16}
                  strokeWidth={2.3}
                  className="text-green-600"
                />
              ) : (
                <BadgeX size={16} className="text-red-600" />
              )}
            </span>
          </TableCell>
          <TableCell className="text-xs">
            added {format(user.createdAt, "MMM d, yyyy")}
          </TableCell>
          <TableCell className="flex items-center justify-end text-xs">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem
                  onClick={() =>
                    updateAdminUser.mutate({
                      id,
                      emailVerified: !user.emailVerified,
                    })
                  }
                >
                  Mark as {user.emailVerified ? "unverified" : "verified"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  Remove email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};
