import { cn } from "@workspace/ui/lib/utils";

export const FormattedJSON = ({
  data,
  className,
}: {
  data: unknown;
  className?: string;
}) => {
  const formattedJSON = JSON.stringify(data, null, 2);

  return (
    <pre
      className={cn(
        "bg-muted overflow-x-auto whitespace-pre rounded-lg p-4 font-mono text-sm",
        className
      )}
    >
      <code>{formattedJSON}</code>
    </pre>
  );
};
