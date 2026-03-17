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
