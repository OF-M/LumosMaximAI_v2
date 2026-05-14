"use client";

import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { UploadCloud, FileVideo, Wand2, Loader2, Download, History, ArrowLeft, SplitSquareHorizontal } from "lucide-react";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/lib/supabaseClient";

export default function Studio() {
    const { user, loading: authLoading } = useRequireAuth();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<string | null>(null);
    const [jobData, setJobData] = useState<any | null>(null);
    const [errorMSG, setErrorMSG] = useState<string | null>(null);
    const [taskType, setTaskType] = useState<string>("denoising");

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type.startsWith("video/")) {
            setFile(droppedFile);
            setJobId(null);
            setJobStatus(null);
            setJobData(null);
            setErrorMSG(null);
        } else {
            setErrorMSG("Please select a valid video file.");
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type.startsWith("video/")) {
            setFile(selectedFile);
            setJobId(null);
            setJobStatus(null);
            setJobData(null);
            setErrorMSG(null);
        } else {
            setErrorMSG("Please select a valid video file.");
        }
    };

    const startEnhancement = async () => {
        if (!file) return;

        setUploading(true);
        setErrorMSG(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("task_type", taskType);

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await axios.post(
                "http://localhost:8000/api/v1/jobs/upload",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                }
            );

            setJobId(response.data.job_id);
            setJobStatus("processing");
        } catch (err: any) {
            const detail = err.response?.data?.detail || err.message || "Failed to process the video. Ensure backend is running.";
            setErrorMSG(detail);
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (jobId && (jobStatus === "processing" || jobStatus === "pending")) {
            interval = setInterval(async () => {
                try {
                    const res = await axios.get(`http://localhost:8000/api/v1/jobs/${jobId}`);
                    setJobData(res.data);
                    setJobStatus(res.data.status);

                    if (res.data.status === "completed" || res.data.status === "failed") {
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error("Error polling job status:", err);
                    clearInterval(interval);
                }
            }, 2000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [jobId, jobStatus]);

    if (authLoading || !user) return (
        <div className="min-h-screen bg-sensor-black flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
        </div>
    );

    return (
        <main className="min-h-screen bg-sensor-black text-titanium flex flex-col items-center pt-32 pb-20 px-4 font-sans selection:bg-optic-amber/30 noise-overlay relative overflow-hidden">

            {/* Background Grid */}
            <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

            {/* Top Navbar */}
            <nav className="w-full max-w-6xl flex justify-between z-10 mb-12">
                <Link href="/" className="flex items-center gap-2 text-neutral-500 hover:text-white font-mono text-xs uppercase tracking-widest transition-colors tactile-btn">
                    <ArrowLeft className="w-4 h-4" /> Home
                </Link>
                <Link href="/dashboard" className="flex items-center gap-2 bg-black border border-neutral-800 hover:border-neutral-500 text-neutral-300 px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors tactile-btn">
                    <History className="w-4 h-4" /> Dashboard
                </Link>
            </nav>

            <header className="text-center z-10 max-w-3xl mb-16 space-y-4">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase pb-2">
                    Enhancement Studio
                </h1>
                <p className="text-sm md:text-base text-neutral-500 font-mono uppercase tracking-wide">
                    Upload dark or grainy footage — choose low-light enhancement, denoising, or both.
                </p>
            </header>

            <section className="w-full max-w-2xl bg-sensor-charcoal border border-neutral-900 p-8 shadow-2xl z-10 relative">

                {/* Upload Zone */}
                <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="border border-dashed border-neutral-700 hover:border-neutral-400 bg-black transition-colors duration-300 p-12 text-center flex flex-col items-center justify-center cursor-pointer group"
                    onClick={() => document.getElementById("fileInput")?.click()}
                >
                    <input
                        type="file"
                        id="fileInput"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <div className="w-16 h-16 bg-sensor-charcoal border border-neutral-800 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300">
                        <UploadCloud className="w-6 h-6 text-neutral-500 group-hover:text-white" />
                    </div>
                    <h3 className="text-lg font-bold font-mono uppercase tracking-widest mb-2 text-white transition-colors">
                        {file ? "Change Video" : "Drag & Drop Your Footage Here"}
                    </h3>
                    <p className="text-neutral-600 text-xs font-mono uppercase tracking-widest">
                        or click to browse your files
                    </p>
                </div>

                {/* Selected File Details */}
                {file && (
                    <div className="mt-8 bg-black border border-neutral-800 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center space-x-4">
                            <div className="bg-sensor-charcoal p-3 border border-neutral-800">
                                <FileVideo className="w-5 h-5 text-neutral-400" />
                            </div>
                            <div>
                                <p className="font-mono text-sm text-neutral-300 truncate max-w-[200px] md:max-w-xs uppercase">{file.name}</p>
                                <p className="text-xs font-mono text-neutral-600 uppercase tracking-widest">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                        </div>

                        {/* Enhancement Type Selection */}
                        {!jobId && (
                            <div className="flex items-center gap-3">
                                <select
                                    value={taskType}
                                    onChange={(e) => setTaskType(e.target.value)}
                                    className="bg-sensor-charcoal border border-neutral-700 text-white font-mono text-xs uppercase tracking-widest px-3 py-3 outline-none hover:border-neutral-500 focus:border-white transition-colors cursor-pointer"
                                >
                                                    <option value="denoising">Spatial Denoising</option>
                                    <option value="enhance">Low-Light Enhancement</option>
                                </select>
                            </div>
                        )}

                        {/* Status / Actions */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {!jobId ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); startEnhancement(); }}
                                    disabled={uploading}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-titanium hover:bg-white text-black px-6 py-3 font-bold font-mono text-xs uppercase tracking-widest transition-colors tactile-btn disabled:opacity-50"
                                >
                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    {uploading ? "Uploading" : "Enhance Video"}
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    {(jobStatus === "processing" || jobStatus === "pending") && (
                                        <span className="flex items-center gap-2 text-optic-amber font-mono font-bold text-xs uppercase tracking-widest">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Processing
                                        </span>
                                    )}
                                    {jobStatus === "completed" && (
                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            <span className="flex items-center gap-2 text-neutral-300 font-mono font-bold text-xs uppercase tracking-widest px-2">
                                                <span className="w-1.5 h-1.5 bg-white" /> Done
                                            </span>
                                            <Link
                                                href={`/compare?jobId=${jobId}`}
                                                className="flex items-center justify-center gap-2 bg-titanium hover:bg-white text-black px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-widest transition-colors tactile-btn"
                                            >
                                                <SplitSquareHorizontal className="w-4 h-4" /> Compare
                                            </Link>
                                            {jobData?.enhanced_url && (
                                                <a
                                                    href={jobData.enhanced_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-2 bg-black border border-neutral-700 hover:border-white text-white px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-widest transition-colors tactile-btn"
                                                >
                                                    <Download className="w-4 h-4" /> Download
                                                </a>
                                            )}
                                        </div>
                                    )}
                                    {jobStatus === "failed" && (
                                        <span className="text-red-500 font-mono font-bold text-xs uppercase tracking-widest">Failed</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {errorMSG && (
                    <div className="mt-4 text-red-500 text-xs font-mono uppercase tracking-widest text-center bg-black border border-red-500/50 p-3">
                        {errorMSG}
                    </div>
                )}

            </section>

            {/* Progress Footer placeholder */}
            {jobStatus === "processing" && (
                <div className="mt-12 text-center animate-pulse">
                    <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest mb-3">Processing // {taskType === "denoising" ? "Spatial Denoising" : "Low-Light Enhancement"}</p>
                    <div className="w-64 h-px bg-neutral-800 mx-auto overflow-hidden relative">
                        <div className="absolute top-0 left-0 h-full bg-optic-amber w-1/3 animate-ping" style={{ animationDuration: "1.5s" }} />
                    </div>
                </div>
            )}

        </main>
    );
}
