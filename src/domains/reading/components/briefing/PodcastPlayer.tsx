"use client";

import React, { useState, useRef, useEffect } from "react";
import { Headphones, RefreshCw, Loader2, Play, Pause, ChevronDown, FileText, X } from "lucide-react";
import { useUIStore } from "@/shared/store/uiStore";

interface PodcastPlayerProps {
    date: string;
}

type AudioState = "idle" | "loading" | "playing" | "paused" | "error";

export function PodcastPlayer({ date }: PodcastPlayerProps) {
    const [audioState, setAudioState] = useState<AudioState>("idle");
    const [loadingText, setLoadingText] = useState("准备为您生成播客...");
    const [showDropdown, setShowDropdown] = useState(false);
    const [showScript, setShowScript] = useState(false);
    const [isFetchingScript, setIsFetchingScript] = useState(false);
    const isAdmin = useUIStore((state) => state.isAdmin);
    const isGeneratingRef = useRef(false);
    const scriptRef = useRef<string | null>(null);

    // Eagerly trigger voice loading in browser
    useEffect(() => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            // This forces voices to populate in Safari/Chrome
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }

        return () => {
            if (typeof window !== "undefined" && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // Sync state with native synthesis engine in case system interrupts
    useEffect(() => {
        const interval = setInterval(() => {
            if (audioState === "idle" || audioState === "loading" || audioState === "error") return;

            if (window.speechSynthesis) {
                if (window.speechSynthesis.paused) {
                    if (audioState !== "paused") setAudioState("paused");
                } else if (window.speechSynthesis.speaking) {
                    if (audioState !== "playing") setAudioState("playing");
                } else if (!window.speechSynthesis.speaking && !window.speechSynthesis.paused && audioState === "playing") {
                    setAudioState("idle"); // Finished
                }
            }
        }, 500);
        return () => clearInterval(interval);
    }, [audioState]);

    const playScript = (text: string) => {
        if (!window.speechSynthesis) {
            setLoadingText("您的浏览器不支持语音合成");
            setAudioState("error");
            return;
        }

        window.speechSynthesis.cancel(); // Stop anything currently playing
        scriptRef.current = text;

        // Clean text (remove markdown asterisks, hashes, etc that shouldn't be spoken)
        const cleanText = text.replace(/[*_#`~]/g, "");

        // Chunk text to avoid browser timeout bugs on very long single utterances
        // We split by punctuation marks that naturally end sentences.
        const chunkRegex = /[^。！？.!?\n]+[。！？.!?\n]+/g;
        const chunks = cleanText.match(chunkRegex) || [cleanText];

        const voices = window.speechSynthesis.getVoices();

        // Temporarily prioritizing Google Mandarin for user evaluation
        const validVoices = voices.filter(v => v.lang.includes('zh'));

        const preferredVoice =
            validVoices.find(v => v.name.includes('Google') && v.name.includes('普通话')) ||
            validVoices.find(v => v.name.includes('Premium')) ||
            validVoices.find(v => v.name.includes('Xiaoxiao')) ||
            validVoices.find(v => v.name.includes('Ting-Ting')) ||
            validVoices.find(v => v.lang === 'zh-CN') ||
            validVoices[0];

        chunks.forEach((chunkText, index) => {
            if (!chunkText.trim()) return;
            const utterance = new SpeechSynthesisUtterance(chunkText.trim());

            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
            utterance.rate = 0.95; // Slightly slower, more human-like pacing
            utterance.pitch = 1.0;

            if (index === chunks.length - 1) {
                utterance.onend = () => {
                    setAudioState("idle");
                };
            }

            window.speechSynthesis.speak(utterance);
        });

        setAudioState("playing");
    };

    const handleGenerateAndPlay = async (forceRegenerate: boolean = false) => {
        if (audioState === "loading") return;

        if (audioState === "playing" && !forceRegenerate) {
            window.speechSynthesis?.pause();
            return;
        }

        if (audioState === "paused" && !forceRegenerate) {
            window.speechSynthesis?.resume();
            return;
        }

        // If we already have the script cached in memory for this session and aren't forcing regen
        if (scriptRef.current && !forceRegenerate) {
            playScript(scriptRef.current);
            return;
        }

        setAudioState("loading");
        isGeneratingRef.current = true;
        setLoadingText("检查预构思文稿...");

        if (forceRegenerate) {
            setLoadingText("重新构思文稿...");
            scriptRef.current = null;
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        }

        try {
            // A tiny silent synthesis to unlock Web Speech context on Safari safely within the interaction event
            if (window.speechSynthesis) {
                const unlock = new SpeechSynthesisUtterance("");
                unlock.volume = 0;
                window.speechSynthesis.speak(unlock);
            }

            const response = await fetch("/api/podcasts/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date, forceRegenerate }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || '服务器响应异常');
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.script) {
                isGeneratingRef.current = false;
                playScript(data.script);
            }
        } catch (err: any) {
            console.error("Podcast Generation Failed:", err);
            isGeneratingRef.current = false;
            setAudioState("error");
            setLoadingText(err.message || "构思讲稿失败");
            setTimeout(() => setAudioState("idle"), 4000);
        }
    };

    const getButtonContent = () => {
        switch (audioState) {
            case "loading":
                return (
                    <span className="flex items-center gap-2 text-primary-500 animate-pulse text-sm font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {loadingText}
                    </span>
                );
            case "playing":
                return (
                    <span className="flex items-center gap-2 text-primary-600 font-medium hover:text-primary-700 transition">
                        <Pause className="w-4 h-4" />
                        暂停播报
                    </span>
                );
            case "paused":
                return (
                    <span className="flex items-center gap-2 text-primary-600 font-medium hover:text-primary-700 transition">
                        <Play className="w-4 h-4" />
                        继续播报
                    </span>
                );
            case "error":
                return (
                    <span className="flex items-center gap-2 text-red-500 font-medium">
                        <Headphones className="w-4 h-4" />
                        播报失败
                    </span>
                );
            case "idle":
            default:
                return (
                    <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium hover:text-primary-600 dark:hover:text-primary-400 transition">
                        <Headphones className="w-4 h-4 text-primary-500" />
                        新闻播报
                    </span>
                );
        }
    };

    // Add click-outside listener for dropdown
    useEffect(() => {
        if (!showDropdown) return;
        const handleClickOutside = () => setShowDropdown(false);
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, [showDropdown]);

    // Fetch script when modal opens if not already in memory
    useEffect(() => {
        if (showScript && !scriptRef.current) {
            setIsFetchingScript(true);
            fetch(`/api/podcasts/fetch?date=${date}`)
                .then(res => res.json())
                .then(data => {
                    if (data.script) {
                        scriptRef.current = data.script;
                    }
                })
                .catch(err => console.error("Failed to fetch existing script:", err))
                .finally(() => setIsFetchingScript(false));
        }
    }, [showScript, date]);

    return (
        <div className="flex flex-col gap-2">
            <div
                className="group relative flex items-center h-10 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all bg-white dark:bg-gray-900"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
                {/* Main Play Button */}
                <button
                    type="button"
                    onClick={() => {
                        setShowDropdown(false);
                        handleGenerateAndPlay(false);
                    }}
                    className="flex items-center justify-center pl-5 pr-3 h-full whitespace-nowrap z-10 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-l-full"
                >
                    {getButtonContent()}
                </button>

                {/* Divider */}
                <div className="w-[1px] h-4 bg-gray-200 dark:bg-gray-700" />

                {/* Dropdown Toggle */}
                <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center justify-center w-10 h-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-r-full text-gray-400 hover:text-sky-500"
                >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Menu */}
                {showDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-[100] py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {isAdmin && (
                            <button
                                onClick={() => {
                                    handleGenerateAndPlay(true);
                                    setShowDropdown(false);
                                }}
                                disabled={audioState === "loading"}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-sky-600 transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${audioState === "loading" ? "animate-spin" : ""}`} />
                                重新生成
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setShowScript(!showScript);
                                setShowDropdown(false);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-sky-600 transition-colors"
                        >
                            <FileText className="w-4 h-4" />
                            播客内容
                        </button>
                    </div>
                )}
            </div>

            {/* Script Content Viewer */}
            {showScript && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-6 bg-black/70 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-[0.98] duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-sky-50 dark:bg-sky-900/30 rounded-lg">
                                    <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">播客构思讲稿</h3>
                            </div>
                            <button
                                onClick={() => setShowScript(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
                            {isFetchingScript ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center gap-5">
                                    <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                                    <p className="text-gray-500 text-sm md:text-base">正在查询云端讲稿记录...</p>
                                </div>
                            ) : scriptRef.current ? (
                                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {scriptRef.current.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                                        <p key={i} className="indent-8 mb-4">{line}</p>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center gap-5">
                                    <p className="text-gray-500 text-sm md:text-base">云端尚未生成今日讲稿，请点击按钮开始生成。</p>
                                    <button
                                        onClick={() => {
                                            handleGenerateAndPlay(false);
                                            setShowScript(false);
                                        }}
                                        className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-full text-sm font-semibold transition-colors shadow-sm"
                                    >
                                        立即生成并播放
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                            <button
                                onClick={() => setShowScript(false)}
                                className="px-6 py-2 bg-stone-800 hover:bg-stone-900 dark:bg-stone-200 dark:hover:bg-white text-white dark:text-stone-900 rounded-full text-sm font-semibold transition-colors shadow-sm"
                            >
                                我了解了
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
