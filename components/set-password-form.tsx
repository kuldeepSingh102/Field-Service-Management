"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bolt, LoaderCircle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function SetPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== form.get("confirmPassword")) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    const client = createClient();
    if (!client) {
      setError(
        "Supabase is not configured. Add your project URL and publishable key to .env.local.",
      );
      setBusy(false);
      return;
    }
    const { error: authError } = await client.auth.updateUser({ password });
    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-mist p-4">
      <div className="w-full max-w-[390px]">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 font-display text-2xl font-extrabold tracking-[-.06em]"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-forest text-[#a6e9c7]">
            <Bolt size={20} fill="currentColor" />
          </span>
          gridline<span className="-ml-2 text-[#54b783]">.</span>
        </Link>
        <section className="rounded-xl border border-line bg-white p-7 shadow-card">
          <p className="font-mono-ui text-[9px] tracking-[.1em] text-[#6f8e79]">
            NORTHSTAR ELECTRIC
          </p>
          <h1 className="mt-2 font-display text-xl font-bold tracking-tight">
            Set your password
          </h1>
          <p className="mt-1 text-[11px] text-muted">
            Choose a password to finish setting up your Gridline account.
          </p>
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <label className="grid gap-1.5 text-[9px] font-semibold text-[#68786f]">
              NEW PASSWORD
              <span className="relative">
                <LockKeyhole
                  size={14}
                  className="absolute left-3 top-3 text-muted"
                />
                <Input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  placeholder="At least 8 characters"
                  className="pl-9"
                />
              </span>
            </label>
            <label className="grid gap-1.5 text-[9px] font-semibold text-[#68786f]">
              CONFIRM PASSWORD
              <span className="relative">
                <LockKeyhole
                  size={14}
                  className="absolute left-3 top-3 text-muted"
                />
                <Input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  placeholder="Enter it again"
                  className="pl-9"
                />
              </span>
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-md bg-red-50 px-3 py-2 text-[10px] text-red-700"
              >
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy} className="mt-1 w-full">
              {busy && <LoaderCircle size={15} className="animate-spin" />}Save
              password
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
