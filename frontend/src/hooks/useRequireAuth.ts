"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Safety valve: if auth takes more than 6s, redirect to login
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setTimedOut(true), 6000);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (timedOut && !user) router.push("/login");
  }, [timedOut, user, router]);

  return { user, loading: loading && !timedOut };
}
