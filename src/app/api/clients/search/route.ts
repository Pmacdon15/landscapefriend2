import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { searchClientsDal } from "@/dal/clients";

export async function GET(request: Request) {
  const { has } = await auth.protect();
  // if (!has({ role: "org:admin" }))
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ clients: [] });
  }

  try {
    const clients = await searchClientsDal(q);
    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Failed to search clients", error);
    return NextResponse.json(
      { error: "Failed to search clients" },
      { status: 500 },
    );
  }
}
