"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { ArrowLeft, Loader2, PlayCircle, Eye, Trash, History, Download, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/useRequireAuth";

interface Job {
    id: string;
    status: string;
    task_type: string | null;
    created_at: string;
    enhanced_url: string | null;
    error_log: string | null;
    videos: {
        filename: string | null;
        original_url: string | null;
    } | null;
}

export default function Dashboard() {
    const { user, loading: authLoading } = useRequireAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const downloadVideo = async (url: string, filename: string) => {
        const res = await fetch(url);
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `enhanced_${filename}`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const deleteJob = async (jobId: string) => {
        setDeletingId(jobId);
        try {
            await axios.delete(`http://localhost:8000/api/v1/jobs/${jobId}`);
            setJobs((prev) => prev.filter((j) => j.id !== jobId));
        } catch (err) {
            console.error("Failed to delete job:", err);
        } finally {
            setDeletingId(null);
        }
    };

    const fetchJobs = async () => {
        try {
            const res = await axios.get("http://localhost:8000/api/v1/jobs/");
            setJobs(res.data);
        } catch (err) {
            console.error("Failed to fetch jobs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();

        // Auto-refresh jobs every 5 seconds nicely
        const intervalId = setInterval(fetchJobs, 5000);
        return () => clearInterval(intervalId);
    }, []);

    if (authLoading || !user) return (
        <div className="min-h-screen bg-sensor-black flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
        </div>
    );

    return (
        <main className="min-h-screen bg-sensor-black text-titanium flex flex-col pt-32 pb-16 px-4 md:px-10 font-sans noise-overlay relative overflow-hidden">

            {/* Background Grid */}
            <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

            <header className="max-w-6xl w-full mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between z-10 gap-6 border-b border-neutral-900 pb-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-white uppercase flex items-center gap-3">
                        <History className="text-neutral-500 w-8 h-8" />
                        My Dashboard
                    </h1>
                    <p className="text-neutral-500 font-mono text-sm mt-2 uppercase tracking-wide">Manage all your AI-enhanced videos.</p>
                </div>

                <Link
                    href="/studio"
                    className="bg-titanium hover:bg-white text-black px-6 py-3 text-xs font-bold font-mono uppercase tracking-widest inline-flex items-center gap-2 transition-colors tactile-btn border border-titanium"
                >
                    <PlayCircle className="w-4 h-4 text-black" /> New Enhancement
                </Link>
            </header>

            <section className="max-w-6xl w-full mx-auto z-10 flex-grow">

                {loading ? (
                    <div className="flex justify-center items-center h-64 border border-neutral-900 bg-sensor-charcoal">
                        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-64 border border-neutral-900 bg-sensor-charcoal text-center p-6">
                        <AlertCircle className="w-10 h-10 text-neutral-600 mb-4" />
                        <h3 className="text-lg font-mono font-bold text-white uppercase tracking-widest mb-2">No videos yet</h3>
                        <p className="text-neutral-500 font-mono text-xs uppercase max-w-sm mb-6">You haven't enhanced any videos yet.</p>
                        <Link href="/studio" className="bg-black border border-neutral-800 hover:border-neutral-500 text-white px-6 py-3 font-mono text-xs uppercase tracking-widest transition-colors tactile-btn">
                            New Enhancement
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {jobs.map((job) => (
                            <div
                                key={job.id}
                                className="bg-sensor-charcoal border border-neutral-900 hover:border-neutral-700 transition-colors flex flex-col group relative overflow-hidden"
                            >

                                {/* Simulated Thumbnail Area */}
                                <div className="h-40 bg-black relative flex items-center justify-center overflow-hidden border-b border-neutral-900">
                                    <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

                                    {job.status === "completed" ? (
                                        <Link href={`/compare?jobId=${job.id}`} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/80 backdrop-blur-sm transition-opacity z-10">
                                            <button className="flex items-center gap-2 bg-titanium text-black px-4 py-2 font-mono text-xs uppercase tracking-widest transform scale-95 group-hover:scale-100 transition-transform tactile-btn border border-titanium hover:bg-white">
                                                <Eye className="w-4 h-4" /> Compare Results
                                            </button>
                                        </Link>
                                    ) : job.status === "processing" ? (
                                        <Loader2 className="w-8 h-8 text-optic-amber animate-spin opacity-80" />
                                    ) : (
                                        <AlertCircle className="w-8 h-8 text-neutral-700" />
                                    )}
                                </div>

                                {/* Details */}
                                <div className="p-5 flex-grow flex flex-col">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-black bg-white px-2 py-1">
                                            {(job.task_type ?? "unknown").replace("_", " ")}
                                        </span>
                                        <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
                                            {new Date(job.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <h3 className="text-sm font-mono text-neutral-300 truncate mb-4" title={job.videos?.filename || "Unknown video"}>
                                        {job.videos?.filename || "Unknown Source"}
                                    </h3>

                                    <div className="mt-auto pt-4 border-t border-neutral-900 flex items-center justify-between">
                                        <div>
                                            {job.status === "processing" && (
                                                <span className="flex items-center gap-2 text-xs font-mono font-bold text-optic-amber uppercase tracking-widest">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                                                </span>
                                            )}
                                            {job.status === "completed" && (
                                                <span className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-300 uppercase tracking-widest">
                                                    <span className="w-1.5 h-1.5 bg-white" /> Completed
                                                </span>
                                            )}
                                            {job.status === "failed" && (
                                                <span className="flex items-center gap-2 text-xs font-mono font-bold text-red-500 uppercase tracking-widest">
                                                    <AlertCircle className="w-3.5 h-3.5" /> Failed
                                                </span>
                                            )}
                                            {job.status === "pending" && (
                                                <span className="flex items-center gap-2 text-xs font-mono text-neutral-500 uppercase tracking-widest">
                                                    Queueing
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {job.status === "completed" && job.enhanced_url && (
                                                <button
                                                    onClick={() => downloadVideo(job.enhanced_url!, job.videos?.filename ?? "video.mp4")}
                                                    className="text-neutral-500 hover:text-white transition-colors bg-black border border-neutral-800 hover:border-neutral-600 p-2"
                                                    title="Download Output"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteJob(job.id)}
                                                disabled={deletingId === job.id}
                                                className="text-neutral-600 hover:text-red-500 transition-colors bg-black border border-neutral-800 hover:border-red-900 p-2 disabled:opacity-40"
                                                title="Delete Job"
                                            >
                                                {deletingId === job.id
                                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                                    : <Trash className="w-4 h-4" />
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                )}

            </section>
        </main>
    );
}
