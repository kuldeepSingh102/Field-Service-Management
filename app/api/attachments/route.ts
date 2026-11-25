import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 12 * 1024 * 1024;
const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

export async function POST(request: Request) {
  if (!hasSupabaseConfig())
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  const supabase = await createClient();
  if (!supabase)
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  const form = await request.formData();
  const publicId = String(form.get("workOrderId") ?? "");
  const file = form.get("file");
  if (
    !(file instanceof File) ||
    !allowedTypes.has(file.type) ||
    file.size > MAX_BYTES
  )
    return NextResponse.json(
      { error: "Choose a supported image or PDF no larger than 12 MB." },
      { status: 400 },
    );
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.company_id)
    return NextResponse.json(
      { error: "Your profile has not been assigned to a company." },
      { status: 403 },
    );
  const { data: workOrder } = await supabase
    .from("work_orders")
    .select("id")
    .eq("company_id", profile.company_id)
    .eq("public_id", publicId)
    .maybeSingle();
  if (!workOrder)
    return NextResponse.json(
      { error: "Work order not found in your company." },
      { status: 404 },
    );
  const extension =
    file.name
      .split(".")
      .pop()
      ?.replace(/[^a-z0-9]/gi, "") || "bin";
  const path = `${profile.company_id}/${workOrder.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("work-order-attachments")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  const { error: rowError } = await supabase
    .from("attachments")
    .insert({
      company_id: profile.company_id,
      work_order_id: workOrder.id,
      uploaded_by: userId,
      file_path: path,
      file_name: file.name,
      media_type: file.type,
    });
  if (rowError) {
    await supabase.storage.from("work-order-attachments").remove([path]);
    return NextResponse.json({ error: rowError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, path });
}
