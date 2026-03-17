import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format, addDays } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = format(new Date(), "yyyy-MM-dd");
    const threeDaysOut = format(addDays(new Date(), 3), "yyyy-MM-dd");

    // Get user's upcoming workouts
    const { data: myWorkouts } = await supabase
      .from("workouts")
      .select("id, workout_type, scheduled_date")
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .gte("scheduled_date", today)
      .lte("scheduled_date", threeDaysOut);

    if (!myWorkouts || myWorkouts.length === 0) {
      return NextResponse.json({ matched: 0 });
    }

    // Get friend IDs
    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_a, user_b")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

    const friendIds = (friendships ?? []).map((f: any) =>
      f.user_a === user.id ? f.user_b : f.user_a
    );

    if (friendIds.length === 0) {
      return NextResponse.json({ matched: 0 });
    }

    // Get friends' upcoming open workouts
    const { data: friendWorkouts } = await supabase
      .from("workouts")
      .select("id, workout_type, scheduled_date, user_id, is_open_for_joining")
      .in("user_id", friendIds)
      .eq("status", "scheduled")
      .gte("scheduled_date", today)
      .lte("scheduled_date", threeDaysOut);

    if (!friendWorkouts || friendWorkouts.length === 0) {
      return NextResponse.json({ matched: 0 });
    }

    // Get friend profiles for names
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", friendIds);

    const nameMap = new Map((profiles ?? []).map(p => [p.id, p.display_name]));

    // Match by workout_type on same day
    let matched = 0;
    const workoutTypeLabels: Record<string, string> = {
      run: "running", swim: "swimming", bike: "cycling", strength: "doing strength training",
      yoga: "doing yoga", cross_train: "cross-training", brick: "doing a brick workout",
    };

    for (const mine of myWorkouts) {
      for (const theirs of friendWorkouts) {
        if (mine.workout_type === theirs.workout_type && mine.scheduled_date === theirs.scheduled_date) {
          const friendName = nameMap.get(theirs.user_id) || "A friend";
          const activity = workoutTypeLabels[theirs.workout_type] || "training";

          // Check if we already sent this notification
          const notifKey = `match_${mine.id}_${theirs.id}`;
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", user.id)
            .eq("type", "friend_matching_workout")
            .like("body", `%${notifKey}%`)
            .limit(1);

          if (!existing || existing.length === 0) {
            await supabase.from("notifications").insert({
              user_id: user.id,
              type: "friend_matching_workout",
              title: `${friendName} is ${activity} today`,
              body: `Join them to meet this week's ${mine.workout_type} goal and catch up! [${notifKey}]`,
            });
            matched++;
          }
        }
      }
    }

    return NextResponse.json({ matched });
  } catch (error) {
    console.error("Match workouts error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
