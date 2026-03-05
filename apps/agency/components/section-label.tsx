import { cn } from "@workspace/ui/lib/utils";

interface SectionLabelProps {
  text: string;
  number?: string;
  className?: string;
}

export function SectionLabel({ text, number, className }: SectionLabelProps) {
  return (
    <div className={cn("mb-6 flex items-center gap-3", className)}>
      {number && <span className="font-mono text-xs">{number}</span>}
      <div className="bg-accent/40 h-px w-6" />
      <span className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
        {text}
      </span>
    </div>
  );
}
