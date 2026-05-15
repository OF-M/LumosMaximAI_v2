"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Loader2, PlayCircle, Eye, Trash, History, Download, AlertCircle, MessageSquare, Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

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

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

export default function Dashboard() {
    const { user, session, loading: authLoading } = useAuth();
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [authTimedOut, setAuthTimedOut] = useState(false);

    useEffect(() => {
        if (!authLoading) return;
        const t = setTimeout(() => setAuthTimedOut(true), 6000);
        return () => clearTimeout(t);
    }, [authLoading]);

    useEffect(() => {
        if (authTimedOut && !user) router.push("/login");
    }, [authTimedOut, user, router]);

    const [notes, setNotes] = useState<Record<string, string>>({});
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [draftNote, setDraftNote] = useState("");

    useEffect(() => {
        try {
            const stored = localStorage.getItem("lumos_job_notes");
            if (stored) setNotes(JSON.parse(stored));
        } catch {}
    }, []);

    const startEdit = (jobId: string) => {
        setEditingNoteId(jobId);
        setDraftNote(notes[jobId] ?? "");
    };

    const cancelEdit = () => {
        setEditingNoteId(null);
        setDraftNote("");
    };

    const saveNote = (jobId: string) => {
        const updated = { ...notes };
        if (draftNote.trim()) {
            updated[jobId] = draftNote.trim();
        } else {
            delete updated[jobId];
        }
        setNotes(updated);
        try { localStorage.setItem("lumos_job_notes", JSON.stringify(updated)); } catch {}
        setEditingNoteId(null);
    };

    const downloadVideo = async (url: string, filename: string) => {
        const res = await fetch(url);
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `enhanced_${filename}`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const authHeader = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

    const deleteJob = async (jobId: string) => {
        setDeletingId(jobId);
        try {
            await axios.delete(`${BACKEND}/api/v1/jobs/${jobId}`, { headers: authHeader });
            setJobs((prev) => prev.filter((j) => j.id !== jobId));
            const updated = { ...notes };
            delete updated[jobId];
            setNotes(updated);
            try { localStorage.setItem("lumos_job_notes", JSON.stringify(updated)); } catch {}
        } catch (err) {
            console.error("Failed to delete job:", err);
        } finally {
            setDeletingId(null);
        }
    };

    const fetchJobs = useCallback(async (token: string) => {
        try {
            const res = await axios.get(`${BACKEND}/api/v1/jobs/`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000,
            });
            setJobs(res.data);
        } catch (err) {
            console.error("Failed to fetch jobs:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
            return;
        }
        const token = session?.access_token;
        if (!token) return;
        setLoading(true);
        fetchJobs(token);
        const intervalId = setInterval(() => fetchJobs(token), 5000);
        return () => clearInterval(intervalId);
    }, [authLoading, user, session?.access_token, fetchJobs, router]);

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
                    <p className="text-neutral-500 font-mono text-sm mt-2 uppercase tracking-wide">Your low-light enhancement and denoising jobs.</p>
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
                        <h3 className="text-lg font-mono font-bold text-white uppercase tracking-widest mb-2">No jobs yet</h3>
                        <p className="text-neutral-500 font-mono text-xs uppercase max-w-sm mb-6">Upload dark or grainy footage in the studio to run your first enhancement.</p>
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
                                {/* Thumbnail Area */}
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
                                            {job.task_type === "enhance" ? "Low-Light + Denoising" : job.task_type === "low_light" ? "Low-Light Only" : job.task_type === "denoising" ? "Spatial Denoising" : job.task_type ?? "unknown"}
                                        </span>
                                        <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
                                            {new Date(job.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <h3 className="text-sm font-mono text-neutral-300 truncate mb-4" title={job.videos?.filename || "Unknown video"}>
                                        {job.videos?.filename || "Unknown Source"}
                                    </h3>

                                    {/* Note area */}
                                    {editingNoteId === job.id ? (
                                        <div className="mb-4">
                                            <textarea
                                                value={draftNote}
                                                onChange={(e) => setDraftNote(e.target.value)}
                                                placeholder="Add a note..."
                                                rows={3}
                                                autoFocus
                                                className="w-full bg-black border border-neutral-700 focus:border-neutral-400 text-neutral-300 font-mono text-xs p-2.5 resize-none outline-none placeholder-neutral-700 transition-colors leading-relaxed"
                                            />
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => saveNote(job.id)}
                                                    className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest bg-white text-black px-3 py-1.5 hover:bg-neutral-200 transition-colors"
                                                >
                                                    <Check className="w-3 h-3" /> Save
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest bg-black border border-neutral-700 text-neutral-400 px-3 py-1.5 hover:border-neutral-500 transition-colors"
                                                >
                                                    <X className="w-3 h-3" /> Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : notes[job.id] ? (
                                        <div className="mb-4 bg-black border border-neutral-800 p-3 flex gap-2.5 cursor-pointer hover:border-neutral-600 transition-colors" onClick={() => startEdit(job.id)}>
                                            <MessageSquare className="w-3.5 h-3.5 text-neutral-600 shrink-0 mt-0.5" />
                                            <p className="text-[11px] font-mono text-neutral-400 leading-relaxed line-clamp-3">
                                                {notes[job.id]}
                                            </p>
                                        </div>
                                    ) : null}

                                    {/* Footer */}
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
                                            {/* Note button */}
                                            <button
                                                onClick={() => startEdit(job.id)}
                                                className={`transition-colors bg-black border p-2 ${
                                                    notes[job.id]
                                                        ? "text-white border-neutral-600 hover:border-neutral-400"
                                                        : "text-neutral-500 border-neutral-800 hover:text-white hover:border-neutral-600"
                                                }`}
                                                title={notes[job.id] ? "Edit Note" : "Add Note"}
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                            </button>

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
