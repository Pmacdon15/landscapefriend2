import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getClientsForInfoDal, searchClientsDal } from "@/dal/clients";

export async function GET(request: Request) {
  await auth.protect();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    try {
      const { clients } = await getClientsForInfoDal(1);
      return NextResponse.json({ clients });
    } catch (error) {
      console.error("Failed to fetch default clients", error);
      return NextResponse.json({ clients: [] });
    }
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
