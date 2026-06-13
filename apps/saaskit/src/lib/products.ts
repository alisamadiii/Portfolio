// Fetches SaaSKit pricing plans from the backend database via the public
// tRPC endpoint (`products.list`, a baseProcedure) hosted by the portfolio app.
// We call it over plain HTTP/react-query rather than the `@workspace/trpc`
// client because that package is Next.js-coupled (server-only / next/headers);
// this keeps the standalone Vite app decoupled while reading the same data.

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const PROJECT = 'SAASKIT'

export type ProductMetadata = {
  project?: string
  /** Optional ordered feature bullets shown on the pricing card. */
  features?: string[]
  [key: string]: unknown
}

/** Mirrors the `product` row in @workspace/drizzle/schema (JSON-serialized). */
export type Product = {
  id: string
  name: string
  description: string | null
  popular: boolean
  priceAmount: number // stored in cents
  priceCurrency: string
  recurringInterval: 'day' | 'week' | 'month' | 'year' | null
  isRecurring: boolean
  isArchived: boolean
  metadata: ProductMetadata | null
}

type TrpcResponse<T> = { result: { data: T } }

/**
 * Returns the active SaaSKit products, cheapest first.
 * Throws on network / HTTP / tRPC error so react-query can surface it.
 */
export async function fetchSaaskitPlans(signal?: AbortSignal): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/trpc/products.list`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    signal,
  })
  if (!res.ok) throw new Error(`products.list failed: ${res.status}`)

  const json = (await res.json()) as TrpcResponse<Product[]> | { error: unknown }
  if ('error' in json) throw new Error('products.list returned an error')

  return json.result.data
    .filter((p) => !p.isArchived && p.metadata?.project === PROJECT)
    .sort((a, b) => a.priceAmount - b.priceAmount)
}

export const productsQueryKey = ['saaskit', 'plans'] as const
