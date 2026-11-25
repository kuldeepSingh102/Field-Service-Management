"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bolt, CircleHelp, LoaderCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type RequestInfo = {
  status: "pending" | "approved" | "rejected";
  requested_role: string;
};
type SetupMode = "join_company" | "create_company";

export function AccessPending({
  initialError = "",
}: {
  initialError?: string;
}) {
  const router = useRouter();
  const [request, setRequest] = useState<RequestInfo | null>(null);
  const [message, setMessage] = useState(initialError);
  const [loading, setLoading] = useState(true);
  const [retryCode, setRetryCode] = useState("");
  const [retryRole, setRetryRole] = useState("technician");
  const [setupMode, setSetupMode] = useState<SetupMode>("join_company");
  const [companyName, setCompanyName] = useState("");
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let loadMessage = initialError;
      const client = createClient();
      if (!client) {
        if (!cancelled) {
          setMessage("Supabase is not configured for this app.");
          setLoading(false);
        }
        return;
      }
      const { data: auth } = await client.auth.getUser();
      if (!auth.user) {
        router.replace("/login");
        return;
      }
      const { data: current } = await client
        .from("access_requests")
        .select("status,requested_role")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (!current && auth.user.user_metadata?.gridline_signup_mode) {
        const { error } = await client.rpc("complete_signup_request");
        if (error) loadMessage = error.message;
      }
      const { data } = await client
        .from("access_requests")
        .select("status,requested_role")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (cancelled) return;
      setRequest(data as RequestInfo | null);
      if (!data && !loadMessage)
        loadMessage =
          "Your account is signed in, but it has no company request yet. Start again from Create account.";
      setMessage(loadMessage);
      setLoading(false);
      if (data?.status === "approved") router.replace("/");
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialError, router]);

  const signOut = async () => {
    const client = createClient();
    if (client) await client.auth.signOut();
    router.replace("/");
    router.refresh();
  };

  const retryRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = createClient();
    if (!client) return;
    setRetrying(true);
    setMessage("");
    const { error: metadataError } = await client.auth.updateUser({
      data: {
        gridline_signup_mode: setupMode,
        gridline_company_name:
          setupMode === "create_company" ? companyName.trim() : "",
        gridline_signup_code:
          setupMode === "join_company" ? retryCode.trim() : "",
        gridline_requested_role: setupMode === "join_company" ? retryRole : "",
      },
    });
    if (metadataError) {
      setMessage(metadataError.message);
      setRetrying(false);
      return;
    }
    const { data, error } = await client.rpc("complete_signup_request");
    if (error) setMessage(error.message);
    else if (data === "approved") router.replace("/");
    else setRequest({ status: "pending", requested_role: retryRole });
    setRetrying(false);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-mist p-4">
      <section className="w-full max-w-md rounded-xl border border-line bg-white p-7 shadow-card">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-forest text-[#a6e9c7]">
            <Bolt size={18} fill="currentColor" />
          </span>
          gridline<span className="-ml-2 text-[#54b783]">.</span>
        </Link>
        <div className="mt-8 grid size-10 place-items-center rounded-xl bg-[#fff5e5] text-[#a36d20]">
          <CircleHelp size={19} />
        </div>
        <h1 className="mt-4 font-display text-xl font-bold">
          {loading
            ? "Checking your access"
            : request?.status === "rejected"
              ? "Access request declined"
              : request
                ? "Waiting for company approval"
                : "Your workspace isn’t assigned yet"}
        </h1>
        {loading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <LoaderCircle size={15} className="animate-spin" />
            Checking your account…
          </p>
        ) : request ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Your request to join the company as a{" "}
            <b className="capitalize text-ink">{request.requested_role}</b> is{" "}
            <b className="capitalize text-ink">{request.status}</b>.{" "}
            {request.status === "pending"
              ? "A company admin must approve it before you can see live work."
              : "You can submit a new request if you have a valid company code."}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Your account is signed in, but it is not linked to an approved
            company yet. Enter your company signup code to request access.
          </p>
        )}
        {message && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-red-50 px-3 py-2 text-[11px] text-red-700"
          >
            {message}
          </p>
        )}
        {!loading && (!request || request.status === "rejected") && (
          <form
            onSubmit={(event) => void retryRequest(event)}
            className="mt-5 grid gap-3"
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSetupMode("join_company")}
                className={`rounded-md border p-2 text-left text-[10px] font-semibold ${setupMode === "join_company" ? "border-[#86b99a] bg-[#f2f8f3]" : "border-line"}`}
              >
                Join a company
              </button>
              <button
                type="button"
                onClick={() => setSetupMode("create_company")}
                className={`rounded-md border p-2 text-left text-[10px] font-semibold ${setupMode === "create_company" ? "border-[#86b99a] bg-[#f2f8f3]" : "border-line"}`}
              >
                Create a company
              </button>
            </div>
            {setupMode === "join_company" ? (
              <>
                <label className="grid gap-1.5 text-[9px] font-semibold text-[#68786f]">
                  COMPANY SIGNUP CODE
                  <Input
                    value={retryCode}
                    onChange={(event) => setRetryCode(event.target.value)}
                    autoCapitalize="none"
                    required
                    placeholder="Ask your company admin"
                  />
                </label>
                <label className="grid gap-1.5 text-[9px] font-semibold text-[#68786f]">
                  REQUESTED ROLE
                  <select
                    value={retryRole}
                    onChange={(event) => setRetryRole(event.target.value)}
                    className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink"
                  >
                    <option value="technician">Technician</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                </label>
              </>
            ) : (
              <label className="grid gap-1.5 text-[9px] font-semibold text-[#68786f]">
                UTILITY / COMPANY NAME
                <Input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  required
                  placeholder="Your utility name"
                />
              </label>
            )}
            <Button type="submit" disabled={retrying}>
              {retrying && <LoaderCircle size={14} className="animate-spin" />}
              {setupMode === "create_company"
                ? "Create company workspace"
                : "Submit access request"}
            </Button>
          </form>
        )}
        <Button
          variant="secondary"
          className="mt-5"
          onClick={() => void signOut()}
        >
          <LogOut size={14} />
          Sign out
        </Button>
      </section>
    </main>
  );
}
