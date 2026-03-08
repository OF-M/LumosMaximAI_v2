"use client";

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { ArrowLeft, Loader2, Maximize } from "lucide-react";
import Link from "next/link";

export default function Compare() {
    const [jobId, setJobId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMSG, setErrorMSG] = useState<string | null>(null);

    // Slider state
    const [sliderPosition, setSliderPosition] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync Video Players
    const originalVideoRef = useRef<HTMLVideoElement>(null);
    const processedVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // Get jobId from URL search params manually since useSearchParams might need suspense
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const id = params.get("jobId");
            if (id) {
                setJobId(id);
            } else {
                setErrorMSG("No Job ID provided in URL.");
            }
            setLoading(false);
        }
    }, []);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!containerRef.current) return;
        const { left, width } = containerRef.current.getBoundingClientRect();
        const position = ((e.clientX - left) / width) * 100;
        setSliderPosition(Math.max(0, Math.min(position, 100)));
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!containerRef.current || e.touches.length === 0) return;
        const { left, width } = containerRef.current.getBoundingClientRect();
        const position = ((e.touches[0].clientX - left) / width) * 100;
        setSliderPosition(Math.max(0, Math.min(position, 100)));
    };

    // Keep videos perfectly in sync via seeking (brute force sync for MVP)
    const handlePlay = () => {
        if (processedVideoRef.current && originalVideoRef.current) {
            processedVideoRef.current.play();
            originalVideoRef.current.play();
        }
    };

    const handlePause = () => {
        if (processedVideoRef.current && originalVideoRef.current) {
            processedVideoRef.current.pause();
            originalVideoRef.current.pause();
        }
    };

    const handleSeek = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        if (processedVideoRef.current && originalVideoRef.current) {
            const time = (e.currentTarget as HTMLVideoElement).currentTime;
            if (Math.abs(processedVideoRef.current.currentTime - time) > 0.1) {
                processedVideoRef.current.currentTime = time;
            }
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (errorMSG || !jobId) {
        return (
            <main className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center py-20 px-4 font-sans">
                <div className="max-w-md text-center">
                    <h2 className="text-2xl font-bold mb-4 text-red-400">Error</h2>
                    <p className="text-neutral-400 mb-8">{errorMSG}</p>
                    <Link href="/" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium inline-flex items-center gap-2 transition-transform hover:-translate-y-0.5">
                        <ArrowLeft className="w-4 h-4" /> Go Back Home
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center py-10 px-4 font-sans overflow-hidden">

            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2" />

            <header className="w-full max-w-6xl mb-8 flex items-center justify-between z-10">
                <Link href="/dashboard" className="text-neutral-400 hover:text-indigo-400 transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5" /> Back to Dashboard
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                    Comparison View <span className="text-neutral-500 text-sm font-normal ml-2">Job #{jobId}</span>
                </h1>
            </header>

            <section className="w-full max-w-6xl flex-grow flex flex-col items-center justify-center z-10 pb-10">

                {/* Interactive Comparison Slider */}
                <div
                    ref={containerRef}
                    className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-neutral-800 touch-none cursor-ew-resize group"
                    onMouseMove={handleMouseMove}
                    onTouchMove={handleTouchMove}
                >
                    {/* Base Layer: Processed Video (Full Width) */}
                    <video
                        ref={processedVideoRef}
                        src={`http://localhost:8000/api/v1/video/stream/processed/${jobId}`}
                        className="absolute top-0 left-0 w-full h-full object-contain bg-black"
                        controls={false}
                        loop
                        muted
                        playsInline
                        crossOrigin="anonymous"
                    />

                    {/* Top Layer: Original Video (Clipped Width) */}
                    <div
                        className="absolute top-0 left-0 h-full overflow-hidden"
                        style={{ width: `${sliderPosition}%` }}
                    >
                        <video
                            ref={originalVideoRef}
                            src={`http://localhost:8000/api/v1/video/stream/original/${jobId}`}
                            className="absolute top-0 left-0 h-full object-contain bg-black max-w-none pointer-events-auto"
                            style={{ width: `${containerRef.current?.offsetWidth || 1000}px` }}
                            controls
                            onPlay={handlePlay}
                            onPause={handlePause}
                            onSeeking={handleSeek}
                            loop
                            muted
                            playsInline
                            crossOrigin="anonymous"
                        />
                    </div>

                    {/* Vertical Slider Line */}
                    <div
                        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize transition-opacity"
                        style={{ left: `calc(${sliderPosition}% - 2px)` }}
                    >
                        {/* Slider Knob */}
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white text-indigo-900 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.5)] group-hover:scale-110 transition-transform">
                            <Maximize className="w-4 h-4 rotate-45" />
                        </div>
                    </div>

                    {/* Labels */}
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white px-3 py-1 rounded-lg text-sm font-medium opacity-70 group-hover:opacity-100 transition-opacity">
                        Before
                    </div>
                    <div className="absolute top-4 right-4 bg-indigo-600/80 backdrop-blur text-white px-3 py-1 rounded-lg text-sm font-medium shadow-[0_0_15px_rgba(79,70,229,0.5)] opacity-80 group-hover:opacity-100 transition-opacity">
                        After
                    </div>

                </div>

                <p className="mt-6 text-neutral-400 text-sm max-w-xl text-center">
                    Drag the slider left and right to instantly compare the original raw video against the deep learning enhanced output. Use the video controls on the left side of the screen to play or pause the synced footage.
                </p>
            </section>

        </main>
    );
}
