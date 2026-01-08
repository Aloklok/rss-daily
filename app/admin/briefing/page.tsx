'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BackfillPanel from '@/components/features/admin/BackfillPanel';

export default function BackfillPage() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        // 异步校验管理员权限 (基于 Cookie)
        fetch('/api/auth/check')
            .then((res) => res.json())
            .then((data) => {
                if (data.isAdmin) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                    // 可以在这里重定向，或者显示 403 界面
                    // router.push('/'); 
                }
            })
            .catch(() => setIsAdmin(false));
    }, [router]);

    if (isAdmin === null) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="text-gray-500 animate-pulse">Verifying Access...</div>
            </div>
        );
    }

    if (isAdmin === false) {
        return (
            <div className="flex h-screen w-full items-center justify-center flex-col gap-4">
                <h1 className="text-2xl font-bold text-red-600">403 Unauthorized</h1>
                <p className="text-gray-600">You do not have permission to access this page.</p>
                <button
                    onClick={() => router.push('/')}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                >
                    Go Home
                </button>
            </div>
        );
    }

    // Admin Verified
    return (
        <div className="flex h-screen w-full flex-col bg-gray-50 dark:bg-gray-900 p-4">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">历史文章回溯中心 (Backfill)</h1>
                    <p className="text-sm text-gray-500">为历史文章批量补充生成 AI 简报</p>
                </div>
                <div className="rounded bg-green-100 px-2 py-1 font-mono text-xs text-green-800">
                    管理员已验证
                </div>
            </div>

            {/* 渲染主面板 */}
            <BackfillPanel />
        </div>
    );
}
