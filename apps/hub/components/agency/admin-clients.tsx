"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { useTRPC } from "@workspace/trpc/client";

const EMPTY = {
  email: "",
  repoId: "",
  googleAdsCustomerId: "",
  googleAdsConversionAction: "",
  leadNotifyEmail: "",
};

// Admin: turn a Hub user into an agency client (one website) and wire their
// Google Ads account. Agency clients get the agency UI instead of this one.
export function AdminAgencyClients() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  const clients = useQuery(trpc.agency.admin.listClients.queryOptions());
  const projects = useQuery(trpc.cms.repos.listMine.queryOptions());
  const customerId = form.googleAdsCustomerId.replace(/\D/g, "");
  const actions = useQuery(
    trpc.agency.admin.conversionActions.queryOptions(
      { customerId },
      { enabled: customerId.length >= 10, retry: false }
    )
  );

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.agency.admin.listClients.queryKey() });

  const upsert = useMutation(
    trpc.agency.admin.upsertClient.mutationOptions({
      onSuccess: () => {
        toast.success("Agency client saved.");
        setForm(EMPTY);
        refresh();
      },
      onError: (error) => toast.error(error.message),
    })
  );
  const remove = useMutation(
    trpc.agency.admin.removeClient.mutationOptions({
      onSuccess: refresh,
      onError: (error) => toast.error(error.message),
    })
  );

  const paymentLink = useMutation(
    trpc.agency.admin.createPaymentLink.mutationOptions({
      onSuccess: async ({ url }) => {
        // The clipboard can refuse after an await; the toast still shows the link.
        const copied = await navigator.clipboard.writeText(url).then(
          () => true,
          () => false
        );
        toast.success(copied ? "Payment link copied." : "Payment link ready.", {
          description: url,
          duration: 15000,
        });
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-6">
      <form
        className="bg-card grid gap-4 rounded-lg border p-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          upsert.mutate({
            email: form.email,
            repoId: Number(form.repoId),
            googleAdsCustomerId: form.googleAdsCustomerId || null,
            googleAdsConversionAction: form.googleAdsConversionAction || null,
            leadNotifyEmail: form.leadNotifyEmail,
          });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="client-email">Client account email</Label>
          <Input
            id="client-email"
            type="email"
            required
            value={form.email}
            onChange={(event) => set("email")(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Website</Label>
          <Select value={form.repoId} onValueChange={(value) => set("repoId")(String(value))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a website" />
            </SelectTrigger>
            <SelectContent>
              {projects.data?.map((project) => (
                <SelectItem key={project.repoId} value={String(project.repoId)}>
                  {project.owner}/{project.repo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-ads">Google Ads customer ID</Label>
          <Input
            id="client-ads"
            placeholder="123-456-7890"
            value={form.googleAdsCustomerId}
            onChange={(event) => set("googleAdsCustomerId")(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-action">Closed-deal conversion action</Label>
          {actions.data?.length ? (
            <Select
              value={form.googleAdsConversionAction}
              onValueChange={(value) => set("googleAdsConversionAction")(String(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a conversion action" />
              </SelectTrigger>
              <SelectContent>
                {actions.data.map((action) => (
                  <SelectItem key={action.resourceName} value={action.resourceName}>
                    {action.name} ({action.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="client-action"
              placeholder="customers/123/conversionActions/456"
              value={form.googleAdsConversionAction}
              onChange={(event) => set("googleAdsConversionAction")(event.target.value)}
            />
          )}
          {actions.error && (
            <p className="text-muted-foreground text-[12px]">{actions.error.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-notify">New-lead email (optional)</Label>
          <Input
            id="client-notify"
            type="email"
            placeholder="Defaults to the account email"
            value={form.leadNotifyEmail}
            onChange={(event) => set("leadNotifyEmail")(event.target.value)}
          />
        </div>
        <div className="flex items-end justify-end gap-2">
          {form !== EMPTY && (
            <Button type="button" variant="ghost" onClick={() => setForm(EMPTY)}>
              Clear
            </Button>
          )}
          <Button type="submit" disabled={upsert.isPending || !form.repoId}>
            Save client
          </Button>
        </div>
      </form>

      <div className="bg-card overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Google Ads</TableHead>
              <TableHead>Form key</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.data?.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <div className="font-medium">{client.name}</div>
                  <div className="text-muted-foreground text-[12.5px]">{client.email}</div>
                </TableCell>
                <TableCell>{client.repo}</TableCell>
                <TableCell className="text-[13px] capitalize">
                  {client.agencyPlanStatus ?? (
                    <span className="text-muted-foreground normal-case">Not paid</span>
                  )}
                </TableCell>
                <TableCell className="text-[13px]">
                  {client.googleAdsCustomerId ?? "Not linked"}
                  {client.googleAdsCustomerId && !client.googleAdsConversionAction && (
                    <div className="text-destructive text-[12px]">No conversion action</div>
                  )}
                </TableCell>
                <TableCell>
                  <code className="text-[12px]">{client.formKey}</code>
                </TableCell>
                <TableCell className="space-x-1 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={paymentLink.isPending}
                    onClick={() => paymentLink.mutate({ repoId: client.repoId })}
                  >
                    Payment link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setForm({
                        email: client.email,
                        repoId: String(client.repoId),
                        googleAdsCustomerId: client.googleAdsCustomerId ?? "",
                        googleAdsConversionAction: client.googleAdsConversionAction ?? "",
                        leadNotifyEmail: client.leadNotifyEmail ?? "",
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (confirm(`Remove ${client.email} as an agency client? Their leads stay saved.`)) {
                        remove.mutate({ id: client.id });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {clients.data && !clients.data.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                  No agency clients yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
