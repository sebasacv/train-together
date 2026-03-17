import type { AdaptationContext } from "./prompts/plan-adaptation";
import { createClient } from "@/lib/supabase/server";
import { format, subDays, addDays } from "date-fns";

export async function buildAdaptationContext(
  planId: string,
  userId: string
): Promise<AdaptationContext> {
  const supabase = await createClient();
  const today = new Date();
  const twoWeeksAgo = subDays(today, 14);
  const twoWeeksAhead = addDays(today, 14);

  // Fetch plan details
  const { data: plan } = await supabase
    .from("training_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (!plan) throw new Error("Plan not found");

  // Fetch recent workout logs
  const { data: recentLogs } = await supabase
    .from("workout_logs")
    .select("*, workouts(title, workout_type, scheduled_date)")
    .eq("user_id", userId)
    .gte("completed_at", twoWeeksAgo.toISOString())
    .order("completed_at", { ascending: false });

  // Fetch unprocessed feedback
  const { data: feedback } = await supabase
    .from("user_feedback")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_id", planId)
    .eq("processed", false)
    .order("created_at", { ascending: false });

  // Fetch upcoming workouts
  const { data: upcoming } = await supabase
    .from("workouts")
    .select("*")
    .eq("plan_id", planId)
    .eq("status", "scheduled")
    .gte("scheduled_date", format(today, "yyyy-MM-dd"))
    .lte("scheduled_date", format(twoWeeksAhead, "yyyy-MM-dd"))
    .order("scheduled_date", { ascending: true });

  // Count missed workouts in last 2 weeks
  const { count: missedCount } = await supabase
    .from("workouts")
    .select("*", { count: "exact", head: true })
    .eq("plan_id", planId)
    .eq("status", "scheduled")
    .gte("scheduled_date", format(twoWeeksAgo, "yyyy-MM-dd"))
    .lt("scheduled_date", format(today, "yyyy-MM-dd"));

  // Fetch profile for streak info
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_streak")
    .eq("id", userId)
    .single();

  // Determine current week number
  const planStart = new Date(plan.created_at);
  const daysSinceStart = Math.floor((today.getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24));
  const currentWeek = Math.floor(daysSinceStart / 7) + 1;

  return {
    planTitle: plan.title,
    objective: plan.objective,
    targetDate: plan.target_date ?? undefined,
    currentWeek: Math.min(currentWeek, plan.duration_weeks),
    totalWeeks: plan.duration_weeks,
    recentWorkoutLogs: (recentLogs ?? []).map((log) => {
      const workout = log.workouts as unknown as { title: string; workout_type: string; scheduled_date: string } | null;
      return {
        date: log.completed_at,
        title: workout?.title ?? "Unknown",
        workout_type: workout?.workout_type ?? "unknown",
        rpe: log.rpe,
        mood: log.mood,
        notes: log.notes,
        completed: true,
      };
    }),
    unprocessedFeedback: (feedback ?? []).map((f) => ({
      type: f.feedback_type,
      details: f.details,
      severity: f.severity,
      body_parts: f.body_parts_affected,
      date: f.created_at,
    })),
    upcomingWorkouts: (upcoming ?? []).map((w) => ({
      id: w.id,
      title: w.title,
      workout_type: w.workout_type,
      scheduled_date: w.scheduled_date,
      duration_minutes: w.duration_minutes ?? 0,
      intensity: w.intensity ?? "moderate",
      is_key_workout: w.is_key_workout,
      exercises: w.exercises as unknown[],
    })),
    streakDays: profile?.current_streak ?? 0,
    missedWorkoutsLast2Weeks: missedCount ?? 0,
  };
}
