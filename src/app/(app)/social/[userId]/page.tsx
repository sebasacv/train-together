import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Flame,
  Trophy,
  Zap,
  Dumbbell,
  Award,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) redirect("/social");

  // Get workout count
  const { count: workoutCount } = await supabase
    .from("workout_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Get achievements
  const { data: achievements } = await supabase
    .from("user_achievements")
    .select("*, achievements(*)")
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false })
    .limit(6);

  // Get upcoming open workouts
  const { data: upcomingWorkouts } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_open_for_joining", true)
    .in("visibility", ["public", "friends"])
    .gte("scheduled_date", format(new Date(), "yyyy-MM-dd"))
    .order("scheduled_date", { ascending: true })
    .limit(5);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Link href="/social" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      {/* Profile Header */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center text-2xl font-bold text-indigo-300">
            {profile.display_name[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold">{profile.display_name}</h1>
            <p className="text-sm text-slate-400">@{profile.username}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-xs">
                Lv.{profile.current_level}
              </span>
              <span className="text-xs text-slate-400 capitalize">{profile.fitness_level}</span>
            </div>
          </div>
        </div>
        {profile.bio && (
          <p className="text-sm text-slate-400 mt-4">{profile.bio}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <Dumbbell className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
          <p className="text-xl font-bold">{workoutCount ?? 0}</p>
          <p className="text-[10px] text-slate-400">Workouts</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
          <p className="text-xl font-bold">{profile.current_streak}</p>
          <p className="text-[10px] text-slate-400">Streak</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <Zap className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
          <p className="text-xl font-bold">{profile.xp_total.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400">XP</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <p className="text-xl font-bold">{profile.longest_streak}</p>
          <p className="text-[10px] text-slate-400">Best Streak</p>
        </div>
      </div>

      {/* Upcoming Open Workouts */}
      {upcomingWorkouts && upcomingWorkouts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Upcoming Workouts (joinable)
          </h2>
          {upcomingWorkouts.map((workout) => (
            <div key={workout.id} className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <p className="font-medium text-sm">{workout.title}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <span>{format(new Date(workout.scheduled_date), "EEE, MMM d")}</span>
                <span>{workout.duration_minutes}min</span>
                <span className="capitalize">{workout.workout_type}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Achievements */}
      {achievements && achievements.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Recent Achievements
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {achievements.map((ua) => {
              const ach = ua.achievements as any;
              return (
                <div key={ua.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <p className="font-medium text-sm">{ach?.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{ach?.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
