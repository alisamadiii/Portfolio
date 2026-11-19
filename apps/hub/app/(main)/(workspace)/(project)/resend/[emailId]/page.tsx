"use client";

import { DocumentTitle } from "@/components/document-title";
import { ResendEmailPage } from "@/components/resend/resend-email-page";

export default function ProjectResendEmailPage() {
  return (
    <>
      <DocumentTitle title="Email · Resend" />
      <ResendEmailPage />
    </>
  );
}
