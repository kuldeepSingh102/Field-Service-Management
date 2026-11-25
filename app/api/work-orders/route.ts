import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const { authenticated, connected, orders, metrics } =
    await getDashboardData();
  if (!authenticated || !connected) {
    return NextResponse.json(
      { error: "Authentication is required to load live dashboard data." },
      { status: 401 },
    );
  }
  return NextResponse.json({ orders, metrics });
}
