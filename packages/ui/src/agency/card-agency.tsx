import { cn } from "../lib/utils";

export const CardAgency = () => {
  return <div>CA</div>;
};

const Card = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-muted shadow-card flex flex-col gap-6 rounded-4xl p-6">
      {children}
    </div>
  );
};

const Header = ({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">{title}</h2>
      {children}
    </div>
  );
};

type DetailRowProps = {
  label: string;
  href?: string;
  className?: string;
} & (
  | { value: string; children?: never }
  | { children: React.ReactNode; value?: never }
);

const DetailRow = ({
  label,
  value,
  href,
  children,
  className,
}: DetailRowProps) => {
  if (!value && !children) return null;

  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {label}
        </p>
        <div
          className={cn("text-primary mt-0.5 whitespace-pre-line", className)}
        >
          {children ? (
            children
          ) : href ? (
            <a href={href} className="block truncate hover:underline">
              {value}
            </a>
          ) : (
            <p>{value}</p>
          )}
        </div>
      </div>
    </div>
  );
};
CardAgency.Card = Card;
CardAgency.Header = Header;
CardAgency.DetailRow = DetailRow;
