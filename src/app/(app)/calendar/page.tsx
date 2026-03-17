"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  MapPin,
  UserPlus,
  Check,
  Loader2,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isToday,
  isSameDay,
} from "date-fns";
import { toast } from "sonner";

interface CalendarWorkout {
  id: string;
  title: string;
  workout_type: string;
  scheduled_date: string;
  scheduled_time: string | null;
  duration_minutes: number | null;
  intensity: string | null;
  location: string | null;
  is_open_for_joining: boolean;
  user_id: string;
  owner_name: string;
  is_own: boolean;
  participant_count: number;
  user_joined: boolean;
}

const WORKOUT_COLORS: Record<string, string> = {
  run: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  swim: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  bike: "bg-green-500/20 text-green-300 border-green-500/30",
  strength: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  yoga: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  rest: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  cross_train: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  brick: "bg-red-500/20 text-red-300 border-red-500/30",
};

export default function CalendarPage() {
  const { supabase, user } = useSupabase();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [workouts, setWorkouts] = useState<CalendarWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningWorkout, setJoiningWorkout] = useState<string | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    if (user) loadWorkouts();
  }, [user, currentWeek]);

  async function loadWorkouts() {
    if (!user) return;
    setLoading(true);

    const startStr = format(weekStart, "yyyy-MM-dd");
    const endStr = format(weekEnd, "yyyy-MM-dd");

    // Get own workouts
    const { data: ownWorkouts } = await supabase
      .from("workouts")
      .select("id, title, workout_type, scheduled_date, scheduled_time, duration_minutes, intensity, location, is_open_for_joining, user_id")
      .eq("user_id", user.id)
      .gte("scheduled_date", startStr)
      .lte("scheduled_date", endStr)
      .in("status", ["scheduled", "completed"]);

    // Get friend IDs
    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_a, user_b")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

    const friendIds = (friendships ?? []).map(f =>
      f.user_a === user.id ? f.user_b : f.user_a
    );

    // Get friends' open workouts
    let friendWorkouts: any[] = [];
    if (friendIds.length > 0) {
      const { data } = await supabase
        .from("workouts")
        .select("id, title, workout_type, scheduled_date, scheduled_time, duration_minutes, intensity, location, is_open_for_joining, user_id, profiles!workouts_user_id_fkey(display_name)")
        .in("user_id", friendIds)
        .eq("is_open_for_joining", true)
        .in("visibility", ["public", "friends"])
        .gte("scheduled_date", startStr)
        .lte("scheduled_date", endStr);
      friendWorkouts = data ?? [];
    }

    // Get participation status
    const allWorkoutIds = [
      ...(ownWorkouts ?? []).map(w => w.id),
      ...friendWorkouts.map(w => w.id),
    ];

    let participantCounts = new Map<string, number>();
    let userParticipation = new Set<string>();

    if (allWorkoutIds.length > 0) {
      const { data: participants } = await supabase
        .from("workout_participants")
        .select("workout_id, user_id, status")
        .in("workout_id", allWorkoutIds)
        .in("status", ["interested", "confirmed"]);

      (participants ?? []).forEach(p => {
        participantCounts.set(p.workout_id, (participantCounts.get(p.workout_id) ?? 0) + 1);
        if (p.user_id === user.id) userParticipation.add(p.workout_id);
      });
    }

    const combined: CalendarWorkout[] = [
      ...(ownWorkouts ?? []).map(w => ({
        ...w,
        owner_name: "You",
        is_own: true,
        participant_count: participantCounts.get(w.id) ?? 0,
        user_joined: false,
      })),
      ...friendWorkouts.map(w => ({
        ...w,
        owner_name: (w.profiles as any)?.display_name ?? "Friend",
        is_own: false,
        participant_count: participantCounts.get(w.id) ?? 0,
        user_joined: userParticipation.has(w.id),
      })),
    ];

    setWorkouts(combined);
    setLoading(false);
  }

  async function joinWorkout(workoutId: string) {
    if (!user) return;
    setJoiningWorkout(workoutId);

    const { error } = await supabase
      .from("workout_participants")
      .insert({ workout_id: workoutId, user_id: user.id, status: "confirmed" });

    if (error) {
      toast.error("Could not join workout");
    } else {
      toast.success("Joined workout!");
      loadWorkouts();
    }
    setJoiningWorkout(null);
  }

  async function leaveWorkout(workoutId: string) {
    if (!user) return;
    await supabase
      .from("workout_participants")
      .delete()
      .eq("workout_id", workoutId)
      .eq("user_id", user.id);
    toast.success("Left workout");
    loadWorkouts();
  }

  async function toggleOpenForJoining(workoutId: string, open: boolean) {
    await supabase
      .from("workouts")
      .update({ is_open_for_joining: open })
      .eq("id", workoutId);
    toast.success(open ? "Workout shared with friends!" : "Workout is now private");
    loadWorkouts();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-indigo-400" />
          Training Calendar
        </h1>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-white/10"
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10"
            onClick={() => setCurrentWeek(new Date())}
          >
            Today
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-slate-400">
        {format(weekStart, "MMM d")} — {format(weekEnd, "MMM d, yyyy")}
      </p>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-indigo-500/30 border border-indigo-500/50" />
          Your workouts
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
          Friends&apos; workouts
        </span>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((day) => {
            const dayWorkouts = workouts.filter(w =>
              isSameDay(new Date(w.scheduled_date), day)
            );
            const own = dayWorkouts.filter(w => w.is_own);
            const friends = dayWorkouts.filter(w => !w.is_own);

            return (
              <div
                key={day.toISOString()}
                className={`rounded-xl border p-4 ${
                  isToday(day)
                    ? "bg-indigo-500/5 border-indigo-500/20"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-sm font-medium ${isToday(day) ? "text-indigo-400" : "text-slate-400"}`}>
                    {format(day, "EEE")}
                  </span>
                  <span className={`text-lg font-bold ${isToday(day) ? "text-indigo-300" : ""}`}>
                    {format(day, "d")}
                  </span>
                  {isToday(day) && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full">Today</span>
                  )}
                </div>

                {dayWorkouts.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Rest day</p>
                ) : (
                  <div className="space-y-2">
                    {/* Own workouts */}
                    {own.map((w) => (
                      <div
                        key={w.id}
                        className={`rounded-lg border p-3 ${WORKOUT_COLORS[w.workout_type] || WORKOUT_COLORS.cross_train}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{w.title}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs opacity-70">
                              {w.duration_minutes && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" /> {w.duration_minutes}min
                                </span>
                              )}
                              {w.location && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3" /> {w.location}
                                </span>
                              )}
                              {w.participant_count > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Users className="w-3 h-3" /> {w.participant_count} joining
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleOpenForJoining(w.id, !w.is_open_for_joining)}
                            className={`text-[10px] px-2 py-1 rounded-full ${
                              w.is_open_for_joining
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-white/10 text-slate-400"
                            }`}
                          >
                            {w.is_open_for_joining ? "Shared" : "Share"}
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Friend workouts */}
                    {friends.map((w) => (
                      <div
                        key={w.id}
                        className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm text-emerald-200">
                              {w.owner_name}: {w.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-emerald-300/60">
                              {w.duration_minutes && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" /> {w.duration_minutes}min
                                </span>
                              )}
                              {w.location && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3" /> {w.location}
                                </span>
                              )}
                              {w.participant_count > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Users className="w-3 h-3" /> {w.participant_count}
                                </span>
                              )}
                            </div>
                          </div>
                          {w.user_joined ? (
                            <button
                              onClick={() => leaveWorkout(w.id)}
                              className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Joined
                            </button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => joinWorkout(w.id)}
                              disabled={joiningWorkout === w.id}
                              className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                            >
                              {joiningWorkout === w.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <UserPlus className="w-3 h-3 mr-1" /> Join
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
