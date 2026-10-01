"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function hashPairingCode(code) {
  const digest = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(code)
  );

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createPairingCode() {
  const randomBytes = window.crypto.getRandomValues(new Uint8Array(16));
  return Array.from(randomBytes, (byte) => PAIRING_ALPHABET[byte & 31]).join("");
}

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [pairingCode, setPairingCode] = useState("");
  const [creatingCode, setCreatingCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [telegramError, setTelegramError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setProfileError("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      setProfileError("Не удалось загрузить профиль. Обнови страницу.");
      setLoading(false);
      return;
    }

    if (!session) {
      router.replace("/login");
      return;
    }

    setEmail(session.user.email || "");

    const { data, error } = await supabase.rpc("get_telegram_link_status");
    if (error) {
      console.error("Не удалось загрузить статус Telegram:", error.code || "unknown");
      setTelegramError("Не удалось проверить подключение Telegram. Попробуй обновить страницу.");
      setTelegramStatus(null);
    } else {
      setTelegramStatus(data);
      setTelegramError("");
    }

    setLoading(false);
  }

  async function handleCreatePairingCode() {
    setCreatingCode(true);
    setTelegramError("");
    setCopied(false);

    try {
      const code = createPairingCode();
      const codeHash = await hashPairingCode(code);
      const { error } = await supabase.rpc("create_telegram_pairing_code", {
        p_code_hash: codeHash,
      });

      if (error) {
        if (error.message?.includes("PAIRING_CODE_RATE_LIMITED")) {
          setTelegramError("Новый код можно создать раз в минуту. Подожди немного и попробуй снова.");
        } else if (error.message?.includes("TELEGRAM_ALREADY_LINKED")) {
          await loadProfile();
          setTelegramError("Этот Planner уже подключён к Telegram.");
        } else {
          console.error("Не удалось создать код привязки:", error.code || "unknown");
          setTelegramError("Не удалось создать код. Обнови страницу и попробуй ещё раз.");
        }
        return;
      }

      setPairingCode(code);
    } catch (error) {
      console.error("Ошибка создания кода привязки:", error?.name || "unknown");
      setTelegramError("Не удалось создать код. Проверь подключение и попробуй ещё раз.");
    } finally {
      setCreatingCode(false);
    }
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(pairingCode);
      setCopied(true);
    } catch {
      setTelegramError("Не удалось скопировать код. Выдели его и скопируй вручную.");
    }
  }

  async function refreshTelegramStatus() {
    setTelegramError("");
    const { data, error } = await supabase.rpc("get_telegram_link_status");

    if (error) {
      console.error("Не удалось обновить статус Telegram:", error.code || "unknown");
      setTelegramError("Не удалось обновить статус. Попробуй ещё раз.");
      return;
    }

    setTelegramStatus(data);
    if (data?.linked) setPairingCode("");
  }

  async function handleLogout() {
    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Ошибка выхода:", error.code || "unknown");
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

      {profileError ? (
        <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">
          {profileError}
        </p>
      ) : null}

      <div className="mt-6 rounded-2xl border border-nav-border bg-surface p-5">
        <p className="text-sm text-muted">Аккаунт</p>

        <p className="mt-1 break-all text-base font-medium text-foreground">
          {email}
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-nav-border bg-surface p-5">
        <p className="text-sm font-medium text-foreground">Подключение Telegram</p>

        {telegramStatus?.linked ? (
          <>
            <p className="mt-2 text-sm text-muted">
              Telegram подключён к этому аккаунту Planner.
              {telegramStatus.telegram_username ? ` Имя пользователя: @${telegramStatus.telegram_username}.` : ""}
            </p>
            <button
              type="button"
              onClick={refreshTelegramStatus}
              className="mt-3 rounded-xl border border-nav-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
            >
              Обновить статус
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-muted">
              Создай одноразовый код, затем отправь его боту в Telegram. Код действует 10 минут.
            </p>

            {pairingCode ? (
              <div className="mt-4 rounded-xl bg-accent-soft p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Код подключения
                </p>
                <p className="mt-2 break-all font-mono text-xl font-bold tracking-[0.12em] text-foreground">
                  {pairingCode}
                </p>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="mt-3 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  {copied ? "Скопировано" : "Скопировать код"}
                </button>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Открой Telegram, отправь боту команду /start и пришли ему этот код.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCreatePairingCode}
                disabled={creatingCode || !telegramStatus}
                className="mt-4 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingCode ? "Создаю код..." : "Создать код подключения"}
              </button>
            )}
          </>
        )}

        {telegramError ? (
          <p role="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-sm text-danger">
            {telegramError}
          </p>
        ) : null}
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
