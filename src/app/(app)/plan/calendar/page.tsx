"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Dumbbell,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";

const WORKOUT_TYPE_COLORS: Record<string, string> = {
  run: "bg-blue-500",
  swim: "bg-cyan-500",
  bike: "bg-green-500",
  strength: "bg-purple-500",
  yoga: "bg-pink-500",
  rest: "bg-slate-500",
  cross_train: "bg-orange-500",
  brick: "bg-red-500",
};

const WORKOUT_TYPE_TEXT: Record<string, string> = {
  run: "text-blue-400",
  swim: "text-cyan-400",
  bike: "text-green-400",
  strength: "text-purple-400",
  yoga: "text-pink-400",
  rest: "text-slate-400",
  cross_train: "text-orange-400",
  brick: "text-red-400",
};

export default function PlanCalendarPage() {
  const { supabase, user } = useSupabase();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadWorkouts();
  }, [user, currentMonth]);

  async function loadWorkouts() {
    if (!user) return;
    setLoading(true);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const { data } = await supabase
      .from("workouts")
      .select("id, title, workout_type, scheduled_date, duration_minutes, intensity, status, is_key_workout")
      .eq("user_id", user.id)
      .gte("scheduled_date", format(monthStart, "yyyy-MM-dd"))
      .lte("scheduled_date", format(monthEnd, "yyyy-MM-dd"))
      .order("scheduled_date", { ascending: true });

    setWorkouts(data ?? []);
    setLoading(false);
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="space-y-6">
      {/* Back to Plan */}
      <Link href="/plan" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" />
        Back to Plan
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-pink-400" />
          Plan Calendar
        </h1>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-white/10"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-32 text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        {Object.entries(WORKOUT_TYPE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="capitalize">{type.replace("_", " ")}</span>
          </span>
        ))}
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          Completed
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-2">
          {days.map((day) => {
            const dayWorkouts = workouts.filter(w =>
              isSameDay(new Date(w.scheduled_date), day)
            );
            const today = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`rounded-xl border p-4 ${
                  today
                    ? "bg-pink-500/5 border-pink-500/20"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-medium ${today ? "text-pink-400" : "text-slate-400"}`}>
                    {format(day, "EEE")}
                  </span>
                  <span className={`text-lg font-bold ${today ? "text-pink-300" : ""}`}>
                    {format(day, "d")}
                  </span>
                  {today && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-pink-500/20 text-pink-300 rounded-full">Today</span>
                  )}
                </div>

                {dayWorkouts.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Rest day</p>
                ) : (
                  <div className="space-y-2">
                    {dayWorkouts.map((w) => (
                      <Link key={w.id} href={`/plan/${w.id}`}>
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors -mx-2">
                          <div className={`w-3 h-3 rounded-full shrink-0 ${
                            w.status === "completed"
                              ? "bg-emerald-500"
                              : WORKOUT_TYPE_COLORS[w.workout_type] || "bg-slate-500"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{w.title}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {w.duration_minutes}min
                              </span>
                              <span className={`capitalize ${WORKOUT_TYPE_TEXT[w.workout_type] || "text-slate-400"}`}>
                                {w.workout_type.replace("_", " ")}
                              </span>
                              <span className="capitalize">{w.intensity}</span>
                              {w.is_key_workout && (
                                <span className="text-amber-400 font-medium">Key</span>
                              )}
                            </div>
                          </div>
                          {w.status === "completed" && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                        </div>
                      </Link>
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
