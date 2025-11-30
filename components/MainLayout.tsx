import React, { useEffect, useRef } from 'react';

interface MainLayoutProps {
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
    isMdUp: boolean;
    sidebar: React.ReactNode;
    children: React.ReactNode;
    showToggleButtons?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMdUp,
    sidebar,
    children,
    showToggleButtons = true
}) => {
    const mainContentRef = useRef<HTMLDivElement | null>(null);

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
        <div className="flex flex-col md:flex-row min-h-screen font-sans">
            {/* Mobile Overlay */}
            {!isSidebarCollapsed && !isMdUp && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsSidebarCollapsed(true)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar Container */}
            <div className={`h-full bg-gray-50 border-r border-gray-200 z-50 transition-all duration-300 ease-in-out ${!isMdUp
                ? `fixed top-0 left-0 w-64 ${isSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}`
                : `md:fixed md:top-0 md:bottom-0 md:left-0 md:overflow-y-auto ${isSidebarCollapsed ? 'md:w-0 md:opacity-0 md:pointer-events-none' : 'md:w-80 md:opacity-100'}`
                }`}>
                {sidebar}
            </div>

            {/* Desktop Toggle Button */}
            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`fixed top-5 p-2 bg-white rounded-full shadow-lg hover:shadow-xl duration-300 ease-in-out border border-gray-200 hover:border-gray-300 z-50
                    hidden md:block
                    ${!showToggleButtons ? 'md:hidden' : ''} 
                    md:left-5 md:transition-all md:duration-300 ${isSidebarCollapsed ? 'md:left-5' : 'md:left-[304px]'}
                    right-5 md:right-auto 
                `}
            >
                {isSidebarCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" /><path d="M9 4v16" strokeWidth="2" /></svg>
                )}
            </button>

            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`md:hidden fixed top-3 right-5 z-50 p-2 rounded-full transition-all duration-300 ease-in-out
                    ${!showToggleButtons ? 'hidden' : ''}
                    ${isSidebarCollapsed ? 'bg-gray-800 text-white' : 'bg-white/20 text-white'}
                `}
            >
                {isSidebarCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" /><path d="M9 4v16" strokeWidth="2" /></svg>
                )}
            </button>

            {/* Main Content Area */}
            <div ref={mainContentRef} className={`flex-1 bg-neutral-50 dark:bg-midnight-bg bg-paper-texture dark:bg-none ${!isSidebarCollapsed && isMdUp ? 'md:ml-80' : ''}`}>
                <div className="w-full max-w-3xl mx-auto px-2 md:px-8">
                    {children}
                </div>
            </div>
        </div>
    );
};
