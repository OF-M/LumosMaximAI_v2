"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { History, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const PLAN_STYLES: Record<string, { label: string; className: string }> = {
  starter:      { label: "Starter",      className: "bg-neutral-800 text-neutral-400 border border-neutral-700" },
  professional: { label: "Professional", className: "bg-optic-amber/20 text-optic-amber border border-optic-amber/40" },
  studio_max:   { label: "Studio Max",   className: "bg-white/10 text-white border border-white/30" },
};

export function Navbar() {
  const { user, loading, plan, signOut } = useAuth();
  const router = useRouter();
  const planStyle = PLAN_STYLES[plan] ?? PLAN_STYLES.starter;
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    setMobileOpen(false);
    await signOut();
    router.push("/");
  };

  const closeMenu = () => setMobileOpen(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-neutral-950/80 backdrop-blur-lg border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105" onClick={closeMenu}>
          <Image src="/logo.png" alt="LumosMaximAI Logo" width={36} height={36} className="rounded-xl shadow-lg object-cover" />
          <span className="text-lg md:text-xl font-bold tracking-tight text-white">LumosMaximAI</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/#pricing" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">Plans</Link>

          {!loading && user ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5">
                <History className="w-4 h-4" /> Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
              <Link href="/studio" className="bg-white hover:bg-neutral-200 text-neutral-950 px-5 py-2.5 rounded-xl text-sm font-semibold transition-transform hover:-translate-y-0.5">
                Enhance Footage
              </Link>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs font-mono text-neutral-500 truncate max-w-[160px]">{user.email}</span>
                <span className={`text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm ${planStyle.className}`}>
                  {planStyle.label}
                </span>
              </div>
            </>
          ) : !loading ? (
            <>
              <Link href="/login" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
                Log In
              </Link>
              <Link href="/register" className="bg-white hover:bg-neutral-200 text-neutral-950 px-5 py-2.5 rounded-xl text-sm font-semibold transition-transform hover:-translate-y-0.5">
                Start Enhancing
              </Link>
            </>
          ) : null}
        </div>

        {/* Mobile hamburger button */}
        <button
          className="md:hidden p-2 text-neutral-400 hover:text-white transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-800 bg-neutral-950/95 backdrop-blur-lg">
          <div className="px-4 py-3 flex flex-col">
            <Link
              href="/#pricing"
              className="text-sm font-medium text-neutral-400 hover:text-white transition-colors py-3 border-b border-neutral-900"
              onClick={closeMenu}
            >
              Plans
            </Link>

            {!loading && user ? (
              <>
                <div className="py-3 border-b border-neutral-900 flex items-center justify-between gap-3">
                  <span className="text-xs font-mono text-neutral-500 truncate">{user.email}</span>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm shrink-0 ${planStyle.className}`}>
                    {planStyle.label}
                  </span>
                </div>
                <Link
                  href="/studio"
                  className="text-sm font-semibold text-white py-3 border-b border-neutral-900 flex items-center gap-2"
                  onClick={closeMenu}
                >
                  Enhance Footage
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-neutral-400 hover:text-white transition-colors py-3 border-b border-neutral-900 flex items-center gap-1.5"
                  onClick={closeMenu}
                >
                  <History className="w-4 h-4" /> Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium text-neutral-400 hover:text-white transition-colors py-3 text-left flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : !loading ? (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-neutral-400 hover:text-white transition-colors py-3 border-b border-neutral-900"
                  onClick={closeMenu}
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold text-white py-3"
                  onClick={closeMenu}
                >
                  Start Enhancing
                </Link>
              </>
            ) : null}
          </div>
        </div>
      )}
    </nav>
  );
}
