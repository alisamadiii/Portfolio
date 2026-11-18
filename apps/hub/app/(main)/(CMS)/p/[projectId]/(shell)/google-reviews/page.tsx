"use client";

import { DocumentTitle } from "@/components/document-title";
import { GoogleReviewsPage } from "@/components/google-reviews/google-reviews-page";

export default function ProjectGoogleReviewsPage() {
  return (
    <>
      <DocumentTitle title="Google Reviews" />
      <GoogleReviewsPage />
    </>
  );
}
