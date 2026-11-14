// Public: clients land here after paying a client-website Stripe link
// (success_url in packages/trpc/src/lib/client-websites-payments.ts). No
// client data.

const PAID_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Payment received</title>
<style>
body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;background:#14110f;color:#f6f3ee;font:16px/1.5 system-ui,sans-serif;text-align:center}
h1{margin:0 0 8px;font-size:28px}
p{margin:0;color:#b5aea5}
</style>
</head>
<body>
<main>
<h1>Payment received. Thank you!</h1>
<p>Your website goes live within one day.</p>
</main>
</body>
</html>`;

export function GET() {
  return new Response(PAID_PAGE, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
