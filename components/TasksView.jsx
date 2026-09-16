"use client";

import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const PRIORITIES = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Средний" },
  { value: "high", label: "Высокий" },
];

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

function startOfDay(isoDate) {
  return new Date(`${isoDate}T00:00:00`);
}

function isOverdue(task) {
  if (task.done || !task.deadline) return false;

  return (
    startOfDay(task.deadline) <
    startOfDay(todayIso())
  );
}

function formatDeadline(isoDate) {
  if (!isoDate) return "Без срока";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(startOfDay(isoDate));
}

function priorityMeta(value) {
  return (
    PRIORITIES.find((item) => item.value === value) ??
    PRIORITIES[1]
  );
}

function pluralTasks(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return "задача";
  }

  if (
    mod10 >= 2 &&
    mod10 <= 4 &&
    (mod100 < 12 || mod100 > 14)
  ) {
    return "задачи";
  }

  return "задач";
}

export default function TasksView() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [deadline, setDeadline] = useState(todayIso());
  const [priority, setPriority] = useState("medium");
  const [titleError, setTitleError] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  async function getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error(
        "Ошибка получения пользователя:",
        error
      );

      return null;
    }

    return user;
  }

  async function fetchTasks() {
    setLoading(true);

    const user = await getCurrentUser();

    if (!user) {
      console.error("Пользователь не авторизован");
      setTasks([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Ошибка загрузки задач:",
        error
      );
    } else {
      setTasks(data || []);
    }

    setLoading(false);
  }

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.done !== b.done) {
        return a.done ? 1 : -1;
      }

      const aOverdue = isOverdue(a) ? 0 : 1;
      const bOverdue = isOverdue(b) ? 0 : 1;

      if (aOverdue !== bOverdue) {
        return aOverdue - bOverdue;
      }

      if (!a.deadline && !b.deadline) {
        return 0;
      }

      if (!a.deadline) {
        return 1;
      }

      if (!b.deadline) {
        return -1;
      }

      return a.deadline.localeCompare(
        b.deadline
      );
    });
  }, [tasks]);

  function openForm() {
    setTitle("");
    setNote("");
    setDeadline(todayIso());
    setPriority("medium");
    setTitleError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setTitleError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setTitleError("Введите название задачи");
      return;
    }

    const user = await getCurrentUser();

    if (!user) {
      setTitleError(
        "Пользователь не авторизован"
      );
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          title: trimmedTitle,
          note: note.trim() || null,
          deadline: deadline || null,
          priority,
          done: false,
          completed_at: null,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(
        "Ошибка добавления задачи:",
        error
      );

      alert("Не удалось добавить задачу");
      return;
    }

    setTasks((current) => [
      data,
      ...current,
    ]);

    closeForm();
  }

  async function toggleDone(id, currentDone) {
    const user = await getCurrentUser();

    if (!user) {
      console.error("Пользователь не авторизован");
      return;
    }

    const newDone = !currentDone;

    const completedAt = newDone
      ? new Date().toISOString()
      : null;

    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              done: newDone,
              completed_at: completedAt,
            }
          : task
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({
        done: newDone,
        completed_at: completedAt,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Ошибка обновления задачи:",
        error
      );

      fetchTasks();
    }
  }

  async function deleteTask(id) {
    const user = await getCurrentUser();

    if (!user) {
      console.error("Пользователь не авторизован");
      return;
    }

    setTasks((current) =>
      current.filter((task) => task.id !== id)
    );

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Ошибка удаления задачи:",
        error
      );

      fetchTasks();
    }
  }

  const openCount = tasks.filter(
    (task) => !task.done
  ).length;

  if (loading) {
    return (
      <section className="px-5 pt-8">
        <p className="text-muted">
          Загрузка задач...
        </p>
      </section>
    );
  }

  return (
    <section className="px-5 pt-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-sm font-medium text-muted">
            Планер
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Задания
          </h1>

          <p className="mt-1 text-sm text-muted">
            {openCount
              ? `${openCount} ${pluralTasks(
                  openCount
                )} в работе`
              : "Все задачи выполнены"}
          </p>
        </div>

        <button
          type="button"
          onClick={openForm}
          className="mt-6 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          Добавить задачу
        </button>
      </div>

      {sortedTasks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-nav-border bg-surface px-5 py-12 text-center">
          <p className="text-base font-medium text-foreground">
            Пока пусто
          </p>

          <p className="mt-1 text-sm text-muted">
            Добавьте первую задачу, чтобы начать день.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() =>
                toggleDone(task.id, task.done)
              }
              onDelete={() =>
                deleteTask(task.id)
              }
            />
          ))}
        </ul>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Закрыть форму"
            className="absolute inset-0 bg-black/30"
            onClick={closeForm}
          />

          <div className="relative w-full max-w-lg rounded-t-3xl bg-surface p-5 pb-8 shadow-2xl sm:mx-5 sm:rounded-3xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-nav-border sm:hidden" />

            <h2 className="text-xl font-semibold tracking-tight">
              Новая задача
            </h2>

            <form
              className="mt-5 flex flex-col gap-4"
              onSubmit={handleSubmit}
            >
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Название
                </span>

                <input
                  autoFocus
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);

                    if (titleError) {
                      setTitleError("");
                    }
                  }}
                  placeholder="Что нужно сделать"
                  className="h-12 rounded-2xl border border-nav-border bg-background px-4 text-base outline-none ring-accent focus:ring-2"
                />

                {titleError ? (
                  <span className="text-sm text-danger">
                    {titleError}
                  </span>
                ) : null}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Заметка
                </span>

                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(event.target.value)
                  }
                  placeholder="Необязательно"
                  rows={3}
                  className="resize-none rounded-2xl border border-nav-border bg-background px-4 py-3 text-base outline-none ring-accent focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Дедлайн
                </span>

                <input
                  type="date"
                  value={deadline}
                  onChange={(event) =>
                    setDeadline(event.target.value)
                  }
                  className="h-12 rounded-2xl border border-nav-border bg-background px-4 text-base outline-none ring-accent focus:ring-2"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  Приоритет
                </span>

                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value)
                  }
                  className="h-12 rounded-2xl border border-nav-border bg-background px-4 text-base outline-none ring-accent focus:ring-2"
                >
                  {PRIORITIES.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="h-12 rounded-2xl bg-background font-medium text-muted"
                >
                  Отмена
                </button>

                <button
                  type="submit"
                  className="h-12 rounded-2xl bg-accent font-semibold text-white"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TaskCard({
  task,
  onToggle,
  onDelete,
}) {
  const overdue = isOverdue(task);
  const priority = priorityMeta(task.priority);

  return (
    <li
      className={`rounded-3xl border bg-surface p-4 shadow-[0_8px_24px_rgba(28,36,48,0.04)] ${
        overdue
          ? "border-danger/30 bg-danger-soft"
          : "border-nav-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={task.done}
          aria-label={
            task.done
              ? "Отметить как невыполненную"
              : "Отметить как выполненную"
          }
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            task.done
              ? "border-accent bg-accent text-white"
              : overdue
                ? "border-danger bg-surface"
                : "border-nav-border bg-surface"
          }`}
        >
          {task.done ? (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2.5 6.2L4.8 8.5 9.5 3.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2
              className={`text-base font-semibold leading-snug ${
                task.done
                  ? "text-muted line-through"
                  : overdue
                    ? "text-danger"
                    : "text-foreground"
              }`}
            >
              {task.title}
            </h2>

            <button
              type="button"
              onClick={onDelete}
              aria-label="Удалить задачу"
              className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-muted hover:bg-background hover:text-danger"
            >
              Удалить
            </button>
          </div>

          {task.note ? (
            <p
              className={`mt-1 text-sm leading-5 ${
                overdue && !task.done
                  ? "text-danger/80"
                  : "text-muted"
              }`}
            >
              {task.note}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                overdue
                  ? "bg-white text-danger"
                  : "bg-background text-muted"
              }`}
            >
              {overdue
                ? `Просрочено · ${formatDeadline(
                    task.deadline
                  )}`
                : formatDeadline(task.deadline)}
            </span>

            <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-muted">
              {priority.label}
            </span>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                task.done
                  ? "bg-accent-soft text-accent"
                  : "bg-background text-muted"
              }`}
            >
              {task.done
                ? "Выполнена"
                : "Не выполнена"}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}