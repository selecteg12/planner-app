"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    setEmail(session.user.email || "");
    setLoading(false);
  }

  async function handleLogout() {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Ошибка выхода:", error);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <section className="px-5 pt-8">
        <p className="text-sm text-muted">Загрузка...</p>
      </section>
    );
  }

  return (
    <section className="px-5 pt-8">
      <p className="mb-2 text-sm font-medium text-muted">Планер</p>

      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Профиль
      </h1>

      <div className="mt-6 rounded-2xl border border-nav-border bg-surface p-5">
        <p className="text-sm text-muted">Аккаунт</p>

        <p className="mt-1 break-all text-base font-medium text-foreground">
          {email}
        </p>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="mt-4 w-full rounded-2xl bg-danger px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loggingOut ? "Выход..." : "Выйти из аккаунта"}
      </button>
    </section>
  );
}