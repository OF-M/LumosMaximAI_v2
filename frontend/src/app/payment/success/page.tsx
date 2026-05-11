"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function PaymentSuccess() {
  const { refreshPlan } = useAuth();

  useEffect(() => {
    // Give the webhook a moment to process, then refresh the plan in context
    const t = setTimeout(() => refreshPlan(), 2000);
    return () => clearTimeout(t);
  }, []);

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
