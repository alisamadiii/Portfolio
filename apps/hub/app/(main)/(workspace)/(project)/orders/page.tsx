import { DocumentTitle } from "@/components/document-title";
import { OrdersPage } from "@/components/orders/orders-page";

export default function OrdersRoute() {
  return (
    <>
      <DocumentTitle title="Orders" />
      <OrdersPage />
    </>
  );
}
