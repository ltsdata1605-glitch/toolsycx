
import React from 'react';
import { Icon } from '../common/Icon';
import type { ViewType } from '../../types';

interface SidebarProps {
    currentView: ViewType;
    setCurrentView: (view: ViewType) => void;
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    isMobileOpen: boolean;
    setIsMobileOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    isMobileOpen,
    setIsMobileOpen
}) => {
    // Menu chỉ có tính năng Báo Cáo YCX theo yêu cầu
    const menuItem = { id: 'dashboard', label: 'Báo Cáo YCX', icon: 'layout-dashboard' };

    return (
        <aside 
            className={`fixed left-0 top-0 h-full z-[100] transition-transform duration-300 ease-in-out border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex flex-col shadow-2xl w-64
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}
        >
            {/* Header / Logo - Luôn hiển thị vì Sidebar không còn co giãn */}
            <div className="flex items-center gap-3 p-6 mb-4">
                <div className="shrink-0 p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
                    <Icon name="zap" size={6} />
                </div>
                <div className="overflow-hidden whitespace-nowrap">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tighter">HUB <span className="text-indigo-600">2.0</span></h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">BI Analyst Professional</p>
                </div>
            </div>

            {/* Navigation Menu - Cố định */}
            <nav className="flex-grow px-3 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
                <div 
                    className="w-full flex items-center gap-4 p-3.5 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none font-bold"
                >
                    <div className="shrink-0 text-white">
                        <Icon name={menuItem.icon} size={5} />
                    </div>
                    <span className="text-sm font-black uppercase tracking-tight">{menuItem.label}</span>
                    <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse"></div>
                </div>

                <div className="mt-8 px-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Chế độ hoạt động</p>
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                            <Icon name="activity" size={4} />
                            <span className="text-xs font-bold">Phân tích chuyên sâu</span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Footer Profile */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 mt-auto overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/20 shrink-0 flex items-center justify-center text-white shadow-sm">
                        <Icon name="user" size={5} />
                    </div>
                    <div className="overflow-hidden whitespace-nowrap">
                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">Quản Trị Viên</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">BI Analyst 2025</p>
                    </div>
                </div>
            </div>

            {/* Mobile Close Button */}
            <button 
                onClick={() => setIsMobileOpen(false)}
                className="absolute top-4 right-4 md:hidden p-2 text-slate-400 hover:text-slate-800"
            >
                <Icon name="x" size={6} />
            </button>
        </aside>
    );
};

export default Sidebar;
