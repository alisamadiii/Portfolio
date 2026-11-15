import { createVerify } from "node:crypto";

// Amazon SNS HTTP(S) message verification
// (docs: "Verifying the signatures of Amazon SNS messages"). The api's SES
// inbound webhook only trusts a message after this passes.

export type SnsMessage = {
  Type: "Notification" | "SubscriptionConfirmation" | "UnsubscribeConfirmation" | string;
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  Signature: string;
  SignatureVersion: string;
  SigningCertURL: string;
  Subject?: string;
  SubscribeURL?: string;
  Token?: string;
};

/** Only certificates served by SNS itself, over https. */
export function isSnsCertUrl(raw: string) {
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/.test(url.hostname) &&
      url.pathname.startsWith("/SimpleNotificationService-") &&
      url.pathname.endsWith(".pem")
    );
  } catch {
    return false;
  }
}

/** The exact "Key\nValue\n" string SNS signs, per message type. */
export function snsStringToSign(msg: SnsMessage) {
  const keys =
    msg.Type === "Notification"
      ? ["Message", "MessageId", ...(msg.Subject !== undefined ? ["Subject"] : []), "Timestamp", "TopicArn", "Type"]
      : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
  return keys.map((k) => `${k}\n${msg[k as keyof SnsMessage] ?? ""}\n`).join("");
}

/** Verifies `msg` against the PEM certificate (or public key) it names. */
export function verifySnsSignature(msg: SnsMessage, certPem: string) {
  const algorithm = msg.SignatureVersion === "2" ? "RSA-SHA256" : msg.SignatureVersion === "1" ? "RSA-SHA1" : null;
  if (!algorithm || !msg.Signature) return false;
  try {
    return createVerify(algorithm).update(snsStringToSign(msg), "utf8").verify(certPem, msg.Signature, "base64");
  } catch {
    return false;
  }
}

/**
 * SNS retries a delivery for a while, so allow a few hours, but an old
 * captured message can't be replayed forever.
 */
const MAX_AGE_MS = 6 * 3600_000;

export function isFreshSnsTimestamp(timestamp: string, now = Date.now()) {
  const at = Date.parse(timestamp);
  return Number.isFinite(at) && now - at <= MAX_AGE_MS && at - now <= 15 * 60_000;
}

const certCache = new Map<string, string>();

/** Full check: right topic, recent, SNS-hosted cert, valid signature. */
export async function verifySnsMessage(msg: SnsMessage, topicArn: string) {
  if (!msg || msg.TopicArn !== topicArn || !isSnsCertUrl(msg.SigningCertURL)) return false;
  if (!isFreshSnsTimestamp(msg.Timestamp)) return false;
  let pem = certCache.get(msg.SigningCertURL);
  if (!pem) {
    const res = await fetch(msg.SigningCertURL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return false;
    pem = await res.text();
    certCache.set(msg.SigningCertURL, pem);
  }
  return verifySnsSignature(msg, pem);
}
