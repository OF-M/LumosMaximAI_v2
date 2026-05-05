"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Aperture, Mail, Lock, ArrowRight, User, Github } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual registration logic
    console.log("Registration attempt:", { name, email, password });
  };

  return (
    <main className="min-h-screen bg-sensor-black text-titanium flex flex-col items-center justify-center pt-32 pb-12 px-6 relative overflow-hidden font-sans noise-overlay">
      
      {/* Background Grid */}
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mb-10 z-10 transition-transform hover:scale-105">
        <div className="w-12 h-12 bg-black border border-neutral-800 flex items-center justify-center">
          <Aperture className="w-6 h-6 text-optic-amber" />
        </div>
        <span className="text-3xl font-black tracking-tight text-white uppercase">LumosMaximAI</span>
      </Link>

      {/* Register Card */}
      <div className="w-full max-w-md bg-sensor-charcoal border border-neutral-900 p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8 border-b border-neutral-900 pb-6">
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Create an Account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-neutral-500 uppercase tracking-widest" htmlFor="name">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="FULL NAME"
                className="w-full bg-black border border-neutral-800 rounded-none py-3 pl-10 pr-4 text-white placeholder:text-neutral-700 font-mono text-sm focus:outline-none focus:border-neutral-500 transition-all"
              />
            </div>
          </div>

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
            <label className="text-xs font-mono text-neutral-500 uppercase tracking-widest" htmlFor="password">Password</label>
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
            <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-wider mt-1.5">Min length: 8 chars.</p>
          </div>

          <button
            type="submit"
            className="w-full bg-titanium hover:bg-white text-black font-bold font-mono text-sm uppercase tracking-widest py-3.5 transition-colors tactile-btn flex items-center justify-center gap-2 mt-4"
          >
            Sign Up <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 flex gap-3">
          <button className="flex-1 bg-black border border-neutral-800 hover:border-neutral-500 text-neutral-400 hover:text-white py-2.5 flex items-center justify-center gap-2 transition-colors font-mono text-xs uppercase tactile-btn">
            <Github className="w-4 h-4" /> Github
          </button>
          <button className="flex-1 bg-black border border-neutral-800 hover:border-neutral-500 text-neutral-400 hover:text-white py-2.5 flex items-center justify-center gap-2 transition-colors font-mono text-xs uppercase tactile-btn">
            Google
          </button>
        </div>

        <p className="mt-8 text-center text-xs font-mono text-neutral-600 uppercase">
          Already have an account?{" "}
          <Link href="/login" className="text-neutral-400 hover:text-white transition-colors border-b border-transparent hover:border-white">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
