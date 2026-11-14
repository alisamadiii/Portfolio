import { api, program } from '../config';

export type ApplicationPayload = {
  fullName: string;
  email: string;
  phone: string | null;
  occupation: string;
  city: string;
  knowOwners: string;
  whyJoin: string;
  agreement: {
    version: string;
    accepted: true;
    signature: string;
    initials: string;
    signedAt: string; // ISO date
  };
};

/** What your backend can send back. Both fields are optional. */
export type ApplicationResponse = {
  id?: string;
  pdfUrl?: string; // link to the signed agreement PDF
};

export class ApplicationError extends Error {
  constructor(readonly userMessage: string | null) {
    super(userMessage ?? 'Application failed');
  }
}

export async function submitApplication(payload: ApplicationPayload): Promise<ApplicationResponse> {
  const res = await fetch(api.apply, {
    method: 'POST',
    credentials: 'include', // Client Hub session cookie (.alisamadii.com)
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    // 400/401/409/429 carry a message meant for the applicant.
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApplicationError(res.status < 500 ? body?.error ?? null : null);
  }
  try {
    return (await res.json()) as ApplicationResponse;
  } catch {
    return {};
  }
}

export type Me = {
  user: { name: string; email: string } | null;
  partner: { status: 'pending' | 'approved' | 'rejected'; createdAt: string } | null;
};

export async function getMe(): Promise<Me> {
  const res = await fetch(api.me, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Me;
}

export const AGREEMENT_VERSION = program.agreementVersion;
