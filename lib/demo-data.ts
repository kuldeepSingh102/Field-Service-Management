import type { WorkOrder } from "@/lib/types";

function sampleCreatedAt(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(12, 0, 0, 0);
  return date.toISOString();
}

export const demoWorkOrders: WorkOrder[] = [
  { id: "WO-2841", title: "Transformer inspection", location: "Madhapur, Hyderabad", district: "Hyderabad", assignee: "Sandeep Reddy", initials: "SR", priority: "High", status: "In progress", assetTag: "HYD-TF-1042", scheduledAt: "8:30 AM", createdAt: sampleCreatedAt(0) },
  { id: "WO-2839", title: "Power line repair", location: "Gachibowli, Hyderabad", district: "Ranga Reddy", assignee: "Ananya Rao", initials: "AR", priority: "Urgent", status: "Open", assetTag: "HYD-FDR-12", scheduledAt: "9:00 AM", createdAt: sampleCreatedAt(0) },
  { id: "WO-2835", title: "Meter replacement", location: "Kukatpally, Hyderabad", district: "Medchal-Malkajgiri", assignee: "Vikram Sharma", initials: "VS", priority: "Medium", status: "Open", assetTag: "HYD-MTR-83019", scheduledAt: "9:30 AM", createdAt: sampleCreatedAt(1) },
  { id: "WO-2832", title: "Substation safety check", location: "Begumpet, Hyderabad", district: "Hyderabad", assignee: "Priya Nair", initials: "PN", priority: "High", status: "In progress", assetTag: "HYD-SS-04", scheduledAt: "10:00 AM", createdAt: sampleCreatedAt(3) },
  { id: "WO-2828", title: "Pole integrity assessment", location: "LB Nagar, Hyderabad", district: "Ranga Reddy", assignee: "Unassigned", initials: "—", priority: "Low", status: "Open", assetTag: "HYD-POLE-18-22", scheduledAt: "11:00 AM", createdAt: sampleCreatedAt(8) },
  { id: "WO-2824", title: "Service restoration", location: "Secunderabad, Hyderabad", district: "Medchal-Malkajgiri", assignee: "Vikram Sharma", initials: "VS", priority: "Urgent", status: "Completed", assetTag: "HYD-MTR-77201", scheduledAt: "8:12 AM", createdAt: sampleCreatedAt(35) },
];

export const demoFieldJobs = [
  { id: "WO-2835", title: "Meter replacement", kind: "Meter service", location: "Kukatpally, Hyderabad", customer: "Lakshmi Reddy · Hyderabad", time: "9:30 AM", priority: "High" as const, status: "Open" as const, progress: 0, total: 5, icon: "▤", description: "Replace the residential smart meter and verify the service connection. The customer reports intermittent readings over the past two billing cycles.", checklist: ["Verify customer and meter serial number", "Photograph existing meter and connection", "Confirm service is safe to isolate", "Install replacement meter", "Restore service and verify reading"] },
  { id: "WO-2847", title: "Pole integrity assessment", kind: "Asset inspection", location: "LB Nagar, Hyderabad", customer: "Ranga Reddy District · Span 18–22", time: "11:00 AM", priority: "Routine" as const, status: "Open" as const, progress: 0, total: 6, icon: "⌁", description: "Scheduled visual and ground-line inspection for poles along the Ranga Reddy feeder. Record defects using the standard pole assessment.", checklist: ["Confirm pole ID against map", "Check ground-line condition", "Inspect pole top and crossarm", "Check insulators and hardware", "Record defects and severity", "Capture overview and defect photos"] },
  { id: "WO-2850", title: "Transformer oil sampling", kind: "Preventive maintenance", location: "Madhapur Substation, Hyderabad", customer: "Hyderabad District · HYD-TF-1042", time: "1:30 PM", priority: "Routine" as const, status: "Open" as const, progress: 0, total: 4, icon: "ϟ", description: "Collect a routine oil sample from distribution transformer HYD-TF-1042 for lab analysis. Label the sample before transport.", checklist: ["Confirm equipment tag HYD-TF-1042", "Check visible leaks or damage", "Collect sample per procedure", "Label and log chain of custody"] },
  { id: "WO-2853", title: "Streetlight outage", kind: "Reactive maintenance", location: "Banjara Hills, Hyderabad", customer: "Hyderabad District · Street lighting", time: "3:00 PM", priority: "High" as const, status: "Open" as const, progress: 0, total: 3, icon: "☼", description: "Investigate a streetlight outage in Banjara Hills. Check the photocell, lamp, and service connection; replace failed components and verify operation.", checklist: ["Confirm pole number and outage", "Check photocell and lamp", "Repair and verify operation"] },
];
