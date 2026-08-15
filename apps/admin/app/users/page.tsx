"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useDebounce } from "@uidotdev/usehooks";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { AdminDataTable } from "@/components/admin-table";
import { Content } from "@/components/content-admin";
import { CreateUser } from "@/components/users/create-user";

import { columns, type UsersTableMeta } from "./columns";

type UserFromAPI = RouterOutputs["users"]["list"][number];

interface FilterUsers {
  page?: number;
  limit?: number;
  sortBy?: "email" | "created" | "banned";
  filterBy?: "all" | "admin";
  search?: string;
}

const filterByOptions: { label: string; value: FilterUsers["filterBy"] }[] = [
  { label: "All Users", value: "all" },
  { label: "Admins", value: "admin" },
];

/** Compact page list: 1 2 … n-1 n with a window around the current page. */
const pageItems = (current: number, total: number): (number | "…")[] => {
  if (total <= 7)
    return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, 2, current - 1, current, current + 1, total - 1, total]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const items: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) items.push("…");
    items.push(p);
  });
  return items;
};

const UsersPage = () => {
  const [sortBy, setSortBy] = useQueryState(
    "sortBy",
    parseAsString.withDefault("created")
  );
  const [filterBy, setFilterBy] = useQueryState(
    "filterBy",
    parseAsString.withDefault("all")
  );

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [limit, setLimit] = useQueryState(
    "limit",
    parseAsInteger.withDefault(10)
  );
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault("")
  );

  const router = useRouter();

  const debouncedSearchTerm = useDebounce(search, 300);

  const trpc = useTRPC();
  const {
    data: users,
    isPending,
    error,
  } = useQuery(
    trpc.users.list.queryOptions({
      page,
      limit,
      sortBy: sortBy as FilterUsers["sortBy"],
      filterBy: filterBy as FilterUsers["filterBy"],
      search,
    })
  );
  const { data: usersCount } = useQuery(
    trpc.users.count.queryOptions({
      filterBy: filterBy as FilterUsers["filterBy"],
    })
  );

  useEffect(() => {
    if (debouncedSearchTerm.length > 0) {
      setPage(1);
    }
  }, [debouncedSearchTerm, setPage]);

  /* eslint-disable-next-line react-hooks/incompatible-library */
  const table = useReactTable<UserFromAPI>({
    data: users || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize: limit,
      },
    },
    meta: {
      sortBy,
      toggleSort: (key) => {
        setSortBy(key);
        setPage(1);
      },
    } as UsersTableMeta,
  });

  const total = usersCount?.[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <Content>
      <div className="bg-card rounded-2xl border p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-base font-semibold">Users</h1>
            <span className="text-num text-muted-foreground text-xs">
              {total}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <InputGroup className="h-9 w-full max-w-56 rounded-lg">
              <InputGroupAddon>
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search users…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="h-9 rounded-lg" />
                }
              >
                <span className="text-muted-foreground">Filter</span>
                <span className="capitalize">
                  {filterByOptions.find((f) => f.value === filterBy)?.label ??
                    "All Users"}
                </span>{" "}
                <ChevronDown data-arrow />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40" align="end">
                {filterByOptions.map((item) => (
                  <DropdownMenuItem
                    key={item.value}
                    onClick={() => {
                      setFilterBy(item.value as string);
                      setPage(1);
                    }}
                    className="cursor-pointer text-sm font-medium"
                    data-checked={filterBy === item.value}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <CreateUser />
          </div>
        </div>
        <AdminDataTable
          isLoading={isPending}
          table={table}
          error={error}
          rowClassName={() => "group/row"}
          onRowClick={(row) => router.push(`/users/${row.original.id}`)}
          footer={
            search.length > 0 ? undefined : (
              <>
                <div className="flex items-center gap-2.5">
                  <span className="text-num">
                    {total === 0 ? 0 : page * limit - limit + 1}–
                    {Math.min(page * limit, total)} of {total}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-num h-6 px-2 text-xs"
                        />
                      }
                    >
                      {limit} <ChevronDown data-arrow />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-20">
                      {[10, 15, 20, 100].map((item) => (
                        <DropdownMenuItem
                          key={item}
                          onClick={() => {
                            setLimit(item);
                            setPage(1);
                          }}
                          data-checked={limit === item}
                        >
                          {item}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="size-3.5" /> Prev
                  </Button>
                  {pageItems(page, Math.max(totalPages, 1)).map((item, i) =>
                    item === "…" ? (
                      <span key={`gap-${i}`} className="text-num px-1">
                        …
                      </span>
                    ) : (
                      <Button
                        key={item}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "text-num size-7 p-0 text-xs",
                          item === page && "bg-accent text-foreground"
                        )}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </Button>
                    )
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                  >
                    Next <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </>
            )
          }
        />
      </div>
    </Content>
  );
};

const Page = () => {
  return (
    <Suspense>
      <UsersPage />
    </Suspense>
  );
};

export default Page;
