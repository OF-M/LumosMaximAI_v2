"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { ArrowLeft, Loader2, PlayCircle, Eye, Trash, History, Download, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Job {
    id: number;
    status: string;
    task_type: string;
    created_at: string;
    original_video_path: string | null;
    processed_video_path: string | null;
}

export default function Dashboard() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchJobs = async () => {
        try {
            const res = await axios.get("http://localhost:8000/api/v1/video/jobs");
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

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col py-16 px-4 md:px-10 font-sans">

            {/* Background Glow */}
            <div className="absolute top-0 right-1/4 w-full max-w-2xl h-64 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2" />

            <header className="max-w-6xl w-full mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between z-10 gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-indigo-300 via-indigo-500 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                        <History className="text-indigo-500 w-8 h-8" />
                        My Dashboard
                    </h1>
                    <p className="text-neutral-400 font-medium mt-2">Manage all your AI-enhanced videos.</p>
                </div>

                <Link
                    href="/studio"
                    className="bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-2 transition-transform hover:-translate-y-0.5"
                >
                    <PlayCircle className="w-5 h-5 text-indigo-400" /> New Enhancement
                </Link>
            </header>

            <section className="max-w-6xl w-full mx-auto z-10 flex-grow">

                {loading ? (
                    <div className="flex justify-center items-center h-64 border border-neutral-800 rounded-3xl bg-neutral-900/30">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-64 border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/20 text-center">
                        <AlertCircle className="w-12 h-12 text-neutral-600 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No videos yet</h3>
                        <p className="text-neutral-500 max-w-sm mb-6">You haven't enhanced any videos. Start your first job from the studio.</p>
                        <Link href="/studio" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-medium">
                            Enhance Video
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {jobs.map((job) => (
                            <div
                                key={job.id}
                                className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-3xl overflow-hidden hover:border-indigo-500/30 transition-colors shadow-lg flex flex-col group"
                            >

                                {/* Simulated Thumbnail Area */}
                                <div className="h-40 bg-black relative flex items-center justify-center overflow-hidden border-b border-neutral-800">
                                    {/* Just a blurred gradient as dummy thumbnail for MVP */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-black pointer-events-none" />

                                    {job.status === "completed" ? (
                                        <Link href={`/compare?jobId=${job.id}`} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 backdrop-blur-sm transition-opacity z-10">
                                            <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full font-medium text-sm transform scale-90 group-hover:scale-100 transition-transform">
                                                <Eye className="w-4 h-4" /> Compare Output
                                            </button>
                                        </Link>
                                    ) : job.status === "processing" ? (
                                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin opacity-50" />
                                    ) : (
                                        <AlertCircle className="w-10 h-10 text-neutral-600" />
                                    )}
                                </div>

                                {/* Details */}
                                <div className="p-5 flex-grow flex flex-col">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 bg-neutral-800 px-2 py-1 rounded">
                                            {job.task_type.replace("_", " ")}
                                        </span>
                                        <span className="text-xs text-neutral-500">
                                            {new Date(job.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <h3 className="text-sm font-medium text-neutral-200 truncate mb-4" title={job.original_video_path || "Unknown video"}>
                                        {job.original_video_path || "Unknown Video Source"}
                                    </h3>

                                    <div className="mt-auto pt-4 border-t border-neutral-800/50 flex items-center justify-between">
                                        <div className="">
                                            {job.status === "processing" && (
                                                <span className="flex items-center gap-1.5 text-xs font-medium text-indigo-400">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                                                </span>
                                            )}
                                            {job.status === "completed" && (
                                                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 block" /> Completed
                                                </span>
                                            )}
                                            {job.status === "failed" && (
                                                <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                                                    <AlertCircle className="w-3.5 h-3.5" /> Failed
                                                </span>
                                            )}
                                            {job.status === "pending" && (
                                                <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
                                                    Queueing
                                                </span>
                                            )}
                                        </div>

                                        {job.status === "completed" && (
                                            <a
                                                href={`http://localhost:8000/api/v1/video/download/${job.id}`}
                                                download
                                                className="text-neutral-400 hover:text-indigo-400 transition-colors bg-neutral-800 p-2 rounded-lg"
                                                title="Download Processed Video"
                                            >
                                                <Download className="w-4 h-4" />
                                            </a>
                                        )}
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
