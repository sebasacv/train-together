"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const FITNESS_LEVELS = ["beginner", "intermediate", "advanced", "elite"];
const EQUIPMENT_OPTIONS = [
  "gym", "home_dumbbells", "home_barbell", "resistance_bands",
  "pool", "road_bike", "trainer_bike", "treadmill",
  "running_shoes", "pull_up_bar", "kettlebells",
];

export default function EditProfilePage() {
  const { supabase, user } = useSupabase();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("intermediate");
  const [trainingDays, setTrainingDays] = useState(5);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState("friends");

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setDisplayName(data.display_name);
      setUsername(data.username);
      setBio(data.bio || "");
      setFitnessLevel(data.fitness_level);
      setTrainingDays(data.training_days_per_week);
      setEquipment(data.available_equipment);
      setPrivacy(data.privacy_level);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        username,
        bio: bio || null,
        fitness_level: fitnessLevel as "beginner" | "intermediate" | "advanced" | "elite",
        training_days_per_week: trainingDays,
        available_equipment: equipment,
        privacy_level: privacy as "public" | "friends" | "private",
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Profile updated!");
      router.push("/profile");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="w-4 h-4" />
        Back to Profile
      </Link>

      <h1 className="text-2xl font-bold">Edit Profile</h1>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1 block">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1 block">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-2 block">Fitness Level</label>
          <div className="grid grid-cols-4 gap-2">
            {FITNESS_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setFitnessLevel(level)}
                className={`py-2 rounded-xl border text-sm capitalize transition-colors ${
                  fitnessLevel === level
                    ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                    : "bg-white/5 border-white/10 text-slate-400"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-2 block">Training Days per Week</label>
          <div className="flex gap-2">
            {[3, 4, 5, 6, 7].map((d) => (
              <button
                key={d}
                onClick={() => setTrainingDays(d)}
                className={`flex-1 py-2 rounded-xl border text-center font-medium transition-colors ${
                  trainingDays === d
                    ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                    : "bg-white/5 border-white/10 text-slate-400"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-2 block">Available Equipment</label>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((eq) => {
              const selected = equipment.includes(eq);
              return (
                <button
                  key={eq}
                  onClick={() => {
                    if (selected) setEquipment(equipment.filter(e => e !== eq));
                    else setEquipment([...equipment, eq]);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    selected
                      ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                      : "bg-white/5 border-white/10 text-slate-400"
                  }`}
                >
                  {eq.replace(/_/g, " ")}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-2 block">Privacy</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "public", label: "Public" },
              { value: "friends", label: "Friends Only" },
              { value: "private", label: "Private" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPrivacy(opt.value)}
                className={`py-2 rounded-xl border text-sm transition-colors ${
                  privacy === opt.value
                    ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                    : "bg-white/5 border-white/10 text-slate-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Save Changes
      </Button>
    </div>
  );
}
