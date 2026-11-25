"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bolt, Check, Copy, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AccessRequest = {
  id: string;
  requester_name: string;
  requester_email: string;
  requested_role: "supervisor" | "technician";
  status: string;
  requested_at: string;
};

export function AccessApprovals() {
  const [signupCode, setSignupCode] = useState("");
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/access-requests", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        signupCode?: string;
        requests?: AccessRequest[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "Could not load access requests.");
      setSignupCode(payload.signupCode ?? "");
      setRequests(payload.requests ?? []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load access requests.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function decide(requestId: string, decision: "approved" | "rejected") {
    setBusyId(requestId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, decision }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error || "Could not review this request.");
      setNotice(
        decision === "approved"
          ? "Access approved. The user can sign in and access the company workspace."
          : "Access request rejected.",
      );
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not review this request.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(signupCode);
      setNotice("Company signup code copied.");
    } catch {
      setNotice("Copy failed. Select and copy the code manually.");
    }
  }

  return (
    <main className="min-h-screen bg-mist p-4 text-ink sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-forest text-[#a6e9c7]">
            <Bolt size={18} fill="currentColor" />
          </span>
          gridline<span className="-ml-2 text-[#54b783]">.</span>
        </Link>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold">Company access</h1>
        <p className="mt-1 text-sm text-muted">
          Share the signup code with people who should request access to this
          company.
        </p>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mt-4 rounded-md bg-[#edf6ef] px-3 py-2 text-xs text-[#376d49]"
          >
            {notice}
          </p>
        )}
        <Card className="mt-5">
          <CardHeader>
            <div>
              <CardTitle>Company signup code</CardTitle>
              <CardDescription>
                New signups still need admin approval before seeing company
                data.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <code className="rounded-md bg-mist px-3 py-2 font-mono-ui text-sm">
              {signupCode || (loading ? "Loading…" : "Unavailable")}
            </code>
            <Button
              variant="secondary"
              size="sm"
              disabled={!signupCode}
              onClick={() => void copyCode()}
            >
              <Copy size={14} />
              Copy code
            </Button>
          </CardContent>
        </Card>
        <Card className="mt-5">
          <CardHeader>
            <div>
              <CardTitle>Pending requests</CardTitle>
              <CardDescription>
                Review each person’s requested role before granting access.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="flex items-center gap-2 py-4 text-sm text-muted">
                <LoaderCircle size={15} className="animate-spin" />
                Loading requests…
              </p>
            ) : requests.length === 0 ? (
              <p className="py-4 text-sm text-muted">
                There are no pending access requests.
              </p>
            ) : (
              <div className="divide-y divide-line">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-sm">
                        {request.requester_name}
                      </b>
                      <span className="block truncate text-xs text-muted">
                        {request.requester_email}
                      </span>
                      <span className="mt-1 inline-block rounded bg-sage px-2 py-0.5 text-[10px] font-semibold capitalize text-[#39754f]">
                        {request.requested_role}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      disabled={Boolean(busyId)}
                      onClick={() => void decide(request.id, "approved")}
                    >
                      {busyId === request.id ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={Boolean(busyId)}
                      onClick={() => void decide(request.id, "rejected")}
                    >
                      <X size={14} />
                      Decline
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
