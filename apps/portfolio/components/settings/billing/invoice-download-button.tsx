"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { format } from "date-fns";

import { company } from "@workspace/ui/lib/company";
import { InvoicePDF } from "@workspace/ui/pdfs/invoice";
import type { InvoicePDFProps } from "@workspace/ui/pdfs/invoice";

interface Props {
  order: {
    invoiceNumber: string;
    createdAt: Date | null;
    billingName: string;
    email: string;
    totalAmount: number;
    discountAmount: number;
    productId: string;
    billingReason: string;
    project?: string;
  };
  userName?: string;
}

export function InvoiceDownloadButton({ order, userName }: Props) {
  const date = order.createdAt ? format(order.createdAt, "MMM d, yyyy") : "—";

  const amount = order.totalAmount / 100;
  const discount = order.discountAmount / 100;

  const description = order.project
    ? `${order.project} — ${order.billingReason.replace(/_/g, " ")}`
    : order.billingReason.replace(/_/g, " ");

  const invoiceProps: InvoicePDFProps = {
    orderNumber: order.invoiceNumber || order.productId.slice(0, 8),
    date,

    fromName: company.name,
    fromPhone: company.phone,
    fromAddress: company.location,

    toName: userName || order.billingName,
    toPhone: "",
    toAddress: order.email,

    items: [
      {
        description: description.charAt(0).toUpperCase() + description.slice(1),
        qty: 1,
        price: amount + discount, // pre-discount price
      },
      ...(discount > 0
        ? [{ description: "Discount applied", qty: 1, price: -discount }]
        : []),
    ],

    taxRate: 0,

    paymentInfo: {
      bankName: "Mercury Bank",
      accountName: company.name,
      accountNumber: "****",
    },

    contact: {
      phone: company.phone,
      email: company.email,
      website: "alisamadii.com",
    },

    companyName: "ALISAMADII",
    slogan: "QUALITY SOFTWARE",
  };

  const fileName = `invoice-${order.invoiceNumber || order.productId.slice(0, 8)}.pdf`;

  return (
    <PDFDownloadLink
      document={<InvoicePDF {...invoiceProps} />}
      fileName={fileName}
      className="mt-2 flex w-full items-center justify-center rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
    >
      {({ loading }) => (loading ? "Preparing…" : "Download Invoice")}
    </PDFDownloadLink>
  );
}
