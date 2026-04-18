'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useUIStore } from '@/shared/store/uiStore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = useUIStore((state) => state.isAdmin);
  const adminStatusChecked = useUIStore((state) => state.adminStatusChecked);
  const checkAdminStatus = useUIStore((state) => state.checkAdminStatus);

  useEffect(() => {
    if (!adminStatusChecked) {
      checkAdminStatus();
    }
  }, [adminStatusChecked, checkAdminStatus]);

  useEffect(() => {
    if (adminStatusChecked && !isAdmin) {
      router.push('/');
    }
  }, [adminStatusChecked, isAdmin, router]);

  if (!adminStatusChecked || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#fdfcf8]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-t-orange-500"></div>
          <div className="text-sm font-bold tracking-widest text-stone-400 uppercase">
            身份验证中...
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { name: '业务看板', href: '/admin/dashboard', icon: '📊' },
    { name: '批量回溯', href: '/admin/briefing', icon: '🔄' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#fdfcf8]">
      {/* 顶部统一导航 */}
      <div className="sticky top-0 z-30 border-b border-stone-200 bg-[#fdfcf8]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-6">
            <Link 
              href="/" 
              className="group flex items-center gap-2 text-stone-400 transition-colors hover:text-stone-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-widest">返回主站</span>
            </Link>
            
            <div className="h-4 w-px bg-stone-200"></div>
            
            <nav className="flex items-center gap-1 p-1">
              {tabs.map((tab) => {
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-stone-900 text-white shadow-lg'
                        : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex animate-pulse items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 ring-1 ring-green-100">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                <span className="text-[10px] font-bold text-green-700 uppercase">Admin Verified</span>
             </div>
          </div>
        </div>
      </div>

      {/* 页面内容 */}
      <main className="mx-auto max-w-7xl">
        {children}
      </main>
    </div>
  );
}
