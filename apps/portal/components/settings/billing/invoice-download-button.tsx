"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { format } from "date-fns";

import { company } from "@workspace/ui/lib/company";
import type { InvoiceData } from "@workspace/ui/pdfs/invoice";
import { InvoiceDocument } from "@workspace/ui/pdfs/invoice";

interface Props {
  order: {
    id: string;
    createdAt: Date | null;
    amount: number;
    productName: string | null;
    billingReason: string | null;
  };
  userName?: string;
  userPhone?: string | null;
  userCompany?: string | null;
  userAddress?: string | null;
}

export function InvoiceDownloadButton({
  order,
  userName,
  userPhone,
  userCompany,
  userAddress,
}: Props) {
  const issueDate = order.createdAt
    ? format(order.createdAt, "MM/dd/yyyy")
    : "—";

  const amount = order.amount / 100;

  const reason = order.billingReason?.replace(/_/g, " ") ?? "purchase";
  const description = reason;

  const items: InvoiceData["items"] = [
    {
      description: description.charAt(0).toUpperCase() + description.slice(1),
      quantity: 1,
      price: amount,
    },
  ];

  const invoiceData: InvoiceData = {
    invoiceNumber: order.id.slice(0, 12),
    issueDate,
    dueDate: issueDate,
    from: {
      company: company.name,
      name: company.ownerName,
      city: company.location,
      email: company.email,
      phone: company.phone,
      website: company.website,
    },
    to: {
      name: userName || "",
      company: userCompany || "",
      city: userAddress || "",
      country: "",
      email: "",
      phone: userPhone || "",
    },
    items,
    vatRate: 0,
  };

  const fileName = `invoice-${invoiceData.invoiceNumber}.pdf`;

  return (
    <PDFDownloadLink
      document={<InvoiceDocument data={invoiceData} />}
      fileName={fileName}
      className="mt-2 flex w-full items-center justify-center rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
    >
      {({ loading }) => (loading ? "Preparing…" : "Download Invoice")}
    </PDFDownloadLink>
  );
}
