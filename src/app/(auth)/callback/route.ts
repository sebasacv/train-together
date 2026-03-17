import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Check if user was invited — auto-befriend
      const inviteCode = data.user.user_metadata?.invite_code;
      if (inviteCode) {
        try {
          // Look up the invite code to find the inviter
          const { data: invite } = await supabase
            .from("invite_codes")
            .select("user_id, uses_remaining")
            .eq("code", inviteCode)
            .gt("uses_remaining", 0)
            .single();

          if (invite && invite.user_id !== data.user.id) {
            const inviterId = invite.user_id;
            const newUserId = data.user.id;

            // Create friendship (user_a < user_b for deduplication)
            const userA = inviterId < newUserId ? inviterId : newUserId;
            const userB = inviterId < newUserId ? newUserId : inviterId;

            // Check if friendship already exists
            const { data: existing } = await supabase
              .from("friendships")
              .select("id")
              .eq("user_a", userA)
              .eq("user_b", userB)
              .single();

            if (!existing) {
              await supabase.from("friendships").insert({ user_a: userA, user_b: userB });

              // Notify the inviter
              const displayName = data.user.user_metadata?.full_name || data.user.user_metadata?.username || "Someone";
              await supabase.from("notifications").insert({
                user_id: inviterId,
                type: "friend_accepted",
                title: `${displayName} joined TrainTogether!`,
                body: "Your invite worked — you're now connected as friends.",
              });
            }

            // Decrement uses_remaining
            await supabase
              .from("invite_codes")
              .update({ uses_remaining: invite.uses_remaining - 1 })
              .eq("code", inviteCode);
          }
        } catch (e) {
          // Don't block signup if auto-befriend fails
          console.error("Auto-befriend error:", e);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
