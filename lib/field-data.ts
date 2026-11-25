import { demoFieldJobs } from "@/lib/demo-data";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { FieldJob } from "@/lib/types";

export async function getFieldJobs(): Promise<FieldJob[]> {
  if (!hasSupabaseConfig()) return demoFieldJobs;
  const supabase = await createClient();
  if (!supabase) return [];
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return [];
  const { data: technician } = await supabase.from("technicians").select("id").eq("profile_id", userId).maybeSingle();
  if (!technician) return [];
  const { data, error } = await supabase.from("work_orders").select("public_id,title,location,priority,status,scheduled_at,description,asset_tag").eq("technician_id", technician.id).not("status", "in", "(Completed,Cancelled)").order("scheduled_at", { ascending: true });
  if (error || !data) return [];
  const defaults = demoFieldJobs;
  return data.map((order, index) => {
    const reference = defaults.find((job) => job.title.toLowerCase() === order.title.toLowerCase()) ?? defaults[index % defaults.length];
    return {
      ...reference,
      id: order.public_id,
      title: order.title,
      location: order.location,
      time: order.scheduled_at ? new Date(order.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Anytime",
      priority: order.priority === "Urgent" || order.priority === "High" ? "High" as const : "Routine" as const,
      status: order.status === "In progress" || order.status === "On site" || order.status === "En route" ? "In progress" as const : "Open" as const,
      progress: 0,
      total: reference.total,
      icon: reference.icon,
      description: order.description || reference.description,
      kind: order.asset_tag || reference.kind,
    };
  });
}
