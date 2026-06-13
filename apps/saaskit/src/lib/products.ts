import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@workspace/trpc/client'
import type { RouterOutputs } from '@workspace/trpc/routers/_app'

export type Product = RouterOutputs['products']['list'][number]
type ProductMetadata = { project?: string; features?: string[] }

const PROJECT = 'SAASKIT'

/**
 * SaaSKit plans from the database, cheapest first — read through the shared
 * tRPC router (`products.list`) so it stays consistent with every other app.
 */
export function useSaaskitPlans() {
  const trpc = useTRPC()
  return useQuery(
    trpc.products.list.queryOptions(undefined, {
      select: (rows: Product[]) =>
        rows
          .filter(
            (p) =>
              !p.isArchived && (p.metadata as ProductMetadata | null)?.project === PROJECT,
          )
          .sort((a, b) => a.priceAmount - b.priceAmount),
    }),
  )
}

export function productFeatures(p: Product): string[] | undefined {
  return (p.metadata as ProductMetadata | null)?.features
}
