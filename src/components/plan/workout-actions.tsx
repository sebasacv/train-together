"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  SkipForward,
  MessageCircle,
  Brain,
  Loader2,
  X,
  ThumbsUp,
  ThumbsDown,
  Frown,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";

const FEEDBACK_OPTIONS = [
  { type: "felt_great", label: "Felt great!", icon: ThumbsUp, color: "text-emerald-400" },
  { type: "too_easy", label: "Too easy", icon: ThumbsUp, color: "text-blue-400" },
  { type: "too_hard", label: "Too hard", icon: ThumbsDown, color: "text-orange-400" },
  { type: "felt_terrible", label: "Felt terrible", icon: Frown, color: "text-red-400" },
  { type: "injury", label: "Injury/Pain", icon: AlertTriangle, color: "text-red-400" },
  { type: "fatigue", label: "Too fatigued", icon: Frown, color: "text-amber-400" },
];

const MOOD_OPTIONS = [
  { value: "great", emoji: "😄", label: "Great" },
  { value: "good", emoji: "🙂", label: "Good" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "tired", emoji: "😴", label: "Tired" },
  { value: "terrible", emoji: "😩", label: "Terrible" },
];

export function WorkoutActions({ workoutId, planId }: { workoutId: string; planId: string }) {
  const router = useRouter();
  const { user } = useSupabase();
  const supabase = createClient();
  const [showLog, setShowLog] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adapting, setAdapting] = useState(false);

  // Log form state
  const [rpe, setRpe] = useState(5);
  const [mood, setMood] = useState("good");
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState("");

  // Feedback state
  const [feedbackType, setFeedbackType] = useState("");
  const [feedbackDetails, setFeedbackDetails] = useState("");

  async function handleComplete() {
    if (!user) return;
    setLoading(true);

    // Create workout log
    await supabase.from("workout_logs").insert({
      workout_id: workoutId,
      user_id: user.id,
      actual_duration_minutes: duration ? parseInt(duration) : null,
      rpe,
      mood: mood as any,
      notes: notes || null,
    });

    // Update workout status
    await supabase
      .from("workouts")
      .update({ status: "completed" })
      .eq("id", workoutId);

    // Update streak
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_streak, longest_streak, xp_total")
      .eq("id", user.id)
      .single();

    if (profile) {
      const newStreak = profile.current_streak + 1;
      const newLongest = Math.max(newStreak, profile.longest_streak);
      const xpAmount = 50; // Base workout XP

      await supabase
        .from("profiles")
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_workout_date: new Date().toISOString().split("T")[0],
          xp_total: profile.xp_total + xpAmount,
        })
        .eq("id", user.id);

      await supabase.from("xp_transactions").insert({
        user_id: user.id,
        amount: xpAmount,
        reason: "workout_completed",
        reference_id: workoutId,
      });
    }

    // Activity feed
    await supabase.from("activity_feed").insert({
      user_id: user.id,
      activity_type: "workout_completed",
      title: "Completed a workout",
      description: `RPE: ${rpe}/10 · Mood: ${mood}`,
      visibility: "friends",
    });

    toast.success("Workout completed! +50 XP — updating your plan...");
    setLoading(false);

    // Auto-adapt plan based on workout data
    try {
      const adaptRes = await fetch("/api/plan/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const adaptData = await adaptRes.json();
      if (adaptRes.ok && adaptData.coach_note) {
        toast.success(adaptData.coach_note, { duration: 6000 });
      }
    } catch {}

    router.refresh();
  }

  async function handleSkip() {
    if (!user) return;
    await supabase
      .from("workouts")
      .update({ status: "skipped" })
      .eq("id", workoutId);
    toast.info("Workout skipped");
    router.refresh();
  }

  async function submitFeedback() {
    if (!user || !feedbackType) return;
    setLoading(true);

    await supabase.from("user_feedback").insert({
      user_id: user.id,
      plan_id: planId,
      workout_id: workoutId,
      feedback_type: feedbackType,
      details: feedbackDetails || null,
    });

    toast.success("Feedback recorded — updating your plan...");
    setShowFeedback(false);
    setFeedbackType("");
    setFeedbackDetails("");

    // Auto-adapt plan based on feedback
    try {
      const adaptRes = await fetch("/api/plan/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const adaptData = await adaptRes.json();
      if (adaptRes.ok && adaptData.coach_note) {
        toast.success(adaptData.coach_note, { duration: 6000 });
      }
    } catch {}

    setLoading(false);
    router.refresh();
  }

  async function handleAdaptPlan() {
    setAdapting(true);
    try {
      const res = await fetch("/api/plan/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.coach_note || "Plan adapted!");
      } else {
        toast.error(data.error || "Failed to adapt plan");
      }
    } catch {
      toast.error("Failed to adapt plan");
    }
    setAdapting(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* "How did it go?" — primary action within this component */}
      {!showLog ? (
        <div className="space-y-2">
          <button
            onClick={() => setShowLog(true)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            <ClipboardCheck className="w-5 h-5" />
            Tell me how you did so I update your next activities
          </button>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowLog(true)}
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-sm"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Complete
            </Button>
            <Button
              onClick={handleSkip}
              variant="outline"
              size="sm"
              className="border-white/10 text-sm"
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Skip
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Log Workout</h3>
            <button onClick={() => setShowLog(false)}>
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Actual duration (min)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g., 45"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* RPE */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Rate of Perceived Exertion: {rpe}/10
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={rpe}
              onChange={(e) => setRpe(Number(e.target.value))}
              className="w-full accent-pink-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Easy</span>
              <span>Moderate</span>
              <span>Maximum</span>
            </div>
          </div>

          {/* Mood */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">How do you feel?</label>
            <div className="flex gap-2">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  className={`flex-1 py-2 rounded-lg border text-center transition-colors ${
                    mood === m.value
                      ? "bg-pink-500/20 border-pink-500/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <span className="text-lg">{m.emoji}</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">{m.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it go?"
              rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
            />
          </div>

          <Button
            onClick={handleComplete}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Save & Complete
          </Button>
        </div>
      )}

      {/* Feedback & Adapt */}
      <div className="flex gap-2">
        <Button
          onClick={() => setShowFeedback(!showFeedback)}
          variant="outline"
          size="sm"
          className="flex-1 border-white/10 text-sm"
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          Give Feedback
        </Button>
        <Button
          onClick={handleAdaptPlan}
          disabled={adapting}
          variant="outline"
          size="sm"
          className="flex-1 border-white/10 text-sm"
        >
          {adapting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Brain className="w-4 h-4 mr-1" />}
          Adapt Plan
        </Button>
      </div>

      {/* Feedback Form */}
      {showFeedback && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <h3 className="font-medium text-sm">How was this workout?</h3>
          <div className="grid grid-cols-3 gap-2">
            {FEEDBACK_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => setFeedbackType(opt.type)}
                className={`p-2 rounded-lg border text-center transition-colors ${
                  feedbackType === opt.type
                    ? "bg-pink-500/20 border-pink-500/30"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <opt.icon className={`w-4 h-4 mx-auto ${opt.color}`} />
                <p className="text-[10px] mt-1 text-slate-400">{opt.label}</p>
              </button>
            ))}
          </div>
          <textarea
            value={feedbackDetails}
            onChange={(e) => setFeedbackDetails(e.target.value)}
            placeholder="Any details? (optional)"
            rows={2}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
          />
          <Button
            onClick={submitFeedback}
            disabled={!feedbackType || loading}
            className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600"
            size="sm"
          >
            Submit Feedback
          </Button>
        </div>
      )}
    </div>
  );
}
