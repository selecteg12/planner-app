# Planner App
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

A personal productivity and planning web application built with Next.js and Supabase.

The application combines a calendar, task management, habit tracking and productivity statistics in a single interface.

## Features

- 📅 Calendar
  - Month and week views
  - Create, edit and delete events
  - Event date and time management
  - Recurring events

- ✅ Tasks
  - Create tasks
  - Edit and delete tasks
  - Mark tasks as completed
  - Track task completion

- 🔁 Habits
  - Create and delete habits
  - Track daily habit completion
  - Habit completion history
  - Current streak tracking

- 📊 Statistics
  - Task completion statistics
  - Habit statistics
  - Weekly productivity overview
  - Productivity heatmap

- 👤 Authentication
  - Email and password registration
  - Login and logout
  - User-specific data
  - Protected application routes

- 🤖 AI Assistant
  - Planned integration with the planner
  - Natural-language interaction with tasks and calendar
  - Smart reminders
  - AI-powered daily planning

## Tech Stack

### Frontend

- Next.js
- React
- Tailwind CSS
- JavaScript

### Backend

- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security (RLS)

### Deployment

- Vercel
- GitHub

## Architecture

```text
┌─────────────────────────┐
│       Next.js App       │
│                         │
│  Calendar               │
│  Tasks                  │
│  Habits                 │
│  Statistics             │
│  Profile                │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│        Supabase         │
│                         │
│  PostgreSQL             │
│  Authentication         │
│  Row Level Security     │
└─────────────────────────┘
```
Each user's data is associated with their authenticated user ID.

Row Level Security policies prevent users from accessing data belonging to other accounts.

##Database

The main database entities are:
```text
User
 │
 ├── Tasks
 │
 ├── Events
 │
 └── Habits
       │
       └── Habit Completions
```
###Tasks

Stores personal tasks and their completion state.

###Events

Stores calendar events, including date, time and recurrence settings.

###Habits

Stores habits created by the user.

###Habit Completions

Stores individual habit completion records by date.

A unique constraint prevents the same habit from being completed multiple times on the same day.

##Authentication & Security

Authentication is handled using Supabase Auth.

Planner records are associated with the authenticated user's user_id.

Row Level Security policies are used to restrict access to user-specific data.

The application separates data between accounts for:

Tasks
Calendar events
Habits
Habit completions
Getting Started
1. Clone the repository
git clone https://github.com/selecteg12/planner-app.git
cd planner-app

2. Install dependencies
npm install

3. Configure environment variables

Create a .env.local file in the project root:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

Do not commit .env.local or private credentials to the repository.

4. Run the development server
npm run dev

Open the application at:

http://localhost:3000
Production Build

Create a production build:

npm run build

Run the production server locally:

npm start
Deployment

The application is deployed using Vercel.

The GitHub repository is connected to Vercel, allowing new commits to be deployed automatically.

Environment variables must be configured in the Vercel project settings.

##Project Structure
```text
planner-app/
│
├── app/
│   ├── calendar/
│   ├── habits/
│   ├── login/
│   ├── signup/
│   ├── stats/
│   └── profile/
│
├── components/
│   ├── CalendarView.jsx
│   ├── TasksView.js
│   ├── BottomNav.jsx
│   └── AuthGuard.jsx
│
├── lib/
│   └── supabase.js
│
├── public/
│
├── package.json
├── next.config.*
├── postcss.config.*
└── README.md
```
##Roadmap
Completed
 Calendar
 Task management
 Habit tracking
 Productivity statistics
 User authentication
 User-specific database records
 Supabase Row Level Security
 Vercel deployment
Planned
 Recurring calendar events
 Improved statistics
 AI assistant
 Natural-language task creation
 Smart reminders
 AI daily planning
 Push notifications
 Improved mobile experience
##AI Assistant

One of the planned features is an AI assistant integrated directly into the planner.

Instead of functioning as a standalone chatbot, the assistant will be able to interact with the user's planner data.

For example:

User:
"What do I have planned for tomorrow?"

AI:
"You have 3 tasks and 2 calendar events tomorrow."

The assistant will eventually be able to perform actions such as:

"Add a workout every Monday at 18:00."

"Move my meeting from 15:00 to 17:00."

"Create a task to finish the project by Friday."

"What tasks do I still have today?"

The AI integration is planned around controlled access to specific planner operations rather than unrestricted access to the database.

##Future Architecture
```text
                    ┌─────────────────┐
                    │   Planner App   │
                    │                 │
                    │ Calendar        │
                    │ Tasks           │
                    │ Habits          │
                    │ Statistics      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  AI Assistant   │
                    │                 │
                    │ Context         │
                    │ Tool Calling    │
                    │ Planning        │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         Tasks API      Calendar API    Habits API
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                         Supabase
```
