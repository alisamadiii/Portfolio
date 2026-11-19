"use client";

import { useParams } from "next/navigation";

import { DocumentTitle } from "@/components/document-title";
import { ContactListPage } from "@/components/newsletter/contacts";
import { NewsletterGate } from "@/components/newsletter/newsletter-gate";

export default function NewsletterContactListPage() {
  const { listId } = useParams<{ listId: string }>();
  return (
    <>
      <DocumentTitle title="Contacts" />
      <NewsletterGate>
        <ContactListPage listId={listId} />
      </NewsletterGate>
    </>
  );
}
