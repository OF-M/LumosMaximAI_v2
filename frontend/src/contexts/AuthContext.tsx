"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type Plan = "starter" | "professional" | "studio_max";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  plan: Plan;
  signOut: () => Promise<void>;
  refreshPlan: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  plan: "starter",
  signOut: async () => {},
  refreshPlan: async () => {},
});

async function fetchPlan(userId: string): Promise<Plan> {
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  return (data?.plan as Plan) ?? "starter";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan>("starter");

  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        try {
          if (session?.user) setPlan(await fetchPlan(session.user.id));
        } finally {
          setLoading(false);
        }
      })
      .catch(() => {
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      try {
        if (session?.user) {
          setPlan(await fetchPlan(session.user.id));
        } else {
          setPlan("starter");
        }
      } catch {}
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshPlan = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) setPlan(await fetchPlan(session.user.id));
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, plan, signOut, refreshPlan }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
