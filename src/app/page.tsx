"use client";

import { Button } from "@/components/ui/button";
import { Dumbbell, Users, Brain, Trophy, ArrowRight, Calendar, Zap } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0b1a] via-[#1a0d2e] to-[#0d0b1a] text-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">TrainTogether</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-slate-300 hover:text-white">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-full px-4 py-1.5 text-sm text-pink-300">
            <Zap className="w-3.5 h-3.5" />
            Powered by AI
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Train smarter,{" "}
            <span className="bg-gradient-to-r from-pink-400 via-yellow-300 to-cyan-400 bg-clip-text text-transparent">
              together
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            AI-generated training plans that adapt to you. Share your calendar,
            train with friends, and build the habits that stick.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-lg px-8 py-6">
                Start Training Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-32 max-w-6xl mx-auto">
          <FeatureCard
            icon={<Brain className="w-6 h-6" />}
            title="AI-Powered Plans"
            description="Tell us your goal — Ironman, marathon, or just getting fit. Our AI builds a complete periodized plan."
            color="indigo"
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Adaptive Training"
            description="Feeling sore? Too easy? Your plan adapts in real-time based on how you feel."
            color="amber"
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Train with Friends"
            description="Share your training calendar. Friends can join your workouts. Build accountability together."
            color="emerald"
          />
          <FeatureCard
            icon={<Trophy className="w-6 h-6" />}
            title="Compete & Level Up"
            description="Earn XP, unlock achievements, climb leaderboards. Gamification that drives real results."
            color="purple"
          />
        </div>

        {/* Social Preview */}
        <div className="mt-32 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Training is better together</h2>
            <p className="text-slate-400 text-lg">
              See what your friends are training, join their sessions, and push each other to new heights.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <span className="font-medium">Social Training Calendar</span>
            </div>
            {[
              { day: "Mon", items: [{ color: "blue", label: "Easy Run 45min", you: true }, { color: "green", label: "Sarah: Yoga", joinable: true }] },
              { day: "Tue", items: [{ color: "orange", label: "Intervals 60min", you: true }] },
              { day: "Wed", items: [{ color: "purple", label: "Strength", you: true }, { color: "blue", label: "Mike: Pool Swim", joinable: true }] },
              { day: "Thu", items: [{ color: "blue", label: "Tempo Run 50min", you: true }] },
              { day: "Fri", items: [] },
              { day: "Sat", items: [{ color: "red", label: "Long Run 90min", you: true }, { color: "green", label: "Alex: Group Ride", joinable: true, count: 3 }] },
              { day: "Sun", items: [{ color: "teal", label: "Recovery Swim", you: true }] },
            ].map(({ day, items }) => (
              <div key={day} className="flex items-center gap-4">
                <span className="w-10 text-sm text-slate-400">{day}</span>
                <div className="flex-1 flex gap-2 flex-wrap">
                  {items.length === 0 ? (
                    <span className="text-sm text-slate-500 italic">Rest day</span>
                  ) : (
                    items.map((item, i) => (
                      <WorkoutPill key={i} {...item} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          TrainTogether — Built with AI, designed for community.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    indigo: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    amber: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    emerald: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    purple: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  };

  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 space-y-4 hover:bg-white/[0.07] transition-colors">
      <div className={`inline-flex p-2.5 rounded-xl border ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function WorkoutPill({
  color,
  label,
  you,
  joinable,
  count,
}: {
  color: string;
  label: string;
  you?: boolean;
  joinable?: boolean;
  count?: number;
}) {
  const bgColors: Record<string, string> = {
    blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    orange: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    red: "bg-red-500/20 text-red-300 border-red-500/30",
    green: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    teal: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs ${bgColors[color]}`}>
      <span>{label}</span>
      {you && <span className="text-[10px] opacity-60">(you)</span>}
      {joinable && (
        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">
          Join{count ? ` +${count}` : ""}
        </span>
      )}
    </div>
  );
}
