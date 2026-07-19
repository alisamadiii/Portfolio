// Checkout / portal / receipt-verification — all through the shared tRPC
// router (`@workspace/trpc/client`), identical to the Next.js apps, so router
// changes propagate here too.
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTRPC } from '@workspace/trpc/client'
import type { RouterOutputs } from '@workspace/trpc/routers/_app'

export type CheckoutSession = RouterOutputs['payments']['getCheckoutSession']

// Auth is centralized on the portal app — it owns every login/signup screen
const SIGNUP_URL = import.meta.env.DEV
  ? 'http://localhost:3006/signup'
  : 'https://portal.alisamadii.com/signup'

function redirectToSignup() {
  const redirectUrl = encodeURIComponent(window.location.href)
  window.location.href = `${SIGNUP_URL}?redirectUrl=${redirectUrl}`
}

function redirectTo(url: string) {
  window.location.href = url
}

/** Starts Polar checkout for a product, then redirects the browser there. */
export function useCheckout() {
  const trpc = useTRPC()
  return useMutation(
    trpc.payments.createCheckout.mutationOptions({
      onSuccess: (data) => {
        if (data?.url) redirectTo(data.url)
      },
      onError: (error) => {
        if (error.data?.code === 'UNAUTHORIZED') return redirectToSignup()
        window.alert(error.message)
      },
    }),
  )
}

/** Opens the buyer's Polar customer portal (connect GitHub, manage billing). */
export function usePortal() {
  const trpc = useTRPC()
  return useMutation(
    trpc.payments.customerPortal.mutationOptions({
      onSuccess: (data) => {
        if (data?.url) redirectTo(data.url)
      },
      onError: (error) => {
        if (error.data?.code === 'UNAUTHORIZED') return redirectToSignup()
        window.alert(error.message)
      },
    }),
  )
}

/** Verifies a Polar checkout by id after the post-payment redirect. */
export function useCheckoutSession(checkoutId: string | null) {
  const trpc = useTRPC()
  return useQuery(
    trpc.payments.getCheckoutSession.queryOptions(checkoutId ?? '', {
      enabled: Boolean(checkoutId),
      retry: 1,
    }),
  )
}

/**
 * Reads `checkout_id` from the URL. Polar appends it to the success URL, but a
 * `#hash` in that URL can push it after the fragment — so scan the whole href.
 */
export function getCheckoutId(): string | null {
  if (typeof window === 'undefined') return null
  const m = window.location.href.match(/[?&]checkout_id=([^&#/]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

/** Strips Polar's redirect params and restores a clean URL (keeps #pricing). */
export function clearCheckoutParams() {
  if (typeof window === 'undefined') return
  window.history.replaceState({}, '', `${window.location.pathname}#pricing`)
}

export function isCheckoutPaid(status: string): boolean {
  return status === 'succeeded' || status === 'confirmed'
}
