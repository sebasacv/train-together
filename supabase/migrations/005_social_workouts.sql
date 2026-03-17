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
