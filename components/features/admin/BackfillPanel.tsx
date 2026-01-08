/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { fetchBackfillCandidates, generateBatchBriefing, getSubscriptionList, BackfillCandidate } from '@/app/actions/backfill';
import { Subscription } from '@/types';
import dayjs from 'dayjs';
import { CATEGORY_ORDER, UNCATEGORIZED_LABEL } from '@/lib/constants';
import { useUIStore } from '@/store/uiStore';
import { useArticleStore } from '@/store/articleStore';
import { ModelSelector, MODELS } from '../ai/ModelSelector';

// --- Types ---
type ProcessingState = 'idle' | 'fetching_candidates' | 'processing' | 'done';

const getOrderIndex = (name: string) => {
    const cleanName = (name || '').trim().toLowerCase();
    return CATEGORY_ORDER.findIndex((keyword) => cleanName.includes(keyword.toLowerCase()));
};

interface LogEntry {
    time: string;
    message: string;
    type: 'info' | 'success' | 'error';
}

// --- Helper Components ---

// 1. Source List Item

// 2. Month Picker Grid (by Year)
const YearGrid = ({
    months, // "YYYY-MM"[]
    selectedMonth,
    onSelect,
}: {
    months: string[];
    selectedMonth: string | null;
    onSelect: (m: string) => void;
}) => {
    // Group by Year
    const grouped = useMemo(() => {
        const map: Record<string, string[]> = {};
        months.forEach(m => {
            const y = m.split('-')[0];
            if (!map[y]) map[y] = [];
            map[y].push(m);
        });
        return map;
    }, [months]);

    return (
        <div className="space-y-4">
            {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(year => (
                <div key={year}>
                    <div className="mb-2 text-xs font-bold text-gray-400">{year}</div>
                    <div className="grid grid-cols-3 gap-2">
                        {grouped[year].map(m => {
                            const isSelected = selectedMonth === m;
                            return (
                                <button
                                    key={m}
                                    onClick={() => onSelect(m)}
                                    className={`rounded px-1 py-1 text-xs font-medium transition-colors border ${isSelected
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                        : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    {dayjs(m).format('M月')}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- Main Component ---

export default function BackfillPanel({ initialSubscriptions }: { initialSubscriptions?: Subscription[] } = {}) {
    const isAdmin = useUIStore((state) => state.isAdmin);

    // --- State: Data ---
    const [subscriptions, setSubscriptions] = useState<Subscription[]>(initialSubscriptions || []);
    const [candidates, setCandidates] = useState<BackfillCandidate[]>([]);

    // --- State: Selection ---
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null); // "YYYY-MM"
    const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
    const [batchSize, setBatchSize] = useState<number>(10);
    const openModal = useUIStore(state => state.openModal);
    const addArticles = useArticleStore(state => state.addArticles);
    const [selectedModel, setSelectedModel] = useState<string>(MODELS[0].id);

    // --- State: UI & Processing ---
    const [processingState, setProcessingState] = useState<ProcessingState>('idle');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    // --- Helper: Add Log ---
    const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
        setLogs(prev => [{ time: dayjs().format('HH:mm:ss'), message, type }, ...prev]);
    };

    // Security Guard: Prevent rendering for non-admins (Moved after hooks)
    if (!isAdmin) return null;

    // --- Effect: Fetch Subscriptions if not provided ---
    useEffect(() => {
        if (!initialSubscriptions || initialSubscriptions.length === 0) {
            getSubscriptionList()
                .then(subs => setSubscriptions(subs))
                .catch(err => addLog(`获取订阅源失败: ${err.message}`, 'error'));
        }
    }, [initialSubscriptions]);

    // --- Derived: Grouped Subscriptions ---
    const groupedSubscriptions = useMemo(() => {
        const groups: Record<string, Subscription[]> = {};
        subscriptions.forEach((sub) => {
            // Filter out default "Reading List" (user/-/state/com.google/reading-list)
            if (sub.id.includes('reading-list')) return;

            const cat = sub.category || UNCATEGORIZED_LABEL;
            if (!groups[cat]) {
                groups[cat] = [];
            }
            groups[cat].push(sub);
        });
        return groups;
    }, [subscriptions]);

    const sortedCategories = useMemo(() => {
        const categories = Object.keys(groupedSubscriptions);

        return categories.sort((a, b) => {
            // Special case: '未分类' or similar should always be last
            const isUncategorizedA =
                a === UNCATEGORIZED_LABEL || a.toLowerCase().includes('uncategorized');
            const isUncategorizedB =
                b === UNCATEGORIZED_LABEL || b.toLowerCase().includes('uncategorized');

            if (isUncategorizedA && !isUncategorizedB) return 1;
            if (!isUncategorizedA && isUncategorizedB) return -1;

            const indexA = getOrderIndex(a);
            const indexB = getOrderIndex(b);

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            return a.localeCompare(b, 'zh-Hans-CN');
        });
    }, [groupedSubscriptions]);

    // --- Derived: Month List (Last 24 Months) ---
    const monthList = useMemo(() => {
        const list = [];
        let current = dayjs().startOf('month');
        for (let i = 0; i < 24; i++) {
            list.push(current.format('YYYY-MM'));
            current = current.subtract(1, 'month');
        }
        return list;
    }, []);

    // --- Action: Fetch Candidates ---
    const handleFetchCandidates = async (sourceId: string, month: string) => {
        if (!sourceId || !month) return;

        setProcessingState('fetching_candidates');
        setCandidates([]);
        setSelectedCandidateIds(new Set());
        addLog(`${month} 数据获取中...`);

        try {
            const startDate = dayjs(month).startOf('month');
            const endDate = dayjs(month).endOf('month');

            const res = await fetchBackfillCandidates(
                sourceId,
                300, // Fetch up to 300 (Increased)
                undefined,
                startDate.unix(),
                endDate.unix()
            );

            if (res.success && res.data) {
                const { candidates: newCandidates } = res.data;

                setCandidates(newCandidates);
                addLog(`获取成功：找到 ${newCandidates.length} 篇文章`, 'success');
                // Updated Logic: Do NOT auto-select
                setSelectedCandidateIds(new Set());
            } else {
                addLog(`获取失败: ${res.error}`, 'error');
            }
        } catch (err: any) {
            addLog(`未知错误: ${err.message}`, 'error');
        } finally {
            setProcessingState('idle');
        }
    };

    // --- Action: Toggle Selection ---
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedCandidateIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedCandidateIds(newSet);
    };

    const selectAll = () => {
        const newSet = new Set(candidates.map(c => c.id));
        setSelectedCandidateIds(newSet);
    };

    const selectPending = () => {
        const newSet = new Set(candidates.filter(c => c.status === 'pending').map(c => c.id));
        setSelectedCandidateIds(newSet);
    };

    const deselectAll = () => {
        setSelectedCandidateIds(new Set());
    };

    // --- Action: Start Processing ---
    const handleStartProcessing = async () => {
        const allSelected = candidates.filter(c => selectedCandidateIds.has(c.id));
        // Apply User-Defined Batch Limit (Respect setting from UI)
        const targets = allSelected.slice(0, batchSize);

        if (targets.length === 0) return;

        setProcessingState('processing');
        setProgress({ current: 0, total: targets.length });
        addLog(`开始批量生成 (共 ${targets.length} 篇)...`);

        // Batch processing logic (using large true batching)
        // We send the whole batch to the action which handles its own internal chunking if needed
        // but currently we send the whole 'targets' to avoid rate limit complexity in action.

        // Actually, for better UX and progress, we still chunk if batchSize is large.
        // But let's follow the user's "10" set and use that.
        const CHUNK_SIZE = batchSize; // Use user defined batch size as the unit
        for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
            const chunk = targets.slice(i, i + CHUNK_SIZE);
            addLog(`处理批次 ${Math.floor(i / CHUNK_SIZE) + 1}... (${chunk.length} 篇)`);

            try {
                const res = await generateBatchBriefing(chunk, selectedModel);
                if (res.success) {
                    const batchResults = (res as any).results || [];
                    addLog(`批次成功 ${res.saved} 篇:`, 'success');
                    batchResults.forEach((r: any, idx: number) => {
                        addLog(`${idx + 1}. ${r.title}`, 'info');
                    });
                    const resultMap = new Map<string, string>();
                    batchResults.forEach((r: any) => resultMap.set(r.id, r.title));

                    // Update local status and titles
                    setCandidates(prev => prev.map(c => {
                        const newTitle = resultMap.get(c.id);
                        if (chunk.find(item => item.id === c.id)) {
                            return {
                                ...c,
                                status: 'processed',
                                title: newTitle || c.title // Use AI title if available, else keep existing
                            };
                        }
                        return c;
                    }));
                } else {
                    const errorMsg = res.errors?.[0] || 'Unknown Error';
                    addLog(`批次失败: ${errorMsg}`, 'error');
                }
            } catch (err: any) {
                addLog(`系统异常: ${err.message}`, 'error');
            }

            setProgress(prev => ({ ...prev, current: Math.min(prev.total, i + CHUNK_SIZE) }));
        }

        addLog('所有任务处理完毕', 'success');
        setProcessingState('done');
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/50">

            {/* --- Top Bar: Source Selection --- */}
            <div className="flex items-center gap-4 border-b border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-black/20">
                <div className="font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                    1. 选择订阅源
                </div>
                <div className="flex-1 max-w-xl">
                    <select
                        value={selectedSourceId || ''}
                        onChange={(e) => {
                            setSelectedSourceId(e.target.value);
                            setSelectedMonth(null); // Reset month
                            setProcessingState('idle'); // Reset state
                            setCandidates([]); // Clear list
                            setSelectedCandidateIds(new Set()); // Clear selection
                            setLogs([]); // Clear logs (optional, or keep history?) maybe keep is better, but user said "Clear list".
                            // Let's clear logs to separate contexts.
                        }}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                        <option value="" disabled>请选择一个订阅源...</option>

                        <option value="user/-/state/com.google/unread">📬 所有未读文章 (Unread)</option>

                        {sortedCategories.map(category => (
                            <optgroup key={category} label={category}>
                                {groupedSubscriptions[category].map(sub => (
                                    <option key={sub.id} value={sub.id}>
                                        {sub.title}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                {/* Global Status/Progress Indicator could go here if needed, but keeping it simple */}
            </div>

            {/* --- Main Content Area: 2 Columns --- */}
            <div className="flex flex-1 flex-row overflow-hidden">

                {/* --- Left Column: Month Picker + Logs --- */}
                <div className="flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">

                    {/* Top: Month Picker */}
                    <div className="flex flex-1 flex-col overflow-hidden transition-opacity duration-200" style={{ opacity: selectedSourceId ? 1 : 0.5, pointerEvents: selectedSourceId ? 'auto' : 'none' }}>
                        <div className="bg-gray-50/50 px-4 py-2 text-xs font-bold text-gray-500 dark:bg-gray-800/50">
                            2. 选择月份
                        </div>
                        <div className="flex-1 overflow-y-auto p-3">
                            <YearGrid
                                months={monthList}
                                selectedMonth={selectedMonth}
                                onSelect={(m) => {
                                    setSelectedMonth(m);
                                    if (selectedSourceId) handleFetchCandidates(selectedSourceId, m);
                                }}
                            />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gray-200 dark:bg-gray-800"></div>

                    {/* Bottom: System Logs */}
                    <div className="flex h-64 flex-col overflow-hidden bg-gray-50 dark:bg-black/40">
                        <div className="flex items-center justify-between bg-gray-100 px-4 py-2 dark:bg-gray-800">
                            <span className="text-xs font-bold text-gray-500">运行日志</span>
                            <span className="text-[10px] text-gray-400">Total: {logs.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] scrollbar-thin">
                            {logs.length === 0 && <div className="text-gray-400 italic p-2">就绪...</div>}
                            {logs.map((log, i) => (
                                <div key={i} className={`mb-1 break-all ${log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'}`}>
                                    <span className="mr-1 opacity-50">[{log.time}]</span>
                                    {log.message}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- Right Column: Article List --- */}
                <div className="flex flex-1 flex-col bg-white dark:bg-transparent">
                    <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
                        <div className="flex items-center gap-4">
                            <div className="font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                                3. 选择文章 <span className="text-sm font-normal text-gray-500 ml-1">({selectedCandidateIds.size} / {candidates.length})</span>
                            </div>

                            {candidates.length > 0 && (() => {
                                const pendingIds = candidates.filter(c => c.status === 'pending').map(c => c.id);
                                // Strict check: All pending selected AND total selected equals pending count (meaning no processed are selected)
                                const isStrictPendingSelected = pendingIds.length > 0 &&
                                    selectedCandidateIds.size === pendingIds.length &&
                                    pendingIds.every(id => selectedCandidateIds.has(id));

                                const isAllSelected = selectedCandidateIds.size === candidates.length && candidates.length > 0;

                                return (
                                    <>
                                        <div className="flex items-center rounded bg-gray-100 p-0.5 dark:bg-gray-800">
                                            <button
                                                onClick={selectPending}
                                                className={`rounded px-2 py-1 text-xs transition-colors ${isStrictPendingSelected
                                                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                                                    : 'text-gray-600 hover:bg-white active:bg-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                                                    }`}
                                                title="仅选择所有未生成过的文章 (Pending)"
                                            >
                                                勾选未生成
                                            </button>
                                        </div>

                                        <div className="flex items-center rounded bg-gray-100 p-0.5 dark:bg-gray-800 ml-auto">
                                            <button
                                                onClick={selectAll}
                                                className={`rounded px-2 py-1 text-xs transition-colors ${isAllSelected
                                                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                                                    : 'text-gray-600 hover:bg-white active:bg-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                                                    }`}
                                                title="选择列表中的所有文章 (包括已处理)"
                                            >
                                                全选
                                            </button>
                                            <div className="mx-1 h-3 w-px bg-gray-300 dark:bg-gray-700"></div>
                                            <button
                                                onClick={deselectAll}
                                                className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-white active:bg-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600 hover:text-gray-700 transition-colors dark:text-gray-400 dark:hover:text-gray-200"
                                                title="取消所有选择"
                                            >
                                                取消
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Progress Bar (Optional, thin line) */}
                    {processingState === 'processing' && (
                        <div className="h-0.5 w-full bg-gray-100 dark:bg-gray-800">
                            <div
                                className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            ></div>
                        </div>
                    )}

                    {/* Content Area */}
                    <div className="flex flex-1 flex-col overflow-y-auto bg-white p-0 dark:bg-transparent scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">

                        {/* Empty State */}
                        {candidates.length === 0 && processingState !== 'fetching_candidates' && (
                            <div className="flex h-full flex-col items-center justify-center text-gray-400">
                                <span className="mb-2 text-4xl opacity-20">👈</span>
                                <div className="text-sm">请在上方选择源，在左侧选择月份</div>
                            </div>
                        )}

                        {/* Loading State */}
                        {processingState === 'fetching_candidates' && (
                            <div className="flex h-full flex-col items-center justify-center space-y-3">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600"></div>
                                <div className="text-sm text-gray-500 animate-pulse">正在索引文章数据...</div>
                            </div>
                        )}

                        {/* Table (No Thead) */}
                        {candidates.length > 0 && (
                            <table className="w-full text-left text-sm">
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {candidates.map(c => {
                                        const isSelected = selectedCandidateIds.has(c.id);
                                        const isDup = c.status.includes('duplicate');
                                        const isProcessed = c.status === 'processed';
                                        const isDone = isDup || isProcessed;

                                        return (
                                            <tr
                                                key={c.id}
                                                className={`
                                                    group transition-colors
                                                    ${isSelected ? '!bg-indigo-100 dark:!bg-indigo-900/40' : (isDone ? 'bg-gray-50/50 dark:bg-gray-900/30' : 'hover:bg-gray-50 dark:hover:bg-white/5')}
                                                `}
                                            >
                                                <td className="w-10 px-4 py-3 align-middle">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelection(c.id)}
                                                        disabled={processingState === 'processing'}
                                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                                    />
                                                </td>
                                                <td className={`px-4 py-3 align-top ${isDone && !isSelected ? 'opacity-60 grayscale-[0.8]' : (isDone ? 'grayscale-[0.8]' : '')}`}>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <div className={`line-clamp-2 font-medium transition-colors ${isDone ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`} title={c.title}>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const targetId = c.existingId || c.id;
                                                                        addArticles([{
                                                                            id: targetId,
                                                                            title: c.title,
                                                                            link: c.link,
                                                                            sourceName: c.sourceName,
                                                                            published: c.published,
                                                                            created_at: c.published,
                                                                            tags: [],
                                                                        } as any]);
                                                                        openModal(targetId, 'briefing');
                                                                    }}
                                                                    className={`hover:underline underline-offset-2 text-left ${isDone ? 'decoration-gray-400' : 'decoration-indigo-400'}`}
                                                                >
                                                                    {c.title}
                                                                </button>
                                                            </div>
                                                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                                                                <span>{dayjs(c.published).format('YYYY-MM-DD')}</span>
                                                                {c.sourceName && (
                                                                    <>
                                                                        <span className="text-gray-300">•</span>
                                                                        <span className="truncate max-w-[200px]">{c.sourceName}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex-shrink-0 pt-0.5">
                                                            {isDup && <span className="inline-flex items-center rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">已生成</span>}
                                                            {isProcessed && <span className="inline-flex items-center rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] text-green-700 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-400">完成</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Bottom Action Footer */}
                    {candidates.length > 0 && (
                        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-black/20">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">模型:</span>
                                    <ModelSelector
                                        selectedModel={selectedModel}
                                        onSelectModel={setSelectedModel}
                                        disabled={processingState === 'processing'}
                                    />
                                </div>

                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">批量:</span>
                                    <input
                                        type="number"
                                        value={batchSize}
                                        onChange={(e) => setBatchSize(Math.max(1, Number(e.target.value)))}
                                        className="w-12 rounded border border-gray-300 bg-white dark:bg-black px-1.5 py-1 text-center text-xs shadow-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700"
                                        min={1}
                                        max={50}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleStartProcessing}
                                disabled={selectedCandidateIds.size === 0 || processingState === 'processing'}
                                className="flex items-center rounded bg-indigo-600 px-3.5 py-1.5 text-[13px] font-bold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-all mr-12"
                            >
                                {processingState === 'processing' ? (
                                    <>
                                        <svg className="mr-1.5 h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        处理中 {progress.current}/{progress.total}
                                    </>
                                ) : (
                                    '开始批量生成'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
