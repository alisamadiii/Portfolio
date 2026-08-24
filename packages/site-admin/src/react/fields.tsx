/**
 * Recursive form-field renderers. Controlled by (value at path, onChange) —
 * all state lives in the editor above. Native inputs only.
 */

import { useState } from "react";

import type { FormField } from "../schema/form-schema";
import { getAtPath, humanize, inferFields } from "../schema/form-schema";

type FieldProps = {
  field: FormField;
  root: unknown;
  onChange: (path: string, value: unknown) => void;
};

export const Field = ({ field, root, onChange }: FieldProps) => {
  const value = getAtPath(root, field.path);

  switch (field.kind) {
    case "text":
      return (
        <div className="sa-field">
          <label className="sa-label" htmlFor={field.path}>
            {field.label}
          </label>
          {field.multiline ? (
            <textarea
              id={field.path}
              className="sa-textarea"
              value={typeof value === "string" ? value : ""}
              onChange={(event) => onChange(field.path, event.target.value)}
            />
          ) : (
            <input
              id={field.path}
              className="sa-input"
              type="text"
              value={typeof value === "string" ? value : ""}
              onChange={(event) => onChange(field.path, event.target.value)}
            />
          )}
        </div>
      );

    case "image": {
      const src = typeof value === "string" ? value : "";
      return (
        <div className="sa-field">
          <label className="sa-label" htmlFor={field.path}>
            {field.label}
          </label>
          <input
            id={field.path}
            className="sa-input"
            type="text"
            placeholder="/media/… or https://…"
            value={src}
            onChange={(event) => onChange(field.path, event.target.value)}
          />
          {src && (src.startsWith("/") || src.startsWith("http")) && (
            <img className="sa-image-preview" src={src} alt="" />
          )}
        </div>
      );
    }

    case "boolean":
      return (
        <div className="sa-field sa-checkbox-row">
          <input
            id={field.path}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(field.path, event.target.checked)}
          />
          <label htmlFor={field.path}>{field.label}</label>
        </div>
      );

    case "number":
      return (
        <div className="sa-field">
          <label className="sa-label" htmlFor={field.path}>
            {field.label}
          </label>
          <input
            id={field.path}
            className="sa-input"
            type="number"
            value={typeof value === "number" ? value : ""}
            onChange={(event) =>
              onChange(field.path, Number(event.target.value))
            }
          />
        </div>
      );

    case "date":
      return (
        <div className="sa-field">
          <label className="sa-label" htmlFor={field.path}>
            {field.label}
          </label>
          <input
            id={field.path}
            className="sa-input"
            type="date"
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(field.path, event.target.value)}
          />
        </div>
      );

    case "select":
      return (
        <div className="sa-field">
          <label className="sa-label" htmlFor={field.path}>
            {field.label}
          </label>
          <select
            id={field.path}
            className="sa-select"
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(field.path, event.target.value)}
          >
            <option value="" />
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      );

    case "link": {
      const link = (value ?? {}) as Record<string, unknown>;
      // The contract uses {label, link}; some data uses {label, url}.
      const urlKey = "url" in link ? "url" : "link";
      return (
        <div className="sa-field">
          <span className="sa-label">{field.label}</span>
          <div className="sa-link-pair">
            <input
              className="sa-input"
              type="text"
              placeholder="Label"
              value={typeof link.label === "string" ? link.label : ""}
              onChange={(event) =>
                onChange(`${field.path}.label`, event.target.value)
              }
            />
            <input
              className="sa-input"
              type="text"
              placeholder="/page or https://…"
              value={typeof link[urlKey] === "string" ? (link[urlKey] as string) : ""}
              onChange={(event) =>
                onChange(`${field.path}.${urlKey}`, event.target.value)
              }
            />
          </div>
        </div>
      );
    }

    case "group":
      return (
        <div className="sa-group">
          <p className="sa-group-title">{field.label}</p>
          {field.fields.map((child) => (
            <Field
              key={child.path}
              field={child}
              root={root}
              onChange={onChange}
            />
          ))}
        </div>
      );

    case "list":
      return <ListField field={field} root={root} onChange={onChange} />;
  }
};

const ListField = ({
  field,
  root,
  onChange,
}: {
  field: Extract<FormField, { kind: "list" }>;
  root: unknown;
  onChange: (path: string, value: unknown) => void;
}) => {
  const items = (getAtPath(root, field.path) ?? []) as unknown[];
  const [open, setOpen] = useState<number | null>(null);

  const setItems = (next: unknown[]) => onChange(field.path, next);

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setItems(next);
    setOpen(null);
  };

  const remove = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    setOpen(null);
  };

  const add = () => {
    // Collections carry an explicit blank template; otherwise mirror the
    // first item's shape with blanked values.
    let blank: unknown = field.blankItem;
    if (blank === undefined) {
      const template = items[0];
      blank =
        template && typeof template === "object" && !Array.isArray(template)
          ? Object.fromEntries(
              Object.entries(template as Record<string, unknown>).map(
                ([key, value]) => [key, blankValue(value)]
              )
            )
          : "";
    }
    setItems([...items, blank]);
    setOpen(items.length);
  };

  const itemPath = (index: number) =>
    field.path ? `${field.path}.${index}` : String(index);

  const itemLabel = (item: unknown, index: number): string => {
    if (typeof item === "string") return item || `Item ${index + 1}`;
    if (item && typeof item === "object" && field.itemLabelKey) {
      const label = (item as Record<string, unknown>)[field.itemLabelKey];
      if (typeof label === "string" && label) return label;
    }
    return `Item ${index + 1}`;
  };

  return (
    <div className="sa-field">
      <span className="sa-label">{field.label}</span>
      {items.map((item, index) => (
        <div key={index} className="sa-list-item">
          <div className="sa-list-item-head">
            <button
              type="button"
              className="sa-list-item-label"
              onClick={() => setOpen(open === index ? null : index)}
            >
              {itemLabel(item, index)}
            </button>
            <button
              type="button"
              className="sa-icon-btn"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              className="sa-icon-btn"
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              className="sa-icon-btn"
              onClick={() => remove(index)}
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
          {open === index && (
            <div className="sa-list-item-body">
              {typeof item === "string" ? (
                <div className="sa-field">
                  <input
                    className="sa-input"
                    type="text"
                    value={item}
                    onChange={(event) =>
                      onChange(itemPath(index), event.target.value)
                    }
                  />
                </div>
              ) : item && typeof item === "object" ? (
                (field.itemFields
                  ? field.itemFields.map((child) =>
                      prefixField(child, itemPath(index))
                    )
                  : inferFields(
                      item as Record<string, unknown>,
                      itemPath(index)
                    )
                ).map((child) => (
                  <Field
                    key={child.path}
                    field={child}
                    root={root}
                    onChange={onChange}
                  />
                ))
              ) : (
                <p className="sa-muted">{humanize(String(item))}</p>
              )}
            </div>
          )}
        </div>
      ))}
      <button type="button" className="sa-add-btn" onClick={add}>
        + Add item
      </button>
    </div>
  );
};

/** Re-root an item-relative field under a concrete list-item path. */
const prefixField = (field: FormField, prefix: string): FormField => {
  const path = field.path ? `${prefix}.${field.path}` : prefix;
  if (field.kind === "group") {
    return {
      ...field,
      path,
      fields: field.fields.map((child) => prefixField(child, prefix)),
    };
  }
  return { ...field, path };
};

const blankValue = (value: unknown): unknown => {
  if (typeof value === "string") return "";
  if (typeof value === "number") return 0;
  if (typeof value === "boolean") return false;
  if (Array.isArray(value)) return [];
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        blankValue(child),
      ])
    );
  }
  return "";
};
