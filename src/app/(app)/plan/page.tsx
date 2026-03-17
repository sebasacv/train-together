"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { Dumbbell, Calendar, Clock, Target, Plus, ArrowRight, CheckCircle2, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function PlanPage() {
  const { supabase, user, loading: authLoading } = useSupabase();
  const router = useRouter();

  const [plans, setPlans] = useState<any[] | null>(null);
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<any[] | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const activePlan = plans?.find(p => p.status === "active") ?? null;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    async function fetchData() {
      setLoading(true);

      const { data: plansData } = await supabase
        .from("training_plans")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      setPlans(plansData);

      const active = plansData?.find(p => p.status === "active");

      if (active) {
        const { data: workouts } = await supabase
          .from("workouts")
          .select("*")
          .eq("plan_id", active.id)
          .eq("status", "scheduled")
          .gte("scheduled_date", format(new Date(), "yyyy-MM-dd"))
          .order("scheduled_date", { ascending: true })
          .limit(5);
        setUpcomingWorkouts(workouts);

        const { count: completed } = await supabase
          .from("workouts")
          .select("*", { count: "exact", head: true })
          .eq("plan_id", active.id)
          .eq("status", "completed");
        const { count: total } = await supabase
          .from("workouts")
          .select("*", { count: "exact", head: true })
          .eq("plan_id", active.id);
        setCompletedCount(completed ?? 0);
        setTotalCount(total ?? 0);
      }

      setLoading(false);
    }

    fetchData();
  }, [supabase, user, authLoading, router]);

  async function handleChatSubmit(e: FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !activePlan) return;

    setChatLoading(true);
    try {
      const res = await fetch("/api/plan/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: activePlan.id, freeText: chatInput.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to adapt plan");
      }

      const data = await res.json();
      toast.success(data.coach_note || "Plan updated by your AI coach!", { duration: 8000 });
      setChatInput("");

      // Refresh data after adaptation
      const { data: plansData } = await supabase
        .from("training_plans")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      setPlans(plansData);

      const active = plansData?.find(p => p.status === "active");
      if (active) {
        const { data: workouts } = await supabase
          .from("workouts")
          .select("*")
          .eq("plan_id", active.id)
          .eq("status", "scheduled")
          .gte("scheduled_date", format(new Date(), "yyyy-MM-dd"))
          .order("scheduled_date", { ascending: true })
          .limit(5);
        setUpcomingWorkouts(workouts);
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setChatLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-pink-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Training Plan</h1>
        <Link href="/plan/generate">
          <Button className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            New Plan
          </Button>
        </Link>
      </div>

      {activePlan ? (
        <div className="space-y-6">
          {/* Active Plan Card */}
          <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 border border-pink-500/20 rounded-2xl p-6 space-y-4">
            {/* Chat Input */}
            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask your AI coach to change anything..."
                disabled={chatLoading}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 disabled:opacity-50 rounded-xl px-4 py-2.5 transition-all flex items-center justify-center"
              >
                {chatLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>

            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-pink-400 uppercase tracking-wider font-medium">Active Plan</p>
                <h2 className="text-xl font-bold mt-1">{activePlan.title}</h2>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                Active
              </span>
            </div>

            {/* Why this plan? */}
            {activePlan.generation_context?.rationale && (
              <details className="group">
                <summary className="text-sm text-pink-400 cursor-pointer hover:text-pink-300 transition-colors select-none">
                  Why this plan?
                </summary>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  {activePlan.generation_context.rationale}
                </p>
              </details>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium capitalize">{activePlan.objective}</p>
                  <p className="text-xs text-slate-400">Goal</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium">{activePlan.duration_weeks} weeks</p>
                  <p className="text-xs text-slate-400">Duration</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium">{completedCount}/{totalCount}</p>
                  <p className="text-xs text-slate-400">Completed</p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 h-2 rounded-full transition-all"
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}% complete
              </p>
            </div>

            <div className="flex gap-2">
              <Link href="/plan/calendar" className="flex-1">
                <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
                  <Calendar className="w-4 h-4 mr-2" />
                  Calendar View
                </Button>
              </Link>
            </div>
          </div>

          {/* Upcoming Workouts */}
          {upcomingWorkouts && upcomingWorkouts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Upcoming Workouts</h2>
              {upcomingWorkouts.map((workout) => (
                <Link key={workout.id} href={`/plan/${workout.id}`}>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 text-pink-400" />
                      </div>
                      <div>
                        <p className="font-medium">{workout.title}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{format(new Date(workout.scheduled_date), "EEE, MMM d")}</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {workout.duration_minutes}min
                          </span>
                          <span className="capitalize px-1.5 py-0.5 rounded bg-white/10">{workout.intensity}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center space-y-4">
          <Dumbbell className="w-16 h-16 text-slate-600 mx-auto" />
          <div>
            <h2 className="text-xl font-bold">No active plan</h2>
            <p className="text-slate-400 mt-2 max-w-md mx-auto">
              Let our AI coach create a personalized training plan tailored to your goals, fitness level, and schedule.
            </p>
          </div>
          <Link href="/plan/generate">
            <Button className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 mt-2">
              <Plus className="w-4 h-4 mr-2" />
              Generate Training Plan
            </Button>
          </Link>
        </div>
      )}

      {/* Past Plans */}
      {plans && plans.filter(p => p.status !== "active").length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Past Plans</h2>
          {plans.filter(p => p.status !== "active").map((plan) => (
            <div key={plan.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{plan.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {plan.duration_weeks} weeks — {plan.status}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                plan.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"
              }`}>
                {plan.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
