import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateChatGPTInstructions } from "../../lib/templates/chatgpt-denis-v3";
import { generateClaudeCommandSuite } from "../../lib/templates/claude-command-suite";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, role_insight_id, format = "both" } = body;

    if (!user_id || !role_insight_id) {
      return NextResponse.json(
        { error: "user_id and role_insight_id are required" },
        { status: 400 }
      );
    }

    // Fetch insights from database
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PRIVATE_KEY!
    );

    const { data: roleInsight, error } = await supabase
      .from("role_insights")
      .select("*")
      .eq("id", role_insight_id)
      .eq("user_id", user_id)
      .single();

    if (error || !roleInsight) {
      return NextResponse.json(
        { error: "Role insight not found" },
        { status: 404 }
      );
    }

    const insights = roleInsight.insights;

    // Generate requested formats
    let chatgpt_instructions = null;
    let claude_commands = null;

    if (format === "chatgpt" || format === "both") {
      chatgpt_instructions = generateChatGPTInstructions(insights);
    }

    if (format === "claude" || format === "both") {
      claude_commands = generateClaudeCommandSuite(insights);
    }

    // Store generated persona
    const { data: persona, error: insertError } = await supabase
      .from("generated_personas")
      .insert({
        user_id,
        role_insight_id,
        role_title: insights.role_title,
        format,
        chatgpt_instructions,
        claude_commands,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      persona_id: persona.id,
      chatgpt_instructions,
      claude_commands,
      metadata: {
        role_title: insights.role_title,
        format,
        generated_at: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}