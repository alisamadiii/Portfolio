import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-accents-4 skeleton",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
