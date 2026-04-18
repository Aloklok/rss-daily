'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BackfillPanel from '@/domains/interaction/components/admin/BackfillPanel';

export default function BriefingAdminPage() {
  // Admin Verified
  return (
    <div className="w-full bg-[#fdfcf8] p-4 pb-20 font-sans text-gray-900 md:p-8">
       {/* 头部标题区 */}
      <div className="mb-8 flex items-center justify-between px-4">
        <div>
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-orange-600 uppercase">Tools</span>
              <div className="h-1 w-1 rounded-full bg-stone-300"></div>
              <span className="text-[10px] font-bold text-stone-400">批量任务处理</span>
           </div>
           <h2 className="mt-1 text-2xl font-black text-stone-900">历史文章回溯中心 (Backfill)</h2>
           <p className="mt-1 text-xs font-medium text-stone-400">为历史文章批量补充生成 AI 简报</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-1.5 ring-1 ring-green-100">
           <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
           <span className="text-[10px] font-bold text-green-700 uppercase">就绪</span>
        </div>
      </div>

      {/* 渲染主面板 */}
      <div className="px-4">
        <BackfillPanel />
      </div>
    </div>
  );
}
