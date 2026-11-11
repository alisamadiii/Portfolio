// POST /api/contact: validates against the live Wix form schema (only known
// field targets pass through), then creates a Wix Forms submission. Accepts
// JSON (enhanced form) or urlencoded (no-JS fallback, redirects back).
import type { APIRoute } from "astro";
import { getForm, submitForm, WixError } from "../../lib/wix";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const formId = import.meta.env.WIX_FORM_ID as string | undefined;
  const wantsJson = request.headers.get("accept")?.includes("application/json");
  const reply = (status: number, body: { ok: boolean; error?: string }) =>
    wantsJson
      ? new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
      : redirect(body.ok ? "/?sent=1#contact" : `/?error=${encodeURIComponent(body.error ?? "failed")}#contact`, 303);

  if (!formId) return reply(500, { ok: false, error: "WIX_FORM_ID is not set" });

  let raw: Record<string, unknown>;
  try {
    raw = request.headers.get("content-type")?.includes("application/json")
      ? ((await request.json()) as Record<string, unknown>)
      : Object.fromEntries(await request.formData());
  } catch {
    return reply(400, { ok: false, error: "Bad request body" });
  }

  try {
    const { fields } = await getForm(formId);
    const values: Record<string, string | number> = {};
    for (const f of fields) {
      const v = raw[f.target];
      if (v === undefined || v === null || v === "") {
        if (f.required) return reply(400, { ok: false, error: `${f.label} is required` });
        continue;
      }
      values[f.target] = f.kind === "number" ? Number(v) : String(v).slice(0, 5000);
    }
    await submitForm(formId, values);
    return reply(200, { ok: true });
  } catch (e) {
    console.error("[wix] submission failed", e);
    const msg = e instanceof WixError && e.status === 428 ? "Captcha is enabled on this Wix form. Turn it off for the demo." : "Could not send. Try again.";
    return reply(502, { ok: false, error: msg });
  }
};
