import { cacheTag } from "next/cache";
import { sql } from "../client";

export interface DbInvoiceItem {
  id: string;
  invoice_id: string;
  service_type: string;
  address_id: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
  street?: string | null;
  city?: string | null;
}

export interface DbInvoiceResult {
  id: string;
  org_id: string;
  client_id: string;
  invoice_number: string;
  status: string;
  issue_date: Date | string;
  due_date: Date | string;
  notes: string | null;
  tax_rate: number;
  created_at: Date;
  updated_at: Date;
  sent_at: Date | null;
  paid_at: Date | null;
  client_name: string;
  client_email: string | null;
  total_amount: number;
  items: DbInvoiceItem[];
  total_count?: number;
}

export interface DbInvoiceRow {
  id: string;
  org_id: string;
  client_id: string;
  invoice_number: string;
  status: string;
  issue_date: Date | string;
  due_date: Date | string;
  notes: string | null;
  tax_rate: number | string;
  created_at: Date | string;
  updated_at: Date | string;
  sent_at: Date | string | null;
  paid_at: Date | string | null;
}

export async function getInvoicesDb(
  orgId: string,
  limit: number,
  offset: number,
  searchQuery?: string,
  statusFilter?: string,
): Promise<DbInvoiceResult[]> {
  "use cache";
  cacheTag(
    `invoices-${orgId}`,
    `invoices-search-${orgId}-${searchQuery || ""}-${statusFilter || ""}`,
  );

  const searchPattern = searchQuery ? `%${searchQuery}%` : null;
  const statusVal =
    statusFilter && statusFilter !== "all" ? statusFilter : null;

  const result = await sql`
    WITH filtered_invoices AS (
      SELECT DISTINCT i.*
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      LEFT JOIN addresses a ON ii.address_id = a.id
      WHERE i.org_id = ${orgId}
      AND (${!statusVal}::boolean OR i.status = ${statusVal})
      AND (
        ${!searchQuery}::boolean OR
        i.id::text ILIKE ${searchPattern} OR
        c.name ILIKE ${searchPattern} OR
        i.invoice_number ILIKE ${searchPattern} OR
        i.status ILIKE ${searchPattern} OR
        a.street ILIKE ${searchPattern} OR
        a.city ILIKE ${searchPattern} OR
        ii.description ILIKE ${searchPattern} OR
        ii.service_type ILIKE ${searchPattern}
      )
    ),
    total_count AS (
      SELECT count(*) as count FROM filtered_invoices
    ),
    paginated_invoices AS (
      SELECT * FROM filtered_invoices
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    )
    SELECT 
      pi.id,
      pi.org_id,
      pi.client_id,
      pi.invoice_number,
      pi.status,
      pi.issue_date,
      pi.due_date,
      pi.notes,
      pi.tax_rate::float AS tax_rate,
      pi.created_at,
      pi.updated_at,
      pi.sent_at,
      pi.paid_at,
      c.name AS client_name,
      c.email AS client_email,
      (SELECT count FROM total_count)::int as total_count,
      COALESCE(
        (
          SELECT SUM(amount) * (1 + COALESCE(pi.tax_rate, 0) / 100.0)
          FROM invoice_items 
          WHERE invoice_id = pi.id
        ),
        0
      )::float AS total_amount,
      COALESCE(
        (
          SELECT jsonb_agg(item_data ORDER BY item_data.created_at ASC)
          FROM (
            SELECT ii.*, a.street, a.city
            FROM invoice_items ii
            LEFT JOIN addresses a ON ii.address_id = a.id
            WHERE ii.invoice_id = pi.id
          ) item_data
        ),
        '[]'::jsonb
      ) AS items
    FROM paginated_invoices pi
    JOIN clients c ON pi.client_id = c.id
    ORDER BY pi.created_at DESC;
  `;

  return result as unknown as DbInvoiceResult[];
}

export async function getInvoiceByIdDb(
  invoiceId: string,
): Promise<DbInvoiceResult | null> {
  "use cache";
  cacheTag(`invoice-detail-${invoiceId}`);

  const result = await sql`
    SELECT 
      i.id,
      i.org_id,
      i.client_id,
      i.invoice_number,
      i.status,
      i.issue_date,
      i.due_date,
      i.notes,
      i.tax_rate::float AS tax_rate,
      i.created_at,
      i.updated_at,
      i.sent_at,
      i.paid_at,
      c.name AS client_name,
      c.email AS client_email,
      COALESCE(
        (
          SELECT SUM(amount) * (1 + COALESCE(i.tax_rate, 0) / 100.0)
          FROM invoice_items 
          WHERE invoice_id = i.id
        ),
        0
      )::float AS total_amount,
      COALESCE(
        (
          SELECT jsonb_agg(item_data ORDER BY item_data.created_at ASC)
          FROM (
            SELECT ii.*, a.street, a.city
            FROM invoice_items ii
            LEFT JOIN addresses a ON ii.address_id = a.id
            WHERE ii.invoice_id = i.id
          ) item_data
        ),
        '[]'::jsonb
      ) AS items
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    WHERE i.id = ${invoiceId};
  `;

  if (result.length === 0) return null;
  return result[0] as unknown as DbInvoiceResult;
}

export async function insertInvoiceDb(
  orgId: string,
  clientId: string,
  invoiceNumber: string,
  issueDate: string,
  dueDate: string,
  notes: string | null,
  taxRate: number,
  items: {
    service_type: string;
    address_id: string | null;
    description: string | null;
    quantity: number;
    unit_price: number;
  }[],
): Promise<DbInvoiceResult> {
  // 1. Insert Invoice
  const invoiceResult = await sql`
    INSERT INTO invoices (org_id, client_id, invoice_number, issue_date, due_date, notes, tax_rate)
    VALUES (${orgId}, ${clientId}, ${invoiceNumber}, ${issueDate}::date, ${dueDate}::date, ${notes || null}, ${taxRate})
    RETURNING *
  `;

  const newInvoice = invoiceResult[0];

  // 2. Insert Items
  for (const item of items) {
    const amount = item.quantity * item.unit_price;
    await sql`
      INSERT INTO invoice_items (invoice_id, service_type, address_id, description, quantity, unit_price, amount)
      VALUES (${newInvoice.id}, ${item.service_type}, ${item.address_id || null}, ${item.description || null}, ${item.quantity}, ${item.unit_price}, ${amount})
    `;
  }

  // 3. Return full populated invoice
  const fullInvoice = await getInvoiceByIdDb(newInvoice.id);
  if (!fullInvoice) throw new Error("Failed to retrieve created invoice");

  return fullInvoice;
}

export async function updateInvoiceStatusDb(
  invoiceId: string,
  status: string,
): Promise<DbInvoiceResult | null> {
  let result: DbInvoiceRow[] = [];
  const now = new Date().toISOString();

  if (status === "sent") {
    result = (await sql`
      UPDATE invoices
      SET status = ${status}, sent_at = ${now}, updated_at = ${now}
      WHERE id = ${invoiceId}
      RETURNING *
    `) as unknown as DbInvoiceRow[];
  } else if (status === "paid") {
    result = (await sql`
      UPDATE invoices
      SET status = ${status}, paid_at = ${now}, updated_at = ${now}
      WHERE id = ${invoiceId}
      RETURNING *
    `) as unknown as DbInvoiceRow[];
  } else {
    result = (await sql`
      UPDATE invoices
      SET status = ${status}, updated_at = ${now}
      WHERE id = ${invoiceId}
      RETURNING *
    `) as unknown as DbInvoiceRow[];
  }

  if (result.length === 0) return null;
  return getInvoiceByIdDb(invoiceId);
}

export async function deleteInvoiceDb(
  invoiceId: string,
): Promise<DbInvoiceResult | null> {
  const result = await sql`
    DELETE FROM invoices
    WHERE id = ${invoiceId}
    RETURNING *
  `;

  if (result.length === 0) return null;
  return result[0] as unknown as DbInvoiceResult;
}

export interface RevenueStats {
  month: string; // "YYYY-MM"
  revenue: number;
}

export async function getRevenueGraphStatsDb(
  orgId: string,
): Promise<RevenueStats[]> {
  "use cache";
  cacheTag(`invoices-${orgId}`, `invoices-revenue-${orgId}`);

  const result = await sql`
    SELECT 
      to_char(issue_date, 'YYYY-MM') AS month,
      COALESCE(SUM(
        (
          SELECT SUM(amount) * (1 + COALESCE(i.tax_rate, 0) / 100.0)
          FROM invoice_items 
          WHERE invoice_id = i.id
        )
      ), 0)::float AS revenue
    FROM invoices i
    WHERE i.org_id = ${orgId}
    AND i.status IN ('sent', 'paid')
    GROUP BY month
    ORDER BY month ASC
    LIMIT 12;
  `;

  return result as unknown as RevenueStats[];
}

export async function getNextInvoiceNumberDb(orgId: string): Promise<string> {
  const result = await sql`
    SELECT invoice_number 
    FROM invoices
    WHERE org_id = ${orgId}
    ORDER BY created_at DESC
    LIMIT 1;
  `;

  if (result.length === 0) {
    return "INV-0001";
  }

  const lastNumStr = result[0].invoice_number;
  const match = lastNumStr.match(/INV-(\d+)/);
  if (match) {
    const nextNum = parseInt(match[1], 10) + 1;
    return `INV-${String(nextNum).padStart(4, "0")}`;
  }

  return `INV-${Date.now()}`;
}

export async function getExistingInvoiceNumbersDb(
  orgId: string,
): Promise<string[]> {
  "use cache";
  cacheTag(`invoices-existing-numbers-${orgId}`);

  const result = await sql`
    SELECT invoice_number 
    FROM invoices
    WHERE org_id = ${orgId}
  `;
  return result.map((r) => r.invoice_number);
}
