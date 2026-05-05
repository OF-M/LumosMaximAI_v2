"use client";

import React from "react";
import Link from "next/link";
import { Camera, Aperture, SlidersHorizontal, ArrowRight, Video, ShieldCheck, Zap, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-sensor-black text-titanium font-sans selection:bg-optic-amber/30 overflow-x-hidden noise-overlay relative">



      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center z-10">
        {/* Calibrated Grid Background */}
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-neutral-800 text-neutral-400 text-sm font-mono mb-8 uppercase tracking-widest relative z-10 bg-black">
          <span className="w-2 h-2 rounded-full bg-optic-amber animate-pulse" /> LumosMaximAI 2.0 is Live
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter max-w-4xl text-titanium mb-8 leading-[1.1] relative z-10">
          Bring dark footage <span className="text-white relative"><span className="absolute -left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full"></span>to the light.</span>
        </h1>
        <p className="text-xl md:text-2xl text-neutral-500 max-w-2xl font-medium mb-12 relative z-10 font-mono text-sm uppercase tracking-wide">
          Professional video denoising and extreme low-light enhancement. <br /> Powered by deep learning.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
          <Link href="/studio" className="bg-titanium text-sensor-black px-8 py-4 text-sm font-bold uppercase tracking-widest flex items-center gap-2 tactile-btn border border-titanium hover:bg-white">
            <Aperture className="w-5 h-5" /> Start Enhancing
          </Link>
          <Link href="#pricing" className="bg-black border border-neutral-800 hover:border-neutral-500 text-titanium px-8 py-4 text-sm font-mono uppercase tracking-widest flex items-center gap-2 tactile-btn transition-colors">
            View Pricing
          </Link>
        </div>
      </section>

      {/* Features Outline */}
      <section className="py-24 border-y border-neutral-900 relative bg-sensor-charcoal overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-12">
          
          <div className="md:col-span-4 space-y-6 border-r border-neutral-900 pr-8">
            <div className="text-xs font-mono text-neutral-600 uppercase tracking-widest mb-12">Feature // 01</div>
            <div className="w-12 h-12 bg-black border border-neutral-800 flex items-center justify-center">
              <Camera className="w-5 h-5 text-optic-amber" />
            </div>
            <h3 className="text-2xl font-bold text-titanium">Zero-DCE Enhancement</h3>
            <p className="text-neutral-500 leading-relaxed font-mono text-sm">Illuminate impossibly dark surveillance footage without amplifying noise or introducing artifacting.</p>
          </div>

          <div className="md:col-span-4 space-y-6 border-r border-neutral-900 px-4">
            <div className="text-xs font-mono text-neutral-600 uppercase tracking-widest mb-12">Feature // 02</div>
            <div className="w-12 h-12 bg-black border border-neutral-800 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5 text-optic-cyan" />
            </div>
            <h3 className="text-2xl font-bold text-titanium">Spatial Denoising</h3>
            <p className="text-neutral-500 leading-relaxed font-mono text-sm">Remove heavy ISO grain from night shots securely using targeted spatial neural networks.</p>
          </div>

          <div className="md:col-span-4 space-y-6 pl-4">
            <div className="text-xs font-mono text-neutral-600 uppercase tracking-widest mb-12">Feature // 03</div>
            <div className="w-12 h-12 bg-black border border-neutral-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-neutral-400" />
            </div>
            <h3 className="text-2xl font-bold text-titanium">Encrypted Pipeline</h3>
            <p className="text-neutral-500 leading-relaxed font-mono text-sm">Your files never leave your encrypted project folder, keeping everything secure and private.</p>
          </div>
          
        </div>
      </section>

      {/* Pricing Specifications */}
      <section id="pricing" className="py-32 px-6 max-w-7xl mx-auto relative z-10">
        <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

        <div className="mb-20 relative z-10 border-b border-neutral-900 pb-8 flex justify-between items-end">
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-titanium mb-2 tracking-tighter uppercase">Simple Pricing</h2>
            <p className="text-sm font-mono text-neutral-500 uppercase tracking-widest">Choose the perfect tier for your workflow</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-0 border border-neutral-900 relative z-10 bg-black">

          {/* Starter Tier */}
          <div className="p-10 border-b md:border-b-0 md:border-r border-neutral-900 flex flex-col hover:bg-sensor-charcoal transition-colors">
            <h3 className="text-2xl font-bold text-titanium uppercase">Starter</h3>
            <div className="mt-6 mb-8 font-mono">
              <span className="text-4xl text-white">£0</span>
              <span className="text-neutral-600 text-sm">/mo</span>
            </div>
            <p className="text-neutral-500 text-xs font-mono mb-10 leading-relaxed uppercase">Perfect for testing the AI on single clips.</p>

            <ul className="space-y-4 mb-12 flex-grow border-t border-neutral-900 pt-8">
              <li className="flex items-center gap-3 text-neutral-400 text-sm font-mono">
                <span className="w-1.5 h-1.5 bg-neutral-600" />
                <span>5 Enhancements/mo</span>
              </li>
              <li className="flex items-center gap-3 text-neutral-400 text-sm font-mono">
                <span className="w-1.5 h-1.5 bg-neutral-600" />
                <span>Max Output: 1080p</span>
              </li>
              <li className="flex items-center gap-3 text-neutral-400 text-sm font-mono">
                <span className="w-1.5 h-1.5 bg-neutral-600" />
                <span>Standard Priority</span>
              </li>
            </ul>

            <Link href="/register" className="w-full text-center border border-neutral-800 hover:border-white text-neutral-400 hover:text-white font-mono text-sm uppercase tracking-widest py-4 transition-colors tactile-btn">
              Get Started
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="p-10 border-b md:border-b-0 md:border-r border-neutral-900 flex flex-col relative bg-sensor-charcoal border-t-2 border-t-optic-amber">
            <div className="absolute top-4 right-4 bg-optic-amber text-black text-[10px] font-bold font-mono uppercase tracking-widest px-2 py-1">
              Recommended
            </div>
            <h3 className="text-2xl font-bold text-white uppercase">Professional</h3>
            <div className="mt-6 mb-8 font-mono">
              <span className="text-4xl text-white">£20</span>
              <span className="text-neutral-600 text-sm">/mo</span>
            </div>
            <p className="text-neutral-400 text-xs font-mono mb-10 leading-relaxed uppercase">For creators needing reliable enhancement.</p>

            <ul className="space-y-4 mb-12 flex-grow border-t border-neutral-800 pt-8">
              <li className="flex items-center gap-3 text-white text-sm font-mono">
                <span className="w-1.5 h-1.5 bg-optic-amber" />
                <span>100 Enhancements/mo</span>
              </li>
              <li className="flex items-center gap-3 text-white text-sm font-mono">
                <span className="w-1.5 h-1.5 bg-optic-amber" />
                <span>Max Output: 4K UHD</span>
              </li>
              <li className="flex items-center gap-3 text-white text-sm font-mono">
                <span className="w-1.5 h-1.5 bg-optic-amber" />
                <span>High Priority Processing</span>
              </li>
              <li className="flex items-center gap-3 text-white text-sm font-mono">
                <span className="w-1.5 h-1.5 bg-optic-amber" />
                <span>Email Support</span>
              </li>
            </ul>

            <Link href="/register" className="w-full text-center bg-optic-amber hover:bg-white text-black font-bold font-mono text-sm uppercase tracking-widest py-4 transition-colors tactile-btn">
              Start Trial
            </Link>
          </div>

          {/* Studio Max */}
          <div className="p-10 flex flex-col hover:bg-sensor-charcoal transition-colors">
            <h3 className="text-2xl font-bold text-titanium uppercase">Studio Max</h3>
            <div className="mt-6 mb-8 font-mono">
              <span className="text-4xl text-white">£100</span>
              <span className="text-neutral-600 text-sm">/mo</span>
            </div>
            <p className="text-neutral-500 text-xs font-mono mb-10 leading-relaxed uppercase">Commercial labs needing limitless access.</p>

            <ul className="space-y-4 mb-12 flex-grow border-t border-neutral-900 pt-8">
              <li className="flex items-center gap-3 text-neutral-400 text-sm font-mono">
                <span className="w-1.5 h-1.5 bg-neutral-600" />
                <span>Unlimited Processing</span>
              </li>
              <li className="flex items-center gap-3 text-neutral-400 text-sm font-mono">
                <span className="w-1.5 h-1.5 bg-neutral-600" />
                <span>Max Output: 8K</span>
              </li>
              <li className="flex items-center gap-3 text-neutral-400 text-sm font-mono">
                <span className="w-1.5 h-1.5 bg-neutral-600" />
                <span>Instant Priority</span>
              </li>
              <li className="flex items-center gap-3 text-neutral-400 text-sm font-mono">
                <span className="w-1.5 h-1.5 bg-neutral-600" />
                <span>Custom Model Access</span>
              </li>
            </ul>

            <Link href="/register" className="w-full text-center border border-neutral-800 hover:border-white text-neutral-400 hover:text-white font-mono text-sm uppercase tracking-widest py-4 transition-colors tactile-btn">
              Go Max
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
