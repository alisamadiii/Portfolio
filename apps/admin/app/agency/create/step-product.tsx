import { Controller, type UseFormReturn } from "react-hook-form";

import { Button } from "@workspace/ui/components/button";
import { Field, FieldError } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

import type { ProductFormValues } from "./wizard";

type StepProductProps = {
  form: UseFormReturn<ProductFormValues>;
  onNext: () => void;
};

export const StepProduct = ({ form, onNext }: StepProductProps) => {
  const handleNext = async () => {
    const valid = await form.trigger("name");
    if (valid) onNext();
  };

  return (
    <div className="flex flex-col gap-4 p-4 pt-0">
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <Field data-invalid={!!fieldState.error}>
            <Input
              label="Product Name"
              placeholder="Landing page"
              aria-invalid={!!fieldState.error}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Button type="button" onClick={handleNext} className="w-full">
        Next
      </Button>
    </div>
  );
};
