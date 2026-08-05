"use client";

import { useState } from "react";
import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { DataTable } from "@workspace/ui/custom/data-table";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import { useCurrentUser } from "@workspace/auth/hooks/use-user";

import { DocumentTitle } from "@/components/document-title";
import { ImportContactsDialog } from "@/components/marketing/import-contacts-dialog";
import { getInitialsFromName } from "@/lib/utils/avatar";

const PAGE_SIZE = 25;

function AddContactDialog({ children }: { children: React.ReactNode }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "" });

  const add = useMutation(
    trpc.marketing.contacts.add.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.marketing.contacts.list.queryKey(),
        });
        toast.success("Contact added.");
        setForm({ email: "", firstName: "", lastName: "" });
        setOpen(false);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
          <DialogDescription>
            Add a single subscriber to your list.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="name@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-first">First name</Label>
              <Input
                id="contact-first"
                value={form.firstName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, firstName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-last">Last name</Label>
              <Input
                id="contact-last"
                value={form.lastName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lastName: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={add.isPending || !form.email.trim()}
            onClick={() =>
              add.mutate({
                email: form.email,
                firstName: form.firstName.trim() || undefined,
                lastName: form.lastName.trim() || undefined,
              })
            }
          >
            {add.isPending ? "Adding…" : "Add contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MarketingContactsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search.trim(), 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useQuery(
    trpc.marketing.contacts.list.queryOptions(
      {
        search: debouncedSearch || undefined,
        status:
          statusFilter === "all"
            ? undefined
            : (statusFilter as "subscribed" | "unsubscribed"),
        page,
        limit: PAGE_SIZE,
      },
      { enabled: !!currentUser, placeholderData: keepPreviousData }
    )
  );

  const remove = useMutation(
    trpc.marketing.contacts.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.marketing.contacts.list.queryKey(),
        });
        toast.success("Contact removed.");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const contacts = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isEmpty = !isLoading && total === 0;
  const isFilteredEmpty =
    isEmpty && (!!debouncedSearch || statusFilter !== "all");

  return (
    <div className="space-y-6">
      <DocumentTitle title="Contacts" />
      <div>
        <Link
          href="/marketing"
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <ArrowLeft className="size-4" />
          Marketing
        </Link>
        <h2 className="text-[27px] font-extrabold tracking-tight">Contacts</h2>
        <p className="text-muted-foreground mt-1 text-[14.5px]">
          {data
            ? `${data.subscribed} subscribed of ${total} total contacts.`
            : "The people your campaigns go to."}
        </p>
      </div>

      {error ? (
        <div className="border-destructive/40 bg-destructive/5 rounded-lg border py-14 text-center">
          <p className="text-muted-foreground text-[14.5px]">{error.message}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Search contacts..."
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v ?? "all");
                setPage(0);
              }}
            >
              <SelectTrigger className="h-10 rounded-full px-4">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="subscribed">Subscribed</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
              </SelectContent>
            </Select>
            <AddContactDialog>
              <Button variant="outline" className="rounded-full">
                <UserPlus className="size-4" />
                Add
              </Button>
            </AddContactDialog>
            <ImportContactsDialog>
              <Button className="rounded-full">
                <Upload className="size-4" />
                Import CSV
              </Button>
            </ImportContactsDialog>
          </div>

          {isEmpty ? (
            <div className="rounded-lg border border-dashed px-6 py-14 text-center">
              <h3 className="text-[22px] font-extrabold tracking-tight">
                {isFilteredEmpty ? "No contacts match" : "No contacts yet"}
              </h3>
              <p className="text-muted-foreground mx-auto mt-2 max-w-[380px] text-[14.5px]">
                {isFilteredEmpty
                  ? "Try a different search or clear the filter."
                  : "Import a CSV of your subscribers or add contacts one by one."}
              </p>
            </div>
          ) : (
            <>
              <DataTable
                className="table-card"
                isLoading={isLoading && PAGE_SIZE}
                columns={[
                  {
                    id: "contact",
                    header: "Contact",
                    cell: ({ row }) => {
                      const fullName = [
                        row.original.firstName,
                        row.original.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <div className="flex items-center gap-3">
                          <div className="bg-muted grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold">
                            {getInitialsFromName(
                              fullName || row.original.email
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="block max-w-[240px] truncate text-sm font-medium">
                              {row.original.email}
                            </span>
                            {fullName && (
                              <span className="text-muted-foreground block max-w-[240px] truncate text-xs">
                                {fullName}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    id: "status",
                    header: "Status",
                    cell: ({ row }) => (
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
                          row.original.status === "subscribed"
                            ? "bg-status-success-bg text-status-success"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {row.original.status === "subscribed"
                          ? "Subscribed"
                          : "Unsubscribed"}
                      </span>
                    ),
                  },
                  {
                    id: "added",
                    header: "Added",
                    cell: ({ row }) => (
                      <span
                        className="text-muted-foreground text-sm whitespace-nowrap"
                        title={format(
                          new Date(row.original.createdAt),
                          "MMM d, yyyy h:mm a"
                        )}
                      >
                        {formatDistanceToNowStrict(
                          new Date(row.original.createdAt),
                          { addSuffix: true }
                        )}
                      </span>
                    ),
                  },
                  {
                    id: "actions",
                    header: () => <div className="text-right" />,
                    cell: ({ row }) => (
                      <div className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove contact"
                          disabled={remove.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            remove.mutate({ ids: [row.original.id] });
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
                data={contacts}
              />

              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  {total > 0
                    ? `Showing ${page * PAGE_SIZE + 1}–${Math.min(
                        (page + 1) * PAGE_SIZE,
                        total
                      )} of ${total}`
                    : ""}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={page === 0}
                    onClick={() => setPage((prev) => prev - 1)}
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {page + 1} / {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={page + 1 >= pageCount}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
