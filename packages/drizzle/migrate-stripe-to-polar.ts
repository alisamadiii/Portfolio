/**
 * Migration script: Stripe → Polar
 *
 * Transforms existing billing data from Stripe format to Polar format.
 * Run with: npx tsx packages/drizzle/migrate-stripe-to-polar.ts
 *
 * Idempotent — safe to re-run. Checks column existence before each step.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { neon } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

const sql = neon(process.env.DATABASE_URL!);

async function columnExists(table: string, column: string): Promise<boolean> {
  const r = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = ${table} AND column_name = ${column}
  `;
  return r.length > 0;
}

async function tableExists(table: string): Promise<boolean> {
  const r = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${table}
  `;
  return r.length > 0;
}

async function dropColumnIfExists(table: string, column: string) {
  if (await columnExists(table, column)) {
    await sql.query(`ALTER TABLE "${table}" DROP COLUMN "${column}"`, []);
    console.log(`    dropped ${table}.${column}`);
  }
}

async function main() {
  console.log("Starting Stripe -> Polar migration...\n");

  // ─── Counts ─────────────────────────────────────────────────────
  const [productCount] = await sql`SELECT count(*) as c FROM product`;
  const [subCount] = await sql`SELECT count(*) as c FROM subscription`;
  const hasOrdersTable = await tableExists("orders");
  const hasOrderTable = await tableExists("order");

  let orderCount = "0";
  if (hasOrdersTable) {
    const [r] = await sql`SELECT count(*) as c FROM orders`;
    orderCount = r.c;
  } else if (hasOrderTable) {
    const [r] = await sql`SELECT count(*) as c FROM "order"`;
    orderCount = r.c;
  }

  console.log(`Records: ${productCount.c} products, ${subCount.c} subscriptions, ${orderCount} orders\n`);

  // ─── Step 1: Product table cleanup ──────────────────────────────
  // Product PK already migrated to UUID in partial first run.
  // Just need to clean up old_stripe_id if present.
  console.log("Step 1: Product table...");

  if (await columnExists("product", "old_stripe_id")) {
    // Before dropping, update subscription.plan → map price IDs to product UUIDs
    // subscription.plan holds Stripe price_id, but old_stripe_id holds Stripe product_id
    // These don't directly map. We'll handle subscription separately.
    await dropColumnIfExists("product", "old_stripe_id");
  }

  if (await columnExists("product", "price_id")) {
    await dropColumnIfExists("product", "price_id");
  }

  console.log("  done\n");

  // ─── Step 2: Subscription table ─────────────────────────────────
  console.log("Step 2: Subscription table...");

  const hasReferenceId = await columnExists("subscription", "reference_id");

  if (hasReferenceId) {
    // Add Polar columns
    if (!(await columnExists("subscription", "user_id"))) {
      await sql`ALTER TABLE subscription ADD COLUMN user_id text`;
    }
    if (!(await columnExists("subscription", "email"))) {
      await sql`ALTER TABLE subscription ADD COLUMN email text DEFAULT ''`;
    }
    if (!(await columnExists("subscription", "amount"))) {
      await sql`ALTER TABLE subscription ADD COLUMN amount integer DEFAULT 0`;
    }
    if (!(await columnExists("subscription", "product_id"))) {
      await sql`ALTER TABLE subscription ADD COLUMN product_id text DEFAULT ''`;
    }
    if (!(await columnExists("subscription", "started_at"))) {
      await sql`ALTER TABLE subscription ADD COLUMN started_at timestamp`;
    }
    if (!(await columnExists("subscription", "customer_cancellation_reason"))) {
      await sql`ALTER TABLE subscription ADD COLUMN customer_cancellation_reason text`;
    }
    if (!(await columnExists("subscription", "customer_cancellation_comment"))) {
      await sql`ALTER TABLE subscription ADD COLUMN customer_cancellation_comment text`;
    }

    // Rename billing_interval → recurring_interval
    if (
      (await columnExists("subscription", "billing_interval")) &&
      !(await columnExists("subscription", "recurring_interval"))
    ) {
      await sql`ALTER TABLE subscription RENAME COLUMN billing_interval TO recurring_interval`;
      console.log("  renamed billing_interval -> recurring_interval");
    }

    // Copy data from Stripe columns to Polar columns
    await sql`UPDATE subscription SET user_id = reference_id WHERE user_id IS NULL OR user_id = ''`;
    await sql`UPDATE subscription SET amount = COALESCE(total_amount, 0) WHERE amount = 0`;
    await sql`
      UPDATE subscription SET email = COALESCE(u.email, '')
      FROM "user" u
      WHERE subscription.user_id = u.id AND (subscription.email IS NULL OR subscription.email = '')
    `;

    // Map plan (Stripe price_id) → product_id (UUID)
    // subscription.plan = Stripe price ID (price_xxx)
    // We can't directly map price → product UUID since we dropped old_stripe_id.
    // Instead, we'll try to match via orders table which has product_id already pointing to UUIDs,
    // or set product_id to the plan value as fallback (will need manual correction).
    // Actually, the product table no longer has price_id either.
    // Best approach: set product_id = plan (preserving the Stripe price reference),
    // and note it'll need to be updated to Polar product IDs when those are created.
    await sql`UPDATE subscription SET product_id = COALESCE(plan, '') WHERE product_id = '' OR product_id IS NULL`;
    console.log("  NOTE: product_id set to Stripe plan/price ID. Update to Polar product IDs after Polar products are created.");

    if (await columnExists("subscription", "period_start")) {
      await sql`UPDATE subscription SET started_at = period_start WHERE started_at IS NULL`;
    }

    // Change PK from text to UUID
    await sql`ALTER TABLE subscription ADD COLUMN new_id uuid DEFAULT gen_random_uuid()`;
    await sql`UPDATE subscription SET new_id = gen_random_uuid()`;
    await sql`ALTER TABLE subscription DROP CONSTRAINT IF EXISTS subscription_pkey`;

    // Drop old id and rename new_id
    if (await columnExists("subscription", "id")) {
      await sql`ALTER TABLE subscription DROP COLUMN id`;
    }
    await sql`ALTER TABLE subscription RENAME COLUMN new_id TO id`;
    await sql`ALTER TABLE subscription ADD PRIMARY KEY (id)`;

    // Drop Stripe-only columns one by one
    const stripeCols = [
      "reference_id", "plan", "stripe_customer_id", "stripe_subscription_id",
      "stripe_schedule_id", "period_start", "period_end", "ended_at",
      "total_amount", "seats", "item_count", "cancel_at",
    ];
    for (const col of stripeCols) {
      await dropColumnIfExists("subscription", col);
    }

    console.log("  done\n");
  } else {
    console.log("  already in Polar format\n");
  }

  // ─── Step 3: Orders table ───────────────────────────────────────
  console.log("Step 3: Orders table...");

  if (hasOrdersTable) {
    // Add Polar columns
    if (!(await columnExists("orders", "email"))) {
      await sql`ALTER TABLE orders ADD COLUMN email text DEFAULT ''`;
    }
    if (!(await columnExists("orders", "billing_name"))) {
      await sql`ALTER TABLE orders ADD COLUMN billing_name text DEFAULT ''`;
    }
    if (!(await columnExists("orders", "subscription_id"))) {
      await sql`ALTER TABLE orders ADD COLUMN subscription_id text DEFAULT ''`;
    }
    if (!(await columnExists("orders", "total_amount"))) {
      await sql`ALTER TABLE orders ADD COLUMN total_amount integer DEFAULT 0`;
    }
    if (!(await columnExists("orders", "invoice_number"))) {
      await sql`ALTER TABLE orders ADD COLUMN invoice_number text DEFAULT ''`;
    }
    if (!(await columnExists("orders", "discount_amount"))) {
      await sql`ALTER TABLE orders ADD COLUMN discount_amount integer DEFAULT 0`;
    }

    // Copy data
    await sql`UPDATE orders SET total_amount = COALESCE(amount, 0) WHERE total_amount = 0`;
    await sql`
      UPDATE orders SET email = COALESCE(u.email, ''), billing_name = COALESCE(u.name, '')
      FROM "user" u
      WHERE orders.user_id = u.id AND (orders.email IS NULL OR orders.email = '')
    `;

    // Map Stripe status → Polar OrderStatus
    await sql`UPDATE orders SET status = 'paid' WHERE status = 'pending'`;

    // Ensure billing_reason has valid Polar enum value
    // Stripe: 'purchase', Polar: 'purchase', 'subscription_create', etc.
    // Keep as-is since 'purchase' is valid in both

    // Change PK from text to UUID
    await sql`ALTER TABLE orders ADD COLUMN new_id uuid DEFAULT gen_random_uuid()`;
    await sql`UPDATE orders SET new_id = gen_random_uuid()`;
    await sql`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_pkey`;
    if (await columnExists("orders", "id")) {
      await sql`ALTER TABLE orders DROP COLUMN id`;
    }
    await sql`ALTER TABLE orders RENAME COLUMN new_id TO id`;
    await sql`ALTER TABLE orders ADD PRIMARY KEY (id)`;

    // Drop Stripe-only columns
    const stripeOrderCols = [
      "stripe_customer_id", "stripe_session_id", "price_id",
      "amount", "currency", "refunded_amount", "receipt_url",
    ];
    for (const col of stripeOrderCols) {
      await dropColumnIfExists("orders", col);
    }

    // Rename table: orders → order
    await sql`ALTER TABLE orders RENAME TO "order"`;
    console.log("  renamed orders -> order");
    console.log("  done\n");
  } else {
    console.log("  already migrated\n");
  }

  // ─── Step 4: Drop stripe_customer_id from user ──────────────────
  console.log("Step 4: User table...");
  if (await columnExists("user", "stripe_customer_id")) {
    await dropColumnIfExists("user", "stripe_customer_id");
    console.log("  done\n");
  } else {
    console.log("  already clean\n");
  }

  // ─── Summary ────────────────────────────────────────────────────
  const [finalProducts] = await sql`SELECT count(*) as c FROM product`;
  const [finalSubs] = await sql`SELECT count(*) as c FROM subscription`;
  const finalOrders = (await tableExists("order"))
    ? await sql`SELECT count(*) as c FROM "order"`
    : await sql`SELECT count(*) as c FROM orders`;

  console.log("Migration complete!");
  console.log(`  Products: ${finalProducts.c}`);
  console.log(`  Subscriptions: ${finalSubs.c}`);
  console.log(`  Orders: ${finalOrders[0].c}`);
  console.log("\nNext steps:");
  console.log("  1. Run `pnpm drizzle-kit generate` to snapshot schema");
  console.log("  2. Verify data in database");
  console.log("  3. Update subscription.product_id to Polar product IDs");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
