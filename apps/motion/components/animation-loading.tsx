import { Spinner } from "@workspace/ui/components/spinner";

export function AnimationLoading() {
  return (
    <div className="flex min-h-[280px] w-full items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}
