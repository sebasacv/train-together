"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Clock,
  Zap,
  Target,
  Users,
  CheckCircle2,
  UserPlus,
  Dumbbell,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { WorkoutActions } from "@/components/plan/workout-actions";

interface Exercise {
  name: string;
  sets?: number | null;
  reps?: string | null;
  duration_minutes?: number | null;
  rest_seconds?: number | null;
  notes?: string;
}

interface Participant {
  id: string;
  status: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
    current_level: string | null;
  } | null;
}

export default function WorkoutDetailPage() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const router = useRouter();
  const { supabase, user, loading: authLoading } = useSupabase();

  const [workout, setWorkout] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [existingLog, setExistingLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    async function fetchData() {
      const { data: w } = await supabase
        .from("workouts")
        .select("*")
        .eq("id", workoutId)
        .single();

      if (!w) {
        router.push("/plan");
        return;
      }
      setWorkout(w);

      const { data: parts } = await supabase
        .from("workout_participants")
        .select("*, profiles!workout_participants_user_id_fkey(display_name, avatar_url, current_level)")
        .eq("workout_id", workoutId)
        .in("status", ["confirmed", "interested"]);

      setParticipants((parts as Participant[]) ?? []);

      const { data: log } = await supabase
        .from("workout_logs")
        .select("id")
        .eq("workout_id", workoutId)
        .eq("user_id", user!.id)
        .single();

      setExistingLog(log);
      setLoading(false);
    }

    fetchData();
  }, [authLoading, user, workoutId, supabase, router]);

  function handleInvite() {
    const url = `${window.location.origin}/plan/${workoutId}`;
    navigator.clipboard.writeText(url);
    toast("Workout link copied! Share it with friends");
  }

  if (loading || authLoading || !workout) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-slate-400">
        Loading...
      </div>
    );
  }

  const exercises = (workout.exercises ?? []) as Exercise[];
  const isOwner = workout.user_id === user?.id;
  const isCompleted = workout.status === "completed" || !!existingLog;

  const intensityColors: Record<string, string> = {
    recovery: "bg-slate-500/20 text-slate-300",
    easy: "bg-green-500/20 text-green-300",
    moderate: "bg-yellow-500/20 text-yellow-300",
    hard: "bg-orange-500/20 text-orange-300",
    max: "bg-red-500/20 text-red-300",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/plan" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" />
        Back to Plan
      </Link>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {workout.is_key_workout && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full text-xs font-medium">Key Workout</span>
          )}
          {workout.status === "adapted" && (
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">Adapted</span>
          )}
          {isCompleted && (
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Completed
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold">{workout.title}</h1>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>{format(new Date(workout.scheduled_date), "EEEE, MMMM d")}</span>
          {workout.scheduled_time && <span>{workout.scheduled_time}</span>}
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <Clock className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <p className="font-medium">{workout.duration_minutes ?? "--"}min</p>
          <p className="text-xs text-slate-400">Duration</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <Zap className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <p className={`font-medium capitalize px-2 py-0.5 rounded-full text-xs inline-block ${intensityColors[workout.intensity ?? "moderate"]}`}>
            {workout.intensity ?? "moderate"}
          </p>
          <p className="text-xs text-slate-400 mt-1">Intensity</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <Target className="w-4 h-4 text-slate-400 mx-auto mb-1" />
          <p className="font-medium capitalize">{workout.workout_type}</p>
          <p className="text-xs text-slate-400">Type</p>
        </div>
      </div>

      {/* Description */}
      {workout.description && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-2">Coach Notes</h3>
          <p className="text-sm text-slate-400 whitespace-pre-line">{workout.description}</p>
        </div>
      )}

      {/* Who's Joining — always visible */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          Who&apos;s Joining {participants.length > 0 && `(${participants.length})`}
        </h3>
        {participants.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => {
              const profile = p.profiles as any;
              return (
                <div key={p.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium">
                    {profile?.display_name?.[0] ?? "?"}
                  </div>
                  <span className="text-sm">{profile?.display_name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    p.status === "confirmed" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                  }`}>
                    {p.status}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-slate-400 mb-3">No one yet — invite a friend!</p>
            <button
              onClick={handleInvite}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite a Friend
            </button>
          </div>
        )}
      </div>

      {/* Exercises */}
      {exercises.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-violet-400" />
            Exercises
          </h3>
          <div className="space-y-2">
            {exercises.map((ex, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{ex.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      {ex.sets && <span>{ex.sets} sets</span>}
                      {ex.reps && <span>{ex.reps} reps</span>}
                      {ex.duration_minutes && <span>{ex.duration_minutes}min</span>}
                      {ex.rest_seconds && <span>{ex.rest_seconds}s rest</span>}
                    </div>
                  </div>
                  <span className="text-sm text-slate-500">#{i + 1}</span>
                </div>
                {ex.notes && (
                  <p className="text-xs text-slate-400 mt-2 italic">{ex.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Friends — primary CTA */}
      <button
        onClick={handleInvite}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-semibold rounded-xl py-3 transition-colors"
      >
        <UserPlus className="w-5 h-5" />
        Invite Friends to Join
      </button>

      {/* Actions */}
      {isOwner && !isCompleted && (
        <WorkoutActions workoutId={workoutId} planId={workout.plan_id} />
      )}

      {isOwner && isCompleted && !existingLog && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <p className="text-emerald-300 font-medium">Workout completed!</p>
        </div>
      )}
    </div>
  );
}
