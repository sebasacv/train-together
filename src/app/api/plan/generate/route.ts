import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithClaude } from "@/lib/claude/client";
import {
  PLAN_GENERATION_SYSTEM_PROMPT,
  buildPlanGenerationPrompt,
} from "@/lib/claude/prompts/plan-generation";
import { format, addDays } from "date-fns";

interface GeneratedPlan {
  title: string;
  weeks: Array<{
    week_number: number;
    theme: string;
    notes: string;
    total_volume_minutes: number;
    workouts: Array<{
      title: string;
      description: string;
      workout_type: string;
      scheduled_date: string;
      day_of_week: number;
      duration_minutes: number;
      intensity: string;
      is_key_workout: boolean;
      exercises: Array<{
        name: string;
        sets?: number | null;
        reps?: string | null;
        duration_minutes?: number | null;
        rest_seconds?: number | null;
        notes: string;
      }>;
    }>;
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

    const body = await request.json();
    const {
      objective,
      durationWeeks,
      targetDate,
      fitnessLevel,
      trainingDaysPerWeek,
      availableEquipment,
      currentWeeklyVolume,
      injuryHistory,
      preferences,
    } = body;

    if (!objective || !durationWeeks) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const startDate = format(addDays(new Date(), 1), "yyyy-MM-dd");

    // Generate plan with Claude
    const prompt = buildPlanGenerationPrompt({
      objective,
      targetDate,
      durationWeeks,
      fitnessLevel: fitnessLevel || "intermediate",
      trainingDaysPerWeek: trainingDaysPerWeek || 5,
      availableEquipment: availableEquipment || [],
      currentWeeklyVolume,
      injuryHistory,
      preferences,
      startDate,
    });

    const generatedPlan = await generateWithClaude<GeneratedPlan>(
      PLAN_GENERATION_SYSTEM_PROMPT,
      prompt,
      { maxTokens: 16384 }
    );

    // Save to database
    const { data: plan, error: planError } = await supabase
      .from("training_plans")
      .insert({
        user_id: user.id,
        title: generatedPlan.title,
        objective,
        target_date: targetDate || null,
        duration_weeks: durationWeeks,
        status: "active",
        generation_context: body,
      })
      .select()
      .single();

    if (planError || !plan) {
      console.error("Plan creation error:", planError);
      return NextResponse.json(
        { error: "Failed to save plan" },
        { status: 500 }
      );
    }

    // Deactivate any other active plans
    await supabase
      .from("training_plans")
      .update({ status: "paused" })
      .eq("user_id", user.id)
      .eq("status", "active")
      .neq("id", plan.id);

    // Insert weeks and workouts
    for (const week of generatedPlan.weeks) {
      const { data: planWeek, error: weekError } = await supabase
        .from("plan_weeks")
        .insert({
          plan_id: plan.id,
          week_number: week.week_number,
          theme: week.theme,
          notes: week.notes,
          total_volume_minutes: week.total_volume_minutes,
          is_current: week.week_number === 1,
        })
        .select()
        .single();

      if (weekError || !planWeek) {
        console.error("Week creation error:", weekError);
        continue;
      }

      // Batch insert workouts for this week
      const workoutInserts = week.workouts.map((workout) => ({
        plan_week_id: planWeek.id,
        plan_id: plan.id,
        user_id: user.id,
        title: workout.title,
        description: workout.description,
        workout_type: workout.workout_type,
        scheduled_date: workout.scheduled_date,
        day_of_week: workout.day_of_week,
        duration_minutes: workout.duration_minutes,
        intensity: workout.intensity as
          | "recovery"
          | "easy"
          | "moderate"
          | "hard"
          | "max",
        is_key_workout: workout.is_key_workout,
        exercises: workout.exercises,
        is_open_for_joining: false,
        visibility: "friends" as const,
      }));

      if (workoutInserts.length > 0) {
        const { error: workoutsError } = await supabase
          .from("workouts")
          .insert(workoutInserts);
        if (workoutsError) {
          console.error("Workouts creation error:", workoutsError);
        }
      }
    }

    // Create activity feed entry
    await supabase.from("activity_feed").insert({
      user_id: user.id,
      activity_type: "plan_started",
      title: `Started a new training plan: ${generatedPlan.title}`,
      description: `${durationWeeks}-week ${objective} plan`,
      visibility: "friends",
    });

    // Award XP for plan creation
    await supabase.from("xp_transactions").insert({
      user_id: user.id,
      amount: 50,
      reason: "plan_created",
      reference_id: plan.id,
    });

    // Update profile XP
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("xp_total")
      .eq("id", user.id)
      .single();

    if (currentProfile) {
      await supabase
        .from("profiles")
        .update({ xp_total: (currentProfile as { xp_total: number }).xp_total + 50 })
        .eq("id", user.id);
    }

    return NextResponse.json({ planId: plan.id });
  } catch (error) {
    console.error("Plan generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate plan. Please try again." },
      { status: 500 }
    );
  }
}
