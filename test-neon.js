const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });
async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT first_cut_date FROM schedules LIMIT 1`;
  console.log("Type:", typeof rows[0].first_cut_date);
  console.log("Constructor:", rows[0].first_cut_date.constructor.name);
  console.log("Value:", rows[0].first_cut_date);
  if (rows[0].first_cut_date instanceof Date) {
     console.log("ISO:", rows[0].first_cut_date.toISOString());
  }
}
run();
