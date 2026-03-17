"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  Check,
  X,
  Copy,
  Search,
  Users,
  Link2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface FriendProfile {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  current_level: number;
  current_streak: number;
}

export default function FriendsPage() {
  const { supabase, user } = useSupabase();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingReceived, setPendingReceived] = useState<any[]>([]);
  const [pendingSent, setPendingSent] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [suggestedPeople, setSuggestedPeople] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingFriend, setAddingFriend] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    setLoading(true);

    // Get friendships
    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_a, user_b")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

    const friendIds = (friendships ?? []).map(f =>
      f.user_a === user.id ? f.user_b : f.user_a
    );

    if (friendIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, current_level, current_streak")
        .in("id", friendIds);
      setFriends((profiles ?? []) as FriendProfile[]);
    }

    // Get pending requests received
    const { data: received } = await supabase
      .from("friend_requests")
      .select("*, profiles!friend_requests_from_user_fkey(id, display_name, username, avatar_url, current_level)")
      .eq("to_user", user.id)
      .eq("status", "pending");
    setPendingReceived(received ?? []);

    // Get pending requests sent
    const { data: sent } = await supabase
      .from("friend_requests")
      .select("*, profiles!friend_requests_to_user_fkey(id, display_name, username, avatar_url)")
      .eq("from_user", user.id)
      .eq("status", "pending");
    setPendingSent(sent ?? []);

    // Get or create invite code
    const { data: codes } = await supabase
      .from("invite_codes")
      .select("code")
      .eq("user_id", user.id)
      .gt("uses_remaining", 0)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (codes && codes.length > 0) {
      setInviteCode(codes[0].code);
    } else {
      const { data: newCode } = await supabase
        .from("invite_codes")
        .insert({ user_id: user.id })
        .select("code")
        .single();
      if (newCode) setInviteCode(newCode.code);
    }

    // Fetch suggested people (not already friends or in pending requests)
    const excludeIds = [
      user.id,
      ...friendIds,
      ...(received ?? []).map((r: any) => r.from_user),
      ...(sent ?? []).map((r: any) => r.to_user),
    ];

    const { data: suggested } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, current_level, current_streak")
      .not("id", "in", `(${excludeIds.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(5);

    setSuggestedPeople((suggested ?? []) as FriendProfile[]);

    setLoading(false);
  }

  async function searchUsers() {
    if (!searchQuery.trim() || !user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, current_level, current_streak")
      .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .neq("id", user.id)
      .limit(10);
    setSearchResults((data ?? []) as FriendProfile[]);
  }

  async function sendFriendRequest(toUserId: string) {
    if (!user) return;
    setAddingFriend(toUserId);
    const { error } = await supabase
      .from("friend_requests")
      .insert({ from_user: user.id, to_user: toUserId });
    if (error) {
      toast.error("Could not send request");
    } else {
      // Get current user's display name for the notification
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      const myName = myProfile?.display_name || "Someone";

      // Create notification for the recipient
      await supabase.from("notifications").insert({
        user_id: toUserId,
        type: "friend_request",
        title: `${myName} wants to train with you!`,
        body: "Accept their request to start training together",
      });

      toast.success("Friend request sent!");
      loadData();
    }
    setAddingFriend(null);
  }

  async function respondToRequest(requestId: string, accept: boolean) {
    if (!user) return;
    if (accept) {
      const request = pendingReceived.find(r => r.id === requestId);
      if (request) {
        const userA = request.from_user < user.id ? request.from_user : user.id;
        const userB = request.from_user < user.id ? user.id : request.from_user;
        await supabase.from("friendships").insert({ user_a: userA, user_b: userB });
      }
    }
    await supabase
      .from("friend_requests")
      .update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
      .eq("id", requestId);
    toast.success(accept ? "Friend added!" : "Request declined");
    loadData();
  }

  function copyInviteLink() {
    const link = `${window.location.origin}/signup?invite=${inviteCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied!");
  }

  const isFriend = (id: string) => friends.some(f => f.id === id);
  const hasSentRequest = (id: string) => pendingSent.some(r => (r.profiles as any)?.id === id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Friends</h1>

      {/* Invite Link */}
      <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-pink-400" />
          <h3 className="font-medium text-sm">Invite Friends</h3>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-400 truncate">
            {typeof window !== "undefined" ? `${window.location.origin}/signup?invite=${inviteCode}` : `...?invite=${inviteCode}`}
          </div>
          <Button size="sm" onClick={copyInviteLink} className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600">
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by username or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchUsers()}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <Button onClick={searchUsers} className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600">
            Search
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((profile) => (
              <div key={profile.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-medium">
                    {profile.display_name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{profile.display_name}</p>
                    <p className="text-xs text-slate-400">@{profile.username} · Lv.{profile.current_level}</p>
                  </div>
                </div>
                {isFriend(profile.id) ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Friends
                  </span>
                ) : hasSentRequest(profile.id) ? (
                  <span className="text-xs text-slate-400">Pending</span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => sendFriendRequest(profile.id)}
                    disabled={addingFriend === profile.id}
                    className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 h-8 text-xs"
                  >
                    {addingFriend === profile.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3 mr-1" />}
                    Add
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Requests */}
      {pendingReceived.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Friend Requests</h2>
          {pendingReceived.map((req) => {
            const profile = req.profiles as any;
            return (
              <div key={req.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-medium">
                    {profile?.display_name?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{profile?.display_name}</p>
                    <p className="text-xs text-slate-400">@{profile?.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => respondToRequest(req.id, true)}
                    className="bg-emerald-600 hover:bg-emerald-700 h-8"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respondToRequest(req.id, false)}
                    className="border-white/10 h-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Suggested People */}
      {suggestedPeople.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Suggested People</h2>
          <div className="space-y-2">
            {suggestedPeople.map((profile) => (
              <div key={profile.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-medium">
                    {profile.display_name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{profile.display_name}</p>
                    <p className="text-xs text-slate-400">@{profile.username} · Lv.{profile.current_level}</p>
                  </div>
                </div>
                {isFriend(profile.id) ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Friends
                  </span>
                ) : hasSentRequest(profile.id) ? (
                  <span className="text-xs text-slate-400">Pending</span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => sendFriendRequest(profile.id)}
                    disabled={addingFriend === profile.id}
                    className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 h-8 text-xs"
                  >
                    {addingFriend === profile.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3 mr-1" />}
                    Add
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friend List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Your Friends ({friends.length})</h2>
        {friends.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-400">No friends yet. Search or share your invite link!</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {friends.map((friend) => (
              <div key={friend.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/[0.07] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-medium">
                    {friend.display_name[0]}
                  </div>
                  <div>
                    <p className="font-medium">{friend.display_name}</p>
                    <p className="text-xs text-slate-400">@{friend.username} · Lv.{friend.current_level}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {friend.current_streak > 0 && (
                    <span className="flex items-center gap-0.5 text-orange-400">
                      🔥 {friend.current_streak}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
