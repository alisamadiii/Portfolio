import { Loader } from "@/components/loader";

export default function Loading() {
  return (
    <Loader className="text-muted-foreground bg-background absolute inset-0 rounded-md text-sm">
      Loading
    </Loader>
  );
}
