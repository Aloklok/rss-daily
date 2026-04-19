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
           <h2 className="mt-1 text-2xl font-black text-stone-900">历史文章补全</h2>
        </div>
      </div>

      {/* 渲染主面板 */}
      <div>
        <BackfillPanel />
      </div>
    </div>
  );
}
