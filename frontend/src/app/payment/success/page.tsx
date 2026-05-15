"use client";

import React, { useEffect, Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

function PaymentSuccessContent() {
  const { user, session, refreshPlan } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId || !user || !session?.access_token) return;

    fetch(`${BACKEND}/api/v1/payments/sync-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ session_id: sessionId, user_id: user.id }),
    })
      .then(() => refreshPlan())
      .catch(() => setTimeout(() => refreshPlan(), 3000));
  }, [user?.id, session?.access_token, searchParams, refreshPlan]);

  return (
    <main className="min-h-screen bg-sensor-black text-titanium flex flex-col items-center justify-center px-6 font-sans noise-overlay relative">
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

      <div className="w-full max-w-md bg-sensor-charcoal border border-neutral-900 p-12 text-center relative z-10">
        <div className="flex justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white mb-3">
          Subscription Active
        </h1>
        <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest mb-10 leading-relaxed">
          Your plan is now active. You can start enhancing your footage right away.
        </p>
        <Link
          href="/studio"
          className="w-full inline-block text-center bg-titanium hover:bg-white text-black font-bold font-mono text-sm uppercase tracking-widest py-4 transition-colors tactile-btn"
        >
          Go to Studio
        </Link>
      </div>
    </main>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-sensor-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
