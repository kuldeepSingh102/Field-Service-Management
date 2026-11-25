import { FieldWorkspace } from "@/components/field-workspace";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { demoFieldJobs } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default async function FieldPage() {
  const configured = hasSupabaseConfig();
  if (configured) {
    const supabase = await createClient();
    const { data } = supabase ? await supabase.auth.getClaims() : { data: null };
    if (!data?.claims?.sub) redirect("/login");
    const { data: profile } = await supabase!.from("profiles").select("role").eq("id", data.claims.sub).maybeSingle();
    if (profile?.role !== "technician") redirect("/");
  }
  return <FieldWorkspace initialJobs={configured ? [] : demoFieldJobs} companyId={configured ? "" : "demo"} />;
}
