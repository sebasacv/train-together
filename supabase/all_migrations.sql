
-- ============================================
-- 001_users_profiles.sql
-- ============================================
-- Profiles table extending Supabase auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  fitness_level TEXT DEFAULT 'beginner' CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
  date_of_birth DATE,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  preferred_units TEXT DEFAULT 'metric' CHECK (preferred_units IN ('metric', 'imperial')),
  available_equipment TEXT[] DEFAULT '{}',
  training_days_per_week INT DEFAULT 5,
  privacy_level TEXT DEFAULT 'friends' CHECK (privacy_level IN ('public', 'friends', 'private')),
  xp_total INT DEFAULT 0,
  current_level INT DEFAULT 1,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_workout_date DATE,
  push_subscription JSONB,
  notification_preferences JSONB DEFAULT '{"push": true, "email": true, "in_app": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================
-- 002_training_plans.sql
-- ============================================
CREATE TABLE public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  target_date DATE,
  duration_weeks INT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  generation_context JSONB,
  claude_conversation_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER training_plans_updated_at
  BEFORE UPDATE ON public.training_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.plan_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  theme TEXT,
  notes TEXT,
  total_volume_minutes INT,
  is_current BOOLEAN DEFAULT FALSE,
  UNIQUE(plan_id, week_number)
);

CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_week_id UUID NOT NULL REFERENCES public.plan_weeks(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  workout_type TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  day_of_week INT,
  duration_minutes INT,
  intensity TEXT CHECK (intensity IN ('recovery', 'easy', 'moderate', 'hard', 'max')),
  is_key_workout BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'skipped', 'adapted')),
  location TEXT,
  is_open_for_joining BOOLEAN DEFAULT FALSE,
  visibility TEXT DEFAULT 'friends' CHECK (visibility IN ('public', 'friends', 'private')),
  exercises JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER workouts_updated_at
  BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_workouts_user_date ON public.workouts(user_id, scheduled_date);
CREATE INDEX idx_workouts_plan ON public.workouts(plan_id);
CREATE INDEX idx_workouts_open_joining ON public.workouts(is_open_for_joining, scheduled_date) WHERE is_open_for_joining = TRUE;


-- ============================================
-- 003_workout_logging.sql
-- ============================================
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  actual_duration_minutes INT,
  rpe INT CHECK (rpe >= 1 AND rpe <= 10),
  mood TEXT CHECK (mood IN ('great', 'good', 'neutral', 'tired', 'terrible')),
  notes TEXT,
  exercise_results JSONB DEFAULT '[]',
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workout_logs_user ON public.workout_logs(user_id, completed_at DESC);
CREATE INDEX idx_workout_logs_workout ON public.workout_logs(workout_id);

CREATE TABLE public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.training_plans(id) ON DELETE SET NULL,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'too_easy', 'too_hard', 'felt_great', 'felt_terrible',
    'injury', 'illness', 'travel', 'fatigue', 'time_constraint',
    'missed_workout_reason', 'general'
  )),
  details TEXT,
  severity INT DEFAULT 1 CHECK (severity >= 1 AND severity <= 5),
  body_parts_affected TEXT[] DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_unprocessed ON public.user_feedback(user_id, plan_id) WHERE processed = FALSE;


-- ============================================
-- 004_social_graph.sql
-- ============================================
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a, user_b),
  CHECK (user_a < user_b)
);

CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(from_user, to_user)
);

CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  uses_remaining INT DEFAULT 10,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_friendships_user_a ON public.friendships(user_a);
CREATE INDEX idx_friendships_user_b ON public.friendships(user_b);
CREATE INDEX idx_friend_requests_to ON public.friend_requests(to_user, status);

CREATE FUNCTION public.are_friends(uid1 UUID, uid2 UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE user_a = LEAST(uid1, uid2) AND user_b = GREATEST(uid1, uid2)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ============================================
-- 005_social_workouts.sql
-- ============================================
CREATE TABLE public.workout_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'interested' CHECK (status IN ('interested', 'confirmed', 'declined', 'attended')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workout_id, user_id)
);

CREATE INDEX idx_participants_workout ON public.workout_participants(workout_id);
CREATE INDEX idx_participants_user ON public.workout_participants(user_id, status);


-- ============================================
-- 006_gamification.sql
-- ============================================
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  category TEXT NOT NULL,
  requirement JSONB NOT NULL,
  xp_reward INT DEFAULT 0,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary'))
);

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_xp_user_date ON public.xp_transactions(user_id, created_at DESC);

CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  requirement JSONB NOT NULL,
  xp_reward INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  progress JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(challenge_id, user_id)
);

CREATE TABLE public.level_thresholds (
  level INT PRIMARY KEY,
  xp_required INT NOT NULL,
  title TEXT NOT NULL
);

-- Seed level thresholds
INSERT INTO public.level_thresholds (level, xp_required, title) VALUES
(1, 0, 'Rookie'),
(2, 100, 'Beginner'),
(3, 250, 'Regular'),
(4, 500, 'Committed'),
(5, 850, 'Dedicated'),
(6, 1300, 'Warrior'),
(7, 1900, 'Athlete'),
(8, 2700, 'Champion'),
(9, 3800, 'Elite'),
(10, 5200, 'Legend'),
(11, 7000, 'Master'),
(12, 9500, 'Grandmaster'),
(13, 12500, 'Titan'),
(14, 16500, 'Mythic'),
(15, 21500, 'Immortal'),
(16, 28000, 'Transcendent'),
(17, 36000, 'Ascended'),
(18, 46000, 'Divine'),
(19, 58000, 'Cosmic'),
(20, 75000, 'Ultimate');

-- Seed achievements
INSERT INTO public.achievements (slug, name, description, category, requirement, xp_reward, rarity) VALUES
('first_step', 'First Step', 'Complete your first workout', 'consistency', '{"type": "workout_count", "target": 1}', 50, 'common'),
('week_warrior', 'Week Warrior', 'Complete 7 workouts in 7 days', 'consistency', '{"type": "streak", "target": 7}', 100, 'uncommon'),
('iron_will', 'Iron Will', 'Maintain a 30-day streak', 'consistency', '{"type": "streak", "target": 30}', 500, 'rare'),
('century_club', 'Century Club', 'Complete 100 workouts', 'consistency', '{"type": "workout_count", "target": 100}', 1000, 'epic'),
('year_dedication', 'Year of Dedication', 'Maintain a 365-day streak', 'consistency', '{"type": "streak", "target": 365}', 5000, 'legendary'),
('social_butterfly', 'Social Butterfly', 'Join 5 friends'' workouts', 'social', '{"type": "workouts_joined", "target": 5}', 100, 'common'),
('rally_leader', 'Rally Leader', 'Have 5+ people join a single workout', 'social', '{"type": "max_participants", "target": 5}', 250, 'rare'),
('crew_builder', 'Crew Builder', 'Train with 10 unique friends', 'social', '{"type": "unique_training_partners", "target": 10}', 200, 'uncommon'),
('feedback_loop', 'Feedback Loop', 'Log feedback for 10 workouts', 'milestone', '{"type": "feedback_count", "target": 10}', 100, 'common'),
('adapt_overcome', 'Adapt and Overcome', 'Have your plan adapted 5+ times and still complete it', 'milestone', '{"type": "adaptations_completed", "target": 5}', 1000, 'legendary'),
('ten_sessions', 'Getting Started', 'Complete 10 workouts', 'consistency', '{"type": "workout_count", "target": 10}', 100, 'common'),
('fifty_sessions', 'Half Century', 'Complete 50 workouts', 'consistency', '{"type": "workout_count", "target": 50}', 500, 'rare'),
('plan_starter', 'Plan Starter', 'Generate your first training plan', 'milestone', '{"type": "plans_created", "target": 1}', 50, 'common'),
('early_bird', 'Early Bird', 'Complete a workout before 7 AM', 'milestone', '{"type": "early_workout", "target": 1}', 75, 'uncommon'),
('night_owl', 'Night Owl', 'Complete a workout after 9 PM', 'milestone', '{"type": "late_workout", "target": 1}', 75, 'uncommon');

-- Materialized view for weekly leaderboard
CREATE MATERIALIZED VIEW public.leaderboard_weekly AS
SELECT
  p.id AS user_id,
  p.display_name,
  p.avatar_url,
  p.current_level,
  COALESCE(SUM(x.amount), 0)::INT AS weekly_xp,
  RANK() OVER (ORDER BY COALESCE(SUM(x.amount), 0) DESC)::INT AS rank
FROM public.profiles p
LEFT JOIN public.xp_transactions x ON x.user_id = p.id
  AND x.created_at >= date_trunc('week', NOW())
GROUP BY p.id, p.display_name, p.avatar_url, p.current_level;

CREATE UNIQUE INDEX idx_leaderboard_weekly_user ON public.leaderboard_weekly(user_id);


-- ============================================
-- 007_notifications.sql
-- ============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  channels_sent TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read = FALSE;


-- ============================================
-- 008_messaging.sql
-- ============================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'workout_group')),
  workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.conversation_members (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);


-- ============================================
-- 009_activity_feed.sql
-- ============================================
CREATE TABLE public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  data JSONB DEFAULT '{}',
  visibility TEXT DEFAULT 'friends' CHECK (visibility IN ('public', 'friends', 'private')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_feed_user ON public.activity_feed(user_id, created_at DESC);
CREATE INDEX idx_activity_feed_visibility ON public.activity_feed(visibility, created_at DESC);


-- ============================================
-- 010_rls_policies.sql
-- ============================================
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


