"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, isPast } from "date-fns";
import { Braces, Copy, ExternalLink, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Spinner } from "@workspace/ui/components/spinner";
import { DataTable } from "@workspace/ui/custom/data-table";

import { useTRPC } from "@workspace/trpc/client";

import { Content } from "@/components/content-admin";
import { ShowJSONDialog } from "@/components/show-json-dialog";

const DiscountsPage = () => {
  const discountsQuery = useQuery(useTRPC().discounts.getAll.queryOptions());

  return (
    <Content>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Discounts</h1>
      <DataTable
        error={discountsQuery.error}
        columns={[
          {
            header: "ID",
            accessorKey: "id",
            cell: ({ row }) => {
              return <Badge>{row.original.id}</Badge>;
            },
          },
          {
            header: "Code",
            accessorKey: "code",
          },
          {
            header: "Redemptions",
            accessorKey: "timesRedeemed",
            cell: ({ row }) => {
              return row.original.maxRedemptions ? (
                <span>
                  {row.original.timesRedeemed}/{row.original.maxRedemptions}
                </span>
              ) : (
                <span>{row.original.timesRedeemed}</span>
              );
            },
          },
          {
            header: "Discount",
            id: "discount",
            cell: ({ row }) => {
              const { coupon } = row.original;
              if (coupon.percentOff) return <span>{coupon.percentOff}% off</span>;
              if (coupon.amountOff)
                return (
                  <span>
                    ${(coupon.amountOff / 100).toFixed(2)} off
                  </span>
                );
              return "—";
            },
          },
          {
            header: "Active",
            accessorKey: "active",
            cell: ({ row }) => (
              <Badge variant={row.original.active ? "default" : "secondary"}>
                {row.original.active ? "Active" : "Inactive"}
              </Badge>
            ),
          },
          {
            id: "isExpired",
            cell: ({ row }) => {
              return (
                <span
                  data-table-row-expired={
                    (row.original.expiresAt &&
                      isPast(new Date(row.original.expiresAt * 1000))) ||
                    (row.original.maxRedemptions !== null &&
                      row.original.timesRedeemed >=
                        row.original.maxRedemptions)
                  }
                ></span>
              );
            },
          },
          {
            id: "json",
            cell: ({ row }) => {
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        navigator.clipboard.writeText(row.original.code ?? "");
                        toast.success("Code copied to clipboard");
                      }}
                    >
                      <Copy /> Copy Code
                    </DropdownMenuItem>
                    {/* <Link
                      href={`${process.env.NEXT_PUBLIC_POLAR_URL}/products/discounts`}
                      target="_blank"
                    >
                      <DropdownMenuItem>
                        <Pencil /> Edit Discount
                      </DropdownMenuItem>
                    </Link> */}
                    <DropdownMenuSeparator />
                    <ShowJSONDialog
                      data={row.original}
                      title="Discount Details"
                    >
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Braces /> Show Details
                      </DropdownMenuItem>
                    </ShowJSONDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            },
          },
        ]}
        data={discountsQuery.data || []}
        isLoading={discountsQuery.isPending}
      />
      <Link
        href="https://dashboard.stripe.com/coupons"
        target="_blank"
        className={buttonVariants({ className: "mt-4" })}
      >
        Manage Discounts in Stripe
        <ExternalLink />
      </Link>
    </Content>
  );
};

const Page = () => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <DiscountsPage />
    </Suspense>
  );
};

export default Page;
