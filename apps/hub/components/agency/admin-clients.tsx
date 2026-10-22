"use client";

import { useDeferredValue, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
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

import { SearchPicker } from "@/components/agency/search-picker";

const NO_WEBSITE = "none";

// "1234567890" -> "123-456-7890"
const formatCustomerId = (id: string) =>
  id.replace(/\D/g, "").replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3");

const EMPTY = {
  email: "",
  repoId: "",
  googleAdsCustomerId: "",
  googleAdsConversionAction: "",
  leadNotifyEmail: "",
  weeklyReport: true,
};

// Admin: turn a Hub user into an agency client (one website) and wire their
// Google Ads account. Agency clients get the agency UI instead of this one.
export function AdminAgencyClients() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  const clients = useQuery(trpc.agency.admin.listClients.queryOptions());
  const projects = useQuery(trpc.cms.repos.listMine.queryOptions());

  const [userSearch, setUserSearch] = useState("");
  const userQuery = useDeferredValue(userSearch.trim());
  const users = useQuery(
    trpc.agency.admin.searchUsers.queryOptions(
      { query: userQuery },
      { placeholderData: keepPreviousData }
    )
  );

  const [adsSearch, setAdsSearch] = useState("");
  const adsAccounts = useQuery(
    trpc.agency.admin.adsAccounts.queryOptions(undefined, {
      staleTime: 5 * 60 * 1000,
      retry: false,
    })
  );
  const adsNeedle = adsSearch.trim().toLowerCase();
  const adsDigits = adsSearch.replace(/\D/g, "");
  const adsMatches = (adsAccounts.data ?? []).filter(
    (account) =>
      !adsNeedle ||
      account.name.toLowerCase().includes(adsNeedle) ||
      (adsDigits && account.id.includes(adsDigits))
  );
  const pickedAds = adsAccounts.data?.find(
    (account) => account.id === form.googleAdsCustomerId.replace(/\D/g, "")
  );
  const customerId = form.googleAdsCustomerId.replace(/\D/g, "");
  const actions = useQuery(
    trpc.agency.admin.conversionActions.queryOptions(
      { customerId },
      { enabled: customerId.length >= 10, retry: false }
    )
  );

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.agency.admin.listClients.queryKey(),
    });

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
            repoId:
              form.repoId && form.repoId !== NO_WEBSITE
                ? Number(form.repoId)
                : null,
            googleAdsCustomerId: form.googleAdsCustomerId || null,
            googleAdsConversionAction: form.googleAdsConversionAction || null,
            leadNotifyEmail: form.leadNotifyEmail,
            weeklyReport: form.weeklyReport,
          });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="client-email">Client account</Label>
          <SearchPicker
            id="client-email"
            label={form.email || null}
            placeholder="Search Hub users"
            searchPlaceholder="Email or name"
            search={userSearch}
            onSearchChange={setUserSearch}
            loading={users.isLoading}
            items={(users.data ?? []).map((user) => ({
              key: user.id,
              title: user.name || user.email,
              subtitle: user.name ? user.email : undefined,
              note: user.agencyClientId ? "Agency client" : undefined,
              selected: user.email === form.email,
              onSelect: () => set("email")(user.email),
            }))}
            empty="No Hub account matches. Have them sign up first."
          />
        </div>
        <div className="space-y-1.5">
          <Label>
            Website{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </Label>
          <Select
            items={[
              { value: NO_WEBSITE, label: "No website yet" },
              ...(projects.data ?? []).map((project) => ({
                value: String(project.repoId),
                label: `${project.owner}/${project.repo}`,
              })),
            ]}
            value={form.repoId || NO_WEBSITE}
            onValueChange={(value) => set("repoId")(String(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_WEBSITE}>No website yet</SelectItem>
              {projects.data?.map((project) => (
                <SelectItem key={project.repoId} value={String(project.repoId)}>
                  {project.owner}/{project.repo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-ads">Google Ads account</Label>
          <SearchPicker
            id="client-ads"
            label={
              form.googleAdsCustomerId
                ? pickedAds
                  ? `${pickedAds.name || "Unnamed"} · ${formatCustomerId(pickedAds.id)}`
                  : formatCustomerId(form.googleAdsCustomerId)
                : null
            }
            placeholder={
              adsAccounts.data
                ? `Pick from ${adsAccounts.data.length} accounts in your MCC`
                : "Pick a Google Ads account"
            }
            searchPlaceholder="Account name or customer ID"
            search={adsSearch}
            onSearchChange={setAdsSearch}
            loading={adsAccounts.isLoading}
            items={[
              ...(form.googleAdsCustomerId
                ? [
                    {
                      key: "none",
                      title: "No Google Ads account",
                      onSelect: () => {
                        set("googleAdsCustomerId")("");
                        set("googleAdsConversionAction")("");
                      },
                    },
                  ]
                : []),
              ...adsMatches.map((account) => ({
                key: account.id,
                title: account.name || "Unnamed account",
                subtitle: `${formatCustomerId(account.id)}${account.testAccount ? " · test" : ""}${
                  account.status && account.status !== "ENABLED"
                    ? ` · ${account.status.toLowerCase()}`
                    : ""
                }`,
                note:
                  account.usedBy && account.usedBy !== form.email
                    ? account.usedBy
                    : undefined,
                selected:
                  account.id === form.googleAdsCustomerId.replace(/\D/g, ""),
                onSelect: () => {
                  if (
                    account.id !== form.googleAdsCustomerId.replace(/\D/g, "")
                  ) {
                    set("googleAdsConversionAction")("");
                  }
                  set("googleAdsCustomerId")(account.id);
                },
              })),
            ]}
            empty={
              adsAccounts.error
                ? adsAccounts.error.message
                : "Not in your MCC yet. Type the 10-digit customer ID to add it by hand."
            }
            footer={(close) =>
              adsDigits.length === 10 &&
              !adsAccounts.data?.some((account) => account.id === adsDigits) ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    set("googleAdsCustomerId")(adsDigits);
                    set("googleAdsConversionAction")("");
                    close();
                  }}
                >
                  Use {formatCustomerId(adsDigits)}
                </Button>
              ) : null
            }
          />
          {form.googleAdsCustomerId && !pickedAds && adsAccounts.data && (
            <p className="text-muted-foreground text-[12px]">
              Not linked under your MCC yet. Send a link request from Google
              Ads; stats show once they accept.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client-action">Closed-deal conversion action</Label>
          {actions.data?.length ? (
            <Select
              value={form.googleAdsConversionAction}
              onValueChange={(value) =>
                set("googleAdsConversionAction")(String(value))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a conversion action" />
              </SelectTrigger>
              <SelectContent>
                {actions.data.map((action) => (
                  <SelectItem
                    key={action.resourceName}
                    value={action.resourceName}
                  >
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
              onChange={(event) =>
                set("googleAdsConversionAction")(event.target.value)
              }
            />
          )}
          {actions.error && (
            <p className="text-muted-foreground text-[12px]">
              {actions.error.message}
            </p>
          )}
          <p className="text-muted-foreground text-[12px]">
            Optional. The Lead gen preset on the client&apos;s Marketing &gt;
            Conversions page creates and links this for you.
          </p>
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
        <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <span>
            <span className="block text-[14px] font-medium">Weekly report email</span>
            <span className="text-muted-foreground block text-[12.5px]">
              Monday summary of leads and ad spend to the owner.
            </span>
          </span>
          <Switch
            checked={form.weeklyReport}
            onCheckedChange={(checked) =>
              setForm((current) => ({ ...current, weeklyReport: checked }))
            }
          />
        </label>
        <div className="flex items-end justify-end gap-2">
          {form !== EMPTY && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setForm(EMPTY)}
            >
              Clear
            </Button>
          )}
          <Button type="submit" disabled={upsert.isPending || !form.email}>
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
                  <div className="text-muted-foreground text-[12.5px]">
                    {client.email}
                  </div>
                </TableCell>
                <TableCell>
                  {client.repo ?? (
                    <span className="text-muted-foreground text-[13px]">
                      No website yet
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-[13px] capitalize">
                  {client.agencyPlanStatus ?? (
                    <span className="text-muted-foreground normal-case">
                      Not paid
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-[13px]">
                  {client.googleAdsCustomerId
                    ? formatCustomerId(client.googleAdsCustomerId)
                    : "Not linked"}
                  {client.googleAdsCustomerId &&
                    !client.googleAdsConversionAction && (
                      <div className="text-destructive text-[12px]">
                        No conversion action
                      </div>
                    )}
                </TableCell>
                <TableCell>
                  <code className="text-[12px]">{client.formKey}</code>
                </TableCell>
                <TableCell className="space-x-1 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={paymentLink.isPending || !client.repoId}
                    title={client.repoId ? undefined : "Link a website first"}
                    onClick={() => paymentLink.mutate({ id: client.id })}
                  >
                    Payment link
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setForm({
                        email: client.email,
                        repoId: client.repoId ? String(client.repoId) : "",
                        googleAdsCustomerId: client.googleAdsCustomerId ?? "",
                        googleAdsConversionAction:
                          client.googleAdsConversionAction ?? "",
                        leadNotifyEmail: client.leadNotifyEmail ?? "",
                        weeklyReport: client.weeklyReport,
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
                      if (
                        confirm(
                          `Remove ${client.email} as an agency client? Their leads stay saved.`
                        )
                      ) {
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
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-8 text-center"
                >
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
