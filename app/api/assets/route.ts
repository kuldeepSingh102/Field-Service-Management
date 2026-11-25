import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseConfig()) return NextResponse.json({ assets: [] });
  const supabase = await createClient();
  if (!supabase)
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id,approval_status")
    .eq("id", userId)
    .maybeSingle();
  if (profileError)
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  if (!profile?.company_id || profile.approval_status !== "approved")
    return NextResponse.json(
      { error: "Approved company access is required." },
      { status: 403 },
    );
  const { data, error } = await supabase
    .from("assets")
    .select("asset_tag,asset_type,name,location,district,condition")
    .eq("company_id", profile.company_id)
    .order("asset_tag", { ascending: true })
    .limit(200);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    assets: (data ?? []).map((asset) => ({
      tag: asset.asset_tag,
      type: asset.asset_type,
      name: asset.name,
      location: asset.location,
      district: asset.district,
      condition: asset.condition,
    })),
  });
}

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id,role,approval_status")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }
  if (!profile?.company_id || profile.approval_status !== "approved") {
    return NextResponse.json(
      { error: "Approved company access is required." },
      { status: 403 },
    );
  }
  if (profile.role !== "admin") {
    return NextResponse.json(
      { error: "Only company admins can add assets." },
      { status: 403 },
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return NextResponse.json(
      { error: "Asset details are required." },
      { status: 400 },
    );
  }
  const values = input as Record<string, unknown>;
  const readText = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";
  const assetTag = readText(values.assetTag).toUpperCase();
  const name = readText(values.name);
  const assetType = readText(values.type);
  const location = readText(values.location);
  const district = readText(values.district);
  const condition =
    values.condition === undefined ? "unknown" : readText(values.condition);
  const validConditions = ["good", "watch", "poor", "critical", "unknown"];
  if (!assetTag || !name || !assetType || !location || !district) {
    return NextResponse.json(
      {
        error:
          "Asset tag, name, type, location, and district are all required.",
      },
      { status: 400 },
    );
  }
  if (
    assetTag.length > 100 ||
    name.length > 200 ||
    assetType.length > 100 ||
    location.length > 300 ||
    district.length > 100
  ) {
    return NextResponse.json(
      { error: "One or more asset fields exceed the allowed length." },
      { status: 400 },
    );
  }
  if (!validConditions.includes(condition)) {
    return NextResponse.json(
      { error: "Choose a valid asset condition." },
      { status: 400 },
    );
  }

  const { data: asset, error } = await supabase
    .from("assets")
    .insert({
      company_id: profile.company_id,
      asset_tag: assetTag,
      asset_type: assetType,
      name,
      location,
      district,
      condition,
    })
    .select("asset_tag,asset_type,name,location,district,condition")
    .single();
  if (error?.code === "23505") {
    return NextResponse.json(
      { error: "That asset tag is already in use for this company." },
      { status: 409 },
    );
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(
    {
      asset: {
        tag: asset.asset_tag,
        type: asset.asset_type,
        name: asset.name,
        location: asset.location,
        district: asset.district,
        condition: asset.condition,
      },
    },
    { status: 201 },
  );
}
