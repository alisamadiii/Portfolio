"use client";

import { DocumentTitle } from "@/components/document-title";
import { ShopifyPage } from "@/components/shopify/shopify-page";

export default function ProjectShopifyPage() {
  return (
    <>
      <DocumentTitle title="Shopify" />
      <ShopifyPage />
    </>
  );
}
