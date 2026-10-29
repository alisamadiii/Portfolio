"use client";

import { useDeferredValue, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { BadgeCheck, Megaphone, TriangleAlert, Users } from "lucide-react";
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
import {
  INDUSTRIES,
  INDUSTRY_LABELS,
  type Industry,
} from "@workspace/trpc/lib/agency/negative-lists";

import { Content } from "@/components/content-admin";
import { SearchPicker } from "@/components/search-picker";
import { StatTile } from "@/components/stat-tile";
import { StatusBadge } from "@/components/status-badge";

const NO_WEBSITE = "none";
const NO_INDUSTRY = "none";

const ADS_TYPES = [
  { value: "search", label: "Search only" },
  { value: "lsa", label: "Local Services (LSA)" },
  { value: "both", label: "Search + LSA" },
] as const;

// "1234567890" -> "123-456-7890"
const formatCustomerId = (id: string) =>
  id.replace(/\D/g, "").replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3");

const EMPTY = {
  // Set while editing an existing client; null = create a new agency project.
  id: null as number | null,
  email: "",
  businessName: "",
  projectId: "",
  industry: "",
  adsType: "search",
  googleAdsCustomerId: "",
  googleAdsConversionAction: "",
  weeklyReport: true,
};

// Admin: give a project an agency workspace and wire its Google Ads account.
// One user can own several (one per business); each lives inside its project
// and the project shows the agency UI instead of the editor.
export default function AgencyClientsPage() {
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

  // Tracking summary, derived from the client list — no extra request.
  const rows = clients.data ?? [];
  const activeCount = rows.filter(
    (client) => client.agencyPlanStatus === "active"
  ).length;
  const adsLinkedCount = rows.filter(
    (client) => client.googleAdsCustomerId
  ).length;
  const needsActionCount = rows.filter(
    (client) =>
      client.googleAdsCustomerId && !client.googleAdsConversionAction
  ).length;

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

  const set = (key: Exclude<keyof typeof EMPTY, "id">) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <Content>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Agency clients</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Projects on a lead generation plan. Opening one in the Hub shows the
          agency workspace instead of the editor.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={<Users />}
          tone="violet"
          label="Total clients"
          value={rows.length}
          isLoading={clients.isPending}
        />
        <StatTile
          icon={<BadgeCheck />}
          tone="green"
          label="Active plan"
          value={activeCount}
          sub="paid"
          isLoading={clients.isPending}
        />
        <StatTile
          icon={<Megaphone />}
          tone="amber"
          label="Ads linked"
          value={adsLinkedCount}
          isLoading={clients.isPending}
        />
        <StatTile
          icon={<TriangleAlert />}
          tone="orange"
          label="Needs attention"
          value={needsActionCount}
          sub="no conversion action"
          isLoading={clients.isPending}
        />
      </div>

      <div className="space-y-6">
        <form
          className="bg-card grid gap-4 rounded-2xl border p-5 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            upsert.mutate({
              id: form.id,
              email: form.email,
              businessName: form.businessName || null,
              projectId:
                form.projectId && form.projectId !== NO_WEBSITE
                  ? form.projectId
                  : null,
              industry:
                form.industry && form.industry !== NO_INDUSTRY
                  ? (form.industry as Industry)
                  : null,
              adsType: (form.adsType || "search") as "search" | "lsa" | "both",
              googleAdsCustomerId: form.googleAdsCustomerId || null,
              googleAdsConversionAction: form.googleAdsConversionAction || null,
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
                note: user.agencyCount
                  ? `${user.agencyCount} agency ${user.agencyCount === 1 ? "project" : "projects"}`
                  : undefined,
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
                { value: NO_WEBSITE, label: "No website yet (create starter site)" },
                ...(projects.data ?? []).map((project) => ({
                  value: String(project.projectId),
                  label: `${project.owner}/${project.repo}`,
                })),
              ]}
              value={form.projectId || NO_WEBSITE}
              onValueChange={(value) => set("projectId")(String(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_WEBSITE}>
                  No website yet (create starter site)
                </SelectItem>
                {projects.data?.map((project) => (
                  <SelectItem
                    key={project.projectId}
                    value={String(project.projectId)}
                  >
                    {project.owner}/{project.repo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!form.id && (!form.projectId || form.projectId === NO_WEBSITE) && (
            <div className="space-y-1.5">
              <Label htmlFor="business-name">Business name</Label>
              <Input
                id="business-name"
                value={form.businessName}
                onChange={(event) => set("businessName")(event.target.value)}
                placeholder="Acme Pest Control"
              />
              <p className="text-muted-foreground text-[12px]">
                Names the starter project (a one-page placeholder site).
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>
              Industry{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Select
              value={form.industry || NO_INDUSTRY}
              onValueChange={(value) => set("industry")(String(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_INDUSTRY}>No industry</SelectItem>
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {INDUSTRY_LABELS[industry]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-[12px]">
              Adds that trade&apos;s starter negative list on the client&apos;s
              Search terms page.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Ads products</Label>
            <Select
              value={form.adsType || "search"}
              onValueChange={(value) => set("adsType")(String(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADS_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-[12px]">
              Controls which marketing pages the client sees. LSA shows Local
              Services leads instead of Search terms and budgets.
            </p>
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
          <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <span>
              <span className="block text-[14px] font-medium">
                Weekly report email
              </span>
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
              {form.id ? "Save changes" : "Add agency project"}
            </Button>
          </div>
        </form>

        <div className="bg-card overflow-hidden rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Google Ads</TableHead>
                <TableHead>Repo ID</TableHead>
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
                  <TableCell>
                    {client.agencyPlanStatus ? (
                      <StatusBadge
                        tone={
                          client.agencyPlanStatus === "active" ? "green" : "gray"
                        }
                        dot
                        className="capitalize"
                      >
                        {client.agencyPlanStatus}
                      </StatusBadge>
                    ) : (
                      <span className="text-muted-foreground text-[13px]">
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
                        <StatusBadge tone="red" className="mt-1">
                          No conversion action
                        </StatusBadge>
                      )}
                  </TableCell>
                  <TableCell>
                    <code className="text-[12px]">{client.projectId}</code>
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={paymentLink.isPending || !client.projectId}
                      title={client.projectId ? undefined : "Link a website first"}
                      onClick={() => paymentLink.mutate({ id: client.id })}
                    >
                      Payment link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setForm({
                          id: client.id,
                          email: client.email,
                          businessName: "",
                          projectId: client.projectId ? String(client.projectId) : "",
                          industry: client.industry ?? "",
                          adsType: client.adsType ?? "search",
                          googleAdsCustomerId: client.googleAdsCustomerId ?? "",
                          googleAdsConversionAction:
                            client.googleAdsConversionAction ?? "",
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
    </Content>
  );
}
