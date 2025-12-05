'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import SidebarClient from './SidebarClient';
import FloatingButtonsClient from './FloatingButtonsClient';

interface MainLayoutClientProps {
    children: React.ReactNode;
}

export default function MainLayoutClient({ children }: MainLayoutClientProps) {
    const isSidebarCollapsed = useUIStore(state => state.isSidebarCollapsed);
    const toggleSidebar = useUIStore(state => state.toggleSidebar);
    const setSidebarCollapsed = useUIStore(state => state.setSidebarCollapsed);
    const checkAdminStatus = useUIStore(state => state.checkAdminStatus);

    useEffect(() => {
        checkAdminStatus();
    }, [checkAdminStatus]);

    const [isMdUp, setIsMdUp] = useState<boolean>(false);
    const mainContentRef = useRef<HTMLDivElement | null>(null);

    // Handle viewport resize
    useEffect(() => {
        const updateViewport = () => {
            const mdUp = window.innerWidth >= 768;
            setIsMdUp(mdUp);
            // Auto-collapse on mobile, expand on desktop if needed
            // But let's respect user state if possible, or just default logic:
            if (!mdUp) {
                setSidebarCollapsed(true);
            } else {
                setSidebarCollapsed(false);
            }
        };
        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, [setSidebarCollapsed]);

    // Handle body overflow for mobile sidebar
    useEffect(() => {
        if (!isSidebarCollapsed && !isMdUp) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isSidebarCollapsed, isMdUp]);

    return (
        <div className="flex flex-col md:flex-row min-h-screen font-sans bg-gray-50 dark:bg-midnight-bg">
            {/* Mobile Overlay */}
            {!isSidebarCollapsed && !isMdUp && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setSidebarCollapsed(true)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar Container */}
            <div className={`h-full bg-gray-50 dark:bg-midnight-sidebar border-r border-transparent dark:border-midnight-sidebar z-50 transition-all duration-300 ease-in-out ${!isMdUp
                ? `fixed top-0 left-0 w-64 ${isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}`
                : `md:fixed md:top-0 md:bottom-0 md:left-0 md:overflow-y-auto ${isSidebarCollapsed ? 'md:w-0 md:opacity-0 md:pointer-events-none' : 'md:w-80 md:opacity-100'}`
                }`}>
                <SidebarClient />
            </div>

            {/* Desktop Toggle Button */}
            <button
                onClick={toggleSidebar}
                className={`fixed top-5 p-2 bg-white dark:bg-midnight-card rounded-full shadow-lg hover:shadow-xl duration-300 ease-in-out border border-gray-200 dark:border-midnight-border z-50
                    hidden md:block
                    md:left-5 md:transition-all md:duration-300 ${isSidebarCollapsed ? 'md:left-5' : 'md:left-[304px]'}
                    right-5 md:right-auto 
                `}
                aria-label="Toggle Sidebar"
            >
                {isSidebarCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800 dark:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800 dark:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" /><path d="M9 4v16" strokeWidth="2" /></svg>
                )}
            </button>

            {/* Mobile Toggle Button */}
            <button
                onClick={toggleSidebar}
                className={`md:hidden fixed top-3 right-5 z-50 p-2 rounded-full transition-all duration-300 ease-in-out
                    ${isSidebarCollapsed ? 'bg-gray-800 text-white' : 'bg-white/20 text-white'}
                `}
                aria-label="Toggle Sidebar"
            >
                {isSidebarCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" /><path d="M9 4v16" strokeWidth="2" /></svg>
                )}
            </button>

            {/* Main Content Area */}
            <div ref={mainContentRef} className={`flex-1 flex flex-col min-w-0 bg-neutral-50 dark:bg-midnight-bg bg-paper-texture dark:bg-none transition-all duration-300 ${!isSidebarCollapsed && isMdUp ? 'md:ml-80' : ''}`}>
                <div className="w-full max-w-3xl mx-auto px-2 md:px-8 pt-4">
                    {children}
                </div>
                <FloatingButtonsClient />
            </div>
        </div>
    );
}
