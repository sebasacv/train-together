# TrainTogether — Setup Guide

## What This App Does
AI-powered fitness training app with social features. Users generate personalized training plans via Claude API, track progress, get adaptive coaching, share calendars with friends, join workouts together, earn XP, climb leaderboards.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **AI**: Claude API via @anthropic-ai/sdk (Sonnet 4.5 for plans, Haiku 4.5 for adaptations)
- **Notifications**: Web Push + in-app + email (Resend)
- **PWA**: Manifest configured, ready for Serwist service worker

## Project Structure
```
src/
├── app/
│   ├── (auth)/          Login, signup, OAuth callback
│   ├── (app)/           Authenticated app shell
│   │   ├── dashboard/   Today's workout, stats, streaks, XP
│   │   ├── plan/        Plan overview, AI generation wizard, calendar, workout detail
│   │   ├── social/      Activity feed, friends, leaderboard, friend profiles
│   │   ├── calendar/    Social training calendar (merged own + friends)
│   │   ├── messages/    DMs and workout group chats (real-time)
│   │   ├── profile/     Profile view + edit
│   │   ├── achievements/ Badges with rarity tiers
│   │   └── notifications/ Multi-type notification center
│   └── api/
│       └── plan/        generate/ (Claude plan gen) + adapt/ (Claude adaptation)
├── components/
│   ├── ui/              shadcn/ui components
│   ├── providers/       SupabaseProvider
│   ├── layout/          AppShell, LogoutButton
│   ├── plan/            WorkoutActions (complete, feedback, adapt)
│   ├── social/          (extensible)
│   ├── gamification/    (extensible)
│   └── dashboard/       (extensible)
├── lib/
│   ├── supabase/        client.ts, server.ts, admin.ts
│   ├── claude/          client.ts, prompts/ (generation + adaptation), context-builder.ts
│   └── gamification/    xp.ts (level calculations)
├── types/               database.ts (full Supabase type definitions)
└── middleware.ts         Auth guard + session refresh

supabase/
├── migrations/          10 SQL files (001-010)
└── functions/           Edge function stubs
```

## Database Schema (10 migrations)
1. **001** — profiles (extends auth.users), auto-create trigger, updated_at trigger
2. **002** — training_plans, plan_weeks, workouts (with exercises JSONB)
3. **003** — workout_logs, user_feedback
4. **004** — friendships (canonical ordering), friend_requests, invite_codes, are_friends() function
5. **005** — workout_participants
6. **006** — achievements, user_achievements, xp_transactions, challenges, challenge_participants, level_thresholds, leaderboard_weekly materialized view + seed data (15 achievements, 20 levels)
7. **007** — notifications
8. **008** — conversations, conversation_members, messages
9. **009** — activity_feed
10. **010** — RLS policies for all 21 tables

## Pages (22 total)
| Route | Type | Description |
|-------|------|-------------|
| `/` | Static | Landing page |
| `/login` | Static | Email + Google OAuth login |
| `/signup` | Static | Registration with username |
| `/callback` | Dynamic | OAuth callback handler |
| `/dashboard` | Dynamic | Main dashboard with stats |
| `/plan` | Dynamic | Active plan overview |
| `/plan/generate` | Static | Multi-step AI plan wizard |
| `/plan/calendar` | Static | Monthly plan calendar |
| `/plan/[workoutId]` | Dynamic | Workout detail + log |
| `/social` | Dynamic | Friends activity feed |
| `/social/friends` | Static | Friend management |
| `/social/leaderboard` | Dynamic | Weekly XP leaderboard |
| `/social/[userId]` | Dynamic | Friend profile |
| `/calendar` | Static | Social training calendar |
| `/messages` | Static | Conversation list |
| `/messages/[id]` | Dynamic | Chat (real-time) |
| `/profile` | Dynamic | Own profile |
| `/profile/edit` | Static | Edit profile |
| `/achievements` | Dynamic | Badges gallery |
| `/notifications` | Static | Notification center |

## Claude API Integration
- **Plan Generation**: System prompt as elite fitness coach, user provides objective/timeline/fitness level/equipment. Claude returns structured JSON matching DB schema. Model: Sonnet 4.5.
- **Plan Adaptation**: Context builder assembles last 2 weeks of logs + unprocessed feedback + upcoming workouts. Claude returns a diff of changes + coach note. Model: Haiku 4.5 for simple, Sonnet 4.5 for complex adaptations.

## Gamification
- XP: 50/workout, 75/key workout, 10/feedback, 100/7-day streak, 500/30-day streak, 25/join friend workout
- Levels: Exponential curve (Rookie → Ultimate), 20 tiers
- Achievements: 15 seeded across consistency, social, milestone categories
- Leaderboard: Weekly reset, friends-only, materialized view

## Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL=       # From Supabase dashboard
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # From Supabase dashboard
SUPABASE_SERVICE_ROLE_KEY=      # From Supabase dashboard (optional, for admin)
ANTHROPIC_API_KEY=              # From console.anthropic.com
RESEND_API_KEY=                 # From resend.com (optional, for email)
```

## Setup Steps
1. Create Supabase project at supabase.com
2. Run migrations 001-010 in SQL editor (in order)
3. Enable Google OAuth in Supabase Auth settings (optional)
4. Get Claude API key from console.anthropic.com
5. Update .env.local with real values
6. Run: `npm run dev`

## Future Enhancements
- React Native mobile app (same Supabase backend)
- Push notifications via service worker
- Email digests via Resend
- Offline workout logging with background sync
- Group challenges
- Comparative friend stats visualizations
