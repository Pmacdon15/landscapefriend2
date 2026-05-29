const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  console.log("Deleting all route orders...");
  await sql`DELETE FROM route_orders`;
  console.log("All route orders deleted.");
}
run().catch(console.error);
