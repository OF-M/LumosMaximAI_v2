"use client";

import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { UploadCloud, FileVideo, Wand2, Loader2, CheckCircle2, Download, History, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function Studio() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [jobId, setJobId] = useState<number | null>(null);
    const [jobStatus, setJobStatus] = useState<string | null>(null);
    const [errorMSG, setErrorMSG] = useState<string | null>(null);
    const [taskType, setTaskType] = useState<string>("denoising");

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type.startsWith("video/")) {
            setFile(droppedFile);
            setJobId(null);
            setJobStatus(null);
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
            setErrorMSG(null);
        } else {
            setErrorMSG("Please select a valid video file.");
        }
    };

    const startEnhancement = async () => {
        if (!file) return;

        setUploading(true);
        setErrorMSG(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("task_type", taskType);

        try {
            const response = await axios.post("http://localhost:8000/api/v1/video/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setJobId(response.data.job_id);
            setJobStatus("processing");
        } catch (err) {
            setErrorMSG("Failed to upload the video. Ensure backend is running.");
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (jobId && jobStatus === "processing") {
            interval = setInterval(async () => {
                try {
                    const res = await axios.get(`http://localhost:8000/api/v1/video/status/${jobId}`);
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

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col items-center py-20 px-4 font-sans selection:bg-indigo-500/30">

            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none -translate-y-1/2" />

            {/* Top Navbar */}
            <nav className="w-full max-w-6xl flex justify-between z-10 mb-8">
                <Link href="/" className="flex items-center gap-2 text-neutral-400 hover:text-indigo-400 font-medium transition-all">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
                <Link href="/dashboard" className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:border-indigo-500/50 hover:bg-neutral-800 text-neutral-300 px-4 py-2 rounded-xl text-sm font-medium transition-all">
                    <History className="w-4 h-4" /> My Dashboard
                </Link>
            </nav>

            <header className="text-center z-10 max-w-3xl mb-16 space-y-4">
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-br from-indigo-300 via-indigo-500 to-purple-600 bg-clip-text text-transparent pb-2">
                    Enhancement Studio
                </h1>
                <p className="text-lg md:text-xl text-neutral-400 font-medium">
                    Upload your video to begin the deep learning enhancement process.
                </p>
            </header>

            <section className="w-full max-w-2xl bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 shadow-2xl z-10">

                {/* Upload Zone */}
                <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-neutral-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-300 rounded-2xl p-12 text-center flex flex-col items-center justify-center cursor-pointer group group-hover"
                    onClick={() => document.getElementById("fileInput")?.click()}
                >
                    <input
                        type="file"
                        id="fileInput"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <div className="w-20 h-20 bg-neutral-800 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 group-hover:bg-indigo-600/20">
                        <UploadCloud className="w-10 h-10 text-neutral-400 group-hover:text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-indigo-300 transition-colors">
                        {file ? "Change Video" : "Drag & Drop your video here"}
                    </h3>
                    <p className="text-neutral-500 text-sm">
                        or click to browse from your device
                    </p>
                </div>

                {/* Selected File Details */}
                {file && (
                    <div className="mt-8 bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center space-x-4">
                            <div className="bg-indigo-500/20 p-3 rounded-xl">
                                <FileVideo className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <p className="font-medium text-neutral-200 truncate max-w-[200px] md:max-w-xs">{file.name}</p>
                                <p className="text-xs text-neutral-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                        </div>

                        {/* Enhancement Type Selection */}
                        {!jobId && (
                            <div className="flex items-center gap-3">
                                <select
                                    value={taskType}
                                    onChange={(e) => setTaskType(e.target.value)}
                                    className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm rounded-xl px-3 py-2.5 outline-none hover:border-indigo-500/50 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium cursor-pointer"
                                >
                                    <option value="denoising">Denoise (Remove Grain)</option>
                                    <option value="low_light">Low-Light Enhance</option>
                                </select>
                            </div>
                        )}

                        {/* Status / Actions */}
                        <div className="flex items-center gap-3">
                            {!jobId ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); startEnhancement(); }}
                                    disabled={uploading}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:hover:translate-y-0"
                                >
                                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                                    {uploading ? "Uploading..." : "Enhance"}
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 pr-2">
                                    {jobStatus === "processing" && (
                                        <span className="flex items-center gap-2 text-indigo-400 font-medium">
                                            <Loader2 className="w-5 h-5 animate-spin" /> Processing
                                        </span>
                                    )}
                                    {jobStatus === "completed" && (
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center gap-2 text-emerald-400 font-medium badge bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mr-2">
                                                <CheckCircle2 className="w-4 h-4" /> Ready
                                            </span>
                                            <a
                                                href={`http://localhost:8000/api/v1/video/download/${jobId}`}
                                                download
                                                className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                                            >
                                                <Download className="w-4 h-4" /> Download
                                            </a>
                                        </div>
                                    )}
                                    {jobStatus === "failed" && (
                                        <span className="text-red-400 font-medium">Failed</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {errorMSG && (
                    <div className="mt-4 text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                        {errorMSG}
                    </div>
                )}

            </section>

            {/* Progress Footer placeholder */}
            {jobStatus === "processing" && (
                <div className="mt-12 text-center animate-pulse">
                    <p className="text-neutral-500 text-sm mb-2">Enhancing frames with Deep Learning model ({taskType})...</p>
                    <div className="w-64 h-1.5 bg-neutral-800 rounded-full mx-auto overflow-hidden">
                        <div className="h-full bg-indigo-500 w-1/3 animate-ping" style={{ animationDuration: "2s" }} />
                    </div>
                </div>
            )}

        </main>
    );
}
