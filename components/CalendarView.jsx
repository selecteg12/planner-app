"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";

const EVENT_COLORS = [
  { value: "#3b82f6", label: "Синий" },
  { value: "#10b981", label: "Зелёный" },
  { value: "#f59e0b", label: "Оранжевый" },
  { value: "#ef4444", label: "Красный" },
  { value: "#8b5cf6", label: "Фиолетовый" },
  { value: "#ec4899", label: "Розовый" },
];

// ---------- helpers ----------

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeek(d) {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  x.setDate(x.getDate() + diff);

  return x;
}

function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);

  e.setDate(e.getDate() + 6);

  return endOfDay(e);
}

function startOfMonth(d) {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    1
  );
}

function endOfMonth(d) {
  return endOfDay(
    new Date(
      d.getFullYear(),
      d.getMonth() + 1,
      0
    )
  );
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalInputValue(date) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(
    d.getTime() - offset * 60000
  );

  return local.toISOString().slice(0, 16);
}

function getMonthMatrix(current) {
  const start = startOfWeek(
    startOfMonth(current)
  );

  const end = endOfWeek(
    endOfMonth(current)
  );

  const days = [];

  let cursor = new Date(start);

  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }

  return days;
}

// ---------- component ----------

export default function CalendarView() {
  const [view, setView] = useState("month");

  const [cursor, setCursor] = useState(() =>
    startOfDay(new Date())
  );

  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [color, setColor] = useState(
    EVENT_COLORS[0].value
  );

  const [formError, setFormError] = useState("");

  // task popup
  const [taskPopup, setTaskPopup] = useState(null);

  useEffect(() => {
    fetchData();
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

  async function fetchData() {
    setLoading(true);

    const user = await getCurrentUser();

    if (!user) {
      console.error(
        "Пользователь не авторизован"
      );

      setEvents([]);
      setTasks([]);
      setLoading(false);

      return;
    }

    const [evRes, taskRes] = await Promise.all([
      supabase
        .from("events")
        .select("*")
        .eq("user_id", user.id)
        .order("start_at"),

      supabase
        .from("tasks")
        .select(
          "id, title, deadline, done, user_id"
        )
        .eq("user_id", user.id),
    ]);

    if (evRes.error) {
      console.error("Ошибка загрузки events");
      console.error("message:", evRes.error.message);
      console.error("code:", evRes.error.code);
      console.error("details:", evRes.error.details);
      console.error("hint:", evRes.error.hint);
    }

    if (taskRes.error) {
      console.error(
        "Ошибка загрузки задач:",
        taskRes.error
      );
    }

    setEvents(evRes.data || []);
    setTasks(taskRes.data || []);

    setLoading(false);
  }

  // ---- navigation ----

  function goToday() {
    setCursor(startOfDay(new Date()));
  }

  function goPrev() {
    if (view === "month") {
      setCursor(
        new Date(
          cursor.getFullYear(),
          cursor.getMonth() - 1,
          1
        )
      );
    } else {
      setCursor(addDays(cursor, -7));
    }
  }

  function goNext() {
    if (view === "month") {
      setCursor(
        new Date(
          cursor.getFullYear(),
          cursor.getMonth() + 1,
          1
        )
      );
    } else {
      setCursor(addDays(cursor, 7));
    }
  }

  // ---- events helpers ----

  const eventsByDay = useMemo(() => {
    const map = {};

    events.forEach((ev) => {
      const key = formatDateKey(
        new Date(ev.start_at)
      );

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(ev);
    });

    return map;
  }, [events]);

  const tasksByDay = useMemo(() => {
    const map = {};

    tasks.forEach((task) => {
      if (!task.deadline || task.done) {
        return;
      }

      const key = task.deadline;

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(task);
    });

    return map;
  }, [tasks]);

  // ---- modal ----

  function openCreate(day, hour = 10) {
    const start = new Date(day);

    start.setHours(hour, 0, 0, 0);

    const end = new Date(start);

    end.setHours(hour + 1, 0, 0, 0);

    setEditingId(null);
    setTitle("");

    setStartAt(
      toLocalInputValue(start)
    );

    setEndAt(
      toLocalInputValue(end)
    );

    setColor(EVENT_COLORS[0].value);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(ev) {
    setEditingId(ev.id);
    setTitle(ev.title);

    setStartAt(
      toLocalInputValue(ev.start_at)
    );

    setEndAt(
      toLocalInputValue(ev.end_at)
    );

    setColor(
      ev.color || EVENT_COLORS[0].value
    );

    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setFormError("");
  }

  async function handleSave(e) {
    e.preventDefault();

    const t = title.trim();

    if (!t) {
      setFormError("Введите название");
      return;
    }

    if (!startAt || !endAt) {
      setFormError(
        "Укажите время начала и конца"
      );
      return;
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (end <= start) {
      setFormError(
        "Конец должен быть позже начала"
      );
      return;
    }

    if (!sameDay(start, end)) {
      setFormError(
        "Событие должно быть в пределах одного дня"
      );
      return;
    }

    const user = await getCurrentUser();

    if (!user) {
      setFormError(
        "Пользователь не авторизован"
      );
      return;
    }

    const payload = {
      title: t,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      color,
      user_id: user.id,
    };

    if (editingId) {
      const { data, error } =
        await supabase
          .from("events")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id)
          .select()
          .single();

      if (error) {
        console.error(
          "Ошибка обновления события:",
          error
        );

        setFormError(
          error.message ||
            "Не удалось сохранить"
        );

        return;
      }

      setEvents((current) =>
        current.map((event) =>
          event.id === editingId
            ? data
            : event
        )
      );
    } else {
      const { data, error } =
        await supabase
          .from("events")
          .insert([payload])
          .select()
          .single();

      if (error) {
        console.error(
          "Ошибка создания события:",
          error
        );

        setFormError(
          error.message ||
            "Не удалось создать"
        );

        return;
      }

      setEvents((current) => [
        ...current,
        data,
      ]);
    }

    closeModal();
  }

  async function handleDelete() {
    if (!editingId) return;

    const user = await getCurrentUser();

    if (!user) {
      setFormError(
        "Пользователь не авторизован"
      );
      return;
    }

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", editingId)
      .eq("user_id", user.id);

    if (error) {
      console.error(
        "Ошибка удаления события:",
        error
      );

      setFormError(
        "Не удалось удалить"
      );

      return;
    }

    setEvents((current) =>
      current.filter(
        (event) =>
          event.id !== editingId
      )
    );

    closeModal();
  }

  // ---- render helpers ----

  const monthDays = useMemo(
    () => getMonthMatrix(cursor),
    [cursor]
  );

  const weekStart = useMemo(
    () => startOfWeek(cursor),
    [cursor]
  );

  const weekDays = useMemo(
    () =>
      Array.from(
        { length: 7 },
        (_, i) =>
          addDays(weekStart, i)
      ),
    [weekStart]
  );

  const headerTitle =
    view === "month"
      ? cursor.toLocaleDateString(
          "ru-RU",
          {
            month: "long",
            year: "numeric",
          }
        )
      : `${weekDays[0].toLocaleDateString(
          "ru-RU",
          {
            day: "numeric",
            month: "short",
          }
        )} – ${weekDays[6].toLocaleDateString(
          "ru-RU",
          {
            day: "numeric",
            month: "short",
            year: "numeric",
          }
        )}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <p className="text-muted">
          Загрузка календаря...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">

        {/* Header */}

        <div className="mb-5">
          <p className="text-sm text-muted">
            Планер
          </p>

          <div className="flex items-center justify-between mt-1">
            <h1 className="text-2xl font-bold text-foreground capitalize">
              {headerTitle}
            </h1>

            <div className="flex items-center gap-1">
              <button
                onClick={goPrev}
                className="w-9 h-9 rounded-full bg-surface border border-nav-border flex items-center justify-center text-muted hover:text-foreground"
              >
                ‹
              </button>

              <button
                onClick={goToday}
                className="px-3 h-9 rounded-full bg-surface border border-nav-border text-sm font-medium text-muted hover:text-foreground"
              >
                Сегодня
              </button>

              <button
                onClick={goNext}
                className="w-9 h-9 rounded-full bg-surface border border-nav-border flex items-center justify-center text-muted hover:text-foreground"
              >
                ›
              </button>
            </div>
          </div>

          {/* View switcher */}

          <div className="mt-4 flex bg-surface border border-nav-border rounded-2xl p-1">
            <button
              onClick={() =>
                setView("month")
              }
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                view === "month"
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Месяц
            </button>

            <button
              onClick={() =>
                setView("week")
              }
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                view === "week"
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Неделя
            </button>
          </div>
        </div>

        {/* MONTH VIEW */}

        {view === "month" && (
          <div className="bg-surface rounded-2xl border border-nav-border overflow-hidden">

            <div className="grid grid-cols-7 border-b border-nav-border">
              {[
                "Пн",
                "Вт",
                "Ср",
                "Чт",
                "Пт",
                "Сб",
                "Вс",
              ].map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-[11px] font-medium text-muted"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthDays.map((day) => {
                const key =
                  formatDateKey(day);

                const isCurrentMonth =
                  day.getMonth() ===
                  cursor.getMonth();

                const isToday = sameDay(
                  day,
                  new Date()
                );

                const dayEvents =
                  eventsByDay[key] || [];

                const dayTasks =
                  tasksByDay[key] || [];

                return (
                  <div
                    key={key}
                    onClick={() =>
                      openCreate(day)
                    }
                    className={`min-h-[92px] border-b border-r border-nav-border p-1 cursor-pointer hover:bg-accent-soft/40 transition ${
                      !isCurrentMonth
                        ? "bg-background/60"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday
                            ? "bg-accent text-white"
                            : isCurrentMonth
                              ? "text-foreground"
                              : "text-muted"
                        }`}
                      >
                        {day.getDate()}
                      </span>

                      {dayTasks.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            setTaskPopup({
                              titles:
                                dayTasks.map(
                                  (task) =>
                                    task.title
                                ),
                              key,
                            });
                          }}
                          className="flex gap-0.5"
                          title={dayTasks
                            .map(
                              (task) =>
                                task.title
                            )
                            .join(", ")}
                        >
                          {dayTasks
                            .slice(0, 3)
                            .map((_, index) => (
                              <span
                                key={index}
                                className="w-1.5 h-1.5 rounded-full bg-danger"
                              />
                            ))}
                        </button>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      {dayEvents
                        .slice(0, 3)
                        .map((event) => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(event);
                            }}
                            className="text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white"
                            style={{
                              backgroundColor:
                                event.color ||
                                "#3b82f6",
                            }}
                          >
                            {formatTime(
                              event.start_at
                            )}{" "}
                            {event.title}
                          </div>
                        ))}

                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted px-1">
                          +
                          {dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}

        {view === "week" && (
          <div className="bg-surface rounded-2xl border border-nav-border overflow-hidden">

            <div className="grid grid-cols-8 border-b border-nav-border sticky top-0 bg-surface z-10">
              <div className="py-2" />

              {weekDays.map((day) => {
                const isToday = sameDay(
                  day,
                  new Date()
                );

                return (
                  <div
                    key={formatDateKey(day)}
                    className="py-2 text-center"
                  >
                    <div className="text-[10px] text-muted">
                      {day.toLocaleDateString(
                        "ru-RU",
                        {
                          weekday: "short",
                        }
                      )}
                    </div>

                    <div
                      className={`mt-0.5 text-sm font-semibold w-7 h-7 mx-auto flex items-center justify-center rounded-full ${
                        isToday
                          ? "bg-accent text-white"
                          : "text-foreground"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="max-h-[560px] overflow-y-auto relative">

              {Array.from(
                { length: 24 },
                (_, hour) => (
                  <div
                    key={hour}
                    className="grid grid-cols-8 border-b border-nav-border/50"
                  >
                    <div className="py-3 pr-1 text-right text-[10px] text-muted h-14 flex items-start justify-end">
                      {String(hour).padStart(
                        2,
                        "0"
                      )}
                      :00
                    </div>

                    {weekDays.map((day) => (
                      <div
                        key={
                          formatDateKey(
                            day
                          ) + hour
                        }
                        onClick={() =>
                          openCreate(
                            day,
                            hour
                          )
                        }
                        className="relative h-14 border-l border-nav-border/40 cursor-pointer hover:bg-accent-soft/30"
                      />
                    ))}
                  </div>
                )
              )}

              <div className="absolute inset-0 pointer-events-none">
                <div className="grid grid-cols-8 h-full">
                  <div />

                  {weekDays.map((day) => {
                    const key =
                      formatDateKey(day);

                    const dayEvents =
                      eventsByDay[key] || [];

                    return (
                      <div
                        key={key}
                        className="relative border-l border-transparent"
                      >
                        {dayEvents.map(
                          (event) => {
                            const start =
                              new Date(
                                event.start_at
                              );

                            const end =
                              new Date(
                                event.end_at
                              );

                            const startMinutes =
                              start.getHours() *
                                60 +
                              start.getMinutes();

                            const endMinutes =
                              end.getHours() *
                                60 +
                              end.getMinutes();

                            const duration =
                              Math.max(
                                endMinutes -
                                  startMinutes,
                                20
                              );

                            const top =
                              (startMinutes /
                                60) *
                              56;

                            const height =
                              (duration / 60) *
                              56;

                            return (
                              <div
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(event);
                                }}
                                className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-[10px] text-white overflow-hidden cursor-pointer pointer-events-auto shadow-sm"
                                style={{
                                  backgroundColor:
                                    event.color ||
                                    "#3b82f6",
                                  top: `${top}px`,
                                  height: `${height}px`,
                                }}
                              >
                                <div className="font-semibold leading-tight truncate">
                                  {event.title}
                                </div>

                                <div className="opacity-90 leading-tight">
                                  {formatTime(
                                    event.start_at
                                  )}
                                  –
                                  {formatTime(
                                    event.end_at
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}

        <div className="mt-4 flex items-center gap-3 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-danger" />
            <span>Дедлайн задачи</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span>Событие</span>
          </div>
        </div>
      </div>

      {/* TASK POPUP */}

      {taskPopup && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
          onClick={() =>
            setTaskPopup(null)
          }
        >
          <div className="absolute inset-0 bg-black/30" />

          <div
            className="relative w-full max-w-sm mx-4 mb-8 sm:mb-0 bg-surface rounded-2xl p-4 shadow-xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h3 className="font-semibold text-foreground mb-2">
              Задачи на этот день
            </h3>

            <ul className="space-y-1.5">
              {taskPopup.titles.map(
                (taskTitle, index) => (
                  <li
                    key={index}
                    className="text-sm text-foreground flex items-start gap-2"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-danger shrink-0" />

                    {taskTitle}
                  </li>
                )
              )}
            </ul>

            <button
              onClick={() =>
                setTaskPopup(null)
              }
              className="mt-4 w-full h-10 rounded-xl bg-background text-sm font-medium text-muted"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* EVENT MODAL */}

      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <button
            className="absolute inset-0 bg-black/30"
            onClick={closeModal}
            aria-label="Закрыть"
          />

          <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-surface p-5 pb-8 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-nav-border sm:hidden" />

            <h2 className="text-xl font-semibold tracking-tight">
              {editingId
                ? "Редактировать событие"
                : "Новое событие"}
            </h2>

            <form
              className="mt-5 flex flex-col gap-4"
              onSubmit={handleSave}
            >
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">
                  Название
                </span>

                <input
                  autoFocus
                  value={title}
                  onChange={(e) =>
                    setTitle(
                      e.target.value
                    )
                  }
                  placeholder="Что запланировано"
                  className="h-12 rounded-2xl border border-nav-border bg-background px-4 text-base outline-none ring-accent focus:ring-2"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    Начало
                  </span>

                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) =>
                      setStartAt(
                        e.target.value
                      )
                    }
                    className="h-12 rounded-2xl border border-nav-border bg-background px-3 text-sm outline-none ring-accent focus:ring-2"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">
                    Конец
                  </span>

                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) =>
                      setEndAt(
                        e.target.value
                      )
                    }
                    className="h-12 rounded-2xl border border-nav-border bg-background px-3 text-sm outline-none ring-accent focus:ring-2"
                  />
                </label>
              </div>

              <div>
                <span className="text-sm font-medium mb-2 block">
                  Цвет
                </span>

                <div className="flex flex-wrap gap-2">
                  {EVENT_COLORS.map(
                    (eventColor) => (
                      <button
                        key={
                          eventColor.value
                        }
                        type="button"
                        onClick={() =>
                          setColor(
                            eventColor.value
                          )
                        }
                        className={`w-8 h-8 rounded-full border-2 transition ${
                          color ===
                          eventColor.value
                            ? "border-foreground scale-110"
                            : "border-transparent"
                        }`}
                        style={{
                          backgroundColor:
                            eventColor.value,
                        }}
                        title={
                          eventColor.label
                        }
                      />
                    )
                  )}
                </div>
              </div>

              {formError && (
                <p className="text-sm text-danger">
                  {formError}
                </p>
              )}

              <div className="mt-2 grid grid-cols-2 gap-3">
                {editingId ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="h-12 rounded-2xl bg-danger-soft font-medium text-danger"
                  >
                    Удалить
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={closeModal}
                    className="h-12 rounded-2xl bg-background font-medium text-muted"
                  >
                    Отмена
                  </button>
                )}

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
      )}
    </div>
  );
}