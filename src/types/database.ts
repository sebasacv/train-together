export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          fitness_level: "beginner" | "intermediate" | "advanced" | "elite";
          date_of_birth: string | null;
          height_cm: number | null;
          weight_kg: number | null;
          preferred_units: "metric" | "imperial";
          available_equipment: string[];
          training_days_per_week: number;
          privacy_level: "public" | "friends" | "private";
          xp_total: number;
          current_level: number;
          current_streak: number;
          longest_streak: number;
          last_workout_date: string | null;
          push_subscription: Json | null;
          notification_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          fitness_level?: "beginner" | "intermediate" | "advanced" | "elite";
          date_of_birth?: string | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          preferred_units?: "metric" | "imperial";
          available_equipment?: string[];
          training_days_per_week?: number;
          privacy_level?: "public" | "friends" | "private";
          xp_total?: number;
          current_level?: number;
          current_streak?: number;
          longest_streak?: number;
          last_workout_date?: string | null;
          push_subscription?: Json | null;
          notification_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      training_plans: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          objective: string;
          target_date: string | null;
          duration_weeks: number;
          status: "active" | "paused" | "completed" | "abandoned";
          generation_context: Json | null;
          claude_conversation_history: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          objective: string;
          target_date?: string | null;
          duration_weeks: number;
          status?: "active" | "paused" | "completed" | "abandoned";
          generation_context?: Json | null;
          claude_conversation_history?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["training_plans"]["Insert"]>;
      };
      plan_weeks: {
        Row: {
          id: string;
          plan_id: string;
          week_number: number;
          theme: string | null;
          notes: string | null;
          total_volume_minutes: number | null;
          is_current: boolean;
        };
        Insert: {
          id?: string;
          plan_id: string;
          week_number: number;
          theme?: string | null;
          notes?: string | null;
          total_volume_minutes?: number | null;
          is_current?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["plan_weeks"]["Insert"]>;
      };
      workouts: {
        Row: {
          id: string;
          plan_week_id: string;
          plan_id: string;
          user_id: string;
          title: string;
          description: string | null;
          workout_type: string;
          scheduled_date: string;
          scheduled_time: string | null;
          day_of_week: number | null;
          duration_minutes: number | null;
          intensity: "recovery" | "easy" | "moderate" | "hard" | "max" | null;
          is_key_workout: boolean;
          status: "scheduled" | "completed" | "skipped" | "adapted";
          location: string | null;
          is_open_for_joining: boolean;
          visibility: "public" | "friends" | "private";
          exercises: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_week_id: string;
          plan_id: string;
          user_id: string;
          title: string;
          description?: string | null;
          workout_type: string;
          scheduled_date: string;
          scheduled_time?: string | null;
          day_of_week?: number | null;
          duration_minutes?: number | null;
          intensity?: "recovery" | "easy" | "moderate" | "hard" | "max" | null;
          is_key_workout?: boolean;
          status?: "scheduled" | "completed" | "skipped" | "adapted";
          location?: string | null;
          is_open_for_joining?: boolean;
          visibility?: "public" | "friends" | "private";
          exercises?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workouts"]["Insert"]>;
      };
      workout_logs: {
        Row: {
          id: string;
          workout_id: string;
          user_id: string;
          completed_at: string;
          actual_duration_minutes: number | null;
          rpe: number | null;
          mood: "great" | "good" | "neutral" | "tired" | "terrible" | null;
          notes: string | null;
          exercise_results: Json;
          metrics: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          user_id: string;
          completed_at?: string;
          actual_duration_minutes?: number | null;
          rpe?: number | null;
          mood?: "great" | "good" | "neutral" | "tired" | "terrible" | null;
          notes?: string | null;
          exercise_results?: Json;
          metrics?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_logs"]["Insert"]>;
      };
      user_feedback: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string | null;
          workout_id: string | null;
          feedback_type: string;
          details: string | null;
          severity: number;
          body_parts_affected: string[];
          processed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id?: string | null;
          workout_id?: string | null;
          feedback_type: string;
          details?: string | null;
          severity?: number;
          body_parts_affected?: string[];
          processed?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_feedback"]["Insert"]>;
      };
      friendships: {
        Row: {
          id: string;
          user_a: string;
          user_b: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_a: string;
          user_b: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["friendships"]["Insert"]>;
      };
      friend_requests: {
        Row: {
          id: string;
          from_user: string;
          to_user: string;
          status: "pending" | "accepted" | "declined";
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          from_user: string;
          to_user: string;
          status?: "pending" | "accepted" | "declined";
          created_at?: string;
          responded_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["friend_requests"]["Insert"]>;
      };
      invite_codes: {
        Row: {
          id: string;
          user_id: string;
          code: string;
          uses_remaining: number;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          code?: string;
          uses_remaining?: number;
          expires_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invite_codes"]["Insert"]>;
      };
      workout_participants: {
        Row: {
          id: string;
          workout_id: string;
          user_id: string;
          status: "interested" | "confirmed" | "declined" | "attended";
          joined_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          user_id: string;
          status?: "interested" | "confirmed" | "declined" | "attended";
          joined_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_participants"]["Insert"]>;
      };
      achievements: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          icon_url: string | null;
          category: string;
          requirement: Json;
          xp_reward: number;
          rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          icon_url?: string | null;
          category: string;
          requirement: Json;
          xp_reward?: number;
          rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary";
        };
        Update: Partial<Database["public"]["Tables"]["achievements"]["Insert"]>;
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          unlocked_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_achievements"]["Insert"]>;
      };
      xp_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: string;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          reason: string;
          reference_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["xp_transactions"]["Insert"]>;
      };
      challenges: {
        Row: {
          id: string;
          title: string;
          description: string;
          challenge_type: string;
          start_date: string;
          end_date: string;
          requirement: Json;
          xp_reward: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          challenge_type: string;
          start_date: string;
          end_date: string;
          requirement: Json;
          xp_reward?: number;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["challenges"]["Insert"]>;
      };
      challenge_participants: {
        Row: {
          id: string;
          challenge_id: string;
          user_id: string;
          progress: Json;
          completed: boolean;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          user_id: string;
          progress?: Json;
          completed?: boolean;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["challenge_participants"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          data: Json;
          read: boolean;
          channels_sent: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          data?: Json;
          read?: boolean;
          channels_sent?: string[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
      conversations: {
        Row: {
          id: string;
          type: "direct" | "workout_group";
          workout_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type?: "direct" | "workout_group";
          workout_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["conversations"]["Insert"]>;
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          user_id: string;
          joined_at: string;
          last_read_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          joined_at?: string;
          last_read_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["conversation_members"]["Insert"]>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
      };
      activity_feed: {
        Row: {
          id: string;
          user_id: string;
          activity_type: string;
          title: string;
          description: string | null;
          data: Json;
          visibility: "public" | "friends" | "private";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_type: string;
          title: string;
          description?: string | null;
          data?: Json;
          visibility?: "public" | "friends" | "private";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_feed"]["Insert"]>;
      };
      level_thresholds: {
        Row: {
          level: number;
          xp_required: number;
          title: string;
        };
        Insert: {
          level: number;
          xp_required: number;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["level_thresholds"]["Insert"]>;
      };
    };
    Functions: {
      are_friends: {
        Args: { uid1: string; uid2: string };
        Returns: boolean;
      };
    };
  };
}
