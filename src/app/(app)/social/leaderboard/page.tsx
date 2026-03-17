import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Trophy, Medal, TrendingUp, Flame, Crown } from "lucide-react";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get friend IDs
  const { data: friendships } = await supabase
    .from("friendships")
    .select("user_a, user_b")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

  const friendIds = [
    user.id,
    ...(friendships ?? []).map(f => f.user_a === user.id ? f.user_b : f.user_a),
  ];

  // Get weekly XP for friends
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  const { data: xpData } = await supabase
    .from("xp_transactions")
    .select("user_id, amount")
    .in("user_id", friendIds)
    .gte("created_at", weekStart.toISOString());

  // Aggregate XP by user
  const xpByUser = new Map<string, number>();
  friendIds.forEach(id => xpByUser.set(id, 0));
  (xpData ?? []).forEach(tx => {
    xpByUser.set(tx.user_id, (xpByUser.get(tx.user_id) ?? 0) + tx.amount);
  });

  // Get profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, current_level, current_streak")
    .in("id", friendIds);

  // Build leaderboard
  const leaderboard = (profiles ?? [])
    .map(p => ({
      ...p,
      weeklyXp: xpByUser.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.weeklyXp - a.weeklyXp);

  const userRank = leaderboard.findIndex(l => l.id === user.id) + 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" />
          Weekly Leaderboard
        </h1>
        <p className="text-slate-400 mt-1">Resets every Monday</p>
      </div>

      {/* Your Position */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-indigo-400">#{userRank}</span>
          <div>
            <p className="font-medium">Your Position</p>
            <p className="text-sm text-slate-400">{xpByUser.get(user.id) ?? 0} XP this week</p>
          </div>
        </div>
        <TrendingUp className="w-5 h-5 text-indigo-400" />
      </div>

      {/* Leaderboard */}
      <div className="space-y-2">
        {leaderboard.map((entry, i) => {
          const rank = i + 1;
          const isUser = entry.id === user.id;
          return (
            <div
              key={entry.id}
              className={`rounded-xl p-4 flex items-center gap-4 border transition-colors ${
                isUser
                  ? "bg-indigo-500/10 border-indigo-500/20"
                  : "bg-white/5 border-white/10"
              }`}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                {rank === 1 ? (
                  <Crown className="w-6 h-6 text-amber-400 mx-auto" />
                ) : rank === 2 ? (
                  <Medal className="w-6 h-6 text-slate-300 mx-auto" />
                ) : rank === 3 ? (
                  <Medal className="w-6 h-6 text-amber-600 mx-auto" />
                ) : (
                  <span className="text-lg font-bold text-slate-400">{rank}</span>
                )}
              </div>

              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                rank === 1 ? "bg-amber-500/20 text-amber-300" :
                rank === 2 ? "bg-slate-400/20 text-slate-300" :
                rank === 3 ? "bg-amber-600/20 text-amber-500" :
                "bg-white/10"
              }`}>
                {entry.display_name[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">
                    {entry.display_name}
                    {isUser && <span className="text-xs text-slate-400 ml-1">(you)</span>}
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  Lv.{entry.current_level}
                  {entry.current_streak > 0 && (
                    <span className="ml-2 text-orange-400">
                      <Flame className="w-3 h-3 inline" /> {entry.current_streak}
                    </span>
                  )}
                </p>
              </div>

              {/* XP */}
              <div className="text-right">
                <p className="font-bold text-lg">{entry.weeklyXp.toLocaleString()}</p>
                <p className="text-xs text-slate-400">XP</p>
              </div>
            </div>
          );
        })}

        {leaderboard.length === 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">Add friends to see the leaderboard!</p>
          </div>
        )}
      </div>
    </div>
  );
}
