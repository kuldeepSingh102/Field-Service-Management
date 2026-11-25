import { NextResponse } from "next/server";
import { demoFieldJobs } from "@/lib/demo-data";
import { getFieldJobs } from "@/lib/field-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseConfig()) return NextResponse.json({ companyId: "demo", userName: "Sandeep Reddy", jobs: demoFieldJobs });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("company_id,name").eq("id", auth.claims.sub).maybeSingle();
  if (!profile?.company_id) return NextResponse.json({ companyId: "unassigned", userName: profile?.name || "Technician", jobs: [] });
  return NextResponse.json({ companyId: profile.company_id, userName: profile.name || "Technician", jobs: await getFieldJobs() });
}
