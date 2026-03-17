-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_thresholds ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Training plans
CREATE POLICY "Users manage own plans" ON public.training_plans FOR ALL USING (auth.uid() = user_id);

-- Plan weeks
CREATE POLICY "Users view own plan weeks" ON public.plan_weeks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.training_plans WHERE id = plan_weeks.plan_id AND user_id = auth.uid()));
CREATE POLICY "Users manage own plan weeks" ON public.plan_weeks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.training_plans WHERE id = plan_weeks.plan_id AND user_id = auth.uid()));

-- Workouts
CREATE POLICY "Users manage own workouts" ON public.workouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Friends view workouts" ON public.workouts FOR SELECT
  USING (visibility IN ('public', 'friends') AND public.are_friends(auth.uid(), user_id));
CREATE POLICY "Public workouts viewable" ON public.workouts FOR SELECT USING (visibility = 'public');

-- Workout logs
CREATE POLICY "Users manage own logs" ON public.workout_logs FOR ALL USING (auth.uid() = user_id);

-- User feedback
CREATE POLICY "Users manage own feedback" ON public.user_feedback FOR ALL USING (auth.uid() = user_id);

-- Friendships
CREATE POLICY "View own friendships" ON public.friendships FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Delete own friendships" ON public.friendships FOR DELETE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Friend requests
CREATE POLICY "View own friend requests" ON public.friend_requests FOR SELECT
  USING (auth.uid() = from_user OR auth.uid() = to_user);
CREATE POLICY "Send friend requests" ON public.friend_requests FOR INSERT
  WITH CHECK (auth.uid() = from_user);
CREATE POLICY "Respond to friend requests" ON public.friend_requests FOR UPDATE
  USING (auth.uid() = to_user);

-- Invite codes
CREATE POLICY "Users manage own invite codes" ON public.invite_codes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read valid invite codes" ON public.invite_codes FOR SELECT USING (true);

-- Workout participants
CREATE POLICY "View workout participants" ON public.workout_participants FOR SELECT USING (true);
CREATE POLICY "Join workouts" ON public.workout_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own participation" ON public.workout_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Leave workouts" ON public.workout_participants FOR DELETE USING (auth.uid() = user_id);

-- Achievements (read-only for users)
CREATE POLICY "Achievements viewable by everyone" ON public.achievements FOR SELECT USING (true);

-- User achievements
CREATE POLICY "View own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Friends view achievements" ON public.user_achievements FOR SELECT
  USING (public.are_friends(auth.uid(), user_id));

-- XP transactions
CREATE POLICY "View own XP" ON public.xp_transactions FOR SELECT USING (auth.uid() = user_id);

-- Challenges
CREATE POLICY "Challenges viewable by everyone" ON public.challenges FOR SELECT USING (true);

-- Challenge participants
CREATE POLICY "View own challenge progress" ON public.challenge_participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Join challenges" ON public.challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own challenge progress" ON public.challenge_participants FOR UPDATE USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- Conversations
CREATE POLICY "Members view conversations" ON public.conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = id AND user_id = auth.uid()));

-- Conversation members
CREATE POLICY "View conversation members" ON public.conversation_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = conversation_members.conversation_id AND cm.user_id = auth.uid()));

-- Messages
CREATE POLICY "Members read messages" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "Members send messages" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));

-- Activity feed
CREATE POLICY "View own activity" ON public.activity_feed FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Friends view activity" ON public.activity_feed FOR SELECT
  USING (visibility IN ('public', 'friends') AND public.are_friends(auth.uid(), user_id));
CREATE POLICY "Public activity viewable" ON public.activity_feed FOR SELECT USING (visibility = 'public');

-- Level thresholds (public read)
CREATE POLICY "Level thresholds viewable" ON public.level_thresholds FOR SELECT USING (true);
