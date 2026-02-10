import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { PageLoading } from "@workspace/ui/custom/page-loading";

import { useGeneratePortalLink } from "@workspace/auth/hooks/use-payments";

export const BillingPortal = () => {
  const generatePortalLink = useGeneratePortalLink();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portal</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => generatePortalLink.mutate()} size={"lg"}>
          Manage Billing
        </Button>

        <PageLoading
          active={generatePortalLink.isPending}
          name={generatePortalLink.isSuccess ? "Redirecting" : "Generating"}
        />
      </CardContent>
    </Card>
  );
};
