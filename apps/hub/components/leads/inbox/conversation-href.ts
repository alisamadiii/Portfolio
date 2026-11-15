/** A lead's conversation in the Leads app (`base` = the project's /leads path). */
export const conversationHref = (base: string, leadId: number) => `${base}?tab=conversations&lead=${leadId}`;
