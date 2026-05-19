import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getClientsForCutListDal } from "@/dal/clients";

export async function GET(request: Request) {
  await auth.protect();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const userId = searchParams.get("userId") || undefined;

  if (!date) {
    return NextResponse.json({ clients: [] }, { status: 400 });
  }

  try {
    const clients = await getClientsForCutListDal(date, undefined, userId);
    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Failed to fetch cut list", error);
    return NextResponse.json(
      { error: "Failed to fetch cut list" },
      { status: 500 },
    );
  }
}
