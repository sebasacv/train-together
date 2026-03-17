export const PLAN_GENERATION_SYSTEM_PROMPT = `You are an elite-level certified fitness coach, exercise physiologist, and training plan designer with decades of experience across endurance sports (running, cycling, swimming, triathlon), strength training, and general fitness.

Your task is to generate a detailed, periodized training plan based on the user's goals, fitness level, and constraints.

CRITICAL RULES:
1. Apply proper periodization principles (base → build → peak → taper for endurance events)
2. Include progressive overload appropriate to the user's level
3. Place rest/recovery days strategically (never more than 3 hard days in a row)
4. For multi-sport events (triathlon), balance disciplines appropriately
5. Include warm-up and cool-down in workout descriptions
6. Specify intensity using a simple scale: recovery, easy, moderate, hard, max
7. Flag key workouts (race-pace sessions, long runs, brick workouts)
8. Consider the user's available equipment and training days
9. Build in deload weeks every 3-4 weeks
10. For events with a target date, ensure proper taper (1-3 weeks depending on event)

SAFETY:
- Never prescribe training that could be dangerous for the stated fitness level
- Include notes about listening to one's body
- Flag exercises that require proper form instruction
- Consider stated injuries/limitations

You MUST respond with ONLY valid JSON matching the exact schema specified in the user message. Do NOT wrap it in markdown code blocks. Do NOT include any text before or after the JSON. Start your response with { and end with }.`;

export interface PlanGenerationInput {
  objective: string;
  targetDate?: string;
  durationWeeks: number;
  fitnessLevel: string;
  trainingDaysPerWeek: number;
  availableEquipment: string[];
  currentWeeklyVolume?: string;
  injuryHistory?: string;
  preferences?: string;
  startDate: string;
}

export function buildPlanGenerationPrompt(input: PlanGenerationInput): string {
  return `Generate a complete training plan with the following parameters:

ATHLETE PROFILE:
- Objective: ${input.objective}
- Target date: ${input.targetDate || "No specific date"}
- Plan duration: ${input.durationWeeks} weeks
- Current fitness level: ${input.fitnessLevel}
- Available training days per week: ${input.trainingDaysPerWeek}
- Available equipment: ${input.availableEquipment.join(", ") || "None specified"}
- Current weekly training volume: ${input.currentWeeklyVolume || "Not specified"}
- Injury history: ${input.injuryHistory || "None"}
- Preferences: ${input.preferences || "None"}
- Plan start date: ${input.startDate}

IMPORTANT: Only generate workouts for the first 4 weeks in detail. For plans longer than 4 weeks, include only the first 4 weeks in the "weeks" array. Keep exercise descriptions concise (1-2 sentences). Keep the exercises array short (3-5 items max per workout).

Respond with ONLY raw JSON (no markdown, no code blocks). Use this exact format:
{
  "title": "string - descriptive plan title",
  "rationale": "string - 2-3 sentences explaining WHY this specific plan structure was chosen (periodization approach, key decisions, what makes it right for this athlete)",
  "weeks": [
    {
      "week_number": 1,
      "theme": "string - e.g. 'Base Building Week 1'",
      "notes": "string - coach notes for this week",
      "total_volume_minutes": number,
      "workouts": [
        {
          "title": "string - e.g. 'Easy Run + Strides'",
          "description": "string - detailed workout description with warm-up, main set, cool-down",
          "workout_type": "string - one of: run, swim, bike, strength, yoga, rest, cross_train, brick",
          "scheduled_date": "YYYY-MM-DD",
          "day_of_week": 0-6 (0=Sunday),
          "duration_minutes": number,
          "intensity": "recovery | easy | moderate | hard | max",
          "is_key_workout": boolean,
          "exercises": [
            {
              "name": "string",
              "sets": number | null,
              "reps": "string | null",
              "duration_minutes": number | null,
              "rest_seconds": number | null,
              "notes": "string"
            }
          ]
        }
      ]
    }
  ]
}`;
}
