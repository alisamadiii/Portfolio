// Checkout / portal / receipt-verification — all through the shared tRPC
// router (`@workspace/trpc/client`), identical to the Next.js apps, so router
// changes propagate here too.
import { useMutation } from '@tanstack/react-query'
import { useTRPC } from '@workspace/trpc/client'

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
