import { logos } from "@workspace/ui/lib/company";

type AuthHeaderProps = {
  title: string;
  description?: string;
};

export function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <img
        src={logos.default}
        alt=""
        className="size-11 rounded-xl object-cover"
      />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
    </div>
  );
}
