import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    let { data: { user } } = await authClient.auth.getUser();
    const authorization = request.headers.get("authorization");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 500 });
    }

    const adminClient = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    if (authorization?.startsWith("Bearer ")) {
      const { data } = await adminClient.auth.getUser(authorization.slice(7).trim());
      user = data.user || user;
    }
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { data: profile, error: profileError } = await adminClient
      .from("users").select("role,is_active").eq("id", user.id).maybeSingle();
    if (profileError || profile?.role !== "admin" || profile.is_active === false) {
      return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    }

    const sessionId = request.nextUrl.searchParams.get("sessionId")?.trim();
    if (!sessionId) return NextResponse.json({ error: "A conversation session ID is required." }, { status: 400 });

    if (sessionId.startsWith("legacy-")) {
      const { data: legacyLog, error: legacyError } = await adminClient
        .from("monitor_inquiries")
        .select("metadata")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (legacyError) {
        console.error("[admin/inquiries/conversation] Legacy read failed:", legacyError);
        return NextResponse.json({ error: "Unable to load this conversation." }, { status: 500 });
      }
      const history = Array.isArray(legacyLog?.metadata?.conversation_history)
        ? legacyLog.metadata.conversation_history
        : [];
      let turns = history.map((turn: any, index: number) => ({
        id: `legacy-${sessionId}-${index}`,
        sender: turn?.sender === "user" ? "user" : "ai",
        content: typeof turn?.content === "string" ? turn.content : "",
        created_at: turn?.created_at || new Date().toISOString(),
      }));

      // Older records sometimes contain several prompts/replies joined into a
      // single text field. Their exact turn boundaries were not stored, so
      // split only on explicit blank-line paragraph boundaries as a best effort.
      if (turns.length <= 2) {
        turns = turns.flatMap((turn: any) => {
          const paragraphs = turn.content
            .split(/\r?\n\s*\r?\n/)
            .map((part: string) => part.trim())
            .filter(Boolean);
          if (paragraphs.length <= 1) return [turn];
          return paragraphs.map((content: string, partIndex: number) => ({
            ...turn,
            id: `${turn.id}-part-${partIndex}`,
            content,
          }));
        });
      }
      return NextResponse.json({ turns });
    }

    const { data: turns, error } = await adminClient
      .from("chat_messages")
      .select("id,sender,content,created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[admin/inquiries/conversation] Read failed:", error);
      return NextResponse.json({ error: "Unable to load this conversation." }, { status: 500 });
    }
    return NextResponse.json({ turns: turns || [] });
  } catch (error) {
    console.error("[admin/inquiries/conversation] Unexpected error:", error);
    return NextResponse.json({ error: "Unable to load this conversation." }, { status: 500 });
  }
}
