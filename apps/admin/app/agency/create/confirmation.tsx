import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { generateDescription } from "@workspace/ui/lib/agency-utils";
import { cn } from "@workspace/ui/lib/utils";

export const Confirmation = ({
  name,
  recurringInterval,
  email,
  userId,
  services,
  isFree,
}: {
  name: string;
  recurringInterval: "month" | "year";
  email: string;
  userId: string;
  services: { name: string; price: number }[];
  isFree: boolean;
}) => {
  return (
    <div className="bg-muted/50 rounded-xl border p-4">
      <h3 className="text-muted-foreground mb-3 text-sm font-medium">
        Confirmation
      </h3>
      <dl className="grid gap-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium">{name || "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Description</dt>
          <dd className="line-clamp-3 font-medium whitespace-pre-wrap">
            {generateDescription(services, recurringInterval) || "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Recurring</dt>
          <dd className="font-medium capitalize">{recurringInterval || "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="truncate font-medium">{email || "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">User ID</dt>
          <dd className="truncate font-mono text-xs">{userId || "—"}</dd>
        </div>
        <div className="flex flex-col gap-1.5 pt-1">
          <dt className="text-muted-foreground">Scopes</dt>
          <dd className="flex min-h-6 flex-wrap gap-1.5">
            {services.map((service) => (
              <Badge
                variant="secondary"
                className="font-normal"
                key={service.name}
              >
                {service.name}
              </Badge>
            ))}
          </dd>
        </div>
        <Separator />
        <div className="flex flex-col gap-2">
          {services.map((service) => (
            <div key={service.name} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{service.name}</dt>
              <dd className="font-medium">
                ${(service.price / 100).toFixed(2)}
              </dd>
            </div>
          ))}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Price</dt>
            <dd className="text-3xl font-bold tracking-tighter tabular-nums">
              <span className={cn(isFree ? "line-through" : "")}>
                $
                {(
                  services.reduce((acc, service) => acc + service.price, 0) /
                  100
                ).toFixed(2)}
              </span>{" "}
              {isFree ? "Free" : ""}
            </dd>
          </div>
        </div>
      </dl>
    </div>
  );
};
