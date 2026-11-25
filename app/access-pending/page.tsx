import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccessPending } from "@/components/access-pending";

export const dynamic = "force-dynamic";

export default async function AccessPendingPage({ searchParams }: { searchParams: Promise<{ request_error?: string }> }) {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("company_id,approval_status").eq("id", auth.claims.sub).maybeSingle();
  if (profile?.approval_status === "approved" && profile.company_id) redirect("/");
  const params = await searchParams;
  return <AccessPending initialError={params.request_error ?? ""} />;
}
