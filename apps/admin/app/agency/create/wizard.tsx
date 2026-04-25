"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Check, Minus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import {
  STARTER_PRICE,
  STARTER_SERVICE_ID,
} from "@workspace/ui/lib/agency-utils";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import { StepConfirmation } from "./step-confirmation";
import { StepProduct } from "./step-product";
import { StepServices } from "./step-services";
import { StepStarter } from "./step-starter";
import { StepUser } from "./step-user";

// ─── Form schema ─────────────────────────────────────────────────────────────

const formSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  email: z.string(),
  name: z.string().min(1, "Name is required"),
  services: z.array(
    z.object({
      name: z.string(),
      price: z.number(),
    })
  ),
  prorationBehavior: z.enum(["invoice", "prorate"]),
});

export type ProductFormValues = z.infer<typeof formSchema>;

// ─── Wizard step config ──────────────────────────────────────────────────────

type WizardStep = {
  id: string;
  title: string;
  type: "custom" | "service";
  serviceId?: string;
  showIf?: (services: { name: string; price: number }[]) => boolean;
};

const WIZARD_STEPS: WizardStep[] = [
  { id: "user", title: "Select Client", type: "custom" },
  { id: "product", title: "Product Details", type: "custom" },
  { id: "starter", title: "Starter Package", type: "custom" },
  { id: "services", title: "Services", type: "custom" },
  { id: "confirmation", title: "Review & Create", type: "custom" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStepSummary(
  step: WizardStep,
  formValues: ProductFormValues
): string | null {
  if (step.id === "user") {
    return formValues.email || null;
  }
  if (step.id === "product") {
    return formValues.name || null;
  }
  if (step.id === "starter") {
    return `$${(STARTER_PRICE / 100).toFixed(2)}/mo`;
  }
  if (step.id === "services") {
    const nonStarter = formValues.services.filter(
      (s) => s.name !== "starter"
    );
    if (nonStarter.length === 0) return "No extras";
    return `${nonStarter.length} service${nonStarter.length > 1 ? "s" : ""}`;
  }
  if (step.id === "confirmation") {
    const total = formValues.services.reduce((sum, s) => sum + s.price, 0);
    return total > 0 ? `$${(total / 100).toFixed(2)}/mo total` : null;
  }
  return null;
}

// ─── Wizard ──────────────────────────────────────────────────────────────────

type WizardProps = {
  productId?: string | null;
  product?: {
    name: string;
    email: string;
    userId: string;
    services: { name: string; price: number }[];
    priceAmount: number;
  } | null;
};

export const Wizard = ({ productId, product }: WizardProps) => {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditMode = !!productId;

  const create = useMutation(
    trpc.admin.agency.products.create.mutationOptions()
  );
  const update = useMutation(
    trpc.admin.agency.products.update.mutationOptions()
  );

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prorationBehavior: "prorate",
      userId: product?.userId ?? "",
      email: product?.email ?? "",
      name: product?.name ?? "",
      services: product?.services ?? [
        { name: STARTER_SERVICE_ID, price: STARTER_PRICE },
      ],
    },
  });

  const services = form.watch("services");

  // Compute visible steps based on current service selections
  const visibleSteps = useMemo(
    () => WIZARD_STEPS.filter((s) => !s.showIf || s.showIf(services)),
    [services]
  );

  // In edit mode, start at confirmation (last step). In create mode, start at 0.
  const [activeStepId, setActiveStepId] = useState<string>(
    isEditMode ? "confirmation" : "user"
  );

  // Track which steps have been completed
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    if (isEditMode) {
      // In edit mode, all steps are pre-completed
      return new Set(WIZARD_STEPS.map((s) => s.id));
    }
    return new Set<string>();
  });

  const activeIndex = visibleSteps.findIndex((s) => s.id === activeStepId);

  const completeAndAdvance = (currentId: string) => {
    setCompletedSteps((prev) => new Set(prev).add(currentId));

    const currentIndex = visibleSteps.findIndex((s) => s.id === currentId);
    const nextStep = visibleSteps[currentIndex + 1];
    if (nextStep) {
      setActiveStepId(nextStep.id);
    }
  };

  const goToStep = (stepId: string) => {
    setActiveStepId(stepId);
  };

  const handleSubmit = () => {
    const data = form.getValues();
    if (isEditMode && productId) {
      update.mutate(
        {
          id: productId,
          name: data.name,
          email: data.email,
          services: data.services,
          userId: data.userId,
          oneTimePurchase: false,
          prorationBehavior: data.prorationBehavior,
          isFree: false,
        },
        {
          onSuccess: () => toast.success("Product updated successfully"),
          onError: (error) => toast.error(error.message),
        }
      );
    } else {
      create.mutate(
        {
          name: data.name,
          email: data.email,
          services: data.services,
          userId: data.userId,
          isFree: false,
          oneTimePurchase: false,
        },
        {
          onSuccess: () => {
            form.reset();
            router.push(`/agency/${data.userId}`);
          },
          onError: (error) => toast.error(error.message),
        }
      );
    }
  };

  const isUpgrading =
    services.reduce((sum, s) => sum + s.price, 0) > (product?.priceAmount ?? 0);

  const formValues = form.getValues();

  // ── Render step content ──────────────────────────────────────────────────

  const renderStepContent = (step: WizardStep) => {
    switch (step.id) {
      case "user":
        return (
          <StepUser
            userId={form.watch("userId")}
            updateState={isEditMode}
            onSelect={(data) => {
              form.setValue("userId", data.id);
              form.setValue("email", data.email);
            }}
            onNext={() => completeAndAdvance("user")}
          />
        );
      case "product":
        return (
          <StepProduct
            form={form}
            onNext={() => completeAndAdvance("product")}
          />
        );
      case "starter":
        return <StepStarter onNext={() => completeAndAdvance("starter")} />;
      case "services":
        return (
          <StepServices
            form={form}
            onNext={() => completeAndAdvance("services")}
          />
        );
      case "confirmation":
        return (
          <StepConfirmation
            form={form}
            isEditMode={isEditMode}
            isUpgrading={isUpgrading}
            isPending={isEditMode ? update.isPending : create.isPending}
            onSubmit={handleSubmit}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="pt-12 pb-48">
      <h1 className="mb-10 text-center text-4xl font-semibold tracking-tight">
        {isEditMode ? "Update Product" : "Create Product"}
      </h1>

      <div className="mx-auto flex max-w-md flex-col gap-2">
        {visibleSteps.map((step, index) => {
          const isActive = step.id === activeStepId;
          const isCompleted = completedSteps.has(step.id) && !isActive;
          const isUpcoming = !isActive && !completedSteps.has(step.id);
          const summary = isCompleted
            ? getStepSummary(step, { ...formValues, services })
            : null;
          const isSkipped = summary === "Skipped";

          return (
            <div
              key={step.id}
              className={cn(
                "overflow-hidden rounded-xl border transition-all",
                isCompleted && "border-green-500/30 bg-green-500/5",
                isActive && "ring-primary/20 bg-background ring-2",
                isUpcoming && "border-border/50 bg-muted/20 opacity-50"
              )}
            >
              {/* Header */}
              <button
                type="button"
                onClick={() => isCompleted && goToStep(step.id)}
                disabled={isUpcoming}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left",
                  isCompleted && "cursor-pointer",
                  isUpcoming && "cursor-default"
                )}
              >
                {/* Step indicator */}
                <div
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    isCompleted &&
                      "bg-green-500/15 text-green-600 dark:text-green-400",
                    isActive && "bg-primary/15 text-primary",
                    isUpcoming && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-3.5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Title */}
                <span
                  className={cn(
                    "flex-1 text-sm font-medium",
                    isCompleted && "text-green-700 dark:text-green-400",
                    isUpcoming && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>

                {/* Summary value */}
                {isCompleted && summary && (
                  <span
                    className={cn(
                      "shrink-0 text-sm tabular-nums",
                      isSkipped
                        ? "text-muted-foreground font-normal italic"
                        : "font-medium"
                    )}
                  >
                    {summary}
                  </span>
                )}

                {/* Collapse indicator for completed */}
                {isCompleted && (
                  <Minus className="text-muted-foreground size-3.5 shrink-0" />
                )}
              </button>

              {/* Content */}
              {isActive && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  {renderStepContent(step)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
