import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(new URL("/login?error=not_configured", url));

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const nextParam = url.searchParams.get("next") ?? "/set-password";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/set-password";

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("The invitation link is incomplete. Request a new invitation.") };

  if (error) {
    const target = new URL("/login", url);
    target.searchParams.set("auth_error", error.message);
    return NextResponse.redirect(target);
  }

  if (next === "/access-pending") {
    const { error: setupError } = await supabase.rpc("complete_signup_request");
    if (setupError) {
      const target = new URL("/access-pending", url);
      target.searchParams.set("request_error", setupError.message);
      return NextResponse.redirect(target);
    }
  }

  return NextResponse.redirect(new URL(next, url));
}
