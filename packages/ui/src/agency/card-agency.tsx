import { format } from "date-fns";
import {
  Building2,
  Calendar,
  Mail,
  MapPin,
  Package,
  Phone,
  User,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { Badge } from "../components/badge";
import { Button } from "../components/button";
import { DetailRow, Header } from "./tools";

export const CardAgency = () => {
  return <div>CA</div>;
};

interface ProductDetailsProps {
  name: string;
  description: string;
  price: number;
  recurringInterval: string;
  createdAt: Date;
  scope?: string[];
  children?: React.ReactNode;
}
const ProductDetails = ({
  name,
  description,
  price,
  recurringInterval,
  createdAt,
  scope,
  children,
}: ProductDetailsProps) => {
  return (
    <div className="bg-muted shadow-card flex flex-col gap-6 rounded-4xl p-6">
      <Header title="Product details" />
      <div className="grid gap-5">
        <DetailRow label="Name" value={name} />
        <DetailRow label="Description" value={description} />
        <DetailRow label="Price" value={`$${(price / 100).toFixed(2)}`} />
        <DetailRow label="Recurring interval" value={recurringInterval} />
        <DetailRow
          label="Created at"
          value={format(createdAt, "MMMM d, yyyy")}
        />
        {scope && <DetailRow label="Services" value={scope.join(", ")} />}
      </div>
      {children}
    </div>
  );
};

interface ClientDetailsProps {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  joinedAt: Date;
}

const ClientDetails = ({
  name,
  email,
  phone,
  company,
  address,
  joinedAt,
}: ClientDetailsProps) => {
  const phoneDigits = phone.replace(/\D/g, "");
  return (
    <div className="bg-muted shadow-card flex flex-col gap-6 rounded-4xl p-6">
      <Header title="Client details" />
      <div className="grid gap-5">
        <DetailRow label="Name" value={name} />
        <DetailRow label="Email" value={email} href={`mailto:${email}`} />
        <DetailRow
          label="Phone"
          value={phone}
          href={phoneDigits ? `tel:${phoneDigits}` : undefined}
        />
        <DetailRow label="Company" value={company} />
        <DetailRow label="Address" value={address} />
        <DetailRow label="Joined" value={format(joinedAt, "MMMM d, yyyy")} />
      </div>
    </div>
  );
};

interface SubscriptionsDetailsProps {
  subscriptions: {
    id: string;
    status: string;
    amount: number;
    email: string;
    createdAt: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date | null;
  }[];
}
const SubscriptionsDetails = ({ subscriptions }: SubscriptionsDetailsProps) => {
  return (
    <div>
      <p className="mb-2 px-8 text-lg font-medium">Subscriptions</p>
      <div className="bg-muted shadow-card flex flex-col gap-6 overflow-hidden rounded-4xl *:data-[slot=table-container]:bg-transparent">
        <Table>
          <TableHeader>
            <TableRow className="h-14 hover:bg-transparent">
              <TableHead className="pl-8 text-lg">Email</TableHead>
              <TableHead className="text-lg">Status</TableHead>
              <TableHead className="text-lg">Amount</TableHead>
              <TableHead className="text-lg">Date</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody className="bg-background">
            {subscriptions.length === 0 ? (
              <TableRow>
                <TableCell
                  className="text-muted-foreground h-18 pl-8 text-center"
                  colSpan={5}
                >
                  No subscriptions found
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="h-18 pl-8">{sub.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        sub.status === "active" ? "default" : "destructive"
                      }
                    >
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    ${(sub.amount / 100).toFixed(2)}
                    <span className="text-muted-foreground text-xs">/mo</span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {format(sub.createdAt, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="pr-8 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

interface OrdersDetailsProps {
  orders: {
    id: string;
    status: string;
    amount: number;
    email: string;
    createdAt: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date | null;
  }[];
}
const OrdersDetails = ({ orders }: OrdersDetailsProps) => {
  return (
    <div>
      <p className="mb-2 px-8 text-lg font-medium">Orders</p>
      <div className="bg-muted shadow-card flex flex-col gap-6 overflow-hidden rounded-4xl *:data-[slot=table-container]:bg-transparent">
        <Table>
          <TableHeader>
            <TableRow className="h-14 hover:bg-transparent">
              <TableHead className="pl-8 text-lg">Email</TableHead>
              <TableHead className="text-lg">Status</TableHead>
              <TableHead className="text-lg">Amount</TableHead>
              <TableHead className="text-lg">Date</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody className="bg-background">
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  className="text-muted-foreground h-18 pl-8 text-center"
                  colSpan={5}
                >
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="h-18 pl-8">{order.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.status === "paid" ? "default" : "destructive"
                      }
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    ${(order.amount / 100).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {format(order.createdAt, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="pr-8 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

CardAgency.ClientDetails = ClientDetails;
CardAgency.ProductDetails = ProductDetails;
CardAgency.SubscriptionsDetails = SubscriptionsDetails;
CardAgency.OrdersDetails = OrdersDetails;
