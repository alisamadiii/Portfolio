export const Header = ({ title }: { title: string }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold">{title}</h2>
    </div>
  );
};

export const DetailRow = ({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) => {
  if (!value) return null;

  const content = (
    <span className="text-foreground truncate font-medium">{value}</span>
  );
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            className="text-primary mt-0.5 block truncate hover:underline"
          >
            {content}
          </a>
        ) : (
          <p className="mt-0.5">{content}</p>
        )}
      </div>
    </div>
  );
};
