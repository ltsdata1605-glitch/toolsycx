
import React from 'react';
import { Icon } from './Icon';

interface DebugInfo {
    name: string;
    description: string;
    design: string;
}

interface DebugPanelProps {
    info: DebugInfo | null;
    isVisible: boolean;
    isInspectorActive: boolean;
    onClose: () => void;
    onToggleInspector: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ info, isVisible, isInspectorActive, onClose, onToggleInspector }) => {
    return (
        <div className={`debug-panel ${isVisible ? '' : 'hidden'}`}>
            <div className="debug-panel-header">
                <div className="flex items-center gap-3">
                    <Icon name="bug" className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-lg">Bảng Gỡ Lỗi Giao Diện</h3>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onToggleInspector} 
                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${isInspectorActive ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
                    >
                        {isInspectorActive ? 'TẮT Inspector' : 'BẬT Inspector'}
                    </button>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
                        <Icon name="x" size={6} />
                    </button>
                </div>
            </div>
            <div className="debug-panel-body">
                {info ? (
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-bold text-xl text-indigo-600 dark:text-indigo-400">{info.name}</h4>
                        </div>
                        <div>
                            <h5 className="font-semibold text-base mb-1 border-b border-slate-300 dark:border-slate-600 pb-1">Chức năng</h5>
                            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{info.description}</p>
                        </div>
                         <div>
                            <h5 className="font-semibold text-base mb-1 border-b border-slate-300 dark:border-slate-600 pb-1">Thiết kế</h5>
                            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{info.design}</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-slate-500 dark:text-slate-400">
                        <p>Kích hoạt chế độ "Inspector" và click vào một khu vực để xem thông tin chi tiết.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
