export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    if (new URL(request.url).pathname !== `/${(env.HOOK_TOKEN ?? "").trim()}`) {
      return new Response("Not found", { status: 404 });
    }
    const res = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    });
    return new Response(null, { status: res.ok ? 200 : res.status });
  },
};
