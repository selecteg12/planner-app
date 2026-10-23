# Planner

**Tasks, calendar, habits, and productivity statistics in one personal workspace.**

[Hosted app](https://planner-app-six-woad.vercel.app) · [Telegram AI assistant](https://github.com/selecteg12/planner-ai-assistant)

Planner is a personal productivity web application built with Next.js, React, and Supabase. It combines everyday planning with a weekly task overview and habit tracking. The interface is in Russian.

The companion Telegram assistant connects to the same Supabase account and records, letting users manage their plan through natural-language messages.

## Features

| Area | Implemented functionality |
| --- | --- |
| Tasks | Create tasks with notes, deadlines, and low/medium/high priority; mark them complete or reopen them; delete tasks. Open tasks appear before completed ones, with overdue tasks prioritised. |
| Calendar | Month and week views; create, edit, and delete events; event colours; daily, weekly, monthly, and yearly recurrence with an end date. Open task deadlines also appear in the calendar. |
| Habits | Create and delete habits, mark or undo today's completion, and track current streaks. Completion records are stored by date. |
| Statistics | Weekly task completion rate, today's habit progress, current habit streaks, and a monthly heatmap of completed tasks. |
| Account | Email/password registration and login, profile, logout, and Telegram account linking with a short-lived one-time code. |

### How statistics are calculated

- **Weekly task completion:** completed tasks divided by all tasks whose deadline falls within the current Monday–Sunday week. Tasks without a deadline are excluded; an empty week displays 0%.
- **Monthly heatmap:** completed tasks grouped by their `completed_at` date during the current month.
- **Habit streak:** consecutive completion dates counted backwards from today, or yesterday when today's check-in has not yet been recorded.

## Telegram AI assistant

The assistant is implemented in a [separate repository](https://github.com/selecteg12/planner-ai-assistant). It can read a user's plan, create and update tasks and events, record habit check-ins, manage ideas, and schedule reminders.

To connect an account:

1. Sign in to Planner and open **Profile**.
2. Create a connection code. It is valid for 10 minutes.
3. Open the configured Telegram bot, send `/start`, and submit the code.

The browser sends only the code's SHA-256 hash to a Supabase RPC for storage. The server-side assistant consumes the code and links the Telegram account to the Planner user. The bot asks for separate confirmation before deleting a task, event, or idea.

Bot credentials, LLM configuration, reminder scheduling, optional tables, and linking SQL are documented in the [assistant setup guide](https://github.com/selecteg12/planner-ai-assistant#run-locally). Running this web application alone does not deploy the bot.

## Stack

| Layer | Technology |
| --- | --- |
| Interface | Next.js App Router, React, JavaScript, Tailwind CSS |
| Data and authentication | Supabase, PostgreSQL, Supabase Auth |
| Access control | Authenticated user queries and PostgreSQL Row Level Security policies |
| Hosting | Vercel |
| Companion integration | Telegram assistant with Node.js, Telegraf, LLM tool calling, and Supabase |

## Architecture and data

The browser uses the Supabase JavaScript client for authentication and planner operations. Both the web app and the separately deployed Telegram assistant work with shared planner records.

| Entity | Purpose |
| --- | --- |
| `tasks` | Titles, notes, deadlines, priorities, completion state, and completion timestamps |
| `events` | Event details, start/end times, colours, and recurrence settings |
| `habits` | Habit definitions owned by a user |
| `habit_completions` | Habit check-ins by date |
| Telegram linking tables and RPCs | Short-lived pairing codes and account links, configured through the assistant project |

Records are associated with a `user_id`. The deployment must enable and configure RLS policies to enforce ownership on reads and writes; client-side filtering and route guards do not replace database access control.

This repository contains the web application. It does not include a complete database migration or an automatic schema bootstrap.

## Run locally

Requirements: a Node.js version supported by Next.js 16, npm, and an existing Supabase project with the compatible Planner schema and access policies. Node.js 22 LTS is a suitable development baseline.

1. Clone the repository and install the locked dependencies:

   ```bash
   git clone https://github.com/selecteg12/planner-app.git
   cd planner-app
   npm ci
   ```

2. Create `.env.local` in the project root:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   These values configure the browser client. Keep service-role keys, bot tokens, and LLM API keys out of browser environment variables and committed files.

3. Configure the database tables, ownership policies, and Supabase Auth settings. If using Telegram linking, also apply the relevant [assistant setup SQL](https://github.com/selecteg12/planner-ai-assistant/tree/main/schema-proposals) to the same project.

4. Start the development server:

   ```bash
   npm run dev
   ```

   Open [localhost:3000](http://localhost:3000).

### Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Create a production build |
| `npm start` | Run the production build locally |

## Project structure

| Path | Purpose |
| --- | --- |
| `app/calendar/`, `components/CalendarView.jsx` | Calendar views and recurring events |
| `app/tasks/`, `components/TasksView.jsx` | Task management and sorting |
| `app/habits/` | Habits and daily check-ins |
| `app/stats/` | Weekly metrics and activity heatmap |
| `app/profile/` | Account details, logout, and Telegram pairing |
| `app/login/`, `app/signup/` | Authentication screens |
| `components/AuthGuard.jsx` | Authentication checks for the interface |
| `components/BottomNav.jsx` | Main navigation |
| `lib/supabase.js` | Supabase browser client |
| `app/globals.css` | Shared styles |

## Deployment

Import the repository into Vercel and configure the two `NEXT_PUBLIC_SUPABASE_*` variables for the target environment. Configure Supabase Auth URLs for the deployed application and ensure the required schema and RLS policies exist in the connected database.

Deploy and configure the Telegram assistant separately against the same Supabase project. Its server-side secrets belong to the assistant deployment.

## Further development

- Add versioned database migrations and a documented setup for a fresh Supabase project.
- Add browser checks for authentication, event recurrence, habit check-ins, and statistics.
- Improve mobile interactions and feedback when a data operation fails.
- Explore push notifications and more advanced daily planning.

These are future improvements; the calendar recurrence and companion Telegram assistant described above are already implemented in the source.
