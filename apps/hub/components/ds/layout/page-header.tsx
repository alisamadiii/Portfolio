import type { ReactNode } from "react";

/**
 * Page title block. Title 26px/600, tracking -0.02em. Subtitle 14px muted.
 * NO giant headings, NO monospace/uppercase eyebrows. Eyebrow (optional) is 13px muted sentence case.
 */
export function PageHeader({
  title,
  count,
  eyebrow,
  description,
  actions,
  pill,
  tabs,
}: {
  title: ReactNode;
  count?: number;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  pill?: ReactNode;
  tabs?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {eyebrow && <span className="text-[13px] text-dim">{eyebrow}</span>}
          <h1 className="flex items-center gap-3 text-[26px] font-semibold leading-tight tracking-[-0.02em]">
            {title}
            {count !== undefined && <span className="font-normal text-faint">{count}</span>}
            {pill}
          </h1>
          {description && (
            <p className="max-w-[620px] text-sm leading-relaxed text-dim">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {tabs}
    </div>
  );
}
