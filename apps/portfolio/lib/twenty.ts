// Thin client for the self-hosted Twenty CRM instance (crm.alisamadii.com).
// Quote submissions only create a Person — the CRM's "new-lead-emails"
// workflow (trigger: person created/updated) handles everything downstream:
// confirmation email, internal alert, Welcome Sent flag.

const DEFAULT_URL = "https://crm.alisamadii.com";

export class TwentyError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "TwentyError";
  }
}

const getApiKey = () => {
  const apiKey = process.env.TWENTY_API_KEY;
  if (!apiKey) {
    throw new Error("Missing TWENTY_API_KEY in environment variables");
  }
  return apiKey;
};

export const isTwentyConfigured = () => Boolean(process.env.TWENTY_API_KEY);

const twentyUrl = () => process.env.TWENTY_API_URL ?? DEFAULT_URL;

async function twentyGql<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const res = await fetch(new URL("/graphql", twentyUrl()), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      // The instance's proxy rejects non-browser user agents with a 403.
      "User-Agent": "Mozilla/5.0 (compatible; alisamadii-portfolio)",
    },
    body: JSON.stringify({ query, variables }),
  });

  const parsed = (await res.json().catch(() => null)) as {
    data?: T;
    errors?: { message?: string }[];
  } | null;

  if (!res.ok || parsed?.errors?.length) {
    const message =
      parsed?.errors?.map((e) => e.message).join("; ") ?? res.statusText;
    throw new TwentyError(res.status, message);
  }
  if (!parsed?.data) {
    throw new TwentyError(res.status, "Empty GraphQL response");
  }
  return parsed.data;
}

export type QuoteLead = {
  name: string;
  email: string;
  phone?: string;
};

// Twenty rejects invalid phone numbers outright, and the form field is free
// text — only pass a phone that sanitizes to a plausible US number.
const usPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  const national =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return national.length === 10 ? national : undefined;
};

const findPersonByEmail = async (email: string) => {
  const data = await twentyGql<{
    people: { edges: { node: { id: string } }[] };
  }>(
    `query($e:String!){ people(filter:{ emails:{ primaryEmail:{ eq:$e } } }, first:1){
      edges{ node{ id } } } }`,
    { e: email }
  );
  return data.people.edges[0]?.node.id;
};

// Create the Person and let the CRM workflow take it from there. Repeat
// submitters (or an email lingering in the CRM trash) already exist — skip
// silently, they've had their confirmation.
export async function createLeadFromQuote(lead: QuoteLead) {
  if (await findPersonByEmail(lead.email)) return;

  const [firstName = "", ...rest] = lead.name.trim().split(/\s+/);
  const phone = lead.phone ? usPhone(lead.phone) : undefined;
  const base = {
    name: { firstName, lastName: rest.join(" ") },
    emails: { primaryEmail: lead.email },
  };
  const create = (withPhone: boolean) =>
    twentyGql<{ createPerson: { id: string } }>(
      `mutation($d:PersonCreateInput!){ createPerson(data:$d){ id } }`,
      {
        d:
          withPhone && phone
            ? {
                ...base,
                phones: {
                  primaryPhoneNumber: phone,
                  primaryPhoneCallingCode: "+1",
                  primaryPhoneCountryCode: "US",
                },
              }
            : base,
      }
    );

  try {
    await create(true);
  } catch (error) {
    // Phone validation is the only lead-dependent failure — retry without it.
    if (phone) await create(false);
    else throw error;
  }
}
