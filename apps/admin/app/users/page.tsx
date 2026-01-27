"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useDebounce } from "@uidotdev/usehooks";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
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
import { Separator } from "@workspace/ui/components/separator";
import { DataTable } from "@workspace/ui/custom/data-table";
import { TabLineAnimate } from "@workspace/ui/custom/tab-line-animate";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";
import type { RouterOutputs } from "@workspace/trpc/routers/_app";

import { Content } from "@/components/content-admin";
import { CreateUser } from "@/components/users/create-user";

import { columns } from "./columns";

type UserFromAPI = RouterOutputs["admin"]["users"]["getAll"][number];

interface FilterUsers {
  page?: number;
  limit?: number;
  sortBy?: "email" | "created" | "banned";
  search?: string;
}

const sortByOptions: FilterUsers["sortBy"][] = ["email", "created", "banned"];

const UsersPage = () => {
  const [sortBy, setSortBy] = useQueryState(
    "sortBy",
    parseAsString.withDefault("created")
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
    trpc.admin.users.getAll.queryOptions({
      page,
      limit,
      sortBy: sortBy as FilterUsers["sortBy"],
      search,
    })
  );
  const { data: usersCount } = useQuery(
    trpc.admin.users.getCount.queryOptions()
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
  });

  return (
    <Content>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Users</h1>
      <TabLineAnimate
        tabs={[
          { label: "All", value: "all" },
          { label: "Invitations", value: "invitations" },
        ]}
        className="mb-8"
      />
      <div className="mb-4 flex items-center gap-2">
        <InputGroup className="w-full max-w-48">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="font-medium">
              Sort by:{" "}
              <span className="capitalize">{sortBy?.replace("_", " ")}</span>{" "}
              <ChevronDown data-arrow />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40" align="start">
            {sortByOptions.map((item) => (
              <DropdownMenuItem
                key={item}
                onClick={() => {
                  setSortBy(item as string);
                }}
                className="cursor-pointer text-sm font-medium"
                data-checked={sortBy === item}
              >
                <span className="capitalize">{item?.replace("_", " ")}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <CreateUser />
      </div>
      <DataTable
        isLoading={isPending}
        table={table}
        error={error}
        onRowClick={(row) => router.push(`/users/${row.original.id}`)}
      />
      <div
        className={cn(
          "bg-muted text-muted-foreground -mt-3 flex items-center justify-between rounded-b-xl p-4 pt-7 text-xs",
          search.length > 0 && "hidden"
        )}
      >
        <div className="flex items-center">
          {page * limit - limit + 1}-
          {Math.min(page * limit, usersCount?.[0]?.count ?? 0)} of{" "}
          {usersCount?.[0]?.count ?? 0}{" "}
          <Separator className="h-5! mx-2" orientation="vertical" /> Results per
          page{" "}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2">
                {limit} <ChevronDown data-arrow />
              </Button>
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
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft />
          </Button>
          <p className="mx-2 tabular-nums">
            <span className="text-foreground">{page}</span> /{" "}
            {Math.ceil((usersCount?.[0]?.count ?? 0) / limit)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === Math.ceil((usersCount?.[0]?.count ?? 0) / limit)}
          >
            <ChevronRight />
          </Button>
        </div>
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
