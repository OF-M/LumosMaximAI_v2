import Link from "next/link";
import { Wand2, History } from "lucide-react";

export function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-neutral-950/80 backdrop-blur-lg border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shadow-[inset_0_1px_rgba(255,255,255,0.4)]">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">LumosMaximAI</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/#pricing" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden md:block">Pricing</Link>
          <Link href="/dashboard" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5">
            <History className="w-4 h-4" /> Dashboard
          </Link>
          <Link href="/login" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
            Log In
          </Link>
          <Link href="/studio" className="bg-white hover:bg-neutral-200 text-neutral-950 px-5 py-2.5 rounded-xl text-sm font-semibold transition-transform hover:-translate-y-0.5">
            Enhance Video
          </Link>
        </div>
      </div>
    </nav>
  );
}
