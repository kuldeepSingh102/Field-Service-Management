import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { PendingUpdate, Priority, WorkStatus } from "@/lib/types";

const priorities: Priority[] = ["Urgent", "High", "Medium", "Low"];
const statuses: WorkStatus[] = ["Open", "In progress", "Completed", "Needs review"];

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("company_id,role").eq("id", userId).maybeSingle();
  if (!profile?.company_id) return NextResponse.json({ error: "Your profile has not been assigned to a company." }, { status: 403 });
  const update = await request.json() as PendingUpdate;
  const payload = update.payload ?? {};

  if (update.kind === "work-order-create") {
    if (!(["admin", "supervisor", "dispatcher"] as string[]).includes(profile.role)) return NextResponse.json({ error: "Only dispatch and supervisor roles can create work orders." }, { status: 403 });
    const title = String(payload.title ?? "").trim();
    const location = String(payload.location ?? "").trim();
    const priority = priorities.find((value) => value === payload.priority);
    if (!title || !location || !priority) return NextResponse.json({ error: "Title, location, and a valid priority are required." }, { status: 400 });
    const technicianId = String(payload.technicianId ?? "") || null;
    if (technicianId) {
      const { data: technician } = await supabase.from("technicians").select("id,profile_id").eq("id", technicianId).eq("company_id", profile.company_id).maybeSingle();
      if (!technician) return NextResponse.json({ error: "The selected technician is not in your company." }, { status: 400 });
      const { data: technicianProfile } = await supabase.from("profiles").select("id").eq("id", technician.profile_id).eq("company_id", profile.company_id).eq("role", "technician").eq("approval_status", "approved").maybeSingle();
      if (!technicianProfile) return NextResponse.json({ error: "The selected technician is not approved." }, { status: 400 });
    }
    const { error } = await supabase.from("work_orders").upsert({
      public_id: String(payload.id), company_id: profile.company_id, title, location,
      district: String(payload.district ?? "Hyderabad"), asset_tag: String(payload.assetTag ?? "") || null,
      technician_id: technicianId, priority, status: "Open", description: String(payload.notes ?? ""), created_by: userId,
      scheduled_at: payload.scheduleAtISO ? String(payload.scheduleAtISO) : null,
    }, { onConflict: "company_id,public_id", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (update.kind === "work-order-update" || update.kind === "inspection-update") {
    const publicId = String(payload.id ?? "");
    if (!publicId) return NextResponse.json({ error: "Work order ID is required." }, { status: 400 });
    const { data: workOrder } = await supabase.from("work_orders").select("id,technician_id").eq("company_id", profile.company_id).eq("public_id", publicId).maybeSingle();
    if (!workOrder) return NextResponse.json({ error: "Work order not found in your company." }, { status: 404 });
    if (profile.role === "technician") {
      const { data: technician } = await supabase.from("technicians").select("id").eq("company_id", profile.company_id).eq("profile_id", userId).maybeSingle();
      if (technician?.id !== workOrder.technician_id) return NextResponse.json({ error: "This work order is assigned to a different technician." }, { status: 403 });
    }
    const status = statuses.find((value) => value === payload.status);
    if (status) {
      const { error } = await supabase.from("work_orders").update({ status, completed_at: status === "Completed" ? new Date().toISOString() : null }).eq("id", workOrder.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (update.kind === "inspection-update") {
      const { error } = await supabase.from("job_updates").insert({ company_id: profile.company_id, work_order_id: workOrder.id, user_id: userId, status: status ?? null, notes: String(payload.notes ?? ""), checklist: payload.checklist ?? [] });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unsupported update type." }, { status: 400 });
}
