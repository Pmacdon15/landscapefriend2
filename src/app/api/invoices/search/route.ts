import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getInvoicesDal } from "@/dal/invoices";

export async function GET(request: Request) {
  await auth.protect();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || undefined;

  try {
    const { data } = await getInvoicesDal(1, q);
    return NextResponse.json({ invoices: data });
  } catch (error) {
    console.error("Failed to search invoices", error);
    return NextResponse.json(
      { error: "Failed to search invoices" },
      { status: 500 },
    );
  }
}
