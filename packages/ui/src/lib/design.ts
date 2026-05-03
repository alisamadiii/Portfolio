import type { ProjectType } from "@workspace/drizzle/schema";

export const projectDesign: Record<
  ProjectType,
  { color: string; label: string }
> = {
  PORTFOLIO: { color: "#FC8464", label: "Portfolio" },
  DOCS: { color: "#F5A623", label: "Docs" },
  MOTION: { color: "#2b7fff", label: "Motion" },
  AGENCY: { color: "#00B894", label: "Agency" },
  TEMPLATE: { color: "#9B59B6", label: "Template" },
  ADMIN: { color: "#95A5A6", label: "Admin" },
};

export function getProjectColor(project?: string | null): string {
  if (!project) return projectDesign.PORTFOLIO.color;
  return (
    projectDesign[project as ProjectType]?.color ?? projectDesign.PORTFOLIO.color
  );
}

// Backward-compatible export
export const design = {
  default: projectDesign.PORTFOLIO,
  motion: projectDesign.MOTION,
  agency: projectDesign.AGENCY,
};
