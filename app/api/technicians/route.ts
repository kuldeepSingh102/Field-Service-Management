import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseConfig()) return NextResponse.json({ technicians: [] });
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id,role,approval_status")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.company_id || profile.approval_status !== "approved")
    return NextResponse.json(
      { error: "Approved company access is required." },
      { status: 403 },
    );
  if (
    !(["admin", "supervisor", "dispatcher"] as string[]).includes(profile.role)
  )
    return NextResponse.json(
      { error: "Only operations staff can view the technician roster." },
      { status: 403 },
    );
  const { data, error } = await supabase
    .from("technicians")
    .select("id,availability,profile_id")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: true });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  const profileIds = [
    ...new Set((data ?? []).map((technician) => technician.profile_id)),
  ];
  const { data: profiles, error: profilesError } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id,name,role,approval_status")
        .in("id", profileIds)
    : { data: [], error: null };
  if (profilesError)
    return NextResponse.json({ error: profilesError.message }, { status: 400 });
  const byId = new Map((profiles ?? []).map((person) => [person.id, person]));
  const technicians = (data ?? []).flatMap((technician) => {
    const person = byId.get(technician.profile_id);
    if (
      !person ||
      person.role !== "technician" ||
      person.approval_status !== "approved"
    )
      return [];
    return [
      {
        id: technician.id,
        name: person.name || "Technician",
        availability: technician.availability,
      },
    ];
  });
  return NextResponse.json({ technicians });
}
