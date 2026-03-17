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
