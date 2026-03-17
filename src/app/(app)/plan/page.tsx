import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dumbbell, Calendar, Clock, Target, Plus, ArrowRight, CheckCircle2 } from "lucide-react";
import { format, differenceInWeeks } from "date-fns";

export default async function PlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: plans } = await supabase
    .from("training_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const activePlan = plans?.find(p => p.status === "active");

  // Get upcoming workouts for active plan
  let upcomingWorkouts = null;
  if (activePlan) {
    const { data } = await supabase
      .from("workouts")
      .select("*")
      .eq("plan_id", activePlan.id)
      .eq("status", "scheduled")
      .gte("scheduled_date", format(new Date(), "yyyy-MM-dd"))
      .order("scheduled_date", { ascending: true })
      .limit(5);
    upcomingWorkouts = data;
  }

  // Get completion stats for active plan
  let completedCount = 0;
  let totalCount = 0;
  if (activePlan) {
    const { count: completed } = await supabase
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .eq("plan_id", activePlan.id)
      .eq("status", "completed");
    const { count: total } = await supabase
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .eq("plan_id", activePlan.id);
    completedCount = completed ?? 0;
    totalCount = total ?? 0;
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
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-pink-400 uppercase tracking-wider font-medium">Active Plan</p>
                <h2 className="text-xl font-bold mt-1">{activePlan.title}</h2>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                Active
              </span>
            </div>

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
