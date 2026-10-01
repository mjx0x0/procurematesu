import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    if (!sessionId) return NextResponse.json({ error: "Session is required." }, { status: 400 });

    const db = await createServerClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: session, error: sessionError } = await db
      .from("chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
    }

    const now = new Date().toISOString();
    const { error } = await db
      .from("chat_sessions")
      .update({ state: { cancelledAt: now }, updated_at: now })
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Unable to stop the current response." }, { status: 500 });
    }

    return NextResponse.json({ cancelled: true });
  } catch {
    return NextResponse.json({ error: "Unable to stop the current response." }, { status: 500 });
  }
}
