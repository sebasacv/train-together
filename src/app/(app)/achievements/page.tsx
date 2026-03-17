import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Award, Lock, CheckCircle2 } from "lucide-react";

const RARITY_COLORS: Record<string, string> = {
  common: "border-slate-500/30 bg-slate-500/10",
  uncommon: "border-emerald-400/30 bg-emerald-400/10",
  rare: "border-cyan-400/30 bg-cyan-400/10",
  epic: "border-violet-400/30 bg-violet-400/10",
  legendary: "border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-yellow-300/10",
};

const RARITY_TEXT: Record<string, string> = {
  common: "text-slate-400",
  uncommon: "text-emerald-400",
  rare: "text-cyan-400",
  epic: "text-violet-400",
  legendary: "text-amber-400",
};

export default async function AchievementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: allAchievements } = await supabase
    .from("achievements")
    .select("*")
    .order("rarity", { ascending: true });

  const { data: userAchievements } = await supabase
    .from("user_achievements")
    .select("achievement_id, unlocked_at")
    .eq("user_id", user.id);

  const unlockedIds = new Set((userAchievements ?? []).map(a => a.achievement_id));
  const unlockedMap = new Map((userAchievements ?? []).map(a => [a.achievement_id, a.unlocked_at]));

  const categories = ["consistency", "social", "milestone"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="w-6 h-6 text-amber-400" />
          Achievements
        </h1>
        <p className="text-slate-400 mt-1">
          {unlockedIds.size} of {allAchievements?.length ?? 0} unlocked
        </p>
      </div>

      {categories.map((category) => {
        const categoryAchievements = (allAchievements ?? []).filter(a => a.category === category);
        if (categoryAchievements.length === 0) return null;

        return (
          <div key={category} className="space-y-3">
            <h2 className="text-lg font-semibold capitalize">{category}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {categoryAchievements.map((achievement) => {
                const unlocked = unlockedIds.has(achievement.id);
                return (
                  <div
                    key={achievement.id}
                    className={`rounded-xl border p-4 ${
                      unlocked
                        ? RARITY_COLORS[achievement.rarity]
                        : "border-white/5 bg-white/[0.02] opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        unlocked ? RARITY_COLORS[achievement.rarity] : "bg-white/5"
                      }`}>
                        {unlocked ? (
                          <Award className={`w-5 h-5 ${RARITY_TEXT[achievement.rarity]}`} />
                        ) : (
                          <Lock className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{achievement.name}</p>
                          {unlocked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{achievement.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] capitalize ${RARITY_TEXT[achievement.rarity]}`}>
                            {achievement.rarity}
                          </span>
                          <span className="text-[10px] text-slate-500">+{achievement.xp_reward} XP</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
