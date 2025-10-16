import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // Need Node for file operations

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, persona_id, export_format } = body;

    if (!user_id || !persona_id || !export_format) {
      return NextResponse.json(
        { error: "user_id, persona_id, and export_format are required" },
        { status: 400 }
      );
    }

    // Fetch persona from database
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PRIVATE_KEY!
    );

    const { data: persona, error } = await supabase
      .from("generated_personas")
      .select("*")
      .eq("id", persona_id)
      .eq("user_id", user_id)
      .single();

    if (error || !persona) {
      return NextResponse.json(
        { error: "Persona not found" },
        { status: 404 }
      );
    }

    // Return based on format
    if (export_format === "chatgpt") {
      return new NextResponse(persona.chatgpt_instructions, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="${persona.role_title.replace(/\s+/g, '-').toLowerCase()}-chatgpt-instructions.md"`,
        },
      });
    }

    if (export_format === "claude") {
      return new NextResponse(persona.claude_commands, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="${persona.role_title.replace(/\s+/g, '-').toLowerCase()}-claude-commands.md"`,
        },
      });
    }

    if (export_format === "json") {
      return NextResponse.json({
        role_title: persona.role_title,
        chatgpt_instructions: persona.chatgpt_instructions,
        claude_commands: persona.claude_commands,
        created_at: persona.created_at,
      });
    }

    return NextResponse.json(
      { error: "Invalid export_format" },
      { status: 400 }
    );

  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}