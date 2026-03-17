import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithClaude } from "@/lib/claude/client";
import {
  PLAN_ADAPTATION_SYSTEM_PROMPT,
  buildAdaptationPrompt,
} from "@/lib/claude/prompts/plan-adaptation";
import { buildAdaptationContext } from "@/lib/claude/context-builder";

interface AdaptationResult {
  coach_note: string;
  adaptations: Array<{
    workout_id: string;
    changes: {
      title?: string | null;
      description?: string | null;
      duration_minutes?: number | null;
      intensity?: string | null;
      exercises?: unknown[] | null;
      status?: string | null;
    };
    reason: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await request.json();
    if (!planId) {
      return NextResponse.json(
        { error: "Missing plan ID" },
        { status: 400 }
      );
    }

    // Build context from database
    const context = await buildAdaptationContext(planId, user.id);
    const prompt = buildAdaptationPrompt(context);

    // Call Claude for adaptation
    const result = await generateWithClaude<AdaptationResult>(
      PLAN_ADAPTATION_SYSTEM_PROMPT,
      prompt,
      {
        model: context.unprocessedFeedback.length <= 1
          ? "claude-haiku-4-5-20250514"
          : "claude-sonnet-4-5-20250514",
        maxTokens: 4096,
      }
    );

    // Apply adaptations
    for (const adaptation of result.adaptations) {
      const updates: Record<string, unknown> = {};

      if (adaptation.changes.title) updates.title = adaptation.changes.title;
      if (adaptation.changes.description) updates.description = adaptation.changes.description;
      if (adaptation.changes.duration_minutes) updates.duration_minutes = adaptation.changes.duration_minutes;
      if (adaptation.changes.intensity) updates.intensity = adaptation.changes.intensity;
      if (adaptation.changes.exercises) updates.exercises = adaptation.changes.exercises;
      if (adaptation.changes.status) updates.status = adaptation.changes.status;
      else updates.status = "adapted";

      if (Object.keys(updates).length > 0) {
        await supabase
          .from("workouts")
          .update(updates)
          .eq("id", adaptation.workout_id)
          .eq("user_id", user.id);
      }
    }

    // Mark feedback as processed
    await supabase
      .from("user_feedback")
      .update({ processed: true })
      .eq("user_id", user.id)
      .eq("plan_id", planId)
      .eq("processed", false);

    // Store adaptation in conversation history
    const { data: plan } = await supabase
      .from("training_plans")
      .select("claude_conversation_history")
      .eq("id", planId)
      .single();

    const history = (plan?.claude_conversation_history as unknown[]) || [];
    history.push({
      timestamp: new Date().toISOString(),
      feedback_count: context.unprocessedFeedback.length,
      coach_note: result.coach_note,
      adaptations_count: result.adaptations.length,
    });

    await supabase
      .from("training_plans")
      .update({ claude_conversation_history: history })
      .eq("id", planId);

    // Create activity feed entry
    await supabase.from("activity_feed").insert({
      user_id: user.id,
      activity_type: "plan_adapted",
      title: "Training plan adapted",
      description: result.coach_note,
      visibility: "friends",
    });

    return NextResponse.json({
      coach_note: result.coach_note,
      adaptations_count: result.adaptations.length,
    });
  } catch (error) {
    console.error("Plan adaptation error:", error);
    return NextResponse.json(
      { error: "Failed to adapt plan. Please try again." },
      { status: 500 }
    );
  }
}
