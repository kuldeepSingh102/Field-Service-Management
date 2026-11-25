"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bolt, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type SignupMode = "create_company" | "join_company";

export function SignupForm() {
  const router = useRouter();
  const [mode, setMode] = useState<SignupMode>("join_company");
  const [requestedRole, setRequestedRole] = useState("technician");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const client = createClient();
    if (!client) {
      setError("Supabase is not configured. Add your project URL and publishable key to .env.local.");
      setBusy(false);
      return;
    }

    const callback = new URL("/auth/confirm", window.location.origin);
    callback.searchParams.set("next", "/access-pending");
    const { data, error: signUpError } = await client.auth.signUp({
      email: String(form.get("email")),
      password: String(form.get("password")),
      options: {
        emailRedirectTo: callback.toString(),
        data: {
          name: String(form.get("name")).trim(),
          gridline_signup_mode: mode,
          gridline_company_name: String(form.get("companyName") ?? "").trim(),
          gridline_signup_code: String(form.get("signupCode") ?? "").trim(),
          gridline_requested_role: mode === "join_company" ? requestedRole : "",
        },
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      setBusy(false);
      return;
    }

    if (data.session) {
      const { data: completion, error: completionError } = await client.rpc("complete_signup_request");
      if (completionError) {
        setError(completionError.message);
        setBusy(false);
        return;
      }
      router.replace(completion === "approved" ? "/" : "/access-pending");
      router.refresh();
      return;
    }

    setNotice("Check your email to confirm your account. The confirmation link will finish signup and send any company-join request for approval.");
    setBusy(false);
  }

  return <main className="grid min-h-screen place-items-center bg-mist p-4"><div className="w-full max-w-[440px]"><Link href="/" className="mb-7 flex items-center justify-center gap-2 font-display text-2xl font-extrabold tracking-[-.06em]"><span className="grid size-8 place-items-center rounded-lg bg-forest text-[#a6e9c7]"><Bolt size={20} fill="currentColor" /></span>gridline<span className="-ml-2 text-[#54b783]">.</span></Link><section className="rounded-xl border border-line bg-white p-7 shadow-card"><p className="font-mono-ui text-[9px] tracking-[.1em] text-[#6f8e79]">GET STARTED</p><h1 className="mt-2 font-display text-xl font-bold tracking-tight">Create your Gridline account</h1><p className="mt-1 text-[11px] text-muted">Join a utility team or create a new workspace.</p><form onSubmit={submit} className="mt-5 grid gap-3.5"><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setMode("join_company")} className={`rounded-lg border p-3 text-left ${mode === "join_company" ? "border-[#86b99a] bg-[#f2f8f3]" : "border-line"}`}><b className="block text-[11px]">Join a company</b><small className="mt-1 block text-[9px] text-muted">Request access from its admin</small></button><button type="button" onClick={() => setMode("create_company")} className={`rounded-lg border p-3 text-left ${mode === "create_company" ? "border-[#86b99a] bg-[#f2f8f3]" : "border-line"}`}><b className="block text-[11px]">Create a company</b><small className="mt-1 block text-[9px] text-muted">You become its admin</small></button></div><label className="grid gap-1.5 text-[9px] font-semibold text-[#68786f]">YOUR NAME<span className="relative"><UserRound size={14} className="absolute left-3 top-3 text-muted"/><Input name="name" required autoComplete="name" placeholder="Full name" className="pl-9"/></span></label><label className="grid gap-1.5 text-[9px] font-semibold text-[#68786f]">EMAIL<span className="relative"><Mail size={14} className="absolute left-3 top-3 text-muted"/><Input name="email" type="email" required autoComplete="email" placeholder="you@utility.com" className="pl-9"/></span></label>{mode === "create_company" ? <label className="grid gap-1.5 text-[9px] font-semibold text-[#68786f]">UTILITY / COMPANY NAME<Input name="companyName" required placeholder="e.g. Northstar Electric"/></label> : <><label className="grid gap-1.5 text-[9px] font-semibold text-[#68786f]">COMPANY SIGNUP CODE<Input name="signupCode" required autoCapitalize="none" placeholder="Ask your company admin"/></label><label className="grid gap-1.5 text-[9px] font-semibold text-[#68786f]">REQUESTED ROLE<select value={requestedRole} onChange={(event) => setRequestedRole(event.target.value)} className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink"><option value="technician">Technician</option><option value="supervisor">Supervisor</option></select></label></>}<label className="grid gap-1.5 text-[9px] font-semibold text-[#68786f]">PASSWORD<span className="relative"><LockKeyhole size={14} className="absolute left-3 top-3 text-muted"/><Input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" className="pl-9"/></span></label>{error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-[10px] text-red-700">{error}</p>}{notice && <p role="status" className="rounded-md bg-[#edf6ef] px-3 py-2 text-[10px] leading-relaxed text-[#376d49]">{notice}</p>}<Button type="submit" disabled={busy} className="mt-1 w-full">{busy && <LoaderCircle size={15} className="animate-spin"/>}{mode === "create_company" ? "Create account and workspace" : "Create account and request access"}</Button></form><p className="mt-5 text-center text-[10px] text-muted">Already have an account? <Link href="/login" className="font-semibold text-[#39845e]">Sign in</Link></p></section></div></main>;
}
