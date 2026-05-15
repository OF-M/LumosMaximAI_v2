"use client";

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { ArrowLeft, Loader2, Download, Play, Pause } from "lucide-react";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/useRequireAuth";

interface JobData {
    id: string;
    status: string;
    task_type: string | null;
    enhanced_url: string | null;
    videos: { filename: string | null; original_url: string | null } | null;
}

function formatTime(s: number) {
    if (!isFinite(s) || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

export default function Compare() {
    const { user, loading: authLoading } = useRequireAuth();
    const [job, setJob] = useState<JobData | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMSG, setErrorMSG] = useState<string | null>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const originalRef = useRef<HTMLVideoElement>(null);
    const enhancedRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get("jobId");
        if (!id) { setErrorMSG("No Job ID in URL."); setLoading(false); return; }

        axios.get(`${BACKEND}/api/v1/jobs/${id}`)
            .then(res => {
                const data: JobData = res.data;
                if (data.status !== "completed") setErrorMSG("This job is not completed yet.");
                else if (!data.enhanced_url) setErrorMSG("Enhanced video URL is missing.");
                else setJob(data);
            })
            .catch(() => setErrorMSG("Failed to load job data."))
            .finally(() => setLoading(false));
    }, []);

    const togglePlayback = () => {
        const orig = originalRef.current;
        const enh = enhancedRef.current;
        if (!orig || !enh) return;

        if (playing) {
            orig.pause();
            enh.pause();
        } else {
            enh.currentTime = orig.currentTime;
            orig.play();
            enh.play();
        }
        setPlaying(p => !p);
    };

    const handleEnded = () => setPlaying(false);

    const handleTimeUpdate = () => {
        if (originalRef.current) {
            setCurrentTime(originalRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (originalRef.current) {
            setDuration(originalRef.current.duration);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (originalRef.current) originalRef.current.currentTime = time;
        if (enhancedRef.current) enhancedRef.current.currentTime = time;
    };

    if (authLoading || !user || loading) return (
        <div className="h-screen bg-sensor-black flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
        </div>
    );

    if (errorMSG || !job) return (
        <main className="h-screen bg-sensor-black text-titanium flex flex-col items-center justify-center px-4 font-sans">
            <div className="max-w-md text-center border border-neutral-800 bg-sensor-charcoal p-12">
                <h2 className="text-xl font-mono font-bold uppercase tracking-widest text-white mb-4">Error</h2>
                <p className="text-neutral-500 font-mono text-sm mb-8">{errorMSG}</p>
                <Link href="/dashboard" className="flex items-center justify-center gap-2 bg-titanium hover:bg-white text-black px-6 py-3 font-mono text-xs uppercase tracking-widest font-bold transition-colors tactile-btn">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>
            </div>
        </main>
    );

    const originalUrl = job.videos?.original_url ?? "";
    const enhancedUrl = job.enhanced_url ?? "";
    const filename = job.videos?.filename ?? "video";
    const taskLabel = job.task_type === "enhance" ? "Low-Light + Denoising" : job.task_type === "low_light" ? "Low-Light Only" : job.task_type === "denoising" ? "Spatial Denoising" : job.task_type ?? "unknown";
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <main className="h-screen bg-sensor-black text-titanium flex flex-col font-sans noise-overlay relative overflow-hidden selection:bg-optic-amber/30">
            <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />

            {/* Header */}
            <header className="w-full flex items-center justify-between px-8 py-5 border-b border-neutral-900 z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-neutral-500 hover:text-white transition-colors flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
                        <ArrowLeft className="w-4 h-4" /> Dashboard
                    </Link>
                    <span className="text-neutral-800">|</span>
                    <span className="font-mono text-xs text-neutral-500 uppercase tracking-widest truncate max-w-xs">{filename}</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-black bg-white px-2 py-1">{taskLabel}</span>
                    <a
                        href={enhancedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-black border border-neutral-700 hover:border-white text-white px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors tactile-btn"
                    >
                        <Download className="w-3.5 h-3.5" /> Download Enhanced
                    </a>
                </div>
            </header>

            {/* Videos */}
            <div className="flex flex-1 z-10 min-h-0">
                {/* Original */}
                <div className="flex-1 flex flex-col border-r border-neutral-900 min-w-0">
                    <div className="px-5 py-3 border-b border-neutral-900 shrink-0 flex items-center">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Original</span>
                    </div>
                    <div className="flex-1 bg-black flex items-center justify-center min-h-0 overflow-hidden">
                        <video
                            ref={originalRef}
                            src={originalUrl}
                            className="w-full h-full object-contain"
                            playsInline
                            muted
                            onEnded={handleEnded}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                        />
                    </div>
                </div>

                {/* Enhanced */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="px-5 py-3 border-b border-neutral-900 flex items-center justify-between shrink-0">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-white">Enhanced</span>
                        <span className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                    <div className="flex-1 bg-black flex items-center justify-center min-h-0 overflow-hidden">
                        <video
                            ref={enhancedRef}
                            src={enhancedUrl}
                            className="w-full h-full object-contain"
                            playsInline
                            muted
                            onEnded={handleEnded}
                        />
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="w-full flex flex-col gap-4 px-8 py-5 border-t border-neutral-900 z-10 shrink-0 bg-sensor-black">
                {/* Seek bar */}
                <div className="flex items-center gap-4">
                    <span className="font-mono text-[10px] text-neutral-500 w-10 text-right tabular-nums shrink-0">
                        {formatTime(currentTime)}
                    </span>
                    <div className="relative flex-1 flex items-center group" style={{ height: 24 }}>
                        {/* Track background */}
                        <div className="absolute left-0 right-0 h-px bg-neutral-800 group-hover:h-[2px] transition-all duration-150">
                            {/* Progress fill */}
                            <div
                                className="absolute top-0 left-0 h-full bg-white"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        {/* Thumb dot */}
                        <div
                            className="absolute w-3 h-3 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 top-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                            style={{ left: `${progress}%` }}
                        />
                        {/* Invisible interactive range input */}
                        <input
                            type="range"
                            min={0}
                            max={duration || 0}
                            step={0.01}
                            value={currentTime}
                            onChange={handleSeek}
                            className="absolute inset-0 w-full opacity-0 cursor-pointer"
                        />
                    </div>
                    <span className="font-mono text-[10px] text-neutral-500 w-10 tabular-nums shrink-0">
                        {formatTime(duration)}
                    </span>
                </div>

                {/* Play / Pause row */}
                <div className="flex items-center justify-between">
                    <p className="text-neutral-600 font-mono text-xs uppercase tracking-widest">
                        Before &amp; After — synchronized playback
                    </p>
                    <button
                        onClick={togglePlayback}
                        className="flex items-center gap-2 bg-titanium hover:bg-white text-black px-6 py-2.5 font-mono text-xs uppercase tracking-widest font-bold transition-colors tactile-btn"
                    >
                        {playing
                            ? <><Pause className="w-4 h-4" /> Pause</>
                            : <><Play className="w-4 h-4" /> Play Both</>
                        }
                    </button>
                </div>
            </div>
        </main>
    );
}
