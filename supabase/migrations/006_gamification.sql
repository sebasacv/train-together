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
