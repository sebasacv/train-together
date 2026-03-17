import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Users,
  Trophy,
  Zap,
  Dumbbell,
  Flame,
  UserPlus,
  TrendingUp,
  CheckCircle2,
  Award,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  workout_completed: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  achievement_unlocked: <Award className="w-4 h-4 text-amber-400" />,
  streak_milestone: <Flame className="w-4 h-4 text-orange-400" />,
  plan_started: <Dumbbell className="w-4 h-4 text-cyan-400" />,
  joined_workout: <Users className="w-4 h-4 text-blue-400" />,
  level_up: <TrendingUp className="w-4 h-4 text-purple-400" />,
};

export default async function SocialPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get friend IDs
  const { data: friendships } = await supabase
    .from("friendships")
    .select("user_a, user_b")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

  const friendIds = (friendships ?? []).map(f =>
    f.user_a === user.id ? f.user_b : f.user_a
  );

  // Get activity feed from friends
  let activities: any[] = [];
  if (friendIds.length > 0) {
    const { data } = await supabase
      .from("activity_feed")
      .select("*, profiles!activity_feed_user_id_fkey(display_name, avatar_url, current_level)")
      .in("user_id", friendIds)
      .in("visibility", ["public", "friends"])
      .order("created_at", { ascending: false })
      .limit(30);
    activities = data ?? [];
  }

  // Get pending friend requests
  const { data: pendingRequests } = await supabase
    .from("friend_requests")
    .select("*, profiles!friend_requests_from_user_fkey(display_name, avatar_url)")
    .eq("to_user", user.id)
    .eq("status", "pending");

  // Get friend count
  const friendCount = friendIds.length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Social</h1>
        <div className="flex gap-2">
          <Link href="/social/leaderboard">
            <Button variant="outline" className="border-white/10 hover:bg-white/5">
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </Button>
          </Link>
          <Link href="/social/friends">
            <Button className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600">
              <UserPlus className="w-4 h-4 mr-2" />
              Friends
            </Button>
          </Link>
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests && pendingRequests.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
          <h3 className="font-medium text-amber-300 text-sm">
            {pendingRequests.length} Pending Friend Request{pendingRequests.length > 1 ? "s" : ""}
          </h3>
          {pendingRequests.map((req) => {
            const profile = req.profiles as any;
            return (
              <div key={req.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium">
                    {profile?.display_name?.[0] ?? "?"}
                  </div>
                  <span className="text-sm">{profile?.display_name}</span>
                </div>
                <Link href="/social/friends">
                  <Button size="sm" className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 h-7 text-xs">
                    View
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <Users className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
          <p className="text-2xl font-bold">{friendCount}</p>
          <p className="text-xs text-slate-400">Friends</p>
        </div>
        <Link href="/social/leaderboard">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/[0.07] transition-colors">
            <Trophy className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-2xl font-bold">--</p>
            <p className="text-xs text-slate-400">Weekly Rank</p>
          </div>
        </Link>
      </div>

      {/* Activity Feed */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Activity Feed</h2>

        {activities.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <div>
              <p className="font-medium">No activity yet</p>
              <p className="text-sm text-slate-400 mt-1">
                Add friends to see their training activity here.
              </p>
            </div>
            <Link href="/social/friends">
              <Button className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 mt-2">
                <UserPlus className="w-4 h-4 mr-2" />
                Find Friends
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => {
              const profile = activity.profiles as any;
              return (
                <div key={activity.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium shrink-0">
                      {profile?.display_name?.[0] ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{profile?.display_name}</span>
                        <span className="text-xs text-slate-500">Lv.{profile?.current_level}</span>
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {ACTIVITY_ICONS[activity.activity_type] || <Zap className="w-4 h-4 text-cyan-400" />}
                        <p className="text-sm text-slate-300">{activity.title}</p>
                      </div>
                      {activity.description && (
                        <p className="text-xs text-slate-400 mt-1">{activity.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
