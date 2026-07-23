import Link from "next/link";

import { buttonVariants } from "@workspace/ui/components/button-variants";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

export default function NotFound() {
  return (
    <Empty className="absolute inset-0 rounded-none border-0">
      <EmptyHeader>
        <EmptyTitle>Page not found</EmptyTitle>
        <EmptyDescription>
          The page or resource you requested could not be found.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link className={buttonVariants({ variant: "default" })} href="/">
          Go home
        </Link>
      </EmptyContent>
    </Empty>
  );
}
