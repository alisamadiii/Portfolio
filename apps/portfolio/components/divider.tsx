import { cn } from "@workspace/ui/lib/utils";

export const Divider = ({
  className,
  borderTop,
}: {
  className?: string;
  borderTop?: boolean;
}) => {
  return (
    <div
      className={cn(
        "pointer-events-none col-span-2 mx-auto w-[calc(100%+var(--width))] -translate-x-[calc(var(--width)/2)] border-t border-dashed [--width:720px]",
        className
      )}
      style={{
        mask: borderTop
          ? "linear-gradient(to top, transparent, black, transparent)"
          : "linear-gradient(to left, transparent, black, transparent)",
      }}
    ></div>
  );
};
