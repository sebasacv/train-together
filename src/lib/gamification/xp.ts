export const XP_AWARDS = {
  workout_completed: 50,
  key_workout_completed: 75,
  workout_logged_feedback: 10,
  streak_7_days: 100,
  streak_30_days: 500,
  joined_friend_workout: 25,
  friend_joined_your_workout: 15,
  weekly_challenge: 200,
  plan_created: 50,
} as const;

export function calculateLevel(totalXp: number): number {
  let level = 1;
  while (level < 20) {
    const required = Math.floor(100 * Math.pow(1.5, level));
    if (totalXp < required) break;
    level++;
  }
  return level;
}

export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function xpForNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level));
}

export function levelProgress(totalXp: number, level: number): number {
  const current = xpForLevel(level);
  const next = xpForNextLevel(level);
  if (next <= current) return 100;
  return Math.min(((totalXp - current) / (next - current)) * 100, 100);
}
