"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getToday() {
  return formatDate(new Date());
}

function getYesterday(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return formatDate(d);
}

function calculateStreak(completedDates) {
  if (!completedDates.length) return 0;

  const dates = new Set(completedDates);

  let current = getToday();

  if (!dates.has(current)) {
    current = getYesterday(new Date());
  }

  if (!dates.has(current)) {
    return 0;
  }

  let streak = 0;

  while (dates.has(current)) {
    streak += 1;

    const previous = new Date(`${current}T12:00:00`);
    previous.setDate(previous.getDate() - 1);
    current = formatDate(previous);
  }

  return streak;
}

export default function HabitsPage() {
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [newHabit, setNewHabit] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Ошибка получения пользователя:", error);
      return null;
    }

    return user;
  }

  async function fetchData() {
    setLoading(true);

    const user = await getCurrentUser();

    if (!user) {
      console.error("Пользователь не авторизован");
      setLoading(false);
      return;
    }

    const [habitsRes, completionsRes] = await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),

      supabase
        .from("habit_completions")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_date", { ascending: true }),
    ]);

    if (habitsRes.error) {
      console.error(
        "Ошибка загрузки привычек:",
        habitsRes.error
      );
    }

    if (completionsRes.error) {
      console.error(
        "Ошибка загрузки выполнений:",
        completionsRes.error
      );
    }

    setHabits(habitsRes.data || []);
    setCompletions(completionsRes.data || []);

    setLoading(false);
  }

  function getHabitCompletions(habitId) {
    return completions.filter(
      (item) => item.habit_id === habitId
    );
  }

  function isCompletedToday(habitId) {
    const today = getToday();

    return completions.some(
      (item) =>
        item.habit_id === habitId &&
        item.completed_date === today
    );
  }

  function getStreak(habitId) {
    const habitCompletions = getHabitCompletions(habitId);

    const dates = habitCompletions.map(
      (item) => item.completed_date
    );

    return calculateStreak(dates);
  }

  async function toggleHabit(habitId) {
    const user = await getCurrentUser();

    if (!user) {
      console.error("Пользователь не авторизован");
      return;
    }

    const today = getToday();
    const alreadyCompleted = isCompletedToday(habitId);

    if (alreadyCompleted) {
      const completion = completions.find(
        (item) =>
          item.habit_id === habitId &&
          item.completed_date === today
      );

      if (!completion) return;

      const { error } = await supabase
        .from("habit_completions")
        .delete()
        .eq("id", completion.id)
        .eq("user_id", user.id);

      if (error) {
        console.error(
          "Ошибка удаления выполнения:",
          error
        );
        return;
      }

      setCompletions((current) =>
        current.filter(
          (item) => item.id !== completion.id
        )
      );

      return;
    }

    const { data, error } = await supabase
      .from("habit_completions")
      .insert({
        habit_id: habitId,
        user_id: user.id,
        completed_date: today,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Ошибка добавления выполнения:",
        error
      );
      return;
    }

    setCompletions((current) => [...current, data]);
  }

  async function addHabit() {
    const title = newHabit.trim();

    if (!title) return;

    const user = await getCurrentUser();

    if (!user) {
      console.error("Пользователь не авторизован");
      return;
    }

    const { data, error } = await supabase
      .from("habits")
      .insert({
        title,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Ошибка добавления привычки:",
        error
      );
      alert("Не удалось добавить привычку");
      return;
    }

    setHabits((current) => [...current, data]);
    setNewHabit("");
    setShowForm(false);
  }

  async function deleteHabit(id) {
    const user = await getCurrentUser();

    if (!user) {
      console.error("Пользователь не авторизован");
      return;
    }

    const { error } = await supabase
      .from("habits")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Ошибка удаления привычки:",
        error
      );
      return;
    }

    setHabits((current) =>
      current.filter((habit) => habit.id !== id)
    );

    setCompletions((current) =>
      current.filter((item) => item.habit_id !== id)
    );
  }

  const completedCount = habits.filter((habit) =>
    isCompletedToday(habit.id)
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <p className="text-muted">
          Загрузка привычек...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted">
              Планер
            </p>

            <h1 className="text-2xl font-bold text-foreground">
              Привычки
            </h1>

            <p className="text-sm text-muted mt-1">
              {completedCount} из {habits.length} выполнено сегодня
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-accent hover:opacity-90 text-white px-4 py-2 rounded-full text-sm font-medium transition"
          >
            {showForm ? "Отмена" : "Добавить"}
          </button>
        </div>

        {showForm && (
          <div className="bg-surface rounded-2xl p-4 mb-4 shadow-sm border border-nav-border">
            <input
              type="text"
              value={newHabit}
              onChange={(event) =>
                setNewHabit(event.target.value)
              }
              placeholder="Название привычки..."
              className="w-full border border-nav-border rounded-xl px-4 py-3 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent mb-3"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  addHabit();
                }
              }}
            />

            <button
              onClick={addHabit}
              className="w-full bg-accent hover:opacity-90 text-white py-2.5 rounded-xl text-sm font-medium transition"
            >
              Сохранить привычку
            </button>
          </div>
        )}

        <div className="space-y-3">
          {habits.map((habit) => {
            const completedToday =
              isCompletedToday(habit.id);

            const streak = getStreak(habit.id);

            return (
              <div
                key={habit.id}
                className={`rounded-2xl p-4 shadow-sm border transition ${
                  completedToday
                    ? "border-green-200 bg-green-50"
                    : "border-nav-border bg-surface"
                }`}
              >
                <div className="flex items-start gap-3">

                  <button
                    onClick={() =>
                      toggleHabit(habit.id)
                    }
                    className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                      completedToday
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-nav-border hover:border-green-400"
                    }`}
                    aria-label={
                      completedToday
                        ? "Отменить выполнение"
                        : "Отметить выполнение"
                    }
                  >
                    {completedToday && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 010 1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium ${
                        completedToday
                          ? "text-gray-500 line-through"
                          : "text-foreground"
                      }`}
                    >
                      {habit.title}
                    </p>

                    <p className="text-xs text-muted mt-1">
                      Стрик: {streak}{" "}
                      {streak === 1
                        ? "день"
                        : "дней"}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      deleteHabit(habit.id)
                    }
                    className="text-muted hover:text-danger text-sm transition"
                  >
                    Удалить
                  </button>

                </div>
              </div>
            );
          })}
        </div>

        {habits.length === 0 && (
          <div className="text-center py-12 text-muted">
            <p>Пока нет привычек</p>

            <p className="text-sm mt-1">
              Нажми «Добавить», чтобы создать первую
            </p>
          </div>
        )}

      </div>
    </div>
  );
}