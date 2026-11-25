"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bolt, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ initialError = "" }: { initialError?: string }) {
  const router = useRouter();
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const client = createClient();
    if (!client) {
      setBusy(false);
      setError(
        "Supabase is not configured. Add your project URL and publishable key to .env.local.",
      );
      return;
    }
    const { error: authError } = await client.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (authError) {
      setError(authError.message);
      setBusy(false);
      return;
    }
    router.push("/");
  };
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
          <h1 className="mt-2 font-display text-xl font-bold tracking-tight">
            Sign in to Gridline
          </h1>
          <p className="mt-1 text-[11px] text-muted">
            Use your utility account to access field operations.
          </p>
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <label className="grid gap-1.5 text-[9px] font-semibold text-[#68786f]">
              EMAIL
              <span className="relative">
                <Mail size={14} className="absolute left-3 top-3 text-muted" />
                <Input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  placeholder="you@utility.com"
                  className="pl-9"
                />
              </span>
            </label>
            <label className="grid gap-1.5 text-[9px] font-semibold text-[#68786f]">
              PASSWORD
              <span className="relative">
                <LockKeyhole
                  size={14}
                  className="absolute left-3 top-3 text-muted"
                />
                <Input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
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
              {busy && <LoaderCircle size={15} className="animate-spin" />}Sign
              in
            </Button>
          </form>
          <p className="mt-5 text-center text-[9px] leading-relaxed text-muted">
            New to Gridline?{" "}
            <Link href="/signup" className="font-semibold text-[#39845e]">
              Create an account
            </Link>
          </p>
        </section>
        <p className="mt-5 text-center text-[9px] text-muted">
          Gridline field operations · Offline-ready
        </p>
      </div>
    </main>
  );
}
