import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  User,
  Settings,
  Flame,
  Trophy,
  Zap,
  Calendar,
  Dumbbell,
  Award,
  LogOut,
} from "lucide-react";
import { LogoutButton } from "@/components/layout/logout-button";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get workout count
  const { count: workoutCount } = await supabase
    .from("workout_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Get achievements count
  const { count: achievementCount } = await supabase
    .from("user_achievements")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Get friends count
  const { count: friendCount } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

  if (!profile) redirect("/login");

  const currentLevel = profile.current_level;
  const xpTotal = profile.xp_total;
  const currentLevelXp = Math.floor(100 * Math.pow(1.5, currentLevel - 1));
  const nextLevelXp = Math.floor(100 * Math.pow(1.5, currentLevel));
  const levelProgress = nextLevelXp > currentLevelXp
    ? ((xpTotal - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center text-2xl font-bold text-indigo-300">
            {profile.display_name[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{profile.display_name}</h1>
            <p className="text-sm text-slate-400">@{profile.username}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-xs">
                Lv.{currentLevel}
              </span>
              <span className="text-xs text-slate-400 capitalize">{profile.fitness_level}</span>
            </div>
          </div>
          <Link href="/profile/edit">
            <Button variant="outline" size="sm" className="border-white/10">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* XP Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Level {currentLevel}</span>
            <span>{xpTotal.toLocaleString()} / {nextLevelXp.toLocaleString()} XP</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
              style={{ width: `${Math.min(levelProgress, 100)}%` }}
            />
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm text-slate-400 mt-3">{profile.bio}</p>
        )}
      </div>

      {/* Stats Grid */}
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
          <Award className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <p className="text-xl font-bold">{achievementCount ?? 0}</p>
          <p className="text-[10px] text-slate-400">Badges</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <User className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <p className="text-xl font-bold">{friendCount ?? 0}</p>
          <p className="text-[10px] text-slate-400">Friends</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="space-y-2">
        <Link href="/achievements">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/[0.07] transition-colors">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span className="font-medium">Achievements</span>
            </div>
            <span className="text-sm text-slate-400">{achievementCount ?? 0} unlocked</span>
          </div>
        </Link>
        <Link href="/social/leaderboard">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/[0.07] transition-colors">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-indigo-400" />
              <span className="font-medium">Leaderboard</span>
            </div>
            <span className="text-sm text-slate-400">View rankings</span>
          </div>
        </Link>
      </div>

      {/* Details */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
        <h3 className="font-medium text-sm text-slate-400">Training Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-500">Fitness Level</span>
            <p className="capitalize">{profile.fitness_level}</p>
          </div>
          <div>
            <span className="text-slate-500">Training Days</span>
            <p>{profile.training_days_per_week}/week</p>
          </div>
          <div>
            <span className="text-slate-500">Equipment</span>
            <p>{profile.available_equipment.length > 0 ? profile.available_equipment.join(", ") : "Not set"}</p>
          </div>
          <div>
            <span className="text-slate-500">Longest Streak</span>
            <p>{profile.longest_streak} days</p>
          </div>
        </div>
      </div>

      {/* Logout */}
      <LogoutButton />
    </div>
  );
}
