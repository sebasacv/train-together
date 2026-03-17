"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import {
  Bell,
  UserPlus,
  Users,
  Dumbbell,
  Award,
  Flame,
  MessageCircle,
  Trophy,
  Brain,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  friend_request: <UserPlus className="w-4 h-4 text-blue-400" />,
  friend_accepted: <Users className="w-4 h-4 text-emerald-400" />,
  workout_join_request: <Users className="w-4 h-4 text-indigo-400" />,
  workout_join_confirmed: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  workout_reminder: <Dumbbell className="w-4 h-4 text-indigo-400" />,
  friend_completed_workout: <Dumbbell className="w-4 h-4 text-emerald-400" />,
  achievement_unlocked: <Award className="w-4 h-4 text-amber-400" />,
  streak_at_risk: <Flame className="w-4 h-4 text-orange-400" />,
  plan_adapted: <Brain className="w-4 h-4 text-purple-400" />,
  leaderboard_change: <Trophy className="w-4 h-4 text-amber-400" />,
  message_received: <MessageCircle className="w-4 h-4 text-blue-400" />,
};

export default function NotificationsPage() {
  const { supabase, user } = useSupabase();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadNotifications();
  }, [user]);

  async function loadNotifications() {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications(data ?? []);
    setLoading(false);

    // Mark all as read
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bell className="w-6 h-6 text-indigo-400" />
        Notifications
      </h1>

      {notifications.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <Bell className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-xl border p-4 flex items-start gap-3 ${
                notification.read
                  ? "bg-white/5 border-white/10"
                  : "bg-indigo-500/5 border-indigo-500/20"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                {NOTIFICATION_ICONS[notification.type] || <Bell className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{notification.title}</p>
                {notification.body && (
                  <p className="text-xs text-slate-400 mt-0.5">{notification.body}</p>
                )}
                <p className="text-[10px] text-slate-500 mt-1">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
              {!notification.read && (
                <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
