export const PLAN_ADAPTATION_SYSTEM_PROMPT = `You are an elite fitness coach reviewing and adapting an existing training plan based on athlete feedback and performance data.

Your role is to make intelligent, context-aware adjustments to upcoming workouts while maintaining the overall training progression and goals.

ADAPTATION PRINCIPLES:
1. Consider cumulative fatigue, not just the most recent feedback
2. If the athlete reports being too sore/tired, reduce volume or intensity for 2-3 days, not just the next workout
3. If consistently "too easy", increase intensity gradually (10-15% per week max)
4. For injuries: immediately remove exercises that aggravate the injury, substitute with cross-training
5. For illness: reduce or eliminate training for the duration, then build back gradually
6. For missed workouts: don't try to "make up" missed training — adjust the plan forward
7. Maintain key workouts when possible (they're the most important for fitness gains)
8. Never sacrifice recovery for volume
9. Consider the athlete's upcoming schedule and event date

You MUST respond with ONLY valid JSON. Do NOT wrap it in markdown code blocks. Start your response with { and end with }. Include a coach_note explaining your reasoning.`;

export interface AdaptationContext {
  planTitle: string;
  objective: string;
  targetDate?: string;
  currentWeek: number;
  totalWeeks: number;
  recentWorkoutLogs: Array<{
    date: string;
    title: string;
    workout_type: string;
    rpe: number | null;
    mood: string | null;
    notes: string | null;
    completed: boolean;
  }>;
  unprocessedFeedback: Array<{
    type: string;
    details: string | null;
    severity: number;
    body_parts: string[];
    date: string;
  }>;
  upcomingWorkouts: Array<{
    id: string;
    title: string;
    workout_type: string;
    scheduled_date: string;
    duration_minutes: number;
    intensity: string;
    is_key_workout: boolean;
    exercises: unknown[];
  }>;
  streakDays: number;
  missedWorkoutsLast2Weeks: number;
}

export function buildAdaptationPrompt(context: AdaptationContext): string {
  return `Review the following training context and adapt the upcoming workouts:

PLAN CONTEXT:
- Plan: ${context.planTitle}
- Objective: ${context.objective}
- Target date: ${context.targetDate || "No specific date"}
- Current week: ${context.currentWeek} of ${context.totalWeeks}
- Current streak: ${context.streakDays} days
- Missed workouts (last 2 weeks): ${context.missedWorkoutsLast2Weeks}

RECENT WORKOUT LOGS (last 2 weeks):
${JSON.stringify(context.recentWorkoutLogs, null, 2)}

UNPROCESSED FEEDBACK:
${JSON.stringify(context.unprocessedFeedback, null, 2)}

UPCOMING WORKOUTS TO POTENTIALLY MODIFY:
${JSON.stringify(context.upcomingWorkouts, null, 2)}

Respond with JSON:
{
  "coach_note": "string - natural language explanation of what you changed and why (2-3 sentences, encouraging tone)",
  "adaptations": [
    {
      "workout_id": "string - ID of the workout to modify",
      "changes": {
        "title": "string | null - new title if changed",
        "description": "string | null - new description if changed",
        "duration_minutes": "number | null - new duration if changed",
        "intensity": "string | null - new intensity if changed",
        "exercises": "array | null - new exercises array if changed",
        "status": "string | null - set to 'adapted' if significantly changed"
      },
      "reason": "string - brief reason for this specific change"
    }
  ]
}`;
}
