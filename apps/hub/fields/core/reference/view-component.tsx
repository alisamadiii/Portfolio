"use client";

import { useConfig } from "@/contexts/config-context";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";

import { Field } from "@workspace/cms-core/types/field";

import { Badge } from "@workspace/ui/components/badge";

import { getSchemaByName } from "@workspace/cms-core/schema";

const normalizeValue = (item: unknown): string => {
  if (item == null) return "";
  if (
    typeof item === "string" ||
    typeof item === "number" ||
    typeof item === "boolean"
  ) {
    return String(item);
  }
  if (typeof item === "object" && item !== null && "value" in item) {
    return String((item as { value?: unknown }).value ?? "");
  }
  return "";
};

type ResolvedLabel = {
  label: string;
  resolved: boolean;
};

const ViewComponent = ({ value, field }: { value: unknown; field: Field }) => {
  const { config } = useConfig();
  const trpc = useTRPC();
  const collectionName =
    typeof field.options?.collection === "string"
      ? field.options.collection
      : null;
  const collection =
    config && collectionName
      ? getSchemaByName(config.object, collectionName)
      : null;
  const values = Array.isArray(value)
    ? value
    : value == null || value === ""
      ? []
      : [value];

  const valueTemplate =
    typeof field.options?.value === "string" ? field.options.value : "{path}";
  const labelTemplate =
    typeof field.options?.label === "string" ? field.options.label : "{name}";
  const selectedValues = values.map(normalizeValue).filter(Boolean);

  const enabled = !!config && !!collection && selectedValues.length > 0;

  // The input-derived query key dedupes identical cells; labels are stable,
  // so a longer staleTime avoids refetch storms in large tables.
  const { data } = useQuery(
    trpc.cms.references.search.queryOptions(
      {
        owner: config?.owner ?? "",
        repo: config?.repo ?? "",
        branch: config?.branch ?? "",
        name: collectionName ?? "",
        valueTemplate,
        labelTemplate,
        values: selectedValues,
      },
      { enabled, staleTime: 60_000 }
    )
  );

  const labelsByValue = new Map<string, string>();
  data?.options.forEach((item: Record<string, unknown>) => {
    labelsByValue.set(
      String(item.value ?? ""),
      String(item.label ?? item.value ?? "")
    );
  });

  const labels: ResolvedLabel[] = values
    .map((item) => {
      const normalized = normalizeValue(item);
      const resolved = labelsByValue.get(normalized);
      return {
        label: resolved || normalized,
        resolved: Boolean(resolved),
      };
    })
    .filter(Boolean);

  if (!labels.length) return null;

  return (
    <span className="flex items-center gap-x-1.5">
      <Badge
        variant="secondary"
        className={
          labels[0]?.resolved === false
            ? "max-w-full animate-pulse"
            : "max-w-full"
        }
      >
        <span className="truncate">{labels[0]?.label}</span>
      </Badge>
      {labels.length > 1 && (
        <Badge
          variant="secondary"
          className={
            labels.slice(1).some((item) => item.resolved === false)
              ? "animate-pulse px-1"
              : "px-1"
          }
        >
          +{labels.length - 1}
        </Badge>
      )}
    </span>
  );
};

export { ViewComponent };
