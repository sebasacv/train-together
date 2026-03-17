"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
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
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
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

export default function PlanCalendarPage() {
  const { supabase, user } = useSupabase();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (user) loadWorkouts();
  }, [user, currentMonth]);

  async function loadWorkouts() {
    if (!user) return;
    setLoading(true);

    const monthStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const monthEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });

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
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const selectedDayWorkouts = selectedDate
    ? workouts.filter(w => isSameDay(new Date(w.scheduled_date), selectedDate))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-400" />
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

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Calendar Grid */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-white/10">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="p-2 text-center text-xs text-slate-400 font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dayWorkouts = workouts.filter(w =>
                  isSameDay(new Date(w.scheduled_date), day)
                );
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`p-2 min-h-[4.5rem] border-b border-r border-white/5 text-left transition-colors ${
                      !isCurrentMonth ? "opacity-30" : ""
                    } ${isSelected ? "bg-indigo-500/10" : "hover:bg-white/5"}`}
                  >
                    <span
                      className={`text-xs font-medium ${
                        isToday(day)
                          ? "bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center"
                          : "text-slate-400"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {dayWorkouts.map((w) => (
                        <div
                          key={w.id}
                          className={`w-2 h-2 rounded-full ${
                            w.status === "completed"
                              ? "bg-emerald-500"
                              : WORKOUT_TYPE_COLORS[w.workout_type] || "bg-slate-500"
                          }`}
                          title={w.title}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Detail */}
          {selectedDate && (
            <div className="space-y-3">
              <h2 className="font-semibold">
                {format(selectedDate, "EEEE, MMMM d")}
              </h2>
              {selectedDayWorkouts.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No workouts scheduled</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayWorkouts.map((workout) => (
                    <Link key={workout.id} href={`/plan/${workout.id}`}>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              workout.status === "completed"
                                ? "bg-emerald-500"
                                : WORKOUT_TYPE_COLORS[workout.workout_type] || "bg-slate-500"
                            }`} />
                            <div>
                              <p className="font-medium text-sm">{workout.title}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />
                                  {workout.duration_minutes}min
                                </span>
                                <span className="capitalize">{workout.intensity}</span>
                                {workout.is_key_workout && (
                                  <span className="text-amber-400">Key</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {workout.status === "completed" && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

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
        </>
      )}
    </div>
  );
}
