"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);

  return d;
}

function endOfWeek(date = new Date()) {
  const start = startOfWeek(date);
  const end = new Date(start);

  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return end;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date = new Date()) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
}

function getYesterday(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return formatDateKey(d);
}

function calculateCurrentStreak(dates) {
  if (!dates.length) return 0;

  const dateSet = new Set(dates);

  let current = formatDateKey(new Date());

  if (!dateSet.has(current)) {
    current = getYesterday();
  }

  if (!dateSet.has(current)) {
    return 0;
  }

  let streak = 0;

  while (dateSet.has(current)) {
    streak += 1;

    const d = new Date(`${current}T12:00:00`);
    d.setDate(d.getDate() - 1);

    current = formatDateKey(d);
  }

  return streak;
}

function getHeatColor(count) {
  if (count === 0) return "bg-gray-100";
  if (count === 1) return "bg-blue-200";
  if (count === 2) return "bg-blue-400";
  return "bg-blue-600";
}

export default function StatsPage() {
  const [habits, setHabits] = useState([]);
  const [habitCompletions, setHabitCompletions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    const [habitsRes, completionsRes, tasksRes] = await Promise.all([
      supabase.from("habits").select("*"),
      supabase.from("habit_completions").select("*"),
      supabase.from("tasks").select("*"),
    ]);

    if (habitsRes.error) {
      console.error("Ошибка загрузки привычек:", habitsRes.error);
    }

    if (completionsRes.error) {
      console.error(
        "Ошибка загрузки выполнений привычек:",
        completionsRes.error
      );
    }

    if (tasksRes.error) {
      console.error("Ошибка загрузки задач:", tasksRes.error);
    }

    setHabits(habitsRes.data || []);
    setHabitCompletions(completionsRes.data || []);
    setTasks(tasksRes.data || []);

    setLoading(false);
  }

  const todayKey = formatDateKey(new Date());

  // ==========================================
  // ПРИВЫЧКИ
  // ==========================================

  const habitsCompletedToday = useMemo(() => {
    const completedHabitIds = new Set(
      habitCompletions
        .filter((item) => item.completed_date === todayKey)
        .map((item) => item.habit_id)
    );

    return completedHabitIds.size;
  }, [habitCompletions, todayKey]);

  const habitStreaks = useMemo(() => {
    const result = {};

    for (const habit of habits) {
      const dates = habitCompletions
        .filter((item) => item.habit_id === habit.id)
        .map((item) => item.completed_date);

      result[habit.id] = calculateCurrentStreak(dates);
    }

    return result;
  }, [habits, habitCompletions]);

  const bestCurrentStreak = useMemo(() => {
    if (!habits.length) return 0;

    return Math.max(
      ...habits.map((habit) => habitStreaks[habit.id] || 0)
    );
  }, [habits, habitStreaks]);

  const totalHabitCompletions = habitCompletions.length;

  // ==========================================
  // ЗАДАЧИ ЗА НЕДЕЛЮ
  // ==========================================

  const weekStart = useMemo(() => startOfWeek(), []);
  const weekEnd = useMemo(() => endOfWeek(), []);

  const tasksThisWeek = useMemo(() => {
    return tasks.filter((task) => {
      const createdAt = task.created_at
        ? new Date(task.created_at)
        : null;

      const completedAt = task.completed_at
        ? new Date(task.completed_at)
        : null;

      const createdThisWeek =
        createdAt &&
        createdAt >= weekStart &&
        createdAt <= weekEnd;

      const completedThisWeek =
        completedAt &&
        completedAt >= weekStart &&
        completedAt <= weekEnd;

      return createdThisWeek || completedThisWeek;
    });
  }, [tasks, weekStart, weekEnd]);

  const completedTasksThisWeek = tasksThisWeek.filter(
    (task) => task.done && task.completed_at
  );

  const totalTasksThisWeek = tasksThisWeek.length;

  const completedTasksCount = completedTasksThisWeek.length;

  const weekCompletionRate =
    totalTasksThisWeek > 0
      ? Math.round(
          (completedTasksCount / totalTasksThisWeek) * 100
        )
      : 0;

  // ==========================================
  // ТЕПЛОВАЯ КАРТА
  // Только выполненные задачи
  // ==========================================

  const monthStart = useMemo(() => startOfMonth(), []);
  const monthEnd = useMemo(() => endOfMonth(), []);

  const heatmapData = useMemo(() => {
    const map = {};

    tasks.forEach((task) => {
      if (!task.done || !task.completed_at) {
        return;
      }

      const completed = new Date(task.completed_at);

      if (
        completed < monthStart ||
        completed > monthEnd
      ) {
        return;
      }

      const key = formatDateKey(completed);

      map[key] = (map[key] || 0) + 1;
    });

    return map;
  }, [tasks, monthStart, monthEnd]);

  const calendarDays = useMemo(() => {
    const days = [];

    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startWeekday = firstDay.getDay();

    startWeekday =
      startWeekday === 0
        ? 6
        : startWeekday - 1;

    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }

    for (
      let day = 1;
      day <= lastDay.getDate();
      day++
    ) {
      const date = new Date(year, month, day);
      const key = formatDateKey(date);

      days.push({
        date,
        key,
        count: heatmapData[key] || 0,
        isToday: key === todayKey,
      });
    }

    return days;
  }, [monthStart, heatmapData, todayKey]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <p className="text-muted">
          Загрузка статистики...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* Заголовок */}
        <div className="mb-6">
          <p className="text-sm text-muted">
            Планер
          </p>

          <h1 className="text-2xl font-bold text-foreground">
            Статистика
          </h1>

          <p className="text-sm text-muted mt-1">
            Обзор твоей продуктивности
          </p>
        </div>

        {/* ===================================== */}
        {/* ПРИВЫЧКИ */}
        {/* ===================================== */}

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-nav-border mb-4">
          <h2 className="font-semibold text-foreground mb-4">
            Привычки
          </h2>

          <div className="grid grid-cols-3 gap-4">

            <div>
              <p className="text-xs text-muted mb-1">
                Сегодня
              </p>

              <p className="text-2xl font-bold text-foreground">
                {habitsCompletedToday}
                <span className="text-sm font-normal text-muted">
                  /{habits.length}
                </span>
              </p>
            </div>

            <div>
              <p className="text-xs text-muted mb-1">
                Стрик
              </p>

              <p className="text-2xl font-bold text-green-600">
                {bestCurrentStreak}
                <span className="text-sm font-normal">
                  {" "}дн.
                </span>
              </p>
            </div>

            <div>
              <p className="text-xs text-muted mb-1">
                Выполнено
              </p>

              <p className="text-2xl font-bold text-foreground">
                {totalHabitCompletions}
              </p>

              <p className="text-xs text-muted">
                всего
              </p>
            </div>

          </div>
        </div>

        {/* ===================================== */}
        {/* ЗАДАЧИ */}
        {/* ===================================== */}

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-nav-border mb-4">

          <h2 className="font-semibold text-foreground mb-1">
            Задачи за неделю
          </h2>

          <p className="text-xs text-muted mb-4">
            {weekStart.toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "short",
            })}

            {" – "}

            {weekEnd.toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "short",
            })}
          </p>

          <div className="grid grid-cols-2 gap-4">

            <div>
              <p className="text-xs text-muted mb-1">
                Выполнено
              </p>

              <p className="text-3xl font-bold text-accent">
                {completedTasksCount}
                <span className="text-sm font-normal text-muted">
                  /{totalTasksThisWeek}
                </span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-muted mb-1">
                Процент выполнения
              </p>

              <p className="text-3xl font-bold text-green-600">
                {weekCompletionRate}%
              </p>
            </div>

          </div>
        </div>

        {/* ===================================== */}
        {/* ТЕПЛОВАЯ КАРТА */}
        {/* ===================================== */}

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-nav-border mb-4">

          <h2 className="font-semibold text-foreground mb-1">
            Активность за месяц
          </h2>

          <p className="text-xs text-muted mb-4">
            {new Date().toLocaleDateString("ru-RU", {
              month: "long",
              year: "numeric",
            })}
          </p>

          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] text-muted">
            {[
              "Пн",
              "Вт",
              "Ср",
              "Чт",
              "Пт",
              "Сб",
              "Вс",
            ].map((day) => (
              <div key={day}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="aspect-square"
                  />
                );
              }

              return (
                <div
                  key={day.key}
                  title={`${day.date.getDate()} — ${day.count} задач`}
                  className={`
                    aspect-square
                    rounded-md
                    flex
                    items-center
                    justify-center
                    text-xs
                    font-medium
                    ${getHeatColor(day.count)}
                    ${
                      day.isToday
                        ? "ring-2 ring-accent ring-offset-1"
                        : ""
                    }
                    ${
                      day.count >= 3
                        ? "text-white"
                        : "text-gray-700"
                    }
                  `}
                >
                  {day.date.getDate()}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted">
            <span>Меньше</span>

            <div className="w-3 h-3 rounded-sm bg-gray-100" />
            <div className="w-3 h-3 rounded-sm bg-blue-200" />
            <div className="w-3 h-3 rounded-sm bg-blue-400" />
            <div className="w-3 h-3 rounded-sm bg-blue-600" />

            <span>Больше</span>
          </div>
        </div>

        <div className="text-center text-sm text-muted mt-6">
          <p>
            Данные обновляются автоматически
          </p>
        </div>

      </div>
    </div>
  );
}