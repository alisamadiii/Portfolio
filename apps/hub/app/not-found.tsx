import Link from "next/link";

import { Button } from "@workspace/ui/components/button";
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
        <Button variant="default" render={<Link href="/">Go home</Link>} />
      </EmptyContent>
    </Empty>
  );
}
