import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseConfig()) return NextResponse.json({ templates: [] });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("company_id,approval_status").eq("id", userId).maybeSingle();
  if (!profile?.company_id || profile.approval_status !== "approved") return NextResponse.json({ error: "Approved company access is required." }, { status: 403 });
  const { data, error } = await supabase.from("inspection_templates").select("id,name,asset_type,version,checklist").eq("company_id", profile.company_id).eq("is_active", true).order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ templates: (data ?? []).map((template) => ({ id: template.id, name: template.name, assetType: template.asset_type, version: template.version, checklist: Array.isArray(template.checklist) ? template.checklist : [] })) });
}
