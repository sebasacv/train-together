"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Clock,
  Calendar,
  Loader2,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";

const PAGE_SIZE = 10;

export default function TrainingSoonPage() {
  const { supabase, user } = useSupabase();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const loadWorkouts = useCallback(async (pageNum: number, append = false) => {
    if (!user) return;
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    // Get friend IDs
    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_a, user_b")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

    const friendIds = (friendships ?? []).map((f: any) =>
      f.user_a === user.id ? f.user_b : f.user_a
    );

    if (friendIds.length === 0) {
      setWorkouts([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    const today = format(new Date(), "yyyy-MM-dd");

    const { data } = await supabase
      .from("workouts")
      .select("id, title, workout_type, scheduled_date, duration_minutes, intensity, user_id, profiles!workouts_user_id_fkey(display_name)")
      .in("user_id", friendIds)
      .eq("status", "scheduled")
      .gte("scheduled_date", today)
      .order("scheduled_date", { ascending: true })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    const results = data ?? [];
    if (append) {
      setWorkouts(prev => [...prev, ...results]);
    } else {
      setWorkouts(results);
    }
    setHasMore(results.length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  }, [user, supabase]);

  useEffect(() => {
    if (user) loadWorkouts(0);
  }, [user, loadWorkouts]);

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    loadWorkouts(nextPage, true);
  }

  const WORKOUT_TYPE_COLORS: Record<string, string> = {
    run: "text-blue-400",
    swim: "text-cyan-400",
    bike: "text-green-400",
    strength: "text-purple-400",
    yoga: "text-pink-400",
    cross_train: "text-orange-400",
    brick: "text-red-400",
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Users className="w-6 h-6 text-cyan-400" />
        Friends&apos; Upcoming Workouts
      </h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : workouts.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400">No friends have upcoming workouts</p>
          <Link href="/social/friends" className="inline-flex items-center gap-2 text-sm text-pink-400 hover:text-pink-300">
            <UserPlus className="w-4 h-4" />
            Invite friends to train together
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {workouts.map((workout) => {
            const friendName = (workout.profiles as any)?.display_name ?? "Friend";
            return (
              <Link key={workout.id} href="/calendar">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{friendName}</p>
                      <p className={`text-sm mt-0.5 ${WORKOUT_TYPE_COLORS[workout.workout_type] || "text-slate-400"}`}>
                        {workout.title}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(workout.scheduled_date), "EEE, MMM d")}
                        </span>
                        {workout.duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {workout.duration_minutes}min
                          </span>
                        )}
                        <span className="capitalize">{workout.intensity}</span>
                      </div>
                    </div>
                    <span className="text-xs text-cyan-400 font-medium">Join</span>
                  </div>
                </div>
              </Link>
            );
          })}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 text-sm text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-2"
            >
              {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
