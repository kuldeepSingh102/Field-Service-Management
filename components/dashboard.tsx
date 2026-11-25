"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Bell,
  Bolt,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileBarChart,
  Gauge,
  Grid2X2,
  LogOut,
  MoreHorizontal,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Users,
  WifiOff,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { DashboardMetrics } from "@/lib/data";
import {
  clearGridlineOfflineData,
  clearUpdate,
  getLocalOrders,
  queueUpdate,
  readUpdates,
  saveLocalOrders,
} from "@/lib/offline";
import type {
  AssetRecord,
  PendingUpdate,
  Priority,
  TechnicianOption,
  WorkOrder,
  WorkStatus,
} from "@/lib/types";

type Page =
  | "Overview"
  | "Work orders"
  | "Crew & schedule"
  | "Assets"
  | "Inspections"
  | "Reports";
const navItems: { label: Page; icon: typeof Grid2X2 }[] = [
  { label: "Overview", icon: Grid2X2 },
  { label: "Work orders", icon: ClipboardCheck },
  { label: "Crew & schedule", icon: Users },
  { label: "Assets", icon: Bolt },
];
const fieldItems: { label: Page; icon: typeof Grid2X2 }[] = [
  { label: "Inspections", icon: ShieldCheck },
  { label: "Reports", icon: FileBarChart },
];
const schedule = [
  {
    time: "8:30",
    name: "Elena Ruiz",
    task: "Transformer inspection",
    zone: "North · TX-1042",
    color: "bg-[#d9efe1]",
  },
  {
    time: "9:00",
    name: "Marcus Lee",
    task: "Power line repair",
    zone: "Central · Feeder 12",
    color: "bg-[#f4e8d2]",
  },
  {
    time: "9:30",
    name: "Jamie Rivera",
    task: "Meter replacement",
    zone: "North · Route 07",
    color: "bg-[#e3eaf5]",
  },
  {
    time: "10:00",
    name: "Andre Wilson",
    task: "Substation safety check",
    zone: "East · SS-04",
    color: "bg-[#eee8f5]",
  },
];
const demoTechnicians: TechnicianOption[] = schedule.map((item, index) => ({
  id: `demo-tech-${index + 1}`,
  name: item.name,
  availability: index < 2 ? "assigned" : "available",
}));
type InspectionTemplate = {
  id: string;
  name: string;
  assetType: string;
  version: number;
  checklist: unknown[];
};
type FieldActivity = {
  updates: Array<{
    id: string;
    technician: string;
    status: string | null;
    notes: string;
    checklist: unknown[];
    createdAt: string;
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    mediaType: string;
    uploadedBy: string;
    createdAt: string;
    url: string;
  }>;
};
const demoInspectionTemplates: InspectionTemplate[] = [
  {
    id: "demo-transformer",
    name: "Transformer inspection",
    assetType: "Transformer",
    version: 1,
    checklist: Array(12).fill(null),
  },
  {
    id: "demo-pole",
    name: "Pole safety assessment",
    assetType: "Pole",
    version: 1,
    checklist: Array(9).fill(null),
  },
  {
    id: "demo-substation",
    name: "Substation perimeter",
    assetType: "Substation",
    version: 1,
    checklist: Array(7).fill(null),
  },
];
const districts = [
  { name: "North District", count: 42, change: "+8%", bar: "w-[76%]" },
  { name: "Central District", count: 38, change: "+3%", bar: "w-[69%]" },
  { name: "South District", count: 31, change: "−2%", bar: "w-[56%]" },
  { name: "East District", count: 17, change: "+12%", bar: "w-[31%]" },
];
const assetRows = [
  {
    tag: "TX-1042",
    type: "Distribution transformer",
    location: "1842 Willow Creek Rd",
    condition: "Inspection due",
    status: "Watch",
  },
  {
    tag: "FEEDER-12",
    type: "Overhead line · 12.4 mi",
    location: "Central District",
    condition: "Active repair",
    status: "In service",
  },
  {
    tag: "SS-04",
    type: "Distribution substation",
    location: "55 Industrial Parkway",
    condition: "Inspection current",
    status: "In service",
  },
  {
    tag: "POLE-18-22",
    type: "Wood pole span",
    location: "1206 Pine Hollow Ln",
    condition: "Integrity assessment",
    status: "Watch",
  },
];
const priorityTone: Record<Priority, string> = {
  Urgent: "bg-[#fff0ed] text-[#b7584c]",
  High: "bg-[#fff4e8] text-[#a96840]",
  Medium: "bg-[#fff8df] text-[#9c7929]",
  Low: "bg-[#edf5ef] text-[#548263]",
};
const statusTone: Record<WorkStatus, string> = {
  Open: "bg-[#f0f3f1] text-[#738078]",
  "In progress": "bg-[#edf3fb] text-[#5f7ca1]",
  Completed: "bg-[#edf6ef] text-[#568665]",
  "Needs review": "bg-[#f3eff9] text-[#826da6]",
};
const initialsTone = [
  "bg-[#e5eee7] text-[#54745f]",
  "bg-[#f1e5dc] text-[#8c6747]",
  "bg-[#e8e4f1] text-[#716493]",
  "bg-[#e0edf0] text-[#517b89]",
];

function priorityRank(priority: Priority) {
  return ["Urgent", "High", "Medium", "Low"].indexOf(priority);
}
function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function Metric({
  label,
  value,
  change,
  icon: Icon,
  tone,
  note,
  bars,
  barValues,
}: {
  label: string;
  value: string;
  change?: string;
  icon: typeof Gauge;
  tone: string;
  note: string;
  bars?: string;
  barValues?: number[];
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono-ui text-[9px] font-medium tracking-[.07em] text-muted">
            {label}
          </span>
          <span className={`grid size-8 place-items-center rounded-lg ${tone}`}>
            <Icon size={15} />
          </span>
        </div>
        <div className="mt-2 font-display text-[27px] font-bold leading-none tracking-[-.06em] text-ink">
          {value}
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted">
          {change && (
            <span
              className={`font-semibold ${change.startsWith("-") ? "text-[#c05a4d]" : "text-[#329568]"}`}
            >
              {change.startsWith("-") ? "↘" : "↗"} {change}
            </span>
          )}
          <span>{note}</span>
          {bars && barValues && (
            <span className="ml-auto flex h-5 items-end gap-[2px]">
              {barValues.map((height, index) => (
                <i
                  key={index}
                  className={`w-[3px] rounded-t-sm ${bars}`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
function OrderTable({
  orders,
  onSelect,
  onStatus,
  canUpdate = true,
}: {
  orders: WorkOrder[];
  onSelect: (order: WorkOrder) => void;
  onStatus: (order: WorkOrder, status: WorkStatus) => void;
  canUpdate?: boolean;
}) {
  return (
    <div className="table-scroll w-full overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead className="bg-[#fafbfa]">
          <tr>
            {[
              "WORK ORDER",
              "LOCATION",
              "ASSIGNEE",
              "PRIORITY",
              "STATUS",
              "",
            ].map((label, i) => (
              <th
                key={i}
                className={`h-9 border-y border-line px-3 font-mono-ui text-[8px] font-medium tracking-wide text-[#96a29b] ${i === 0 ? "pl-5" : ""}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order, index) => (
            <tr
              key={order.id}
              className="border-b border-[#eff2f0] last:border-b-0 hover:bg-[#fbfcfb]"
            >
              <td className="py-3 pl-5 pr-3">
                <button onClick={() => onSelect(order)} className="text-left">
                  <span className="block font-mono-ui text-[9px] text-[#6a8c78]">
                    {order.id}
                  </span>
                  <span className="mt-1 block text-[10px] font-semibold text-[#395447]">
                    {order.title}
                  </span>
                </button>
              </td>
              <td className="px-3 text-[9px] text-[#6f7e76]">
                {order.location}
              </td>
              <td className="px-3">
                <span className="flex items-center gap-2">
                  <i
                    className={`grid size-6 place-items-center rounded-full text-[8px] font-bold not-italic ${initialsTone[index % initialsTone.length]}`}
                  >
                    {order.initials}
                  </i>
                  <span className="text-[9px] text-[#697970]">
                    {order.assignee}
                  </span>
                </span>
              </td>
              <td className="px-3">
                <Badge className={priorityTone[order.priority]}>
                  <i className="size-1.5 rounded-full bg-current" />
                  {order.priority}
                </Badge>
              </td>
              <td className="px-3">
                <select
                  aria-label={`Status for ${order.id}`}
                  disabled={!canUpdate}
                  className={`rounded-md border-0 px-2 py-1.5 text-[9px] outline-none disabled:cursor-default disabled:opacity-100 ${statusTone[order.status]}`}
                  value={order.status}
                  onChange={(event) =>
                    onStatus(order, event.target.value as WorkStatus)
                  }
                >
                  <option>Open</option>
                  <option>In progress</option>
                  <option>Completed</option>
                  <option>Needs review</option>
                </select>
              </td>
              <td className="px-2">
                <button
                  onClick={() => onSelect(order)}
                  aria-label={`Open ${order.id}`}
                  className="rounded p-1 text-muted hover:bg-mist"
                >
                  <MoreHorizontal size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Dashboard({
  initialOrders,
  initialMetrics,
  serverConnected,
  companyId,
  companyName,
  profileName,
  role,
  guestMode = false,
}: {
  initialOrders: WorkOrder[];
  initialMetrics: DashboardMetrics;
  serverConnected: boolean;
  companyId: string;
  companyName: string;
  profileName: string;
  role: string;
  guestMode?: boolean;
}) {
  const router = useRouter();
  const [page, setPage] = useState<Page>("Overview");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [orders, setOrders] = useState(initialOrders);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>(
    guestMode ? demoTechnicians : [],
  );
  const [assets, setAssets] = useState<AssetRecord[]>(
    guestMode
      ? assetRows.map((asset) => ({
          tag: asset.tag,
          type: asset.type,
          name: asset.type,
          location: asset.location,
          condition: asset.status === "Watch" ? "watch" : "good",
        }))
      : [],
  );
  const [inspectionTemplates, setInspectionTemplates] = useState<
    InspectionTemplate[]
  >(guestMode ? demoInspectionTemplates : []);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [online, setOnline] = useState(true);
  const [offlinePreview, setOfflinePreview] = useState(false);
  const offlinePreviewRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [newAssetOpen, setNewAssetOpen] = useState(false);
  const [assetSaving, setAssetSaving] = useState(false);
  const [assetSaveError, setAssetSaveError] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [fieldActivity, setFieldActivity] = useState<FieldActivity | null>(
    null,
  );
  const [fieldActivityLoading, setFieldActivityLoading] = useState(false);
  const [fieldActivityError, setFieldActivityError] = useState("");
  const fieldActivityRequest = useRef<AbortController | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => {
    const timeout = window.setTimeout(() => setCurrentDate(new Date()), 0);
    return () => window.clearTimeout(timeout);
  }, []);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const canManageWork =
    !guestMode && ["admin", "supervisor", "dispatcher"].includes(role);
  const canManageAssets = !guestMode && role === "admin";
  const visibleNavItems =
    role === "dispatcher"
      ? navItems.filter(({ label }) => label !== "Assets")
      : navItems;
  const visibleFieldItems =
    role === "dispatcher"
      ? fieldItems.filter(({ label }) => label === "Reports")
      : fieldItems;
  const mobileNavItems = [...visibleNavItems, ...visibleFieldItems];
  const isConnected = online && !offlinePreview;

  const refreshOperationsData = useCallback(async () => {
    if (!supabaseConfigured || guestMode) return;
    const [
      dashboardResponse,
      crewResponse,
      assetResponse,
      inspectionResponse,
    ] = await Promise.all([
      fetch("/api/work-orders", { cache: "no-store" }),
      fetch("/api/technicians", { cache: "no-store" }),
      fetch("/api/assets", { cache: "no-store" }),
      fetch("/api/inspections", { cache: "no-store" }),
    ]);
    if (dashboardResponse.ok) {
      const payload = (await dashboardResponse.json()) as {
        orders: WorkOrder[];
        metrics: DashboardMetrics;
      };
      setMetrics(payload.metrics);
      setOrders(payload.orders);
      void saveLocalOrders(payload.orders, companyId);
    }
    if (crewResponse.ok) {
      const payload = (await crewResponse.json()) as {
        technicians: TechnicianOption[];
      };
      setTechnicians(payload.technicians);
    }
    if (assetResponse.ok) {
      const payload = (await assetResponse.json()) as { assets: AssetRecord[] };
      setAssets(payload.assets);
    }
    if (inspectionResponse.ok) {
      const payload = (await inspectionResponse.json()) as {
        templates: InspectionTemplate[];
      };
      setInspectionTemplates(payload.templates);
    }
  }, [companyId, guestMode, supabaseConfigured]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);
  const openOrderDetails = (order: WorkOrder) => {
    fieldActivityRequest.current?.abort();
    setFieldActivity(null);
    setFieldActivityError("");
    setFieldActivityLoading(false);
    setSelectedOrder(order);
  };
  const loadFieldActivity = async () => {
    if (!selectedOrder) return;
    fieldActivityRequest.current?.abort();
    const request = new AbortController();
    fieldActivityRequest.current = request;
    setFieldActivity(null);
    setFieldActivityError("");
    setFieldActivityLoading(true);
    try {
      const response = await fetch(
        `/api/work-orders/${encodeURIComponent(selectedOrder.id)}/activity`,
        { cache: "no-store", signal: request.signal },
      );
      const result = (await response.json()) as FieldActivity & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          result.error || "Unable to load technician submissions.",
        );
      }
      setFieldActivity(result);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFieldActivityError(
        error instanceof Error
          ? error.message
          : "Unable to load technician submissions.",
      );
    } finally {
      if (fieldActivityRequest.current === request) {
        fieldActivityRequest.current = null;
        setFieldActivityLoading(false);
      }
    }
  };
  const createAsset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setAssetSaveError("");
    setAssetSaving(true);
    try {
      const formData = new FormData(form);
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const result = (await response.json()) as {
        asset?: AssetRecord;
        error?: string;
      };
      const asset = result.asset;
      if (!response.ok || !asset) {
        throw new Error(result.error || "Unable to add this asset.");
      }
      setAssets((current) =>
        [...current, asset].sort((a, b) => a.tag.localeCompare(b.tag)),
      );
      form.reset();
      setNewAssetOpen(false);
      showToast("Asset added to the register");
    } catch (error) {
      setAssetSaveError(
        error instanceof Error ? error.message : "Unable to add this asset.",
      );
    } finally {
      setAssetSaving(false);
    }
  };
  const persist = useCallback(
    (next: WorkOrder[]) => {
      setOrders(next);
      void saveLocalOrders(next, companyId);
    },
    [companyId],
  );

  const flushQueue = useCallback(async () => {
    if (!navigator.onLine || offlinePreviewRef.current || !supabaseConfigured)
      return;
    const queue = await readUpdates(companyId).catch(
      () => [] as PendingUpdate[],
    );
    for (const update of queue) {
      try {
        const response = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
        });
        if (!response.ok) break;
        await clearUpdate(update.id);
      } catch {
        break;
      }
    }
    const remaining = await readUpdates(companyId).catch(
      () => [] as PendingUpdate[],
    );
    setPendingCount(remaining.length);
  }, [companyId, supabaseConfigured]);

  useEffect(() => {
    const local = getLocalOrders(companyId);
    if (local?.length) {
      const localById = new Map(local.map((order) => [order.id, order]));
      const serverIds = new Set(initialOrders.map((order) => order.id));
      const merged = [
        ...initialOrders.map((order) => localById.get(order.id) ?? order),
        ...local.filter((order) => !serverIds.has(order.id)),
      ];
      queueMicrotask(() => setOrders(merged));
    }
    const updateConnection = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void flushQueue();
    };
    updateConnection();
    void readUpdates(companyId)
      .then((queue) => setPendingCount(queue.length))
      .catch(() => {});
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, [companyId, flushQueue, initialOrders]);

  useEffect(() => {
    if (!supabaseConfigured || guestMode) return;
    let timer = 0;
    const start = window.setTimeout(() => {
      void refreshOperationsData();
    }, 0);
    timer = window.setInterval(() => {
      void refreshOperationsData();
    }, 30000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [guestMode, refreshOperationsData, supabaseConfigured]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel("work-order-live-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_orders" },
        async () => {
          const response = await fetch("/api/work-orders", {
            cache: "no-store",
          });
          if (response.ok) {
            const payload = (await response.json()) as {
              orders: WorkOrder[];
              metrics: DashboardMetrics;
            };
            setMetrics(payload.metrics);
            persist(payload.orders);
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [persist, supabaseConfigured]);

  const filteredOrders = useMemo(
    () =>
      orders
        .filter(
          (order) =>
            (filter === "All" || order.status === filter) &&
            `${order.id} ${order.title} ${order.location} ${order.assignee}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)),
    [orders, filter, search],
  );
  const openCount = metrics.openOrders;
  const completedCount = metrics.completedToday;
  const scheduleRows = useMemo(() => {
    if (guestMode)
      return schedule.map((item, index) => ({
        ...item,
        id: `demo-schedule-${index}`,
      }));
    return orders
      .filter((order) => order.assignee !== "Unassigned")
      .slice(0, 5)
      .map((order, index) => ({
        id: order.id,
        time: order.scheduledAt ?? "Anytime",
        name: order.assignee,
        task: order.title,
        zone: `${order.district} · ${order.assetTag || order.location}`,
        color: ["bg-[#d9efe1]", "bg-[#f4e8d2]", "bg-[#e3eaf5]", "bg-[#eee8f5]"][
          index % 4
        ],
      }));
  }, [guestMode, orders]);
  const districtSummary = useMemo(() => {
    if (guestMode) return districts;
    const counts = orders.reduce<Record<string, number>>((result, order) => {
      result[order.district || "Other"] =
        (result[order.district || "Other"] ?? 0) + 1;
      return result;
    }, {});
    return Object.entries(counts)
      .map(([name, count]) => ({
        name: `${name} District`,
        count,
        change: "",
        bar: "",
      }))
      .sort((a, b) => b.count - a.count);
  }, [guestMode, orders]);
  const overviewBars = useMemo(() => {
    if (guestMode)
      return {
        labels: ["6 AM", "8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM"],
        parts: [
          [29, 23, 26],
          [33, 27, 21],
          [37, 31, 28],
          [44, 25, 30],
          [42, 30, 27],
          [34, 27, 20],
          [24, 20, 13],
        ],
      };
    const names = [
      ...new Set(orders.map((order) => order.district || "Other")),
    ].slice(0, 7);
    const max = Math.max(
      ...names.map(
        (name) => orders.filter((order) => order.district === name).length,
      ),
      1,
    );
    return {
      labels: names,
      parts: names.map((name) => {
        const group = orders.filter((order) => order.district === name);
        return [
          group.filter((order) => order.status === "Completed").length,
          group.filter((order) => order.status === "In progress").length,
          group.filter(
            (order) =>
              order.status === "Open" || order.status === "Needs review",
          ).length,
        ].map((count) =>
          count ? Math.max(5, Math.round((count / max) * 65)) : 0,
        );
      }),
    };
  }, [guestMode, orders]);
  const overviewStatusLabels = guestMode
    ? [
        ["bg-[#55b27d]", "Completed"],
        ["bg-[#a3d5b6]", "In progress"],
        ["bg-[#e1eee6]", "Open"],
      ]
    : [
        [
          "bg-[#55b27d]",
          `Completed ${orders.filter((order) => order.status === "Completed").length}`,
        ],
        [
          "bg-[#a3d5b6]",
          `In progress ${orders.filter((order) => order.status === "In progress").length}`,
        ],
        [
          "bg-[#e1eee6]",
          `Open ${orders.filter((order) => order.status === "Open" || order.status === "Needs review").length}`,
        ],
      ];
  const busyTechnicianIds = new Set(
    orders
      .filter((order) => order.technicianId && order.status !== "Completed")
      .map((order) => order.technicianId),
  );
  const assignedTechnicianCount = technicians.filter(
    (technician) =>
      technician.availability === "assigned" ||
      busyTechnicianIds.has(technician.id),
  ).length;
  const availableTechnicianCount = technicians.filter(
    (technician) =>
      technician.availability === "available" &&
      !busyTechnicianIds.has(technician.id),
  ).length;
  const offShiftTechnicianCount = technicians.filter(
    (technician) =>
      technician.availability === "off_shift" ||
      technician.availability === "on_leave",
  ).length;
  const completionRate = guestMode ? 94.2 : metrics.monthlyCompletionRate;
  const assignedOrderCount = guestMode
    ? orders.filter(
        (order) =>
          order.assignee !== "Unassigned" && order.status !== "Completed",
      ).length
    : metrics.assignedOrders;
  const completedPercentChange =
    metrics.completedDailyAverage && metrics.completedDailyAverage > 0
      ? Math.round(
          ((metrics.completedToday - metrics.completedDailyAverage) /
            metrics.completedDailyAverage) *
            100,
        )
      : null;
  const completionTrend = useMemo(() => {
    if (guestMode)
      return ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"].map(
        (day, index) => ({ day, count: [45, 58, 52, 74, 67, 88, 79][index] }),
      );
    const max = Math.max(
      ...metrics.completedTrend.map((day) => day.count),
      1,
    );
    return metrics.completedTrend.map((day) => ({
      ...day,
      count: Math.round((day.count / max) * 100),
    }));
  }, [guestMode, metrics.completedTrend]);
  const filteredAssets = useMemo(() => {
    const query = assetSearch.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter((asset) =>
      [
        asset.tag,
        asset.name,
        asset.type,
        asset.location,
        asset.district ?? "",
        asset.condition,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [assetSearch, assets]);

  const enqueue = async (
    kind: PendingUpdate["kind"],
    payload: Record<string, unknown>,
  ) => {
    const item: PendingUpdate = {
      id: crypto.randomUUID(),
      scope: companyId,
      kind,
      payload,
      queuedAt: new Date().toISOString(),
    };
    await queueUpdate(item, companyId).catch(() => {});
    setPendingCount((count) => count + 1);
    if (isConnected) void flushQueue();
  };

  const createWorkOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = `WO-${Date.now().toString().slice(-8)}`;
    const selectedTechnicianId = String(form.get("technicianId") || "");
    const selectedTechnician = technicians.find(
      (technician) => technician.id === selectedTechnicianId,
    );
    const assignee = selectedTechnician?.name ?? "Unassigned";
    const order: WorkOrder = {
      id,
      title: String(form.get("title")),
      location: String(form.get("location")),
      district: String(form.get("district")),
      assignee,
      technicianId: supabaseConfigured
        ? selectedTechnicianId || undefined
        : undefined,
      initials: initials(assignee),
      priority: String(form.get("priority")) as Priority,
      status: "Open",
      assetTag: String(form.get("assetTag") || ""),
      scheduledAt: form.get("scheduledAt")
        ? new Date(String(form.get("scheduledAt"))).toLocaleTimeString(
            "en-US",
            { hour: "numeric", minute: "2-digit" },
          )
        : undefined,
      scheduleAtISO: form.get("scheduledAt")
        ? new Date(String(form.get("scheduledAt"))).toISOString()
        : undefined,
    };
    const next = [order, ...orders];
    persist(next);
    setMetrics((current) => ({
      ...current,
      openOrders: current.openOrders + 1,
      totalOrders: current.totalOrders + 1,
      assignedOrders:
        current.assignedOrders + (order.assignee !== "Unassigned" ? 1 : 0),
    }));
    setNewOrderOpen(false);
    showToast(
      isConnected
        ? "Work order added to this workspace"
        : "Work order saved offline",
    );
    await enqueue("work-order-create", {
      ...order,
      technicianId: order.technicianId ?? null,
      notes: String(form.get("notes") || ""),
    });
  };

  const updateStatus = async (order: WorkOrder, status: WorkStatus) => {
    const next = orders.map((item) =>
      item.id === order.id
        ? {
            ...item,
            status,
            completedAt:
              status === "Completed" ? new Date().toISOString() : undefined,
          }
        : item,
    );
    persist(next);
    if (order.status !== "Completed" && status === "Completed") {
      setMetrics((current) => ({
        ...current,
        openOrders: Math.max(0, current.openOrders - 1),
        completedToday: current.completedToday + 1,
        assignedOrders: Math.max(
          0,
          current.assignedOrders - (order.assignee !== "Unassigned" ? 1 : 0),
        ),
      }));
    }
    if (order.status === "Completed" && status !== "Completed") {
      setMetrics((current) => ({
        ...current,
        openOrders: current.openOrders + 1,
        completedToday: Math.max(0, current.completedToday - 1),
        assignedOrders:
          current.assignedOrders + (order.assignee !== "Unassigned" ? 1 : 0),
      }));
    }
    showToast(
      isConnected ? `${order.id} status updated` : `${order.id} saved offline`,
    );
    await enqueue("work-order-update", { id: order.id, status });
  };

  const exportCsv = () => {
    const rows = [
      ["Work order", "Title", "Location", "Assignee", "Priority", "Status"],
      ...filteredOrders.map((order) => [
        order.id,
        order.title,
        order.location,
        order.assignee,
        order.priority,
        order.status,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    anchor.download = "gridline-work-orders.csv";
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  const isOverview = page === "Overview";
  const isOrders = page === "Work orders";
  const displayOpenCount = openCount;
  const displayCompletedCount = completedCount;
  const activeTechnicianLabel = `${metrics.activeTechnicians} / ${metrics.totalTechnicians}`;
  const completedAverageNote = guestMode
    ? "sample preview"
    : metrics.completedDailyAverage === null
      ? "daily average unavailable"
      : metrics.completedDailyAverage === 0
        ? "no completions in prior 7 days"
        : `vs. 7-day daily avg. (${new Intl.NumberFormat("en-US", {
            maximumFractionDigits: 1,
          }).format(metrics.completedDailyAverage)}/day)`;
  const title =
    page === "Overview" ? `Good morning, ${profileName.split(" ")[0]}` : page;

  return (
    <div className="min-h-screen bg-mist text-ink">
      <aside className="sidebar-scroll fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col border-r border-line bg-white px-4 pb-3 pt-6 md:flex">
        <Link
          href="/"
          className="flex h-8 items-center gap-2 px-1.5 font-display text-[21px] font-extrabold tracking-[-.065em]"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-forest text-[#a6e9c7]">
            <Bolt size={18} fill="currentColor" />
          </span>
          gridline<span className="-ml-2 text-[#54b783]">.</span>
        </Link>
        <button className="mt-7 flex items-center gap-2.5 rounded-lg border border-line p-2 text-left hover:bg-mist">
          <span className="grid size-8 place-items-center rounded-lg bg-sage font-display font-extrabold text-[#39805a]">
            N
          </span>
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[11px]">{companyName}</b>
            <small className="mt-0.5 block text-[9px] text-muted">
              Operations workspace
            </small>
          </span>
          <ChevronDown size={14} className="text-muted" />
        </button>
        <div className="mb-2 mt-8 px-2 font-mono-ui text-[9px] tracking-[.11em] text-[#9aa59f]">
          WORKSPACE
        </div>
        <nav className="grid gap-1">
          {visibleNavItems.map(({ label, icon: Icon }) => (
            <NavButton
              key={label}
              label={label}
              icon={Icon}
              active={page === label}
              count={label === "Work orders" ? openCount : undefined}
              onClick={() => setPage(label)}
            />
          ))}
        </nav>
        {!guestMode && role === "admin" && (
          <Link
            href="/admin/access-requests"
            className="mt-3 flex h-9 items-center gap-2 rounded-md px-3 text-[10px] font-semibold text-[#52685c] hover:bg-mist"
          >
            <ShieldCheck size={15} /> Access requests
          </Link>
        )}
        {visibleFieldItems.length > 0 && (
          <>
            <div className="mb-2 mt-7 px-2 font-mono-ui text-[9px] tracking-[.11em] text-[#9aa59f]">
              FIELD TOOLS
            </div>
            <nav className="grid gap-1">
              {visibleFieldItems.map(({ label, icon: Icon }) => (
                <NavButton
                  key={label}
                  label={label}
                  icon={Icon}
                  active={page === label}
                  onClick={() => setPage(label)}
                />
              ))}
            </nav>
          </>
        )}
        <div className="mt-auto border-t border-[#edf0ee] pb-3 pt-4">
          <div className="flex items-center gap-2.5 px-2">
            <span className="size-2 rounded-full bg-[#56b785] shadow-[0_0_0_4px_#e9f6ef]" />
            <span>
              <b className="block text-[10px] font-semibold">
                All systems operational
              </b>
              <small className="mt-1 block text-[9px] text-muted">
                Service territory online
              </small>
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2.5 border-t border-[#edf0ee] pt-3">
            <span className="grid size-8 place-items-center rounded-full bg-[#e8dfd2] text-[10px] font-bold text-[#78583d]">
              MC
            </span>
            <span className="flex-1">
              <b className="block text-[10px]">{profileName}</b>
              <small className="block text-[9px] capitalize text-muted">
                {role.replaceAll("_", " ")}
              </small>
            </span>
            <button
              onClick={async () => {
                const client = createClient();
                if (client) {
                  await client.auth.signOut();
                  clearGridlineOfflineData();
                  router.push("/login");
                } else showToast("Demo workspace is not signed in");
              }}
              aria-label="Sign out"
              className="p-1 text-muted"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-h-screen md:ml-[236px]">
        <header className="sticky top-0 z-20 flex h-[58px] items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span className="hidden sm:block">{companyName}</span>
            <span className="hidden text-[#c6cec9] sm:block">/</span>
            <b className="font-semibold text-[#344f44]">{page}</b>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-4">
            {guestMode ? (
              <Button asChild size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
            ) : (
              <button
                onClick={() => {
                  if (!offlinePreview) {
                    offlinePreviewRef.current = true;
                    setOfflinePreview(true);
                    showToast("Offline preview enabled");
                  } else {
                    offlinePreviewRef.current = false;
                    setOfflinePreview(false);
                    showToast("Connection restored");
                    void flushQueue();
                  }
                }}
                className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10px] ${isConnected ? "border-line text-[#597268]" : "border-[#f2e5ce] bg-[#fff8ed] text-[#96651d]"}`}
              >
                <span
                  className={`size-1.5 rounded-full ${isConnected ? "bg-[#56b785]" : "bg-[#d49335]"}`}
                />
                {isConnected ? "Connected" : "Offline mode"}
              </button>
            )}
            <button
              onClick={() => setNotificationsOpen(true)}
              aria-label="Notifications"
              className="relative rounded-md p-1.5 text-[#65746d] hover:bg-mist"
            >
              <Bell size={16} />
              <i className="absolute right-1 top-1 size-1.5 rounded-full border border-white bg-[#dc785e]" />
            </button>
            <span className="hidden h-5 border-l border-line sm:block" />
            <button className="hidden items-center gap-2 text-[10px] text-[#697970] sm:flex">
              {currentDate
                ? new Intl.DateTimeFormat("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  }).format(currentDate)
                : ""}
              <ChevronDown size={13} />
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1500px] px-4 pb-24 pt-6 sm:px-7 md:pb-10 lg:px-9">
          {guestMode && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#dfe9e1] bg-white px-4 py-3">
              <div>
                <b className="text-[11px]">Guest preview · sample data</b>
                <p className="mt-1 text-[10px] text-muted">
                  Explore the dashboard. Sign in to access your utility’s live
                  work.
                </p>
              </div>
              <span className="rounded-full bg-sage px-2.5 py-1 text-[9px] font-semibold text-[#39754f]">
                READ ONLY
              </span>
            </div>
          )}
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>
                {isOverview
                  ? currentDate
                    ? new Intl.DateTimeFormat("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                        .format(currentDate)
                        .toUpperCase()
                    : ""
                  : page.toUpperCase()}
              </Eyebrow>
              <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-.055em] text-[#18372e] sm:text-[28px]">
                {title}
                {isOverview && (
                  <span className="ml-2 text-[19px] text-[#dda85b]">✳</span>
                )}
              </h1>
              <p className="mt-1.5 text-[11px] text-[#84918b]">
                {isOverview
                  ? "Here’s what’s happening across your service territory today."
                  : page === "Work orders"
                    ? "Track, assign, and prioritize service work across your territory."
                    : page === "Assets"
                      ? "Equipment condition and inspection activity across your territory."
                      : page === "Crew & schedule"
                        ? "Today’s assignments and field team availability."
                        : page === "Inspections"
                          ? "Manage asset inspection programs and field findings."
                          : "Service performance and work completion trends."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={exportCsv}>
                <ArrowDownToLine size={14} /> Export report
              </Button>
              {canManageWork && (
                <Button
                  size="sm"
                  onClick={async () => {
                    await refreshOperationsData();
                    setNewOrderOpen(true);
                  }}
                >
                  <Plus size={15} /> New work order
                </Button>
              )}
            </div>
          </div>

          {isOverview && (
            <>
              <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <Metric
                  label="OPEN WORK ORDERS"
                  value={`${displayOpenCount}`}
                  icon={ClipboardCheck}
                  tone="bg-[#ddf2e9] text-[#28815d]"
                  note={guestMode ? "sample preview" : "currently open"}
                />
                <Metric
                  label="ACTIVE TECHNICIANS"
                  value={activeTechnicianLabel}
                  icon={Users}
                  tone="bg-[#e4eefb] text-[#5278ac]"
                  note={
                    serverConnected
                      ? "Available or assigned"
                      : "sample preview"
                  }
                />
                <Metric
                  label="COMPLETED TODAY"
                  value={`${displayCompletedCount}`}
                  change={
                    guestMode || completedPercentChange === null
                      ? undefined
                      : `${completedPercentChange > 0 ? "+" : ""}${completedPercentChange}%`
                  }
                  icon={CheckCircle2}
                  tone="bg-[#ece8f9] text-[#7461b1]"
                  note={completedAverageNote}
                  bars="bg-[#c8bfe7]"
                  barValues={completionTrend.map(({ count }) => count)}
                />
                <Metric
                  label="SLA COMPLIANCE"
                  value={
                    metrics.slaCompliance === null
                      ? "—"
                      : `${metrics.slaCompliance}%`
                  }
                  icon={Clock3}
                  tone="bg-[#fff0d7] text-[#a96e14]"
                  note={
                    metrics.slaCompliance === null
                      ? "No SLA targets set"
                      : "on time for work with due dates"
                  }
                />
              </section>
              <Card className="mb-4">
                <CardHeader>
                  <div>
                    <CardTitle>Operations overview</CardTitle>
                    <CardDescription>
                      Live status across your service territory
                    </CardDescription>
                  </div>
                  <button className="flex h-7 items-center gap-2 rounded-md border border-line px-2.5 text-[10px] text-[#62746b]">
                    Today <ChevronDown size={13} />
                  </button>
                </CardHeader>
                <CardContent className="grid gap-5 pt-4 lg:grid-cols-[minmax(0,1fr)_235px]">
                  <div>
                    <div className="mb-2 flex justify-end gap-4 text-[9px] text-muted">
                      {overviewStatusLabels.map(([color, label]) => (
                        <span className="flex items-center gap-1.5" key={label}>
                          <i className={`size-2 rounded-sm ${color}`} />
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="relative flex h-[165px] items-end justify-around gap-3 border-b border-dashed border-line bg-[linear-gradient(to_bottom,transparent_24%,#edf1ee_24%,#edf1ee_calc(24%+1px),transparent_calc(24%+1px),transparent_49%,#edf1ee_49%,#edf1ee_calc(49%+1px),transparent_calc(49%+1px),transparent_74%,#edf1ee_74%,#edf1ee_calc(74%+1px),transparent_calc(74%+1px))] px-2">
                      {overviewBars.parts.map((parts, index) => (
                        <div
                          key={index}
                          className="flex h-full w-[9%] max-w-[34px] flex-col-reverse justify-end gap-[2px] pb-6"
                        >
                          {parts.map((height, segment) => (
                            <i
                              key={segment}
                              className={`block rounded-t-sm ${["bg-[#55b27d]", "bg-[#a3d5b6]", "bg-[#e1eee6]"][segment]}`}
                              style={{ height: `${height}%` }}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="ml-7 flex justify-around pt-2 font-mono-ui text-[9px] text-[#98a39d]">
                      {overviewBars.labels.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                    <div className="flex items-center justify-between font-mono-ui text-[9px] font-medium tracking-wide text-[#829089]">
                      WORK BY DISTRICT <MoreHorizontal size={15} />
                    </div>
                    <div className="mt-4 grid gap-3.5">
                      {districtSummary.map((district, index) => (
                        <div key={district.name}>
                          <div className="mb-1 flex items-center gap-2 text-[9px]">
                            <i
                              className={`size-2 rounded-full ${["bg-[#60b882]", "bg-[#8dbfa1]", "bg-[#b2d4be]", "bg-[#d3e7d9]"][index % 4]}`}
                            />
                            <span className="flex-1 text-[#738179]">
                              {district.name}
                            </span>
                            <b className="text-[10px] text-[#3b554a]">
                              {district.count}
                            </b>
                            {district.change && (
                              <span
                                className={`w-8 text-right ${district.change.startsWith("−") ? "text-[#b68b55]" : "text-[#46a174]"}`}
                              >
                                {district.change}
                              </span>
                            )}
                          </div>
                          <div className="ml-4 h-1 overflow-hidden rounded-full bg-[#f0f3f0]">
                            <i
                              className={`block h-full rounded-full bg-[#a9d4b8] ${district.bar}`}
                              style={
                                district.bar
                                  ? undefined
                                  : {
                                      width: `${Math.max(8, (district.count / Math.max(...districtSummary.map((item) => item.count), 1)) * 100)}%`,
                                    }
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setPage("Work orders")}
                      className="mt-4 text-[9px] font-semibold text-[#39845e]"
                    >
                      View district breakdown{" "}
                      <ArrowRight size={12} className="ml-1 inline" />
                    </button>
                  </div>
                </CardContent>
              </Card>
              <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1.8fr)_minmax(260px,.88fr)]">
                <Card className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div>
                      <CardTitle>Priority work orders</CardTitle>
                      <CardDescription>
                        Jobs that need your attention
                      </CardDescription>
                    </div>
                    <button
                      onClick={() => setPage("Work orders")}
                      className="text-[10px] font-semibold text-[#39845e]"
                    >
                      View all <ArrowRight size={12} className="ml-1 inline" />
                    </button>
                  </CardHeader>
                  <OrderTable
                    orders={filteredOrders.slice(0, 5)}
                    onSelect={openOrderDetails}
                    onStatus={updateStatus}
                    canUpdate={canManageWork}
                  />
                  <div className="flex h-11 items-center justify-between px-5 text-[9px] text-[#95a19a]">
                    <span>
                      Showing{" "}
                      <b className="text-[#607168]">
                        {Math.min(5, orders.length)}
                      </b>{" "}
                      of <b className="text-[#607168]">{orders.length}</b> work
                      orders
                    </span>
                    <div className="flex items-center gap-1">
                      <button className="grid size-6 place-items-center rounded text-muted hover:bg-mist">
                        <ChevronLeft size={13} />
                      </button>
                      <button className="grid size-6 place-items-center rounded bg-sage text-[9px] font-bold text-[#38734f]">
                        1
                      </button>
                      <button className="grid size-6 place-items-center rounded text-muted hover:bg-mist">
                        2
                      </button>
                      <button className="grid size-6 place-items-center rounded text-muted hover:bg-mist">
                        3
                      </button>
                      <span>…</span>
                      <button className="grid size-6 place-items-center rounded text-muted">
                        26
                      </button>
                      <button className="grid size-6 place-items-center rounded text-muted hover:bg-mist">
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </Card>
                <div className="grid gap-3">
                  <Card>
                    <CardHeader>
                      <div>
                        <CardTitle className="text-[13px]">
                          Today’s schedule
                        </CardTitle>
                        <CardDescription>
                          {new Intl.DateTimeFormat("en", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          }).format(new Date())}
                        </CardDescription>
                      </div>
                      <button
                        className="text-muted"
                        aria-label="Schedule options"
                      >
                        <MoreHorizontal size={17} />
                      </button>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <div className="mb-2 flex gap-3 border-b border-line pb-3 text-[9px] text-[#87938d]">
                        <span>
                          <i className="mr-1 inline-block size-1.5 rounded-full bg-[#55b784]" />
                          {assignedTechnicianCount} assigned
                        </span>
                        <span>
                          <i className="mr-1 inline-block size-1.5 rounded-full bg-[#bdc7c1]" />
                          {availableTechnicianCount} available
                        </span>
                      </div>
                      <div className="grid">
                        {scheduleRows.map((item) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-[38px_3px_1fr] gap-2.5 border-b border-[#f0f2f0] py-2.5 last:border-0"
                          >
                            <span className="font-mono-ui text-[9px] text-[#7c8982]">
                              {item.time}
                            </span>
                            <i className={`rounded-full ${item.color}`} />
                            <div>
                              <b className="block text-[9px] font-semibold text-[#3d574a]">
                                {item.name}
                                <span className="font-normal text-[#92a097]">
                                  {" "}
                                  · {item.task}
                                </span>
                              </b>
                              <small className="mt-1 block text-[8px] text-[#95a099]">
                                {item.zone}
                              </small>
                            </div>
                          </div>
                        ))}
                        {!scheduleRows.length && (
                          <p className="py-4 text-[9px] text-muted">
                            No assigned work orders are scheduled yet.
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setPage("Crew & schedule")}
                        className="mt-1 w-full pt-2 text-left text-[9px] font-semibold text-[#39845e]"
                      >
                        View full schedule{" "}
                        <ArrowRight size={12} className="float-right" />
                      </button>
                    </CardContent>
                  </Card>
                  <div className="flex gap-3 rounded-xl border border-[#deebe1] bg-[#eaf4ed] p-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#d9eddf] text-[#3c8b60]">
                      <Radio size={16} />
                    </span>
                    <div>
                      <b className="font-display text-[10px] text-[#315b43]">
                        Built for the field
                      </b>
                      <p className="mt-1 text-[9px] leading-relaxed text-[#779181]">
                        Technicians keep working offline. Local updates sync
                        when a connection returns.
                      </p>
                      {guestMode ? (
                        <Link
                          href="/login"
                          className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-[#39845e]"
                        >
                          Sign in for field mode <ArrowRight size={12} />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPage("Work orders")}
                          className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-[#39845e]"
                        >
                          Review work orders <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {isOrders && (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                <div className="flex max-w-full gap-1 overflow-x-auto">
                  {[
                    "All",
                    "Open",
                    "In progress",
                    "Completed",
                    "Needs review",
                  ].map((item) => (
                    <button
                      key={item}
                      onClick={() => setFilter(item)}
                      className={`whitespace-nowrap rounded-md px-2.5 py-2 text-[10px] ${filter === item ? "border border-line bg-white font-semibold text-[#34654b]" : "text-[#78867e] hover:bg-mist"}`}
                    >
                      {item}
                      <span className="ml-1.5 text-[9px] text-[#9da8a2]">
                        {item === "All"
                          ? orders.length
                          : orders.filter((order) => order.status === item)
                              .length}
                      </span>
                    </button>
                  ))}
                </div>
                <label className="relative w-full sm:w-52">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-2.5 text-[#98a39d]"
                  />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search work orders"
                    className="h-8 pl-8 text-[10px]"
                  />
                </label>
              </div>
              <OrderTable
                orders={filteredOrders}
                onSelect={openOrderDetails}
                onStatus={updateStatus}
                canUpdate={canManageWork}
              />
              <div className="border-t border-line px-5 py-3 text-[9px] text-muted">
                {filteredOrders.length} work orders in this view · Changes save
                locally and queue for sync.
              </div>
            </Card>
          )}

          {page === "Crew & schedule" && (
            <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Crew schedule</CardTitle>
                    <CardDescription>
                      Assigned work for {companyName}
                    </CardDescription>
                  </div>
                  <Button variant="secondary" size="sm">
                    <CalendarDays size={14} /> Today
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {scheduleRows.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-line p-3"
                    >
                      <span className="w-12 font-mono-ui text-[10px] text-muted">
                        {item.time}
                      </span>
                      <span
                        className={`grid size-9 place-items-center rounded-full text-[10px] font-bold ${initialsTone[index]}`}
                      >
                        {initials(item.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block text-[11px]">{item.name}</b>
                        <small className="mt-1 block text-[9px] text-muted">
                          {item.task} · {item.zone}
                        </small>
                      </span>
                      <span className="hidden text-[9px] text-[#4c8e65] sm:block">
                        Assigned
                      </span>
                      <MoreHorizontal size={16} className="text-muted" />
                    </div>
                  ))}
                  {!scheduleRows.length && (
                    <p className="py-4 text-sm text-muted">
                      No assigned work is scheduled yet.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Crew availability</CardTitle>
                    <CardDescription>
                      Current crew · {technicians.length} technicians
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      [String(assignedTechnicianCount), "Assigned"],
                      [String(availableTechnicianCount), "Available"],
                      [String(offShiftTechnicianCount), "Off shift"],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-lg bg-mist p-3">
                        <b className="font-display text-xl">{value}</b>
                        <small className="mt-1 block text-[9px] text-muted">
                          {label}
                        </small>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 space-y-3">
                    {districtSummary.map((district, index) => (
                      <div
                        key={district.name}
                        className="flex items-center justify-between text-[10px]"
                      >
                        <span className="text-[#63746a]">{district.name}</span>
                        <span className="font-semibold">
                          {guestMode
                            ? ([7, 5, 4, 2][index] ?? 0)
                            : orders.filter(
                                (order) =>
                                  `${order.district} District` ===
                                    district.name &&
                                  order.assignee !== "Unassigned",
                              ).length}{" "}
                          assigned
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {page === "Assets" && (
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-wrap items-start justify-between gap-4 pb-4">
                <div>
                  <CardTitle>Asset register</CardTitle>
                  <CardDescription>
                    Keep equipment details here so work orders can be linked
                    to the right asset.
                  </CardDescription>
                </div>
                <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                  <label className="relative min-w-[180px] flex-1 sm:flex-none">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-2.5 text-[#98a39d]"
                    />
                    <Input
                      value={assetSearch}
                      onChange={(event) => setAssetSearch(event.target.value)}
                      placeholder="Search assets"
                      aria-label="Search assets"
                      className="h-8 pl-8 text-[10px]"
                    />
                  </label>
                  {canManageAssets && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setAssetSaveError("");
                        setNewAssetOpen(true);
                      }}
                    >
                      <Plus size={14} /> Add asset
                    </Button>
                  )}
                </div>
              </CardHeader>
              <div className="border-y border-line bg-mist/60 px-5 py-3">
                <p className="text-[10px] font-semibold text-[#456253]">
                  How to add an asset
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  {canManageAssets
                    ? "Select Add asset, enter a unique tag and the equipment details, then save. The tag will be available when you create a work order."
                    : guestMode
                      ? "Sign in to your company workspace to manage its asset register."
                      : "Only a company admin can add assets. Ask your admin to register the equipment; once added, its tag can be selected on a work order."}
                </p>
              </div>
              <div className="table-scroll overflow-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-[#fafbfa] text-[8px] font-mono-ui text-muted">
                    <tr>
                      {[
                        "ASSET TAG",
                        "EQUIPMENT",
                        "LOCATION",
                        "DISTRICT",
                        "CONDITION",
                        "STATE",
                      ].map((x) => (
                        <th key={x} className="border-y border-line px-5 py-3">
                          {x}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {!filteredAssets.length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-8 text-center text-sm text-muted"
                        >
                          {assets.length
                            ? "No assets match your search."
                            : "No assets have been added to this company yet."}
                          {!assets.length && canManageAssets && (
                            <Button
                              className="mx-auto mt-3 flex"
                              size="sm"
                              onClick={() => {
                                setAssetSaveError("");
                                setNewAssetOpen(true);
                              }}
                            >
                              <Plus size={14} /> Add your first asset
                            </Button>
                          )}
                        </td>
                      </tr>
                    )}
                    {filteredAssets.map((asset) => (
                      <tr
                        key={asset.tag}
                        className="border-b border-line last:border-0"
                      >
                        <td className="px-5 py-4 font-mono-ui text-[10px] text-[#52765f]">
                          {asset.tag}
                        </td>
                        <td className="px-5 py-4 text-[10px] font-semibold">
                          {asset.name || asset.type}
                        </td>
                        <td className="px-5 py-4 text-[10px] text-muted">
                          {asset.location}
                        </td>
                        <td className="px-5 py-4 text-[10px] text-muted">
                          {asset.district || "—"}
                        </td>
                        <td className="px-5 py-4 text-[10px]">
                          {asset.condition}
                        </td>
                        <td className="px-5 py-4">
                          <Badge
                            className={
                              ["watch", "poor", "critical"].includes(
                                asset.condition.toLowerCase(),
                              )
                                ? "bg-[#fff6df] text-[#9c7929]"
                                : "bg-[#edf6ef] text-[#568665]"
                            }
                          >
                            {["watch", "poor", "critical"].includes(
                              asset.condition.toLowerCase(),
                            )
                              ? "Attention"
                              : "In service"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {page === "Inspections" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {inspectionTemplates.map((template) => {
                const Icon = /transform|elect|asset/i.test(
                  `${template.name} ${template.assetType}`,
                )
                  ? Bolt
                  : /pole|line/i.test(`${template.name} ${template.assetType}`)
                    ? Activity
                    : ShieldCheck;
                return (
                  <Card key={template.id}>
                    <CardContent className="p-5">
                      <span className="grid size-9 place-items-center rounded-lg bg-sage text-[#47845f]">
                        <Icon size={18} />
                      </span>
                      <h3 className="mt-4 font-display text-sm font-bold">
                        {template.name}
                      </h3>
                      <p className="mt-1 text-[10px] text-muted">
                        {template.checklist.length} checkpoints ·{" "}
                        {template.assetType} · v{template.version}
                      </p>
                      <Link
                        href="/field"
                        className="mt-5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#39845e]"
                      >
                        Open field checklist <ArrowRight size={13} />
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
              {!inspectionTemplates.length && (
                <Card className="md:col-span-2 xl:col-span-3">
                  <CardContent className="p-6 text-sm text-muted">
                    No active inspection templates have been added to this
                    company yet.
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {page === "Reports" && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Metric
                label="COMPLETION RATE"
                value={
                  completionRate === null
                    ? "—"
                    : `${completionRate}%`
                }
                change={guestMode ? "3.1%" : ""}
                icon={CheckCircle2}
                tone="bg-[#ddf2e9] text-[#28815d]"
                note={
                  guestMode
                    ? "sample this month"
                    : "work orders created this month"
                }
              />
              <Metric
                label="WORK ORDERS"
                value={String(guestMode ? orders.length : metrics.totalOrders)}
                change=""
                icon={Clock3}
                tone="bg-[#e4eefb] text-[#5278ac]"
                note="in this workspace"
              />
              <Metric
                label="ASSIGNED JOBS"
                value={String(assignedOrderCount)}
                change=""
                icon={Wrench}
                tone="bg-[#ece8f9] text-[#7461b1]"
                note="active work with a technician"
              />
              <Card className="lg:col-span-3">
                <CardHeader>
                  <div>
                    <CardTitle>Work completion trend</CardTitle>
                    <CardDescription>
                      Completed service work · past 7 days
                    </CardDescription>
                  </div>
                  <Button variant="secondary" size="sm" onClick={exportCsv}>
                    <ArrowDownToLine size={14} /> Download CSV
                  </Button>
                </CardHeader>
                <CardContent className="grid h-60 grid-cols-7 items-end gap-4 border-b border-dashed border-line px-8 pb-0 pt-8">
                  {completionTrend.map(({ day, count }) => (
                    <div
                      key={day}
                      className="flex h-full flex-col items-center justify-end gap-2"
                    >
                      <div className="flex w-full max-w-14 flex-1 items-end rounded-t-md bg-[#eef3ef]">
                        <i
                          className="block w-full rounded-t-md bg-[#65b786]"
                          style={{ height: `${count}%` }}
                        />
                      </div>
                      <span className="mb-2 text-[9px] text-muted">{day}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur md:hidden"
          style={{
            gridTemplateColumns: `repeat(${mobileNavItems.length}, minmax(0, 1fr))`,
          }}
        >
          {mobileNavItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setPage(label)}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[7px] ${page === label ? "font-bold text-[#2f6848]" : "text-muted"}`}
            >
              <Icon size={15} />
              <span>{label === "Crew & schedule" ? "Crew" : label}</span>
            </button>
          ))}
        </nav>
        <div className="fixed bottom-16 right-3 z-50 grid gap-2 md:bottom-5 md:right-5">
          {!isConnected && (
            <div className="rounded-lg border border-[#f1e2c5] bg-[#fff8e9] px-3 py-2 text-[10px] text-[#906b2f] shadow-card">
              <WifiOff size={13} className="mr-2 inline" />
              Offline · {pendingCount} updates saved on device
            </div>
          )}
          {toast && (
            <div
              role="status"
              className="toast-in rounded-lg bg-forest px-4 py-3 text-[11px] text-white shadow-xl"
            >
              {toast}
            </div>
          )}
        </div>
      </main>

      <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
        <DialogContent>
          <div className="mb-5">
            <Eyebrow>FIELD OPERATIONS</Eyebrow>
            <DialogTitle className="mt-2">Create work order</DialogTitle>
            <DialogDescription className="mt-1">
              Add the job details and assign it to a field technician.
            </DialogDescription>
          </div>
          <form onSubmit={createWorkOrder} className="grid gap-3.5">
            <FormField label="WORK ORDER TITLE">
              <Input
                required
                name="title"
                placeholder="e.g. Transformer inspection"
              />
            </FormField>
            <FormField label="SERVICE LOCATION">
              <Input
                required
                name="location"
                placeholder="Street address or asset location"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="DISTRICT">
                <select
                  name="district"
                  className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
                >
                  {Array.from(
                    new Set([
                      ...(guestMode
                        ? ["North", "Central", "South", "East"]
                        : ["North", "Central", "South", "East"]),
                      ...orders.map((order) => order.district).filter(Boolean),
                    ]),
                  ).map((district) => (
                    <option key={district}>{district}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="ASSET TAG">
                <Input
                  name="assetTag"
                  list="company-assets"
                  placeholder="Choose or enter asset tag"
                />
                <datalist id="company-assets">
                  {assets.map((asset) => (
                    <option key={asset.tag} value={asset.tag}>
                      {asset.name}
                    </option>
                  ))}
                </datalist>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="ASSIGN TECHNICIAN">
                <select
                  name="technicianId"
                  className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
                >
                  <option value="">Unassigned</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name}
                      {technician.availability === "off_shift" ||
                      technician.availability === "on_leave"
                        ? " · Off shift"
                        : ""}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="PRIORITY">
                <select
                  name="priority"
                  className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
                >
                  <option>Medium</option>
                  <option>High</option>
                  <option>Urgent</option>
                  <option>Low</option>
                </select>
              </FormField>
            </div>
            <FormField label="SCHEDULED START">
              <Input name="scheduledAt" type="datetime-local" />
            </FormField>
            <FormField label="WORK NOTES">
              <Textarea
                name="notes"
                placeholder="Describe the issue or required inspection"
                className="min-h-20"
              />
            </FormField>
            <div className="mt-1 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setNewOrderOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                <Plus size={14} /> Create work order
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={newAssetOpen}
        onOpenChange={(open) => {
          setNewAssetOpen(open);
          if (!open) setAssetSaveError("");
        }}
      >
        <DialogContent>
          <div className="mb-5">
            <Eyebrow>ASSET REGISTER</Eyebrow>
            <DialogTitle className="mt-2">Add an asset</DialogTitle>
            <DialogDescription className="mt-1">
              Register the equipment once, then link it to work orders using
              its asset tag.
            </DialogDescription>
          </div>
          <form onSubmit={createAsset} className="grid gap-3.5">
            <FormField label="ASSET TAG">
              <Input
                autoFocus
                required
                maxLength={100}
                name="assetTag"
                placeholder="e.g. TX-1042"
                aria-describedby="asset-tag-help"
              />
              <small id="asset-tag-help" className="mt-1 block text-[9px] text-muted">
                Use the unique identifier printed on the equipment.
              </small>
            </FormField>
            <FormField label="EQUIPMENT NAME">
              <Input
                required
                maxLength={200}
                name="name"
                placeholder="e.g. North feeder transformer"
              />
            </FormField>
            <FormField label="ASSET TYPE">
              <Input
                required
                maxLength={100}
                name="type"
                placeholder="e.g. Distribution transformer"
              />
            </FormField>
            <FormField label="LOCATION">
              <Input
                required
                maxLength={300}
                name="location"
                placeholder="Street address or site description"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="DISTRICT">
                <Input
                  required
                  maxLength={100}
                  name="district"
                  placeholder="e.g. North"
                />
              </FormField>
              <FormField label="CONDITION">
                <select
                  name="condition"
                  defaultValue="unknown"
                  className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
                >
                  <option value="unknown">Unknown</option>
                  <option value="good">Good</option>
                  <option value="watch">Watch</option>
                  <option value="poor">Poor</option>
                  <option value="critical">Critical</option>
                </select>
              </FormField>
            </div>
            {assetSaveError && (
              <p role="alert" className="text-xs text-[#b7584c]">
                {assetSaveError}
              </p>
            )}
            <div className="mt-1 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={assetSaving}
                onClick={() => setNewAssetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={assetSaving}>
                <Plus size={14} />
                {assetSaving ? "Saving…" : "Save asset"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => {
          if (!open) {
            fieldActivityRequest.current?.abort();
            setSelectedOrder(null);
            setFieldActivity(null);
            setFieldActivityError("");
            setFieldActivityLoading(false);
          }
        }}
      >
        <DialogContent>
          {selectedOrder && (
            <>
              <div className="mb-5">
                <Eyebrow>
                  {selectedOrder.id} · {selectedOrder.district.toUpperCase()}{" "}
                  DISTRICT
                </Eyebrow>
                <DialogTitle className="mt-2">
                  {selectedOrder.title}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Service location · {selectedOrder.location}
                </DialogDescription>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-mist p-4">
                <div>
                  <small className="font-mono-ui text-[8px] tracking-wide text-muted">
                    PRIORITY
                  </small>
                  <p className="mt-1 text-xs font-semibold">
                    {selectedOrder.priority}
                  </p>
                </div>
                <div>
                  <small className="font-mono-ui text-[8px] tracking-wide text-muted">
                    ASSIGNED TO
                  </small>
                  <p className="mt-1 text-xs font-semibold">
                    {selectedOrder.assignee}
                  </p>
                </div>
                <div>
                  <small className="font-mono-ui text-[8px] tracking-wide text-muted">
                    ASSET
                  </small>
                  <p className="mt-1 text-xs font-semibold">
                    {selectedOrder.assetTag || "Not specified"}
                  </p>
                </div>
                <div>
                  <small className="font-mono-ui text-[8px] tracking-wide text-muted">
                    STATUS
                  </small>
                  <p className="mt-1 text-xs font-semibold">
                    {selectedOrder.status}
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <h3 className="text-xs font-bold">Technician submissions</h3>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  Review work notes, checklist progress, and uploaded files
                  from the assigned technician.
                </p>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => void loadFieldActivity()}
                    disabled={guestMode || fieldActivityLoading}
                  >
                    {fieldActivityLoading
                      ? "Loading submissions…"
                      : fieldActivity
                        ? "Refresh submissions"
                        : "View field submissions"}
                  </Button>
                </div>
                {guestMode && (
                  <p className="mt-3 text-[10px] text-muted">
                    Sign in to view technician submissions.
                  </p>
                )}
                {fieldActivityError && (
                  <p role="alert" className="mt-3 text-[10px] text-[#b7584c]">
                    {fieldActivityError}
                  </p>
                )}
                {fieldActivity && (
                  <div className="mt-4 space-y-5">
                    <section>
                      <h4 className="text-[10px] font-bold uppercase tracking-wide text-[#65766d]">
                        Work notes &amp; checklist
                      </h4>
                      {fieldActivity.updates.length ? (
                        <div className="mt-2 space-y-2">
                          {fieldActivity.updates.map((update) => {
                            const completedChecks =
                              update.checklist.filter(
                                (item) => item === true,
                              ).length;
                            return (
                              <article
                                key={update.id}
                                className="rounded-lg border border-line p-3"
                              >
                                <div className="flex flex-wrap justify-between gap-2 text-[9px] text-muted">
                                  <span>{update.technician}</span>
                                  <time dateTime={update.createdAt}>
                                    {new Intl.DateTimeFormat("en-US", {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                    }).format(new Date(update.createdAt))}
                                  </time>
                                </div>
                                {update.notes.trim() ? (
                                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink">
                                    {update.notes}
                                  </p>
                                ) : (
                                  <p className="mt-2 text-[10px] text-muted">
                                    No work note was added.
                                  </p>
                                )}
                                {update.checklist.length > 0 && (
                                  <p className="mt-2 text-[10px] text-muted">
                                    {completedChecks} of{" "}
                                    {update.checklist.length} checklist items
                                    completed
                                  </p>
                                )}
                                {update.status && (
                                  <p className="mt-1 text-[10px] text-muted">
                                    Submitted status: {update.status}
                                  </p>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-[10px] text-muted">
                          No technician notes or checklist updates have been
                          submitted.
                        </p>
                      )}
                    </section>
                    <section>
                      <h4 className="text-[10px] font-bold uppercase tracking-wide text-[#65766d]">
                        Photos &amp; files
                      </h4>
                      {fieldActivity.attachments.length ? (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {fieldActivity.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="overflow-hidden rounded-lg border border-line p-2 text-[9px] text-[#39845e] hover:bg-mist"
                            >
                              {attachment.mediaType.startsWith("image/") &&
                              attachment.mediaType !== "image/heic" ? (
                                <Image
                                  src={attachment.url}
                                  alt={attachment.fileName}
                                  width={560}
                                  height={360}
                                  unoptimized
                                  className="mb-2 h-28 w-full rounded object-cover"
                                />
                              ) : (
                                <span className="mb-2 block rounded bg-mist p-6 text-center">
                                  Open file
                                </span>
                              )}
                              <span className="block truncate font-semibold">
                                {attachment.fileName}
                              </span>
                              <span className="mt-1 block text-muted">
                                {attachment.uploadedBy} ·{" "}
                                {new Intl.DateTimeFormat("en-US", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                }).format(new Date(attachment.createdAt))}
                              </span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-[10px] text-muted">
                          No photos or files have been uploaded.
                        </p>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="max-w-md">
          <div className="mb-4">
            <Eyebrow>FIELD UPDATES</Eyebrow>
            <DialogTitle className="mt-2">Notifications</DialogTitle>
          </div>
          <div className="divide-y divide-line">
            {[
              [
                "SLA watch",
                "WO-2839 is approaching its response target.",
                "12 minutes ago · Central District",
              ],
              [
                "Crew update",
                "Elena Ruiz completed her morning inspection.",
                "38 minutes ago · North District",
              ],
              [
                "Schedule change",
                "Marcus Lee is available for reassignment.",
                "1 hour ago · Central District",
              ],
            ].map(([title, body, time]) => (
              <div key={title} className="py-3">
                <b className="text-[11px]">{title}</b>
                <p className="mt-1 text-[10px] text-[#586b60]">{body}</p>
                <small className="mt-1 block text-[9px] text-muted">
                  {time}
                </small>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NavButton({
  label,
  icon: Icon,
  active,
  count,
  onClick,
}: {
  label: Page;
  icon: typeof Grid2X2;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-9 items-center gap-2.5 rounded-md px-2.5 text-left text-[11px] transition-colors ${active ? "bg-sage font-semibold text-[#2f6848]" : "text-[#68776f] hover:bg-mist"}`}
    >
      <Icon size={15} />
      <span className="flex-1">{label}</span>
      {count !== undefined && (
        <span className="rounded bg-[#e6eee9] px-1.5 py-0.5 text-[9px] text-[#62746a]">
          {count}
        </span>
      )}
    </button>
  );
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-mono-ui text-[9px] font-medium tracking-[.1em] text-[#82928a]">
      <i className="h-px w-4 bg-[#55ac7e]" />
      {children}
    </div>
  );
}
function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="font-mono-ui text-[8px] font-medium tracking-[.07em] text-[#829087]">
        {label}
      </span>
      {children}
    </label>
  );
}
