"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

const PUBLIC_ROUTES = ["/login", "/signup"];

export default function AuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(session);
      setLoading(false);

      if (!session && !PUBLIC_ROUTES.includes(pathname)) {
        router.replace("/login");
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (
        event === "SIGNED_OUT" &&
        !PUBLIC_ROUTES.includes(pathname)
      ) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (loading && !isPublicRoute) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5">
        <div className="text-sm text-muted">Загрузка...</div>
      </div>
    );
  }

  if (!session && !isPublicRoute) {
    return null;
  }

  return (
    <>
      {children}
      {session ? <BottomNav /> : null}
    </>
  );
}