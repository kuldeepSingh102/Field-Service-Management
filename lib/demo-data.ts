import type { WorkOrder } from "@/lib/types";

function sampleCreatedAt(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(12, 0, 0, 0);
  return date.toISOString();
}

export const demoWorkOrders: WorkOrder[] = [
  { id: "WO-2841", title: "Transformer inspection", location: "1842 Willow Creek Rd", district: "North", assignee: "Elena Ruiz", initials: "ER", priority: "High", status: "In progress", assetTag: "TX-1042", scheduledAt: "8:30 AM", createdAt: sampleCreatedAt(0) },
  { id: "WO-2839", title: "Power line repair", location: "742 Evergreen Terrace", district: "Central", assignee: "Marcus Lee", initials: "ML", priority: "Urgent", status: "Open", assetTag: "FEEDER-12", scheduledAt: "9:00 AM", createdAt: sampleCreatedAt(0) },
  { id: "WO-2835", title: "Meter replacement", location: "3098 Oakridge Blvd", district: "North", assignee: "Jamie Rivera", initials: "JR", priority: "Medium", status: "Open", assetTag: "MTR-83019", scheduledAt: "9:30 AM", createdAt: sampleCreatedAt(1) },
  { id: "WO-2832", title: "Substation safety check", location: "55 Industrial Parkway", district: "East", assignee: "Andre Wilson", initials: "AW", priority: "High", status: "In progress", assetTag: "SS-04", scheduledAt: "10:00 AM", createdAt: sampleCreatedAt(3) },
  { id: "WO-2828", title: "Pole integrity assessment", location: "1206 Pine Hollow Ln", district: "North", assignee: "Unassigned", initials: "—", priority: "Low", status: "Open", assetTag: "POLE-18-22", scheduledAt: "11:00 AM", createdAt: sampleCreatedAt(8) },
  { id: "WO-2824", title: "Service restoration", location: "601 Riverbend Dr", district: "Central", assignee: "Jamie Rivera", initials: "JR", priority: "Urgent", status: "Completed", assetTag: "MTR-77201", scheduledAt: "8:12 AM", createdAt: sampleCreatedAt(35) },
];

export const demoFieldJobs = [
  { id: "WO-2835", title: "Meter replacement", kind: "Meter service", location: "3098 Oakridge Blvd", customer: "Patridjkccia H. · 555-0134", time: "9:30 AM", priority: "High" as const, status: "Open" as const, progress: 0, total: 5, icon: "▤", description: "Replace the residential smart meter and verify the service connection. Customer reports intermittent readings over the past two billing cycles.", checklist: ["Verify customer and meter serial number", "Photograph existing meter and connection", "Confirm service is safe to isolate", "Install replacement meter", "Restore service and verify reading"] },
  { id: "WO-2847", title: "Pole integrity assessment", kind: "Asset inspection", location: "1206 Pine Hollow Ln", customer: "North District · Span 18–22", time: "11:00 AM", priority: "Routine" as const, status: "Open" as const, progress: 0, total: 6, icon: "⌁", description: "Scheduled visual and ground-line inspection for wood poles along the north feeder. Record defects using the standard pole assessment.", checklist: ["Confirm pole ID against map", "Check ground-line condition", "Inspect pole top and crossarm", "Check insulators and hardware", "Record defects and severity", "Capture overview and defect photos"] },
  { id: "WO-2850", title: "Transformer oil sampling", kind: "Preventive maintenance", location: "88 Cedar Ridge Way", customer: "North District · TX-1042", time: "1:30 PM", priority: "Routine" as const, status: "Open" as const, progress: 0, total: 4, icon: "ϟ", description: "Collect a routine oil sample from distribution transformer TX-1042 for lab analysis. Label the sample before transport.", checklist: ["Confirm equipment tag TX-1042", "Check visible leaks or damage", "Collect sample per procedure", "Label and log chain of custody"] },
  { id: "WO-2853", title: "Streetlight outage", kind: "Reactive maintenance", location: "Corner of Pine & 8th", customer: "City services · 555-0171", time: "3:00 PM", priority: "High" as const, status: "Open" as const, progress: 0, total: 3, icon: "☼", description: "Investigate a streetlight outage at Pine and 8th. Check photocell, lamp, and service connection; replace failed components and verify operation.", checklist: ["Confirm pole number and outage", "Check photocell and lamp", "Repair and verify operation"] },
];
