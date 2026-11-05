import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CopyIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Spinner } from "@workspace/ui/components/spinner";
import { Textarea } from "@workspace/ui/components/textarea";

import {
  createPayment,
  errorMessage,
  expirePayment,
  findCustomer,
  formatDate,
  formatMoney,
  getCatalog,
  getConfig,
  getPayments,
  type CatalogPrice,
  type CreateLinkInput,
  type PaymentLink,
} from "@/lib/api";

const DEFAULT_MESSAGE = "Your website goes live within one day of payment.";
const INTERVALS = [
  { value: "one_time", label: "One-time" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

const formSchema = z.object({
  email: z.email("Enter a valid email."),
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
          .number("Enter a quantity.")
          .int()
          .min(1, "At least 1.")
          .max(99),
        amount: z.number("Enter a price.").min(0.5, "At least $0.50."),
      })
    )
    .min(1, "Add at least one item.")
    .superRefine((items, ctx) => {
      items.forEach((item, index) => {
        if (item.kind === "price" && !item.priceId) {
          ctx.addIssue({
            code: "custom",
            message: "Pick a product.",
            path: [index, "priceId"],
          });
        }
        if (item.kind === "custom" && !item.name.trim()) {
          ctx.addIssue({
            code: "custom",
            message: "Name this item.",
            path: [index, "name"],
          });
        }
      });
    }),
});

type FormValues = z.infer<typeof formSchema>;

const blankItem = (kind: "price" | "custom"): FormValues["items"][number] => ({
  kind,
  priceId: "",
  name: "",
  interval: "one_time",
  quantity: 1,
  // empty until a product is picked or a price typed
  amount: undefined as unknown as number,
});

const toCents = (dollars: number) => Math.round(dollars * 100);

const intervalLabel = (price: {
  interval: string | null;
  intervalCount: number;
}) =>
  !price.interval
    ? "one-time"
    : price.intervalCount > 1
      ? `every ${price.intervalCount} ${price.interval}s`
      : `/${price.interval}`;

const priceLabel = (price: CatalogPrice) =>
  `${price.productName}${price.nickname ? ` (${price.nickname})` : ""}: ${formatMoney(price.unitAmount, price.currency)} ${intervalLabel(price)}`;

export const PaymentDialog = ({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) => {
  const [open, setOpen] = useState(false);
  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: getConfig,
  });
  const { data: links } = useQuery({
    queryKey: ["payments", slug],
    queryFn: () => getPayments(slug),
    enabled: Boolean(config?.stripeEnabled),
    // Stripe is the record of who paid, so look again on coming back to the tab.
    refetchOnWindowFocus: true,
  });
  const paid = links?.some((link) => link.status === "paid");

  if (config && !config.stripeEnabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        Stripe not set up
      </Button>
    );
  }
  return (
    <>
      {paid && <Badge>Paid</Badge>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          Payment
        </DialogTrigger>
        <DialogContent className="md:max-w-2xl">
          <Content slug={slug} name={name} links={links} />
        </DialogContent>
      </Dialog>
    </>
  );
};

const Content = ({
  slug,
  name,
  links,
}: {
  slug: string;
  name: string;
  links?: PaymentLink[];
}) => {
  const [created, setCreated] = useState<PaymentLink | null>(null);
  const others = links?.filter((link) => link.id !== created?.id);

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {created ? "Payment link ready" : "New payment link"}
        </DialogTitle>
        <DialogDescription>
          {created
            ? "Send it or let the client scan it. Stripe closes it after 24 hours."
            : "The customer is created in Stripe if the email is new."}
        </DialogDescription>
      </DialogHeader>
      {created ? (
        <>
          <LinkResult link={created} />
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() => setCreated(null)}
          >
            New link
          </Button>
        </>
      ) : (
        <PaymentForm slug={slug} name={name} onCreated={setCreated} />
      )}
      {others && others.length > 0 && <LinkList slug={slug} links={others} />}
    </>
  );
};

const PaymentForm = ({
  slug,
  name,
  onCreated,
}: {
  slug: string;
  name: string;
  onCreated: (link: PaymentLink) => void;
}) => {
  const queryClient = useQueryClient();
  const catalog = useQuery({ queryKey: ["catalog"], queryFn: getCatalog });
  const [checkedEmail, setCheckedEmail] = useState("");
  const customer = useQuery({
    queryKey: ["customer", checkedEmail],
    queryFn: () => findCustomer(checkedEmail),
    enabled: Boolean(checkedEmail),
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name,
      message: DEFAULT_MESSAGE,
      note: "",
      items: [blankItem("price")],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const create = useMutation({
    mutationFn: (input: CreateLinkInput) => createPayment(slug, input),
    onSuccess: (link) => {
      queryClient.invalidateQueries({ queryKey: ["payments", slug] });
      onCreated(link);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const onSubmit = (values: FormValues) => {
    create.mutate({
      email: values.email,
      name: values.name || undefined,
      message: values.message || undefined,
      note: values.note || undefined,
      items: values.items.map((item) =>
        item.kind === "price"
          ? {
              kind: "price",
              priceId: item.priceId,
              quantity: item.quantity,
              unitAmount: toCents(item.amount),
            }
          : {
              kind: "custom",
              name: item.name,
              interval: item.interval,
              quantity: item.quantity,
              unitAmount: toCents(item.amount),
            }
      ),
    });
  };

  const emailField = register("email");
  const prices = catalog.data ?? [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="payment-email">Client email</FieldLabel>
          <Input
            id="payment-email"
            type="email"
            autoComplete="off"
            {...emailField}
            onBlur={(event) => {
              emailField.onBlur(event);
              const value = event.target.value.trim();
              setCheckedEmail(z.email().safeParse(value).success ? value : "");
            }}
          />
          <FieldError errors={[errors.email]} />
          {checkedEmail && customer.isSuccess && (
            <p className="text-muted-foreground text-xs">
              {customer.data
                ? `Existing customer: ${customer.data.name || customer.data.email}`
                : "New customer will be created"}
            </p>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor="payment-name">Client name</FieldLabel>
          <Input id="payment-name" autoComplete="off" {...register("name")} />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <FieldLabel>Items</FieldLabel>
        {catalog.isPending && <Skeleton className="h-9 w-full" />}
        {catalog.isError && (
          <p className="text-destructive text-sm">
            {errorMessage(catalog.error)}
          </p>
        )}
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
        <FieldError errors={[errors.items?.root ?? errors.items]} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(blankItem("price"))}
          >
            <PlusIcon />
            Product
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(blankItem("custom"))}
          >
            <PlusIcon />
            Custom item
          </Button>
        </div>
      </div>

      <Field>
        <FieldLabel htmlFor="payment-message">
          Message on the checkout page
        </FieldLabel>
        <Textarea id="payment-message" rows={2} {...register("message")} />
        <FieldError errors={[errors.message]} />
      </Field>
      <Field>
        <FieldLabel htmlFor="payment-note">Internal note</FieldLabel>
        <Input id="payment-note" autoComplete="off" {...register("note")} />
        <FieldError errors={[errors.note]} />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Total control={control} prices={prices} />
        <Button type="submit" disabled={create.isPending}>
          {create.isPending && <Spinner />}
          Generate link
        </Button>
      </div>
    </form>
  );
};

const ItemRow = ({
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
}) => {
  const kind = useWatch({ control, name: `items.${index}.kind` });
  const priceId = useWatch({ control, name: `items.${index}.priceId` });
  const amount = useWatch({ control, name: `items.${index}.amount` });
  const listed = prices.find((price) => price.id === priceId);
  const tweaked = listed && toCents(amount) !== listed.unitAmount;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-48 flex-1">
          {kind === "price" ? (
            <Controller
              control={control}
              name={`items.${index}.priceId`}
              render={({ field }) => (
                <Select
                  value={field.value || null}
                  items={prices.map((price) => ({
                    value: price.id,
                    label: priceLabel(price),
                  }))}
                  onValueChange={(value) => {
                    const next = prices.find((price) => price.id === value);
                    field.onChange(value ?? "");
                    if (next) {
                      setValue(`items.${index}.amount`, next.unitAmount / 100, {
                        shouldValidate: true,
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-full" aria-label="Product">
                    <SelectValue placeholder="Pick a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {prices.map((price) => (
                      <SelectItem key={price.id} value={price.id}>
                        {priceLabel(price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
          <Controller
            control={control}
            name={`items.${index}.interval`}
            render={({ field }) => (
              <Select
                value={field.value}
                items={INTERVALS}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-28" aria-label="Billing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVALS.map((interval) => (
                    <SelectItem key={interval.value} value={interval.value}>
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove item"
            onClick={onRemove}
          >
            <Trash2Icon />
          </Button>
        )}
      </div>
      {tweaked && (
        <p className="text-muted-foreground text-xs">
          List price {formatMoney(listed.unitAmount, listed.currency)}. This
          link only; the Stripe catalog stays the same.
        </p>
      )}
      <FieldError
        errors={[
          errors?.priceId,
          errors?.name,
          errors?.quantity,
          errors?.amount,
        ]
          .filter(Boolean)
          .slice(0, 1)}
      />
    </div>
  );
};

const Total = ({
  control,
  prices,
}: {
  control: Control<FormValues>;
  prices: CatalogPrice[];
}) => {
  const items = useWatch({ control, name: "items" });
  const rows = items.map((item) => {
    const price = prices.find((candidate) => candidate.id === item.priceId);
    const interval =
      item.kind === "price"
        ? (price?.interval ?? null)
        : item.interval === "one_time"
          ? null
          : item.interval;
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
      Due today{" "}
      <span className="font-semibold">{formatMoney(today, currency)}</span>
      {repeat > 0 && (
        <span className="text-muted-foreground">
          , then {formatMoney(repeat, currency)}/{recurring[0]?.interval}
        </span>
      )}
    </p>
  );
};

const LinkResult = ({ link }: { link: PaymentLink }) => {
  if (!link.url) return null;
  const expires = new Date(link.expiresAt).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <QRCodeSVG
        value={link.url}
        size={208}
        marginSize={2}
        className="rounded-lg"
      />
      <div className="flex w-full gap-2">
        <Input readOnly value={link.url} aria-label="Payment link" />
        <CopyButton url={link.url} label="Copy" />
      </div>
      <p className="text-muted-foreground text-xs">
        {link.email} ·{" "}
        {link.amountTotal != null &&
          `${formatMoney(link.amountTotal, link.currency ?? "usd")} due · `}
        Expires {expires}
      </p>
    </div>
  );
};

const CopyButton = ({ url, label }: { url: string; label?: string }) => (
  <Button
    type="button"
    variant="outline"
    size={label ? "default" : "icon"}
    aria-label="Copy link"
    onClick={async () => {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    }}
  >
    <CopyIcon />
    {label}
  </Button>
);

const LinkList = ({ slug, links }: { slug: string; links: PaymentLink[] }) => {
  const queryClient = useQueryClient();
  const expire = useMutation({
    mutationFn: (id: string) => expirePayment(slug, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["payments", slug] }),
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <h3 className="text-sm font-medium">Earlier links</h3>
      {links.map((link) => (
        <div
          key={link.id}
          className="flex flex-wrap items-center gap-2 text-sm"
        >
          <Badge
            variant={
              link.status === "paid"
                ? "default"
                : link.status === "open"
                  ? "secondary"
                  : "outline"
            }
          >
            {link.status}
          </Badge>
          <span className="min-w-0 flex-1 truncate">{link.email}</span>
          {link.amountTotal != null && (
            <span>{formatMoney(link.amountTotal, link.currency ?? "usd")}</span>
          )}
          <span className="text-muted-foreground text-xs">
            {formatDate(link.createdAt)}
          </span>
          {link.url && (
            <>
              <CopyButton url={link.url} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={expire.isPending}
                onClick={() => expire.mutate(link.id)}
              >
                Expire
              </Button>
            </>
          )}
        </div>
      ))}
    </div>
  );
};
