export type Priority = "Urgent" | "High" | "Medium" | "Low";
export type WorkStatus = "Open" | "In progress" | "Completed" | "Needs review";

export type WorkOrder = {
  id: string;
  title: string;
  location: string;
  district: string;
  assignee: string;
  technicianId?: string;
  initials: string;
  priority: Priority;
  status: WorkStatus;
  assetTag?: string;
  scheduledAt?: string;
  scheduleAtISO?: string;
  createdAt?: string;
  completedAt?: string;
};

export type TechnicianOption = { id: string; name: string; availability: "available" | "assigned" | "off_shift" | "on_leave" };
export type AssetRecord = {
  tag: string;
  type: string;
  name: string;
  location: string;
  district?: string;
  condition: string;
};

export type PendingUpdate = {
  id: string;
  scope?: string;
  kind: "work-order-create" | "work-order-update" | "inspection-update";
  payload: Record<string, unknown>;
  queuedAt: string;
};

export type FieldJob = {
  id: string;
  title: string;
  kind: string;
  location: string;
  customer: string;
  time: string;
  priority: "High" | "Routine";
  status: "Open" | "In progress";
  progress: number;
  total: number;
  icon: string;
  description: string;
  checklist: string[];
  notes?: string;
  photos?: number;
};
