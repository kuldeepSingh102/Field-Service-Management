import { Dashboard } from "@/components/dashboard";
import { getDashboardData } from "@/lib/data";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const {
    orders,
    metrics,
    connected,
    authenticated,
    companyId,
    companyName,
    profileName,
    role,
  } = await getDashboardData();
  if (authenticated && role === "technician" && hasSupabaseConfig())
    redirect("/field");
  if (authenticated && companyId === "unassigned") redirect("/access-pending");
  return (
    <Dashboard
      initialOrders={orders}
      initialMetrics={metrics}
      serverConnected={connected}
      companyId={companyId}
      companyName={companyName}
      profileName={profileName}
      role={role}
      guestMode={!authenticated}
    />
  );
}
