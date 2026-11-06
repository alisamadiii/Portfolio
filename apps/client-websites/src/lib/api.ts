import axios from "axios";

import type { Project, ProjectDetail } from "../../server/meta";
import type {
  CatalogPrice,
  CreateLinkInput,
  PaymentLink,
} from "../../server/payments-schema";

export type { Meta, Project, ProjectDetail } from "../../server/meta";
export type {
  CatalogPrice,
  CreateLinkInput,
  PaymentLink,
} from "../../server/payments-schema";

// Kept in step with PRESENTATION_FILE / PREVIEW_VIDEO_FILE in server/meta.ts,
// which pulls in zod and so stays out of the browser bundle.
export const PRESENTATION = "presentation.html";
export const PREVIEW_VIDEO = "preview.mp4";

// Own backend only (same origin, Basic Auth handled by the browser).
export const api = axios.create({ baseURL: "/api" });

export const getConfig = async () =>
  (
    await api.get<{ originAddress: string | null; stripeEnabled: boolean }>(
      "/config"
    )
  ).data;

export const getCatalog = async () =>
  (await api.get<CatalogPrice[]>("/stripe/catalog")).data;

export const findCustomer = async (email: string) =>
  (
    await api.get<{ name: string | null; email: string | null } | null>(
      "/stripe/customer",
      { params: { email } }
    )
  ).data;

export const getPayments = async (slug: string) =>
  (await api.get<PaymentLink[]>(`/projects/${slug}/payments`)).data;

export const createPayment = async (slug: string, input: CreateLinkInput) =>
  (await api.post<PaymentLink>(`/projects/${slug}/payments`, input)).data;

export const expirePayment = async (slug: string, id: string) => {
  await api.post(`/projects/${slug}/payments/${id}/expire`);
};

// The server's reason for a failed request, when it sent one.
export const errorMessage = (err: unknown) =>
  (axios.isAxiosError(err) && err.response?.data?.error) ||
  "Something went wrong";

export const formatMoney = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

export const getProjects = async () =>
  (await api.get<Project[]>("/projects")).data;

export const getProject = async (slug: string) =>
  (await api.get<ProjectDetail>(`/projects/${slug}`)).data;

export const formatDate = (value: string | null) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// _meta.json is uploaded content: only http(s) values become links.
export const httpUrl = (value?: string) =>
  value && /^https?:\/\//i.test(value) ? value : null;
