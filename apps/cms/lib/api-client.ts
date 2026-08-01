type ApiResponseLike = {
  status?: string;
  message?: string;
};

const parseJsonSafely = async <T = unknown>(
  response: Response
): Promise<T | null> => {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};

// 402 is reserved for feature gates (see lib/feature-access.ts). Every
// mutation surface funnels through requireApiSuccess, so dispatching here
// opens the purchase dialog app-wide without per-surface wiring — the
// SubscriptionGateProvider listens for this event.
const SUBSCRIPTION_REQUIRED_EVENT = "cms:subscription-required";

const requireApiSuccess = async <T = any>(
  response: Response,
  fallbackMessage: string
): Promise<T> => {
  const payload = await parseJsonSafely<T & ApiResponseLike>(response);

  if (!response.ok) {
    const message =
      payload?.message ||
      `${fallbackMessage}: ${response.status} ${response.statusText}`;
    if (response.status === 402 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SUBSCRIPTION_REQUIRED_EVENT));
    }
    throw new Error(message);
  }

  if (
    payload &&
    typeof payload === "object" &&
    "status" in payload &&
    payload.status !== "success"
  ) {
    throw new Error(payload.message || fallbackMessage);
  }

  return (payload ?? ({} as T)) as T;
};

export { requireApiSuccess, SUBSCRIPTION_REQUIRED_EVENT };
