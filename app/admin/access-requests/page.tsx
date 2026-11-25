import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccessApprovals } from "@/components/access-approvals";

export const dynamic = "force-dynamic";

export default async function AccessRequestsPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role,approval_status").eq("id", auth.claims.sub).maybeSingle();
  if (profile?.role !== "admin" || profile.approval_status !== "approved") redirect("/");
  return <AccessApprovals />;
}
