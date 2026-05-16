"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
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
const ZOOM = 1.5;
const LENS_SIZE = 180;

interface VideoPanelProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    src: string;
    videoProps: React.VideoHTMLAttributes<HTMLVideoElement>;
    labelLeft: React.ReactNode;
    labelRight?: React.ReactNode;
    borderRight?: boolean;
}

function VideoPanel({ videoRef, src, videoProps, labelLeft, labelRight, borderRight }: VideoPanelProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const lensRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef<{ x: number; y: number } | null>(null);
    const rafRef = useRef<number>(0);
    const [hovered, setHovered] = useState(false);

    const drawLens = useCallback(() => {
        const video = videoRef.current;
        const canvas = lensRef.current;
        const container = containerRef.current;
        const mouse = mouseRef.current;
        if (!video || !canvas || !container || !mouse || video.readyState < 2) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const cW = container.clientWidth;
        const cH = container.clientHeight;
        const vAspect = video.videoWidth / video.videoHeight;
        const cAspect = cW / cH;

        let rW: number, rH: number, oX: number, oY: number;
        if (vAspect > cAspect) {
            rW = cW;
            rH = cW / vAspect;
            oX = 0;
            oY = (cH - rH) / 2;
        } else {
            rH = cH;
            rW = cH * vAspect;
            oX = (cW - rW) / 2;
            oY = 0;
        }

        const relX = mouse.x - oX;
        const relY = mouse.y - oY;

        // If cursor is outside the rendered video area, clear and return
        if (relX < 0 || relX > rW || relY < 0 || relY > rH) {
            ctx.clearRect(0, 0, LENS_SIZE, LENS_SIZE);
            return;
        }

        const scaleX = video.videoWidth / rW;
        const scaleY = video.videoHeight / rH;
        const srcSize = LENS_SIZE / ZOOM;
        const sx = Math.max(0, Math.min(relX * scaleX - srcSize / 2, video.videoWidth - srcSize));
        const sy = Math.max(0, Math.min(relY * scaleY - srcSize / 2, video.videoHeight - srcSize));

        ctx.clearRect(0, 0, LENS_SIZE, LENS_SIZE);

        // Draw zoomed frame (square, no clip)
        ctx.drawImage(video, sx, sy, srcSize, srcSize, 0, 0, LENS_SIZE, LENS_SIZE);

        // Border
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0.75, 0.75, LENS_SIZE - 1.5, LENS_SIZE - 1.5);

        // Center canvas on cursor
        canvas.style.left = `${mouse.x - LENS_SIZE / 2}px`;
        canvas.style.top = `${mouse.y - LENS_SIZE / 2}px`;
    }, [videoRef]);

    useEffect(() => {
        if (!hovered) return;
        const loop = () => {
            drawLens();
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [hovered, drawLens]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    return (
        <div className={`flex-1 flex flex-col min-w-0 min-h-[40vh] md:min-h-0 ${borderRight ? "border-b md:border-b-0 md:border-r border-neutral-900" : ""}`}>
            <div className="px-5 py-3 border-b border-neutral-900 shrink-0 flex items-center justify-between">
                {labelLeft}
                {labelRight}
            </div>
            <div
                ref={containerRef}
                className="flex-1 bg-black flex items-center justify-center min-h-0 overflow-hidden relative"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => { setHovered(false); mouseRef.current = null; }}
            >
                <video
                    ref={videoRef}
                    src={src}
                    className="w-full h-full object-contain"
                    {...videoProps}
                />
                {hovered && (
                    <canvas
                        ref={lensRef}
                        width={LENS_SIZE}
                        height={LENS_SIZE}
                        className="absolute pointer-events-none"
                        style={{
                            width: LENS_SIZE,
                            height: LENS_SIZE,
                            left: 0,
                            top: 0,
                            filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.7))",
                        }}
                    />
                )}
            </div>
        </div>
    );
}

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
        if (originalRef.current) setCurrentTime(originalRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (originalRef.current) setDuration(originalRef.current.duration);
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
            <header className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-8 py-3 sm:py-5 border-b border-neutral-900 z-10 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/dashboard" className="text-neutral-500 hover:text-white transition-colors flex items-center gap-2 font-mono text-xs uppercase tracking-widest shrink-0">
                        <ArrowLeft className="w-4 h-4" /> Dashboard
                    </Link>
                    <span className="text-neutral-800 hidden sm:block">|</span>
                    <span className="font-mono text-xs text-neutral-500 uppercase tracking-widest truncate hidden sm:block">{filename}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-black bg-white px-2 py-1 hidden sm:block">{taskLabel}</span>
                    <a
                        href={enhancedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-black border border-neutral-700 hover:border-white text-white px-3 sm:px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors tactile-btn"
                    >
                        <Download className="w-3.5 h-3.5" /> Download
                    </a>
                </div>
            </header>

            {/* Videos */}
            <div className="flex flex-col md:flex-row flex-1 z-10 min-h-0">
                <VideoPanel
                    videoRef={originalRef}
                    src={originalUrl}
                    borderRight
                    labelLeft={<span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Original</span>}
                    videoProps={{
                        playsInline: true,
                        muted: true,
                        onEnded: handleEnded,
                        onTimeUpdate: handleTimeUpdate,
                        onLoadedMetadata: handleLoadedMetadata,
                    }}
                />
                <VideoPanel
                    videoRef={enhancedRef}
                    src={enhancedUrl}
                    labelLeft={<span className="font-mono text-[10px] uppercase tracking-widest text-white">Enhanced</span>}
                    labelRight={<span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    videoProps={{
                        playsInline: true,
                        muted: true,
                        onEnded: handleEnded,
                    }}
                />
            </div>

            {/* Controls */}
            <div className="w-full flex flex-col gap-4 px-4 sm:px-8 py-4 sm:py-5 border-t border-neutral-900 z-10 shrink-0 bg-sensor-black">
                {/* Seek bar */}
                <div className="flex items-center gap-4">
                    <span className="font-mono text-[10px] text-neutral-500 w-10 text-right tabular-nums shrink-0">
                        {formatTime(currentTime)}
                    </span>
                    <div className="relative flex-1 flex items-center group" style={{ height: 24 }}>
                        <div className="absolute left-0 right-0 h-px bg-neutral-800 group-hover:h-[2px] transition-all duration-150">
                            <div
                                className="absolute top-0 left-0 h-full bg-white"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div
                            className="absolute w-3 h-3 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 top-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                            style={{ left: `${progress}%` }}
                        />
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
