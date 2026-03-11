
import React from 'react';
import type { Status } from '../../types';
import { Icon } from './Icon';

interface ProcessingLoaderProps {
    status: Status;
    processingTime: number; // Thời gian tính bằng ms
}

const ProcessingLoader: React.FC<ProcessingLoaderProps> = ({ status, processingTime }) => {
    // Chuyển đổi ms sang giây với 1 chữ số thập phân
    const seconds = (processingTime / 1000).toFixed(1);

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-md"></div>

            {/* Compact Floating Card */}
            <div className="relative w-full max-w-[300px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white dark:border-slate-800 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] rounded-[2rem] p-5 flex flex-col items-center text-center overflow-hidden">
                
                {/* Aura AI Mini - Compact */}
                <div className="relative mb-3 h-14 w-14 flex items-center justify-center">
                    <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                    <div className="absolute inset-1.5 bg-indigo-500/10 rounded-full animate-pulse" style={{ animationDuration: '2s' }}></div>
                    <div className="relative h-9 w-9 bg-indigo-600 shadow-lg rounded-xl flex items-center justify-center text-white">
                        <Icon name="sparkles" className="w-5 h-5 animate-pulse" />
                    </div>
                </div>

                {/* Status Info - Tightened */}
                <div className="space-y-1 mb-3">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[8px] font-black uppercase tracking-widest shadow-sm">
                        <span className="relative flex h-1 w-1">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1 w-1 bg-indigo-600"></span>
                        </span>
                        AI Engine
                    </div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white leading-tight uppercase tracking-tight">
                        {status.message || "Đang xử lý"}
                    </h3>
                </div>

                {/* Stopwatch - Resized */}
                <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-black text-slate-900 dark:text-white font-mono tabular-nums tracking-tighter leading-none">
                        {seconds}
                    </span>
                    <span className="text-sm font-black text-indigo-500 italic lowercase leading-none">s</span>
                </div>

                {/* Progress Bar - Compact */}
                <div className="w-full space-y-1.5">
                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-700 ease-out"
                            style={{ width: `${status.progress > 0 ? status.progress : 15}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between items-center px-0.5">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tiến độ</span>
                        <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400">{Math.round(status.progress)}%</span>
                    </div>
                </div>

                {/* Decorative Bottom blob */}
                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
            </div>
        </div>
    );
};

export default ProcessingLoader;
