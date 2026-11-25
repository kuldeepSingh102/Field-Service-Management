import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "@/components/set-password-form";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login?auth_error=Open%20your%20latest%20invitation%20email%20to%20set%20up%20your%20account.");
  return <SetPasswordForm />;
}
