"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Target,
  Calendar,
  Gauge,
  Wrench,
  Dumbbell,
  Brain,
  CheckCircle2,
} from "lucide-react";
import { format, addWeeks } from "date-fns";

const OBJECTIVES = [
  { value: "ironman", label: "Ironman", description: "Full distance triathlon (3.8km swim, 180km bike, 42.2km run)", icon: "🏊" },
  { value: "ironman_70.3", label: "Ironman 70.3", description: "Half distance triathlon", icon: "🏊" },
  { value: "marathon", label: "Marathon", description: "42.2km / 26.2 miles", icon: "🏃" },
  { value: "half_marathon", label: "Half Marathon", description: "21.1km / 13.1 miles", icon: "🏃" },
  { value: "10k", label: "10K Race", description: "10km running race", icon: "🏃" },
  { value: "5k", label: "5K Race", description: "5km running race", icon: "🏃" },
  { value: "century_ride", label: "Century Ride", description: "100-mile cycling event", icon: "🚴" },
  { value: "general_fitness", label: "General Fitness", description: "Overall health and fitness improvement", icon: "💪" },
  { value: "weight_loss", label: "Weight Loss", description: "Fat loss with strength preservation", icon: "⚖️" },
  { value: "muscle_building", label: "Muscle Building", description: "Hypertrophy and strength gains", icon: "🏋️" },
  { value: "custom", label: "Custom Goal", description: "Define your own training objective", icon: "🎯" },
];

const FITNESS_LEVELS = [
  { value: "beginner", label: "Beginner", description: "New to structured training or returning after a long break" },
  { value: "intermediate", label: "Intermediate", description: "Consistent training for 6+ months, comfortable with most exercises" },
  { value: "advanced", label: "Advanced", description: "2+ years of structured training, strong fitness base" },
  { value: "elite", label: "Elite", description: "Competitive athlete with extensive training history" },
];

const EQUIPMENT_OPTIONS = [
  { value: "gym", label: "Full Gym" },
  { value: "home_dumbbells", label: "Dumbbells" },
  { value: "home_barbell", label: "Barbell + Rack" },
  { value: "resistance_bands", label: "Resistance Bands" },
  { value: "pool", label: "Swimming Pool" },
  { value: "road_bike", label: "Road Bike" },
  { value: "trainer_bike", label: "Indoor Trainer" },
  { value: "treadmill", label: "Treadmill" },
  { value: "running_shoes", label: "Running Shoes (Outdoors)" },
  { value: "pull_up_bar", label: "Pull-up Bar" },
  { value: "kettlebells", label: "Kettlebells" },
  { value: "none", label: "Bodyweight Only" },
];

type WizardStep = "objective" | "timeline" | "fitness" | "equipment" | "preferences" | "generating";

export default function GeneratePlanPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("objective");
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [objective, setObjective] = useState("");
  const [customObjective, setCustomObjective] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [targetDate, setTargetDate] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("intermediate");
  const [trainingDays, setTrainingDays] = useState(5);
  const [equipment, setEquipment] = useState<string[]>(["running_shoes"]);
  const [currentVolume, setCurrentVolume] = useState("");
  const [injuries, setInjuries] = useState("");
  const [preferences, setPreferences] = useState("");

  const steps: WizardStep[] = ["objective", "timeline", "fitness", "equipment", "preferences"];
  const currentStepIndex = steps.indexOf(step);

  async function handleGenerate() {
    setStep("generating");
    setError(null);

    try {
      const response = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective: objective === "custom" ? customObjective : objective,
          durationWeeks,
          targetDate: targetDate || undefined,
          fitnessLevel,
          trainingDaysPerWeek: trainingDays,
          availableEquipment: equipment,
          currentWeeklyVolume: currentVolume || undefined,
          injuryHistory: injuries || undefined,
          preferences: preferences || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate plan");
      }

      const { planId } = await response.json();
      router.push(`/plan`);
    } catch (err: any) {
      setError(err.message);
      setStep("preferences");
    }
  }

  if (step === "generating") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-pink-500/20 flex items-center justify-center">
            <Brain className="w-10 h-10 text-pink-400 animate-pulse" />
          </div>
          <Loader2 className="w-24 h-24 text-pink-500 animate-spin absolute -top-2 -left-2" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Building your training plan...</h2>
          <p className="text-slate-400">Our AI coach is designing a personalized program just for you.</p>
          <p className="text-sm text-slate-500">This may take 15-30 seconds.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Generate Training Plan</h1>
        <p className="text-slate-400 mt-1">Let AI build your perfect plan</p>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              i <= currentStepIndex ? "bg-pink-500" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* Step Content */}
      {step === "objective" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-pink-400" />
            What&apos;s your training goal?
          </h2>
          <div className="grid gap-3">
            {OBJECTIVES.map((obj) => (
              <button
                key={obj.value}
                onClick={() => setObjective(obj.value)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  objective === obj.value
                    ? "bg-pink-500/10 border-pink-500/30 text-white"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/[0.07]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{obj.icon}</span>
                  <div>
                    <p className="font-medium">{obj.label}</p>
                    <p className="text-sm text-slate-400">{obj.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {objective === "custom" && (
            <input
              type="text"
              placeholder="Describe your goal..."
              value={customObjective}
              onChange={(e) => setCustomObjective(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          )}
        </div>
      )}

      {step === "timeline" && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-400" />
            Plan Timeline
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Duration (weeks)</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={4}
                  max={52}
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(Number(e.target.value))}
                  className="flex-1 accent-pink-500"
                />
                <span className="text-xl font-bold w-16 text-right">{durationWeeks}w</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Plan ends: {format(addWeeks(new Date(), durationWeeks), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Target event date (optional)</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Training days per week</label>
              <div className="flex gap-2">
                {[3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    onClick={() => setTrainingDays(d)}
                    className={`flex-1 py-3 rounded-xl border text-center font-medium transition-colors ${
                      trainingDays === d
                        ? "bg-pink-500/20 border-pink-500/30 text-pink-300"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/[0.07]"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "fitness" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Gauge className="w-5 h-5 text-pink-400" />
            Current Fitness Level
          </h2>
          <div className="grid gap-3">
            {FITNESS_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setFitnessLevel(level.value)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  fitnessLevel === level.value
                    ? "bg-pink-500/10 border-pink-500/30"
                    : "bg-white/5 border-white/10 hover:bg-white/[0.07]"
                }`}
              >
                <p className="font-medium">{level.label}</p>
                <p className="text-sm text-slate-400">{level.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "equipment" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="w-5 h-5 text-pink-400" />
            Available Equipment
          </h2>
          <p className="text-sm text-slate-400">Select all that apply</p>
          <div className="grid grid-cols-2 gap-3">
            {EQUIPMENT_OPTIONS.map((eq) => {
              const selected = equipment.includes(eq.value);
              return (
                <button
                  key={eq.value}
                  onClick={() => {
                    if (selected) {
                      setEquipment(equipment.filter(e => e !== eq.value));
                    } else {
                      setEquipment([...equipment, eq.value]);
                    }
                  }}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    selected
                      ? "bg-pink-500/10 border-pink-500/30"
                      : "bg-white/5 border-white/10 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selected && <CheckCircle2 className="w-4 h-4 text-pink-400" />}
                    <span className="text-sm font-medium">{eq.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === "preferences" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-pink-400" />
            Additional Info (optional)
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Current weekly training volume</label>
              <input
                type="text"
                placeholder="e.g., 5 hours/week, 30km running/week"
                value={currentVolume}
                onChange={(e) => setCurrentVolume(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Injury history or limitations</label>
              <textarea
                placeholder="e.g., Past knee surgery in 2024, avoid heavy squats"
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Training preferences</label>
              <textarea
                placeholder="e.g., Prefer morning sessions, enjoy outdoor running, want to include yoga"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
              />
            </div>
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        {currentStepIndex > 0 ? (
          <Button
            variant="ghost"
            onClick={() => setStep(steps[currentStepIndex - 1])}
            className="text-slate-400"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        ) : (
          <div />
        )}

        {currentStepIndex < steps.length - 1 ? (
          <Button
            onClick={() => setStep(steps[currentStepIndex + 1])}
            disabled={step === "objective" && !objective}
            className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleGenerate}
            className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600"
          >
            <Brain className="w-4 h-4 mr-2" />
            Generate Plan
          </Button>
        )}
      </div>
    </div>
  );
}
