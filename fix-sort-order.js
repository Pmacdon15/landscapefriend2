const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log("Fetching addresses...");
  const addresses = await sql`
    SELECT a.id as address_id, c.org_id, ro.sort_order
    FROM addresses a
    JOIN clients c ON a.client_id = c.id
    LEFT JOIN route_orders ro ON a.id = ro.address_id
    WHERE a.status != 'deleted'
    ORDER BY c.org_id, ro.sort_order ASC NULLS LAST, a.created_at ASC
  `;

  console.log(`Found ${addresses.length} addresses. Rebalancing...`);

  let currentOrg = null;
  let counter = 1000;

  for (const addr of addresses) {
    if (currentOrg !== addr.org_id) {
      currentOrg = addr.org_id;
      counter = 1000;
    }

    await sql`
      INSERT INTO route_orders (address_id, org_id, sort_order)
      VALUES (${addr.address_id}, ${addr.org_id}, ${counter})
      ON CONFLICT (address_id) DO UPDATE SET sort_order = EXCLUDED.sort_order, updated_at = CURRENT_TIMESTAMP
    `;
    counter += 1000;
  }
  console.log("Sort order rebalanced successfully!");
}
run().catch(console.error);
