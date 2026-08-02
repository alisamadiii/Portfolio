import { logos } from "@workspace/ui/lib/company";
import { cn } from "@workspace/ui/lib/utils";

export function LogoLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-background absolute inset-0 grid place-items-center rounded-md",
        className
      )}
    >
      <img
        src={logos.green}
        alt="Loading"
        className="animate-logo-breathe size-12 rounded-full"
      />
    </div>
  );
}
