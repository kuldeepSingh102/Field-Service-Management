import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

async function requireAdmin() {
  if (!hasSupabaseConfig()) return { error: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }) };
  const supabase = await createClient();
  if (!supabase) return { error: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }) };
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return { error: NextResponse.json({ error: "Sign in is required." }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("company_id,role,approval_status").eq("id", userId).maybeSingle();
  if (profile?.approval_status !== "approved" || profile.role !== "admin" || !profile.company_id) {
    return { error: NextResponse.json({ error: "Only an approved company admin can manage access requests." }, { status: 403 }) };
  }
  return { supabase, profile };
}

export async function GET() {
  const access = await requireAdmin();
  if (access.error) return access.error;
  const { supabase, profile } = access;
  const [companyResult, requestsResult] = await Promise.all([
    supabase.rpc("get_company_signup_code"),
    supabase.from("access_requests").select("id,requester_name,requester_email,requested_role,status,requested_at").eq("company_id", profile.company_id).eq("status", "pending").order("requested_at", { ascending: false }),
  ]);
  if (requestsResult.error) return NextResponse.json({ error: requestsResult.error.message }, { status: 400 });
  if (companyResult.error) return NextResponse.json({ error: companyResult.error.message }, { status: 400 });
  return NextResponse.json({ signupCode: companyResult.data ?? null, requests: requestsResult.data ?? [] });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if (access.error) return access.error;
  let body: { requestId?: string; decision?: string };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!body.requestId || !["approved", "rejected"].includes(body.decision ?? "")) {
    return NextResponse.json({ error: "A request ID and approved/rejected decision are required." }, { status: 400 });
  }
  const { data, error } = await access.supabase.rpc("review_company_access_request", {
    p_request_id: body.requestId,
    p_decision: body.decision,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ status: data });
}
