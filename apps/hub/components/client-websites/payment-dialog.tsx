"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldError,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useTRPC } from "@workspace/trpc/client";
import {
  formatMoney,
  type CatalogPrice,
  type PaymentLink,
} from "@workspace/trpc/lib/client-websites-shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

import { Badge, type BadgeTone } from "@/components/ds/ui/badge";
import { Button, IconButton } from "@/components/ds/ui/button";
import { Input, Select, Textarea } from "@/components/ds/ui/field";
import { formatDate } from "@/lib/client-websites";
import { handleCmsError } from "@/lib/trpc-errors";

// Stripe Checkout links made while showing a client their design. The server
// re-validates everything (routers/client-websites.ts); this form only helps.

const DEFAULT_MESSAGE = "Your website goes live within one day of payment.";
const INTERVALS = [
  { value: "one_time", label: "One-time" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
] as const;

const formSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  name: z.string(),
  message: z.string().max(1000),
  note: z.string().max(500),
  items: z
    .array(
      z.object({
        kind: z.enum(["price", "custom"]),
        priceId: z.string(),
        name: z.string(),
        interval: z.enum(["one_time", "month", "year"]),
        quantity: z
          .number({ invalid_type_error: "Enter a quantity." })
          .int()
          .min(1, "At least 1.")
          .max(99),
        amount: z.number({ invalid_type_error: "Enter a price." }).min(0.5, "At least $0.50."),
      })
    )
    .min(1, "Add at least one item.")
    .superRefine((items, ctx) => {
      items.forEach((item, index) => {
        if (item.kind === "price" && !item.priceId) {
          ctx.addIssue({ code: "custom", message: "Pick a product.", path: [index, "priceId"] });
        }
        if (item.kind === "custom" && !item.name.trim()) {
          ctx.addIssue({ code: "custom", message: "Name this item.", path: [index, "name"] });
        }
      });
    }),
});

type FormValues = z.infer<typeof formSchema>;
type Item = FormValues["items"][number];

const blankItem = (kind: Item["kind"]): Item => ({
  kind,
  priceId: "",
  name: "",
  interval: "one_time",
  quantity: 1,
  // empty until a product is picked or a price typed
  amount: undefined as unknown as number,
});

const toCents = (dollars: number) => Math.round(dollars * 100);

const intervalLabel = (price: { interval: string | null; intervalCount: number }) =>
  !price.interval
    ? "one-time"
    : price.intervalCount > 1
      ? `every ${price.intervalCount} ${price.interval}s`
      : `/${price.interval}`;

const priceLabel = (price: CatalogPrice) =>
  `${price.productName}${price.nickname ? ` (${price.nickname})` : ""}: ${formatMoney(price.unitAmount, price.currency)} ${intervalLabel(price)}`;

const STATUS_TONE: Record<PaymentLink["status"], BadgeTone> = {
  paid: "success",
  open: "info",
  processing: "warning",
  expired: "neutral",
};

export function PaymentDialog({ slug, name }: { slug: string; name: string }) {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const config = useQuery(trpc.clientWebsites.config.queryOptions());
  const links = useQuery(
    trpc.clientWebsites.payments.queryOptions(
      { slug },
      {
        enabled: Boolean(config.data?.stripeEnabled),
        // Stripe is the record of who paid, so look again on coming back to the tab.
        refetchOnWindowFocus: true,
      }
    )
  );
  const paid = links.data?.some((link) => link.status === "paid");

  if (config.data && !config.data.stripeEnabled) {
    return (
      <Button size="sm" disabled>
        Stripe not set up
      </Button>
    );
  }
  return (
    <>
      {paid && (
        <Badge tone="success" dot>
          Paid
        </Badge>
      )}
      <Button size="sm" onClick={() => setOpen(true)}>
        Payment
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto md:max-w-2xl">
          <Content slug={slug} name={name} links={links.data} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Content({ slug, name, links }: { slug: string; name: string; links?: PaymentLink[] }) {
  const [created, setCreated] = useState<PaymentLink | null>(null);
  const others = links?.filter((link) => link.id !== created?.id);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{created ? "Payment link ready" : "New payment link"}</DialogTitle>
        <DialogDescription>
          {created
            ? "Send it or let the client scan it. Stripe closes it after 24 hours."
            : "The customer is created in Stripe if the email is new."}
        </DialogDescription>
      </DialogHeader>
      {created ? (
        <>
          <LinkResult link={created} />
          <Button size="sm" className="justify-self-start" onClick={() => setCreated(null)}>
            New link
          </Button>
        </>
      ) : (
        <PaymentForm slug={slug} name={name} onCreated={setCreated} />
      )}
      {others && others.length > 0 && <LinkList slug={slug} links={others} />}
    </>
  );
}

function PaymentForm({
  slug,
  name,
  onCreated,
}: {
  slug: string;
  name: string;
  onCreated: (link: PaymentLink) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const catalog = useQuery(trpc.clientWebsites.catalog.queryOptions());
  const [checkedEmail, setCheckedEmail] = useState("");
  const customer = useQuery(
    trpc.clientWebsites.customer.queryOptions({ email: checkedEmail }, { enabled: Boolean(checkedEmail) })
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    // hub's resolvers types expect zod v4; the schema is v3 (same cast as account/general/company.tsx)
    resolver: zodResolver(formSchema as unknown as Parameters<typeof zodResolver>[0]),
    defaultValues: { email: "", name, message: DEFAULT_MESSAGE, note: "", items: [blankItem("price")] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const create = useMutation(
    trpc.clientWebsites.createPayment.mutationOptions({
      onSuccess: (link) => {
        void queryClient.invalidateQueries({ queryKey: trpc.clientWebsites.payments.queryKey({ slug }) });
        onCreated(link);
      },
      onError: (e) => toast.error(handleCmsError(e, "Couldn't create the link.")),
    })
  );

  const onSubmit = (values: FormValues) => {
    create.mutate({
      slug,
      link: {
        email: values.email,
        name: values.name || undefined,
        message: values.message || undefined,
        note: values.note || undefined,
        items: values.items.map((item) =>
          item.kind === "price"
            ? { kind: "price", priceId: item.priceId, quantity: item.quantity, unitAmount: toCents(item.amount) }
            : {
                kind: "custom",
                name: item.name,
                interval: item.interval,
                quantity: item.quantity,
                unitAmount: toCents(item.amount),
              }
        ),
      },
    });
  };

  const emailField = register("email");
  const prices = catalog.data ?? [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">Client email</span>
          <Input
            type="email"
            autoComplete="off"
            {...emailField}
            onBlur={(event) => {
              void emailField.onBlur(event);
              const value = event.target.value.trim();
              setCheckedEmail(z.string().email().safeParse(value).success ? value : "");
            }}
          />
          <ErrorText error={errors.email} />
          {checkedEmail && customer.isSuccess && (
            <span className="text-[13px] text-dim">
              {customer.data
                ? `Existing customer: ${customer.data.name || customer.data.email}`
                : "New customer will be created"}
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">Client name</span>
          <Input autoComplete="off" {...register("name")} />
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-ink">Items</span>
        {catalog.isPending && <div className="h-9 w-full animate-pulse rounded-control bg-subtle" />}
        {catalog.isError && <p className="text-[13px] text-danger">{catalog.error.message}</p>}
        {fields.map((field, index) => (
          <ItemRow
            key={field.id}
            index={index}
            control={control}
            register={register}
            setValue={setValue}
            prices={prices}
            errors={errors.items?.[index]}
            onRemove={fields.length > 1 ? () => remove(index) : undefined}
          />
        ))}
        <ErrorText error={errors.items?.root ?? (errors.items as FieldError | undefined)} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="subtle" icon={<Plus className="size-4" />} onClick={() => append(blankItem("price"))}>
            Product
          </Button>
          <Button size="sm" variant="subtle" icon={<Plus className="size-4" />} onClick={() => append(blankItem("custom"))}>
            Custom item
          </Button>
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">Message on the checkout page</span>
        <Textarea rows={2} {...register("message")} />
        <ErrorText error={errors.message} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">Internal note</span>
        <Input autoComplete="off" {...register("note")} />
        <ErrorText error={errors.note} />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <Total control={control} prices={prices} />
        <Button type="submit" variant="primary" disabled={create.isPending}>
          {create.isPending ? "Generating…" : "Generate link"}
        </Button>
      </div>
    </form>
  );
}

function ErrorText({ error }: { error?: { message?: string } }) {
  return error?.message ? <span className="text-[13px] text-danger">{error.message}</span> : null;
}

function ItemRow({
  index,
  control,
  register,
  setValue,
  prices,
  errors,
  onRemove,
}: {
  index: number;
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  prices: CatalogPrice[];
  errors?: {
    priceId?: { message?: string };
    name?: { message?: string };
    quantity?: { message?: string };
    amount?: { message?: string };
  };
  onRemove?: () => void;
}) {
  const kind = useWatch({ control, name: `items.${index}.kind` });
  const priceId = useWatch({ control, name: `items.${index}.priceId` });
  const amount = useWatch({ control, name: `items.${index}.amount` });
  const listed = prices.find((price) => price.id === priceId);
  const tweaked = listed && toCents(amount) !== listed.unitAmount;
  const priceField = register(`items.${index}.priceId`);
  const firstError = [errors?.priceId, errors?.name, errors?.quantity, errors?.amount].find(Boolean);

  return (
    <div className="flex flex-col gap-1.5 rounded-card border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-48 flex-1">
          {kind === "price" ? (
            <Select
              aria-label="Product"
              {...priceField}
              onChange={(event) => {
                void priceField.onChange(event);
                const next = prices.find((price) => price.id === event.target.value);
                if (next) setValue(`items.${index}.amount`, next.unitAmount / 100, { shouldValidate: true });
              }}
            >
              <option value="">Pick a product</option>
              {prices.map((price) => (
                <option key={price.id} value={price.id}>
                  {priceLabel(price)}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              placeholder="Item name, e.g. Website setup"
              aria-label="Item name"
              autoComplete="off"
              {...register(`items.${index}.name`)}
            />
          )}
        </div>
        {kind === "custom" && (
          <Select aria-label="Billing" className="w-28" {...register(`items.${index}.interval`)}>
            {INTERVALS.map((interval) => (
              <option key={interval.value} value={interval.value}>
                {interval.label}
              </option>
            ))}
          </Select>
        )}
        <Input
          type="number"
          min={1}
          max={99}
          aria-label="Quantity"
          className="w-16"
          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
        />
        <Input
          type="number"
          step="0.01"
          min={0.5}
          placeholder="Price"
          aria-label="Price in dollars"
          className="w-28"
          {...register(`items.${index}.amount`, { valueAsNumber: true })}
        />
        {onRemove && (
          <IconButton aria-label="Remove item" onClick={onRemove}>
            <Trash2 className="size-4" />
          </IconButton>
        )}
      </div>
      {tweaked && (
        <span className="text-[13px] text-dim">
          List price {formatMoney(listed.unitAmount, listed.currency)}. This link only; the Stripe catalog stays the
          same.
        </span>
      )}
      <ErrorText error={firstError} />
    </div>
  );
}

function Total({ control, prices }: { control: Control<FormValues>; prices: CatalogPrice[] }) {
  const items = useWatch({ control, name: "items" });
  const rows = items.map((item) => {
    const price = prices.find((candidate) => candidate.id === item.priceId);
    const interval =
      item.kind === "price" ? (price?.interval ?? null) : item.interval === "one_time" ? null : item.interval;
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    const amount = Number.isFinite(item.amount) ? toCents(item.amount) : 0;
    return { interval, currency: price?.currency, total: amount * quantity };
  });
  const currency = rows.find((row) => row.currency)?.currency ?? "usd";
  const today = rows.reduce((sum, row) => sum + row.total, 0);
  const recurring = rows.filter((row) => row.interval);
  const repeat = recurring.reduce((sum, row) => sum + row.total, 0);

  return (
    <p className="text-sm">
      Due today <span className="font-semibold">{formatMoney(today, currency)}</span>
      {repeat > 0 && (
        <span className="text-dim">
          , then {formatMoney(repeat, currency)}/{recurring[0]?.interval}
        </span>
      )}
    </p>
  );
}

function LinkResult({ link }: { link: PaymentLink }) {
  if (!link.url) return null;
  const expires = new Date(link.expiresAt).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <QRCodeSVG value={link.url} size={208} marginSize={2} className="rounded-card" />
      <div className="flex w-full gap-2">
        <Input readOnly value={link.url} aria-label="Payment link" />
        <CopyButton url={link.url} label="Copy" />
      </div>
      <p className="text-[13px] text-dim">
        {link.email} ·{" "}
        {link.amountTotal != null && `${formatMoney(link.amountTotal, link.currency ?? "usd")} due · `}
        Expires {expires}
      </p>
    </div>
  );
}

function CopyButton({ url, label }: { url: string; label?: string }) {
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };
  return label ? (
    <Button icon={<Copy className="size-4" />} onClick={copy}>
      {label}
    </Button>
  ) : (
    <IconButton aria-label="Copy link" onClick={copy}>
      <Copy className="size-4" />
    </IconButton>
  );
}

function LinkList({ slug, links }: { slug: string; links: PaymentLink[] }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const expire = useMutation(
    trpc.clientWebsites.expirePayment.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: trpc.clientWebsites.payments.queryKey({ slug }) }),
      onError: (e) => toast.error(handleCmsError(e, "Couldn't expire the link.")),
    })
  );

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-4">
      <h3 className="text-sm font-semibold">Earlier links</h3>
      {links.map((link) => (
        <div key={link.id} className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone={STATUS_TONE[link.status]}>{link.status}</Badge>
          <span className="min-w-0 flex-1 truncate">{link.email}</span>
          {link.amountTotal != null && <span>{formatMoney(link.amountTotal, link.currency ?? "usd")}</span>}
          <span className="text-[13px] text-dim">{formatDate(link.createdAt)}</span>
          {link.url && (
            <>
              <CopyButton url={link.url} />
              <Button
                size="sm"
                variant="ghost"
                disabled={expire.isPending}
                onClick={() => expire.mutate({ slug, id: link.id })}
              >
                Expire
              </Button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
