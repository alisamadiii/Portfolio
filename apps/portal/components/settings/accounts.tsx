import React from "react";
import { useQuery } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Github } from "@workspace/ui/icons/social";

import { authClient } from "@workspace/auth/auth-client";

const providerConfig: Record<string, { label: string; icon: React.ReactNode }> =
  {
    credential: {
      label: "Email & Password",
      icon: <KeyRound className="size-5" />,
    },
    github: {
      label: "GitHub",
      icon: <Github className="size-5" />,
    },
    google: {
      label: "Google",
      icon: (
        <svg className="size-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      ),
    },
  };

export const Accounts = () => {
  const { data: accounts, isPending } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const accounts = await authClient.listAccounts();

      return accounts;
    },
  });

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="card-head">
        <CardTitle className="font-bold">Connected accounts</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {isPending
          ? Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="mx-5.5 my-3 h-12" />
            ))
          : accounts?.data?.map((account) => {
              const config = providerConfig[account.providerId] ?? {
                label: account.providerId,
                icon: <KeyRound className="size-5" />,
              };
              return (
                <div
                  key={account.id}
                  className="border-rule flex items-center gap-3.5 border-b px-5.5 py-4.5 last:border-b-0"
                >
                  <div className="bg-muted/60 text-secondary-foreground border-border flex size-9.5 items-center justify-center rounded-[12px] border">
                    {config.icon}
                  </div>
                  <span className="flex-1 text-[14.5px] font-semibold">
                    {config.label}
                  </span>
                  <Badge className="bg-status-success-bg text-status-success gap-1.5 rounded-full border-transparent px-3 py-1 text-[12.5px] font-semibold">
                    <span className="bg-status-success size-1.5 rounded-full" />
                    Connected
                  </Badge>
                </div>
              );
            })}
      </CardContent>
    </Card>
  );
};
