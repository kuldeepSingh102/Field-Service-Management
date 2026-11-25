"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bolt,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  MapPin,
  Navigation,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  clearMedia,
  clearUpdate,
  listMedia,
  queueUpdate,
  readUpdates,
  saveLocalOrders,
  storeMedia,
} from "@/lib/offline";
import { demoWorkOrders } from "@/lib/demo-data";
import type { PendingUpdate } from "@/lib/types";

type Job = {
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
type Tab = "jobs" | "history" | "checklists";

export function FieldWorkspace({
  initialJobs: fieldAssignments,
  companyId: initialCompanyId,
}: {
  initialJobs: Job[];
  companyId: string;
}) {
  const [jobs, setJobs] = useState(fieldAssignments);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [userName, setUserName] = useState("Jamie Rivera");
  const [scope, setScope] = useState(initialCompanyId);
  const [history, setHistory] = useState<
    Array<{ id: string; title: string; location: string }>
  >([]);
  const [tab, setTab] = useState<Tab>("jobs");
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [checks, setChecks] = useState<boolean[]>([]);
  const [notes, setNotes] = useState("");
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [toast, setToast] = useState("");
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const timeout = window.setTimeout(() => setCurrentDate(new Date()), 0);
    return () => window.clearTimeout(timeout);
  }, []);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  const showToast = useCallback((value: string) => {
    setToast(value);
    window.setTimeout(() => setToast(""), 2600);
  }, []);
  const flushQueue = useCallback(async () => {
    if (!navigator.onLine || !supabaseConfigured || !scope) return;
    const queue = await readUpdates(scope).catch(() => [] as PendingUpdate[]);
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
    const media = await listMedia(scope).catch(() => []);
    for (const item of media) {
      const body = new FormData();
      body.set("workOrderId", item.workOrderId);
      body.set("file", item.blob, item.name);
      try {
        const response = await fetch("/api/attachments", {
          method: "POST",
          body,
        });
        if (!response.ok) break;
        await clearMedia(item.id);
      } catch {
        break;
      }
    }
    setPending(
      (await readUpdates(scope).catch(() => [])).length +
        (await listMedia(scope).catch(() => [])).length,
    );
  }, [scope, supabaseConfigured]);

  useEffect(() => {
    const hydrate = async () => {
      let activeScope =
        initialCompanyId ||
        localStorage.getItem("gridline:active-company") ||
        "demo";
      let serverJobs: Job[] | null = null;
      if (supabaseConfigured) {
        try {
          const response = await fetch("/api/field-data", {
            cache: "no-store",
          });
          if (response.ok) {
            const result = (await response.json()) as {
              companyId: string;
              userName: string;
              jobs: Job[];
            };
            activeScope = result.companyId || activeScope;
            setUserName(result.userName || "Technician");
            serverJobs = result.jobs;
          }
        } catch {
          /* Use the scoped offline copy below. */
        }
      }
      setScope(activeScope);
      localStorage.setItem("gridline:active-company", activeScope);
      try {
        const storedValue = localStorage.getItem(
          `gridline:${activeScope}:field-jobs`,
        );
        const stored = storedValue ? (JSON.parse(storedValue) as Job[]) : null;
        const finished = localStorage.getItem(
          `gridline:${activeScope}:field-history`,
        );
        const finishedJobs = finished
          ? (JSON.parse(finished) as typeof history)
          : [];
        setHistory(finishedJobs);
        if (serverJobs) {
          const savedById = new Map((stored ?? []).map((job) => [job.id, job]));
          const finishedIds = new Set(finishedJobs.map((job) => job.id));
          const mergedJobs = serverJobs
            .map((job) => {
              const saved = savedById.get(job.id);
              return saved
                ? {
                    ...job,
                    progress: saved.progress,
                    notes: saved.notes,
                    photos: saved.photos,
                    status: saved.status,
                  }
                : job;
            })
            .filter((job) => !finishedIds.has(job.id));
          setJobs(mergedJobs);
          localStorage.setItem(
            `gridline:${activeScope}:field-jobs`,
            JSON.stringify(mergedJobs),
          );
        } else if (stored) setJobs(stored);
        else if (!supabaseConfigured) setJobs(fieldAssignments);
      } catch {
        /* Keep the preloaded route assignments. */
      }
      const [updates, media] = await Promise.all([
        readUpdates(activeScope).catch(() => []),
        listMedia(activeScope).catch(() => []),
      ]);
      setPending(updates.length + media.length);
    };
    void hydrate();
    const updateOnline = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void flushQueue();
    };
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    const install = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", install);
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      window.removeEventListener("beforeinstallprompt", install);
    };
  }, [fieldAssignments, flushQueue, initialCompanyId, supabaseConfigured]);

  const persistJobs = (next: Job[]) => {
    setJobs(next);
    localStorage.setItem(`gridline:${scope}:field-jobs`, JSON.stringify(next));
  };
  const startJob = async (job: Job) => {
    const next = jobs.map((item) =>
      item.id === job.id ? { ...item, status: "In progress" as const } : item,
    );
    persistJobs(next);
    const update: PendingUpdate = {
      id: crypto.randomUUID(),
      scope,
      kind: "work-order-update",
      payload: { id: job.id, status: "In progress" },
      queuedAt: new Date().toISOString(),
    };
    await queueUpdate(update, scope).catch(() => {});
    setPending((count) => count + 1);
    showToast("Job started · field updates are ready");
    if (navigator.onLine) void flushQueue();
  };
  const openChecklist = (job: Job) => {
    setActiveJob(job);
    setChecks(
      Array.from(
        { length: job.checklist.length },
        (_, index) => index < job.progress,
      ),
    );
    setNotes(job.notes || "");
  };
  const storeAndQueue = async (job: Job, complete = false) => {
    const progress = checks.filter(Boolean).length;
    const changed: Job = { ...job, progress, notes, status: "In progress" };
    const update: PendingUpdate = {
      id: crypto.randomUUID(),
      scope,
      kind: "inspection-update",
      payload: {
        id: job.id,
        status: complete ? "Completed" : "In progress",
        progress,
        total: job.total,
        notes,
        checklist: checks,
      },
      queuedAt: new Date().toISOString(),
    };
    await queueUpdate(update, scope).catch(() => {});
    setPending((count) => count + 1);
    if (complete) {
      const next = jobs.filter((item) => item.id !== job.id);
      const finished = [
        ...history,
        { id: job.id, title: job.title, location: job.location },
      ];
      persistJobs(next);
      setHistory(finished);
      localStorage.setItem(
        `gridline:${scope}:field-history`,
        JSON.stringify(finished),
      );
      setActiveJob(null);
      showToast("Work order completed");
      const storedOrders = (() => {
        try {
          return JSON.parse(
            localStorage.getItem(`gridline:${scope}:orders`) || "null",
          ) as typeof demoWorkOrders | null;
        } catch {
          return null;
        }
      })();
      if (storedOrders)
        await saveLocalOrders(
          storedOrders.map((order) =>
            order.id === job.id
              ? { ...order, status: "Completed" as const }
              : order,
          ),
          scope,
        );
    } else {
      persistJobs(jobs.map((item) => (item.id === job.id ? changed : item)));
      setActiveJob(null);
      showToast(
        online
          ? "Checklist progress saved"
          : "Saved offline · syncs when connected",
      );
    }
    if (navigator.onLine) void flushQueue();
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files || !activeJob) return;
    for (const file of Array.from(files))
      await storeMedia(activeJob.id, file, scope).catch(() => {});
    const count = files.length;
    const updated = jobs.map((job) =>
      job.id === activeJob.id
        ? { ...job, photos: (job.photos || 0) + count }
        : job,
    );
    persistJobs(updated);
    setActiveJob({ ...activeJob, photos: (activeJob.photos || 0) + count });
    setPending((value) => value + count);
    showToast(`${count} photo${count === 1 ? "" : "s"} stored on device`);
    if (navigator.onLine) void flushQueue();
  };

  const install = async () => {
    if (!installPrompt) {
      showToast("Use your browser menu to install Gridline");
      return;
    }
    await installPrompt.prompt();
    setInstallPrompt(null);
  };
  const jobRows = jobs;

  return (
    <div className="min-h-screen bg-[#f5f8f5] text-[#203d32]">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white px-4 sm:px-7">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-[19px] font-extrabold tracking-[-.06em]"
        >
          <span className="grid size-7 place-items-center rounded-lg bg-forest text-[#a6e9c7]">
            <Bolt size={18} fill="currentColor" />
          </span>
          gridline<span className="-ml-2 text-[#54b783]">.</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={install}
            className="hidden rounded-md border border-line px-2.5 py-1.5 text-[9px] font-semibold text-muted hover:bg-mist sm:block"
          >
            Install app
          </button>
          <div
            className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[9px] ${online ? "border-line text-[#597268]" : "border-[#f2e5ce] bg-[#fff8ed] text-[#96651d]"}`}
          >
            {online ? <Wifi size={12} /> : <WifiOff size={12} />}
            {online ? "Connected" : "Offline"}
          </div>
          <button className="grid size-8 place-items-center rounded-full bg-[#d9e9df] text-[9px] font-bold text-[#37624a]">
            JR
          </button>
        </div>
      </header>
      <div className="mx-auto grid min-h-[calc(100vh-56px)] max-w-[1300px] md:grid-cols-[205px_minmax(0,1fr)]">
        <nav className="sticky top-14 z-10 flex h-12 border-b border-line bg-white px-2 md:static md:h-auto md:flex-col md:border-b-0 md:border-r md:px-3 md:py-6">
          {(
            [
              ["jobs", "▤", "My jobs"],
              ["history", "◷", "History"],
              ["checklists", "☷", "Checklists"],
            ] as const
          ).map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 text-[10px] md:mb-1 md:h-10 md:flex-none md:justify-start ${tab === key ? "bg-sage font-semibold text-[#2f6848]" : "text-[#718078] hover:bg-mist"}`}
            >
              <span className="text-sm">{icon}</span>
              {label}
              {key === "jobs" && (
                <b className="ml-1 rounded bg-[#d9eadf] px-1.5 py-0.5 text-[8px]">
                  {jobs.length}
                </b>
              )}
            </button>
          ))}
          <div className="mt-auto hidden border-t border-line pt-3 md:block">
            <div className="flex items-center gap-2 px-2 py-2 text-[9px] text-muted">
              <span
                className={`size-1.5 rounded-full ${pending ? "bg-amber-500" : "bg-[#56b785]"}`}
              />
              {pending
                ? `${pending} update${pending === 1 ? "" : "s"} waiting to sync`
                : "All changes synced"}
            </div>
            <Link
              href="/"
              className="mt-2 flex items-center gap-2 rounded-md px-2 py-2 text-[10px] text-[#61746a] hover:bg-mist"
            >
              <ArrowLeft size={13} /> Supervisor dashboard
            </Link>
          </div>
        </nav>
        <main className="mx-auto w-full max-w-[900px] px-4 pb-12 pt-6 sm:px-7 lg:px-9">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono-ui text-[9px] tracking-[.1em] text-[#82928a]">
                {currentDate
                  ? new Intl.DateTimeFormat("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                      .format(currentDate)
                      .toUpperCase()
                  : ""}
              </p>
              <h1 className="mt-2 font-display text-[24px] font-bold tracking-[-.05em]">
                Good morning, {userName.split(" ")[0]}
              </h1>
              <p className="mt-1 text-[10px] text-muted">
                Your route is looking good. Stay safe out there.
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 sm:flex">
              <span className="text-xl text-[#daa64f]">☀</span>
              <span>
                <b className="block text-[12px]">68°</b>
                <small className="text-[8px] text-muted">Clear skies</small>
              </span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 rounded-lg border border-line bg-white py-3">
            <div className="border-r border-line px-3 sm:px-5">
              <small className="font-mono-ui text-[8px] tracking-wide text-muted">
                MY JOBS
              </small>
              <b className="mt-1 block font-display text-lg">{jobs.length}</b>
            </div>
            <div className="border-r border-line px-3 sm:px-5">
              <small className="font-mono-ui text-[8px] tracking-wide text-muted">
                COMPLETED
              </small>
              <b className="mt-1 block font-display text-lg">
                {history.length + 2}
              </b>
            </div>
            <div className="px-3 sm:px-5">
              <small className="font-mono-ui text-[8px] tracking-wide text-muted">
                ROUTE DISTANCE
              </small>
              <b className="mt-1 block font-display text-lg">
                18.6{" "}
                <small className="text-[9px] font-medium text-muted">mi</small>
              </b>
            </div>
          </div>
          {tab === "jobs" && (
            <>
              <div className="mb-3 mt-7 flex items-end justify-between">
                <div>
                  <h2 className="font-display text-sm font-bold">
                    Today’s assignments
                  </h2>
                  <p className="mt-1 text-[9px] text-muted">
                    North District · Route 07
                  </p>
                </div>
                <button
                  onClick={() => {
                    const sorted = [...jobs].sort(
                      (a, b) =>
                        Number(b.priority === "High") -
                        Number(a.priority === "High"),
                    );
                    persistJobs(sorted);
                    showToast("High-priority work first");
                  }}
                  className="flex h-7 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-[9px] text-[#697970]"
                >
                  <span>⇅</span> Priority
                </button>
              </div>
              <div className="grid gap-2.5">
                {jobRows.map((job) => (
                  <Card key={job.id} className="overflow-hidden rounded-lg">
                    <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2.5 p-3 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:gap-3.5 sm:p-4">
                      <span
                        className={`grid size-8 place-items-center rounded-lg text-sm ${job.priority === "High" ? "bg-[#fff0e9] text-[#b76448]" : "bg-[#eaf3ec] text-[#48845f]"}`}
                      >
                        {job.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-[10px] font-bold text-[#314b3e] sm:text-[11px]">
                            {job.title}
                          </h3>
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono-ui text-[7px] ${job.priority === "High" ? "bg-[#fff3e8] text-[#b16d42]" : "bg-[#eef6ef] text-[#648b6c]"}`}
                          >
                            {job.priority}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[8px] text-[#89968f]">
                          {job.kind} · {job.location}
                        </p>
                        <div className="mt-1.5 flex gap-2 text-[8px] text-[#89958f]">
                          <span>{job.customer.split(" · ")[0]}</span>
                          <span>·</span>
                          <span>{job.id}</span>
                        </div>
                      </div>
                      <span className="self-start font-mono-ui text-[8px] text-[#718078]">
                        {job.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 border-t border-[#f0f2f0] px-3 py-2 pl-[52px] sm:pl-[64px]">
                      {job.status === "Open" ? (
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-[9px]"
                          onClick={() => startJob(job)}
                        >
                          Start job
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="soft"
                          className="h-7 px-2.5 text-[9px]"
                          onClick={() => openChecklist(job)}
                        >
                          Continue
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2.5 text-[9px]"
                        onClick={() => openChecklist(job)}
                      >
                        Checklist{" "}
                        <span className="text-muted">
                          {job.progress}/{job.total}
                        </span>
                      </Button>
                      <button
                        onClick={() => openChecklist(job)}
                        className="ml-auto flex h-7 items-center gap-1 text-[9px] text-[#39845e]"
                      >
                        Details <ChevronDown size={12} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
          {tab === "history" && (
            <div className="mt-7">
              <h2 className="font-display text-sm font-bold">Completed work</h2>
              <p className="mt-1 text-[9px] text-muted">
                Recently finished jobs and saved field updates.
              </p>
              <Card className="mt-3 divide-y divide-line px-4">
                {[
                  {
                    id: "WO-2824",
                    title: "Service restoration",
                    location: "601 Riverbend Dr",
                    time: "Today · 8:12 AM",
                  },
                  {
                    id: "WO-2817",
                    title: "Switchgear thermal scan",
                    location: "2200 Utility Loop",
                    time: "Friday · 3:45 PM",
                  },
                  ...history.map((item) => ({
                    ...item,
                    time: "Today · just now",
                  })),
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <b className="block text-[10px]">{item.title}</b>
                      <small className="mt-1 block text-[8px] text-muted">
                        {item.location} · {item.time}
                      </small>
                    </div>
                    <span className="flex items-center gap-1 text-[9px] text-[#58926c]">
                      <Check size={12} /> Complete
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          )}
          {tab === "checklists" && (
            <div className="mt-7">
              <h2 className="font-display text-sm font-bold">
                Inspection checklists
              </h2>
              <p className="mt-1 text-[9px] text-muted">
                Standard forms ready to use offline.
              </p>
              <Card className="mt-3 divide-y divide-line px-4">
                {[
                  [
                    "Transformer inspection",
                    "12 checkpoints · Updated Nov 18",
                    "ϟ",
                  ],
                  [
                    "Pole safety assessment",
                    "9 checkpoints · Updated Nov 12",
                    "⌁",
                  ],
                  [
                    "Substation perimeter check",
                    "7 checkpoints · Updated Nov 8",
                    "▦",
                  ],
                ].map(([name, meta, icon]) => (
                  <button
                    key={name}
                    onClick={() => {
                      const target = name.split(" ")[0].toLowerCase();
                      const job = jobs.find((item) =>
                        item.title.toLowerCase().includes(target),
                      );
                      if (!job) {
                        showToast(`No assigned ${name.toLowerCase()} job`);
                        return;
                      }
                      openChecklist(job);
                    }}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-sage text-[#44825d]">
                      {icon}
                    </span>
                    <span className="flex-1">
                      <b className="block text-[10px]">{name}</b>
                      <small className="mt-1 block text-[8px] text-muted">
                        {meta}
                      </small>
                    </span>
                    <ArrowRight size={14} className="text-[#6f9e7a]" />
                  </button>
                ))}
              </Card>
            </div>
          )}
        </main>
      </div>
      {toast && (
        <div
          role="status"
          className="toast-in fixed bottom-5 right-5 z-40 rounded-lg bg-forest px-4 py-3 text-[10px] text-white shadow-xl"
        >
          {toast}
        </div>
      )}
      <Dialog
        open={Boolean(activeJob)}
        onOpenChange={(open) => !open && setActiveJob(null)}
      >
        <DialogContent className="max-w-[560px]">
          {activeJob && (
            <>
              <div className="mb-4">
                <p className="font-mono-ui text-[8px] tracking-wide text-[#6f8e79]">
                  {activeJob.id} · {activeJob.kind.toUpperCase()}
                </p>
                <DialogTitle className="mt-2 text-[18px]">
                  {activeJob.title}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {activeJob.description}
                </DialogDescription>
              </div>
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-mist px-3 py-2 text-[9px] text-[#738178]">
                <MapPin size={13} className="text-[#4d9368]" />
                {activeJob.location}
                <button className="ml-auto flex items-center gap-1 font-semibold text-[#39845e]">
                  <Navigation size={12} /> Map
                </button>
              </div>
              <div className="mb-2 flex justify-between text-[9px] font-semibold">
                <span>Inspection checklist</span>
                <span className="text-muted">
                  {checks.filter(Boolean).length} / {activeJob.total}
                </span>
              </div>
              <Progress
                value={
                  (checks.filter(Boolean).length /
                    Math.max(1, activeJob.total)) *
                  100
                }
                className="mb-3"
              />
              <div className="grid gap-1.5">
                {activeJob.checklist.map((item, index) => (
                  <label
                    key={`${activeJob.id}-${index}`}
                    className="flex cursor-pointer items-start gap-2.5 rounded-md border border-line p-2.5 text-[9px] leading-relaxed text-[#63736a] hover:bg-mist"
                  >
                    <input
                      type="checkbox"
                      checked={checks[index] || false}
                      onChange={(event) =>
                        setChecks((items) =>
                          items.map((value, i) =>
                            i === index ? event.target.checked : value,
                          ),
                        )
                      }
                      className="mt-0.5 accent-[#3e8c60]"
                    />
                    <span>{item}</span>
                    {index === 0 && (
                      <small className="ml-auto text-[7px] text-muted">
                        Required
                      </small>
                    )}
                  </label>
                ))}
              </div>
              <label className="mb-1.5 mt-4 block font-mono-ui text-[8px] font-medium tracking-wide text-[#839088]">
                FIELD NOTES
              </label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add observations, readings, or parts used…"
                className="min-h-[68px] text-[10px]"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line px-2.5 text-[9px] text-[#68786f] hover:bg-mist">
                  <Camera size={13} /> Add photo{" "}
                  {activeJob.photos ? `(${activeJob.photos})` : ""}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={(event) => void addPhotos(event.target.files)}
                  />
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void storeAndQueue(activeJob)}
                  >
                    Save progress
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void storeAndQueue(activeJob, true)}
                  >
                    <CheckCircle2 size={13} /> Complete job
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-[8px] text-muted">
                Updates and photos stay on this device until connectivity is
                restored.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{
      outcome: "accepted" | "dismissed";
      platform: string;
    }>;
  }
}
