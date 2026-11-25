import { demoWorkOrders } from "@/lib/demo-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { WorkOrder } from "@/lib/types";

export type DashboardMetrics = {
  openOrders: number;
  activeTechnicians: number;
  totalTechnicians: number;
  completedToday: number;
  completedDailyAverage: number | null;
  totalOrders: number;
  assignedOrders: number;
  monthlyCompletionRate: number | null;
  completedTrend: Array<{ day: string; count: number }>;
  slaCompliance: number | null;
};
const demoMetrics: DashboardMetrics = {
  openOrders: 128,
  activeTechnicians: 18,
  totalTechnicians: 31,
  completedToday: 36,
  completedDailyAverage: null,
  totalOrders: demoWorkOrders.length,
  assignedOrders: demoWorkOrders.filter(
    (order) => order.assignee !== "Unassigned" && order.status !== "Completed",
  ).length,
  monthlyCompletionRate: 94.2,
  completedTrend: [],
  slaCompliance: 96.4,
};
export async function getDashboardData(): Promise<{
  orders: WorkOrder[];
  metrics: DashboardMetrics;
  connected: boolean;
  authenticated: boolean;
  companyId: string;
  companyName: string;
  profileName: string;
  role: string;
}> {
  if (!hasSupabaseConfig())
    return {
      orders: demoWorkOrders,
      metrics: demoMetrics,
      connected: false,
      authenticated: false,
      companyId: "demo",
      companyName: "Gridline Utilities",
      profileName: "Aarav Reddy",
      role: "supervisor",
    };
  const supabase = await createClient();
  if (!supabase)
    return {
      orders: demoWorkOrders,
      metrics: demoMetrics,
      connected: false,
      authenticated: false,
      companyId: "demo",
      companyName: "Gridline Utilities",
      profileName: "Aarav Reddy",
      role: "supervisor",
    };
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub)
    return {
      orders: demoWorkOrders,
      metrics: demoMetrics,
      connected: false,
      authenticated: false,
      companyId: "demo",
      companyName: "Gridline Utilities",
      profileName: "Aarav Reddy",
      role: "supervisor",
    };
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id,name,role")
    .eq("id", claims.claims.sub)
    .maybeSingle();
  const companyId = profile?.company_id ?? "unassigned";
  const { data: company } = profile?.company_id
    ? await supabase
        .from("companies")
        .select("name")
        .eq("id", profile.company_id)
        .maybeSingle()
    : { data: null };
  const profileName = profile?.name || "Operations user";
  const companyName = company?.name || "Utility workspace";
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const trendStart = new Date(todayStart);
  trendStart.setUTCDate(trendStart.getUTCDate() - 6);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const [
    openCount,
    activeTechCount,
    techCount,
    completedCount,
    completedAverageCount,
    totalOrderCount,
    assignedOrderCount,
    monthlyOrderCount,
    monthlyCompletedCount,
    completedTrendRows,
    slaRows,
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .in("status", [
        "Open",
        "En route",
        "On site",
        "In progress",
        "Needs review",
      ]),
    supabase
      .from("technicians")
      .select("id", { count: "exact", head: true })
      .in("availability", ["available", "assigned"]),
    supabase.from("technicians").select("id", { count: "exact", head: true }),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "Completed")
      .gte("completed_at", todayStart.toISOString()),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "Completed")
      .gte("completed_at", sevenDaysAgo.toISOString())
      .lt("completed_at", todayStart.toISOString()),
    supabase.from("work_orders").select("id", { count: "exact", head: true }),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .not("technician_id", "is", null)
      .in("status", [
        "Open",
        "En route",
        "On site",
        "In progress",
        "Needs review",
      ]),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString()),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "Completed")
      .gte("created_at", monthStart.toISOString()),
    supabase
      .from("work_orders")
      .select("completed_at")
      .eq("status", "Completed")
      .gte("completed_at", trendStart.toISOString())
      .lt("completed_at", tomorrowStart.toISOString()),
    supabase
      .from("work_orders")
      .select("status,sla_due_at,completed_at")
      .not("sla_due_at", "is", null)
      .gte("created_at", monthStart.toISOString()),
  ]);
  const completedByDay = new Map<string, number>();
  for (const row of completedTrendRows.data ?? []) {
    if (!row.completed_at) continue;
    const date = new Date(row.completed_at).toISOString().slice(0, 10);
    completedByDay.set(date, (completedByDay.get(date) ?? 0) + 1);
  }
  const completedTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(trendStart);
    date.setUTCDate(date.getUTCDate() + index);
    return {
      day: new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
        timeZone: "UTC",
      }).format(date),
      count: completedByDay.get(date.toISOString().slice(0, 10)) ?? 0,
    };
  });
  const slaData = slaRows.data ?? [];
  const slaCompliance = slaData.length
    ? Math.round(
        (slaData.filter((row) =>
          row.status === "Completed"
            ? Boolean(
                row.completed_at &&
                row.sla_due_at &&
                row.completed_at <= row.sla_due_at,
              )
            : Boolean(row.sla_due_at && row.sla_due_at >= now.toISOString()),
        ).length /
          slaData.length) *
          1000,
      ) / 10
    : null;
  const metrics: DashboardMetrics = {
    openOrders: openCount.count ?? 0,
    activeTechnicians: activeTechCount.count ?? 0,
    totalTechnicians: techCount.count ?? 0,
    completedToday: completedCount.count ?? 0,
    completedDailyAverage:
      completedAverageCount.count === null
        ? null
        : completedAverageCount.count / 7,
    totalOrders: totalOrderCount.count ?? 0,
    assignedOrders: assignedOrderCount.count ?? 0,
    monthlyCompletionRate: monthlyOrderCount.count
      ? Math.round(
          ((monthlyCompletedCount.count ?? 0) / monthlyOrderCount.count) * 1000,
        ) / 10
      : null,
    completedTrend,
    slaCompliance,
  };
  const { data, error } = await supabase
    .from("work_orders")
    .select(
      "id,public_id,title,location,district,priority,status,asset_tag,scheduled_at,technician_id,created_at,completed_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error)
    return {
      orders: [],
      metrics,
      connected: true,
      authenticated: true,
      companyId,
      companyName,
      profileName,
      role: profile?.role ?? "technician",
    };
  if (!data?.length)
    return {
      orders: [],
      metrics,
      connected: true,
      authenticated: true,
      companyId,
      companyName,
      profileName,
      role: profile?.role ?? "technician",
    };
  const techIds = [
    ...new Set(
      data
        .map((order) => order.technician_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: techs } = techIds.length
    ? await supabase
        .from("technicians")
        .select("id,profile_id")
        .in("id", techIds)
    : { data: [] };
  const profileIds = [...new Set((techs ?? []).map((tech) => tech.profile_id))];
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id,name").in("id", profileIds)
    : { data: [] };
  const profileNames = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.name]),
  );
  const techNames = new Map(
    (techs ?? []).map((tech) => [
      tech.id,
      profileNames.get(tech.profile_id) ?? "Assigned technician",
    ]),
  );
  return {
    orders: data.map((order) => {
      const assignee = order.technician_id
        ? (techNames.get(order.technician_id) ?? "Assigned technician")
        : "Unassigned";
      return {
        id: order.public_id,
        title: order.title,
        location: order.location,
        district: order.district,
        assignee,
        technicianId: order.technician_id ?? undefined,
        initials:
          assignee
            .split(" ")
            .map((part: string) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "—",
        priority: order.priority,
        status:
          order.status === "Completed"
            ? "Completed"
            : order.status === "Needs review"
              ? "Needs review"
              : order.status === "Cancelled"
                ? "Open"
                : order.status === "Open"
                  ? "Open"
                  : "In progress",
        assetTag: order.asset_tag ?? undefined,
        scheduledAt: order.scheduled_at
          ? new Date(order.scheduled_at).toLocaleTimeString("en-IN", {
              hour: "numeric",
              minute: "2-digit",
            })
          : undefined,
        scheduleAtISO: order.scheduled_at ?? undefined,
        createdAt: order.created_at ?? undefined,
        completedAt: order.completed_at ?? undefined,
      } satisfies WorkOrder;
    }),
    metrics,
    connected: true,
    authenticated: true,
    companyId,
    companyName,
    profileName,
    role: profile?.role ?? "technician",
  };
}
