import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id,role,approval_status")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }
  if (
    !profile?.company_id ||
    profile.approval_status !== "approved" ||
    !(["admin", "supervisor", "dispatcher"] as string[]).includes(profile.role)
  ) {
    return NextResponse.json(
      { error: "Approved operations access is required." },
      { status: 403 },
    );
  }

  const { publicId } = await params;
  const { data: workOrder, error: workOrderError } = await supabase
    .from("work_orders")
    .select("id")
    .eq("company_id", profile.company_id)
    .eq("public_id", publicId)
    .maybeSingle();
  if (workOrderError) {
    return NextResponse.json({ error: workOrderError.message }, { status: 400 });
  }
  if (!workOrder) {
    return NextResponse.json(
      { error: "Work order not found in your company." },
      { status: 404 },
    );
  }

  const [updatesResult, attachmentsResult] = await Promise.all([
    supabase
      .from("job_updates")
      .select("id,user_id,status,notes,checklist,created_at")
      .eq("work_order_id", workOrder.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("attachments")
      .select("id,uploaded_by,file_path,file_name,media_type,created_at")
      .eq("work_order_id", workOrder.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (updatesResult.error) {
    return NextResponse.json(
      { error: updatesResult.error.message },
      { status: 400 },
    );
  }
  if (attachmentsResult.error) {
    return NextResponse.json(
      { error: attachmentsResult.error.message },
      { status: 400 },
    );
  }

  const userIds = [
    ...new Set(
      [
        ...(updatesResult.data ?? []).map((update) => update.user_id),
        ...(attachmentsResult.data ?? []).map(
          (attachment) => attachment.uploaded_by,
        ),
      ].filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: users, error: usersError } = userIds.length
    ? await supabase.from("profiles").select("id,name").in("id", userIds)
    : { data: [], error: null };
  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 400 });
  }
  const namesById = new Map(
    (users ?? []).map((user) => [user.id, user.name || "Technician"]),
  );

  const attachments = [];
  for (const attachment of attachmentsResult.data ?? []) {
    const { data: signedFile, error } = await supabase.storage
      .from("work-order-attachments")
      .createSignedUrl(attachment.file_path, 600);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    attachments.push({
      id: attachment.id,
      fileName: attachment.file_name,
      mediaType: attachment.media_type,
      uploadedBy: attachment.uploaded_by
        ? (namesById.get(attachment.uploaded_by) ?? "Technician")
        : "Technician",
      createdAt: attachment.created_at,
      url: signedFile.signedUrl,
    });
  }

  return NextResponse.json(
    {
      updates: (updatesResult.data ?? []).map((update) => ({
        id: update.id,
        technician: update.user_id
          ? (namesById.get(update.user_id) ?? "Technician")
          : "Technician",
        status: update.status,
        notes: update.notes,
        checklist: Array.isArray(update.checklist) ? update.checklist : [],
        createdAt: update.created_at,
      })),
      attachments,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
