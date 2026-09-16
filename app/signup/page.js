"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.replace("/calendar");
      router.refresh();
      return;
    }

    setSuccess(
      "Аккаунт создан. Проверь почту и подтверди email."
    );

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full rounded-3xl bg-surface p-6 shadow-sm border border-nav-border">
          <div className="mb-8">
            <p className="mb-2 text-sm font-medium text-muted">
              Планер
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Регистрация
            </h1>

            <p className="mt-2 text-sm text-muted">
              Создай аккаунт
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">
                Email
              </span>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="h-12 rounded-2xl border border-nav-border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-accent"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">
                Пароль
              </span>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Минимум 6 символов"
                autoComplete="new-password"
                required
                className="h-12 rounded-2xl border border-nav-border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-accent"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">
                Повторите пароль
              </span>

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Повторите пароль"
                autoComplete="new-password"
                required
                className="h-12 rounded-2xl border border-nav-border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-accent"
              />
            </label>

            {error ? (
              <p className="text-sm text-danger">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="text-sm text-green-600">
                {success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-12 rounded-2xl bg-accent font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading
                ? "Создаём аккаунт..."
                : "Зарегистрироваться"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="mt-5 w-full text-sm text-muted hover:text-foreground"
          >
            Уже есть аккаунт? Войти
          </button>
        </div>
      </div>
    </main>
  );
}