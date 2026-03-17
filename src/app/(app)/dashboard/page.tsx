import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Flame,
  Dumbbell,
  Trophy,
  ArrowRight,
  Calendar,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { format, isToday, startOfWeek, endOfWeek } from "date-fns";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch active plan
  const { data: activePlan } = await supabase
    .from("training_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  // Fetch today's workouts
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: todaysWorkouts } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", user.id)
    .eq("scheduled_date", today)
    .eq("status", "scheduled");

  // Fetch this week's workout stats
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: weekWorkouts } = await supabase
    .from("workouts")
    .select("id, status")
    .eq("user_id", user.id)
    .gte("scheduled_date", weekStart)
    .lte("scheduled_date", weekEnd);

  const weekTotal = weekWorkouts?.length ?? 0;
  const weekCompleted = weekWorkouts?.filter(w => w.status === "completed").length ?? 0;

  // Fetch recent activity
  const { data: recentActivity } = await supabase
    .from("activity_feed")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Calculate level progress
  const xpTotal = profile?.xp_total ?? 0;
  const currentLevel = profile?.current_level ?? 1;
  const currentLevelXp = Math.floor(100 * Math.pow(1.5, currentLevel - 1));
  const nextLevelXp = Math.floor(100 * Math.pow(1.5, currentLevel));
  const levelProgress = nextLevelXp > currentLevelXp
    ? ((xpTotal - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
    : 0;

  const displayName = profile?.display_name || "there";
  const streak = profile?.current_streak ?? 0;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">Hey, {displayName}!</h1>
        <p className="text-slate-400 mt-1">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Flame className={`w-5 h-5 ${streak > 0 ? "text-orange-400" : "text-slate-500"}`} />
          </div>
          <p className="text-2xl font-bold">{streak}</p>
          <p className="text-xs text-slate-400">Day Streak</p>
        </div>
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold">{xpTotal.toLocaleString()}</p>
          <p className="text-xs text-slate-400">Total XP</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold">Lv.{currentLevel}</p>
          <p className="text-xs text-slate-400">Level</p>
        </div>
      </div>

      {/* Level Progress */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Level {currentLevel} Progress</span>
          <span className="text-sm text-slate-400">{Math.round(levelProgress)}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-pink-500 via-orange-500 to-yellow-500 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(levelProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Today's Workout */}
      {todaysWorkouts && todaysWorkouts.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-400" />
            Today&apos;s Training
          </h2>
          {todaysWorkouts.map((workout) => (
            <Link key={workout.id} href={`/plan/${workout.id}`}>
              <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 border border-pink-500/20 rounded-xl p-5 hover:from-pink-500/15 hover:via-purple-500/15 hover:to-cyan-500/15 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">{workout.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {workout.duration_minutes}min
                      </span>
                      <span className="capitalize px-2 py-0.5 rounded-full bg-white/10 text-xs">
                        {workout.intensity}
                      </span>
                      <span className="capitalize">{workout.workout_type}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : activePlan ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="font-medium">Rest day!</p>
          <p className="text-sm text-slate-400 mt-1">Recovery is part of the plan. You&apos;ve earned it.</p>
        </div>
      ) : null}

      {/* Week Progress */}
      {weekTotal > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              This Week
            </h3>
            <span className="text-sm text-slate-400">{weekCompleted}/{weekTotal} workouts</span>
          </div>
          <div className="flex gap-1">
            {weekWorkouts?.map((w, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full ${
                  w.status === "completed"
                    ? "bg-emerald-500"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Plan CTA */}
      {!activePlan && (
        <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 border border-pink-500/20 rounded-2xl p-8 text-center space-y-4">
          <Dumbbell className="w-12 h-12 text-pink-400 mx-auto" />
          <div>
            <h2 className="text-xl font-bold">Ready to start training?</h2>
            <p className="text-slate-400 mt-2">
              Let our AI coach build a personalized training plan for your goals.
            </p>
          </div>
          <Link href="/plan/generate">
            <Button className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 mt-2">
              <Plus className="w-4 h-4 mr-2" />
              Generate Training Plan
            </Button>
          </Link>
        </div>
      )}

      {/* Recent Activity */}
      {recentActivity && recentActivity.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <div className="space-y-2">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <p className="text-xs text-slate-400">{activity.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
