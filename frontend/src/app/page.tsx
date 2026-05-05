"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Moon, Wand2, History, ArrowRight, Video, ShieldCheck, Zap, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-indigo-500/30 overflow-x-hidden">



      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Deep Layer Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-600/30 blur-[150px] rounded-[100%] pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" /> LumosMaximAI 2.0 is Live
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter max-w-4xl text-white mb-8 leading-[1.1]">
          Bring your dark footage <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400">into the light.</span>
        </h1>
        <p className="text-xl md:text-2xl text-neutral-400 max-w-2xl font-medium mb-12">
          Professional-grade video denoising and extreme low-light enhancement powered by zero-reference deep learning architectures.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/studio" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl text-lg font-semibold flex items-center gap-2 transition-all hover:-translate-y-1 shadow-[0_0_40px_rgba(79,70,229,0.4)]">
            <Wand2 className="w-5 h-5" /> Start Enhancing For Free
          </Link>
          <Link href="#pricing" className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white px-8 py-4 rounded-2xl text-lg font-medium flex items-center gap-2 transition-colors">
            View Pricing
          </Link>
        </div>
      </section>

      {/* Features Outline */}
      <section className="py-24 bg-black border-y border-neutral-900 relative">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
              <Moon className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Zero-DCE Low-Light</h3>
            <p className="text-neutral-400 leading-relaxed">Illuminate impossibly dark surveillance footage without amplifying noise or introducing artifacting.</p>
          </div>
          <div className="space-y-4">
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
              <Video className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Spatial Denoising</h3>
            <p className="text-neutral-400 leading-relaxed">Remove heavy ISO grain from night shots or low-quality sensors securely using spatial neural networks.</p>
          </div>
          <div className="space-y-4">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Secure Local Storage</h3>
            <p className="text-neutral-400 leading-relaxed">Your files never leave your encrypted project folder, satisfying strict regulatory & IP demands.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6 max-w-7xl mx-auto relative">
        <div className="absolute right-0 top-1/4 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none" />

        <div className="text-center mb-20 relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Simple, transparent pricing.</h2>
          <p className="text-lg text-neutral-400">Choose the perfect tier for your workflow.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative z-10">

          {/* Free Tier */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 flex flex-col hover:border-neutral-700 transition-colors">
            <h3 className="text-lg font-semibold text-neutral-300">Starter Core</h3>
            <div className="mt-4 mb-8">
              <span className="text-5xl font-bold text-white">£0</span>
              <span className="text-neutral-500 font-medium">/mo</span>
            </div>
            <p className="text-neutral-400 text-sm mb-8 leading-relaxed">Perfect for testing the AI and evaluating the results on single clips.</p>

            <ul className="space-y-4 mb-10 flex-grow">
              <li className="flex items-center gap-3 text-neutral-300 text-sm">
                <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                <span><strong>5</strong> Enhancements per month</span>
              </li>
              <li className="flex items-center gap-3 text-neutral-300 text-sm">
                <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                <span>Up to <strong>1080p</strong> resolution</span>
              </li>
              <li className="flex items-center gap-3 text-neutral-300 text-sm">
                <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                <span>Standard Queue Priority</span>
              </li>
            </ul>

            <Link href="/register" className="w-full text-center bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-3.5 rounded-xl transition-colors">
              Get Started
            </Link>
          </div>

          {/* Professional Tier (Highlighted) */}
          <div className="bg-gradient-to-b from-indigo-900/50 to-neutral-900 border border-indigo-500/50 rounded-3xl p-8 flex flex-col relative transform md:-translate-y-4 shadow-2xl shadow-indigo-900/50">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
              Most Popular
            </div>
            <h3 className="text-lg font-semibold text-indigo-200">Professional</h3>
            <div className="mt-4 mb-8">
              <span className="text-5xl font-bold text-white">£20</span>
              <span className="text-neutral-400 font-medium">/mo</span>
            </div>
            <p className="text-indigo-200/70 text-sm mb-8 leading-relaxed">For independent creators & PI security firms needing reliable enhancement.</p>

            <ul className="space-y-4 mb-10 flex-grow">
              <li className="flex items-center gap-3 text-white text-sm">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                <span><strong>100</strong> Enhancements per month</span>
              </li>
              <li className="flex items-center gap-3 text-white text-sm">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                <span>Up to <strong>4K UHD</strong> resolution</span>
              </li>
              <li className="flex items-center gap-3 text-white text-sm">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                <span><strong>Priority</strong> Queue Processing</span>
              </li>
              <li className="flex items-center gap-3 text-white text-sm">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                <span>Email Support</span>
              </li>
            </ul>

            <Link href="/register" className="w-full text-center bg-indigo-500 hover:bg-indigo-400 text-white font-semibold py-3.5 rounded-xl shadow-lg transition-colors">
              Start Pro Trial
            </Link>
          </div>

          {/* Studio Tier */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 flex flex-col hover:border-neutral-700 transition-colors">
            <h3 className="text-lg font-semibold text-neutral-300">Studio Max</h3>
            <div className="mt-4 mb-8">
              <span className="text-5xl font-bold text-white">£100</span>
              <span className="text-neutral-500 font-medium">/mo</span>
            </div>
            <p className="text-neutral-400 text-sm mb-8 leading-relaxed">For commercial labs needing limitless processing and advanced model tuning.</p>

            <ul className="space-y-4 mb-10 flex-grow">
              <li className="flex items-center gap-3 text-neutral-300 text-sm">
                <CheckCircle2 className="w-5 h-5 text-purple-500" />
                <span><strong>Unlimited</strong> Enhancements</span>
              </li>
              <li className="flex items-center gap-3 text-neutral-300 text-sm">
                <CheckCircle2 className="w-5 h-5 text-purple-500" />
                <span>Up to <strong>8K</strong> resolution</span>
              </li>
              <li className="flex items-center gap-3 text-neutral-300 text-sm">
                <CheckCircle2 className="w-5 h-5 text-purple-500" />
                <span>Highest GPU Priority (Instant)</span>
              </li>
              <li className="flex items-center gap-3 text-neutral-300 text-sm">
                <CheckCircle2 className="w-5 h-5 text-purple-500" />
                <span>Custom Model Access</span>
              </li>
              <li className="flex items-center gap-3 text-neutral-300 text-sm">
                <CheckCircle2 className="w-5 h-5 text-purple-500" />
                <span>Dedicated 24/7 SL Support</span>
              </li>
            </ul>

            <Link href="/register" className="w-full text-center bg-white hover:bg-neutral-200 text-neutral-900 font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> Go Max
            </Link>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-black py-10 text-center">
        <p className="text-neutral-600 text-sm">© {new Date().getFullYear()} LumosMaximAI. All rights reserved.</p>
      </footer>

    </main>
  );
}
