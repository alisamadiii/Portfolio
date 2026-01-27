import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import { UAParser } from "ua-parser-js";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@workspace/ui/components/table";
import { Laptop, Phone } from "@workspace/ui/icons";

import { useTRPC } from "@workspace/trpc/client";
import { RouterOutputs } from "@workspace/trpc/routers/_app";
import { useRevokeSession } from "@workspace/auth/hooks/use-user";

export const Devices = () => {
  const { id } = useParams<{ id: string }>();

  const trpc = useTRPC();
  const { data: user } = useQuery(
    trpc.admin.users.getById.queryOptions(id, {
      enabled: !!id,
    })
  );
  const { data: sessions } = useQuery(
    trpc.sessions.getSessions.queryOptions(id, {
      enabled: !!id,
    })
  );

  if (!user) return null;

  if (sessions?.length === 0) return <div>No devices found</div>;

  return (
    <div>
      <Table>
        <TableBody>
          {sessions?.map((session) => (
            <EachSessions key={session.id} session={session} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

function EachSessions({
  session,
}: {
  session: RouterOutputs["sessions"]["getSessions"][number];
}) {
  const parser = new UAParser();
  const result = parser.setUA(session.userAgent ?? "").getResult();

  const revokeSession = useRevokeSession();

  return (
    <TableRow key={session.id}>
      <TableCell className="flex items-center gap-3">
        {result.device.type === "mobile" ? <Phone /> : <Laptop />}
        <div>
          <p className="text-sm font-medium">{result.os.name}</p>
          <p className="text-muted-foreground text-xs">
            {result.browser.name} {result.browser.version}
          </p>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {formatDistanceToNow(session.createdAt, { addSuffix: true })}
      </TableCell>
      <TableCell className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => revokeSession.mutate(session.id)}
            >
              Revoke
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
