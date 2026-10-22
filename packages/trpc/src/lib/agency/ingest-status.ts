// Pure mapping of a Data Manager retrieveRequestStatus response to an upload
// verdict. Ingestion is async: a 200 on events:ingest only means the payload
// was received, so each request is checked later with its request id.

export type IngestDestinationStatus = {
  requestStatus?: string;
  errorInfo?: {
    errorCounts?: { reason?: string; recordCount?: string }[];
  };
};

export type IngestVerdict =
  | { done: false }
  | { done: true; ok: true }
  | { done: true; ok: false; error: string };

/**
 * We send one event to one destination, so the first destination's status is
 * the whole story. PROCESSING (or anything unknown) means check again later.
 */
export function ingestVerdict(
  statuses: IngestDestinationStatus[] | undefined
): IngestVerdict {
  const status = statuses?.[0]?.requestStatus;
  if (status === "SUCCESS") return { done: true, ok: true };
  if (status === "FAILED" || status === "PARTIAL_SUCCESS") {
    const reason = statuses?.[0]?.errorInfo?.errorCounts?.find(
      (count) => count.reason
    )?.reason;
    return {
      done: true,
      ok: false,
      error: reason
        ? `Google rejected the conversion: ${reason}`
        : "Google rejected the conversion.",
    };
  }
  return { done: false };
}
