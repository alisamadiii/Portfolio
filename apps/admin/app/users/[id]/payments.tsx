import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import { Orders } from "@/components/users/payments/orders";
import { Subscriptions } from "@/components/users/payments/subscriptions";

export const Payments = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Orders />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <Subscriptions />
        </CardContent>
      </Card>
    </div>
  );
};
