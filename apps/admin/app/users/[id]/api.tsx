"use client";

import { ApiKeysCard } from "@/components/users/api/api-keys-card";
import { ApiSettingsForm } from "@/components/users/api/api-settings-form";
import { EmailUsage } from "@/components/users/api/email-usage";

export const Api = () => {
  return (
    <div className="space-y-6">
      <EmailUsage />
      <ApiKeysCard />
      <ApiSettingsForm />
    </div>
  );
};
