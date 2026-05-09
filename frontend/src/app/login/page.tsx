"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Github } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/studio");
    }
  };

  return (
    <main className="min-h-screen bg-sensor-black text-titanium flex flex-col items-center justify-center pt-32 pb-12 px-6 relative overflow-hidden font-sans noise-overlay">

      {/* Background Grid */}
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-sensor-charcoal border border-neutral-900 p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8 border-b border-neutral-900 pb-6">
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Welcome Back</h1>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-950/50 border border-red-800 text-red-400 text-xs font-mono uppercase tracking-wide">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-neutral-500 uppercase tracking-widest" htmlFor="email">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="USER@DOMAIN.COM"
                className="w-full bg-black border border-neutral-800 rounded-none py-3 pl-10 pr-4 text-white placeholder:text-neutral-700 font-mono text-sm focus:outline-none focus:border-neutral-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-neutral-500 uppercase tracking-widest" htmlFor="password">Password</label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-black border border-neutral-800 rounded-none py-3 pl-10 pr-4 text-white placeholder:text-neutral-700 font-mono text-sm focus:outline-none focus:border-neutral-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-titanium hover:bg-white text-black font-bold font-mono text-sm uppercase tracking-widest py-3.5 transition-colors tactile-btn flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing In..." : <><span>Sign In</span> <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-mono text-neutral-600 uppercase">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-neutral-400 hover:text-white transition-colors border-b border-transparent hover:border-white">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
