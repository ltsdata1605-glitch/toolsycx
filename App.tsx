
import React, { Suspense, lazy } from 'react';

const DashboardView = lazy(() => import('./components/views/DashboardView'));

export default function App() {
    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-500 overflow-hidden font-sans">
            {/* Main Application Area - Đã gỡ bỏ Sidebar và các margin liên quan */}
            <main className="flex-grow overflow-y-auto w-full h-screen custom-scrollbar">
                <div className="w-full h-full">
                    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                        <DashboardView />
                    </Suspense>
                </div>
            </main>
        </div>
    );
}
