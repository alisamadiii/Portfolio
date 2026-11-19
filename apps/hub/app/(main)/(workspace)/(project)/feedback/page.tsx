"use client";

import { DocumentTitle } from "@/components/document-title";
import { FeedbackPage } from "@/components/feedback/feedback-page";
import { ProjectFeatureGate } from "@/components/settings/project-paywall";

export default function ProjectFeedbackPage() {
  return (
    <>
      <DocumentTitle title="Feedback" />
      <ProjectFeatureGate feature="feedback">
        <FeedbackPage />
      </ProjectFeatureGate>
    </>
  );
}
