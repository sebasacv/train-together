"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSupabase } from "@/components/providers/supabase-provider";
import Link from "next/link";
import { MessageCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function MessagesPage() {
  const { supabase, user } = useSupabase();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  async function loadConversations() {
    if (!user) return;

    // Get conversation IDs where user is a member
    const { data: memberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setLoading(false);
      return;
    }

    const convIds = memberships.map(m => m.conversation_id);

    // Get conversations with latest message
    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .in("id", convIds);

    // Get latest message and other member for each conversation
    const enriched = await Promise.all(
      (convs ?? []).map(async (conv) => {
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, sender_id, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { data: members } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conv.id)
          .neq("user_id", user.id);

        let otherName = "Unknown";
        if (members && members.length > 0) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", members[0].user_id)
            .single();
          otherName = profile?.display_name ?? "Unknown";
        }

        return {
          ...conv,
          lastMessage: lastMsg,
          otherName,
        };
      })
    );

    setConversations(enriched.sort((a, b) => {
      const aTime = a.lastMessage?.created_at ?? a.created_at;
      const bTime = b.lastMessage?.created_at ?? b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    }));
    setLoading(false);
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
        <MessageCircle className="w-6 h-6 text-indigo-400" />
        Messages
      </h1>

      {conversations.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <MessageCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400">No conversations yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Join a friend&apos;s workout to start chatting!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link key={conv.id} href={`/messages/${conv.id}`}>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition-colors flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-medium">
                  {conv.otherName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{conv.otherName}</p>
                  {conv.lastMessage && (
                    <p className="text-xs text-slate-400 truncate">{conv.lastMessage.content}</p>
                  )}
                </div>
                {conv.lastMessage && (
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
