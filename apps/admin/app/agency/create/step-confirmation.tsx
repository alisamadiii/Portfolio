import { Controller, type UseFormReturn } from "react-hook-form";

import { Button } from "@workspace/ui/components/button";
import { Field, FieldError } from "@workspace/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { SERVICE_CATALOG } from "@workspace/ui/lib/agency-utils";
import { cn } from "@workspace/ui/lib/utils";

import { Confirmation } from "./confirmation";
import type { ProductFormValues } from "./wizard";

type StepConfirmationProps = {
  form: UseFormReturn<ProductFormValues>;
  isEditMode: boolean;
  isUpgrading: boolean;
  isPending: boolean;
  onSubmit: () => void;
};

export const StepConfirmation = ({
  form,
  isEditMode,
  isUpgrading,
  isPending,
  onSubmit,
}: StepConfirmationProps) => {
  const services = form.watch("services");
  const includedIds = new Set(services.map((s) => s.name));
  const excludedServices = SERVICE_CATALOG.filter(
    (s) => !includedIds.has(s.id)
  );

  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      <Confirmation
        name={form.watch("name")}
        email={form.watch("email")}
        userId={form.watch("userId")}
        services={services}
        isFree={false}
        oneTimePurchase={false}
      />

      {excludedServices.length > 0 && (
        <div className="bg-muted/30 rounded-xl border border-dashed p-4">
          <h4 className="text-muted-foreground mb-2 text-sm font-medium">
            Excluded Services
          </h4>
          <ul className="flex flex-col gap-1">
            {excludedServices.map((s) => (
              <li
                key={s.id}
                className={cn(
                  "text-muted-foreground text-sm line-through"
                )}
              >
                {s.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isEditMode && (
        <Controller
          control={form.control}
          name="prorationBehavior"
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error}>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full" disabled={!isUpgrading}>
                  <SelectValue placeholder="Select proration behavior" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always_invoice">Immediate Billing</SelectItem>
                  <SelectItem value="create_prorations">Prorate</SelectItem>
                  <SelectItem value="none">No Change</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground mt-2 px-2 text-xs">
                Disabled if no price increase
              </p>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      )}

      <Button
        type="button"
        size="lg"
        isLoading={isPending}
        disabled={services.length === 0}
        onClick={onSubmit}
        className="w-full"
      >
        {isEditMode ? "Update Product" : "Create Product"}
      </Button>
    </div>
  );
};
