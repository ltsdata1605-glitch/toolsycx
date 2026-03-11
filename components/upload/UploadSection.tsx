
import React, { useState, useCallback } from 'react';
import { Icon } from '../common/Icon';

interface UploadSectionProps {
    onProcessFile: (file: File) => void;
    configUrl: string;
    onConfigUrlChange: (url: string) => void;
    isDeduplicationEnabled?: boolean;
    onDeduplicationChange?: (enabled: boolean) => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onProcessFile, configUrl, onConfigUrlChange, isDeduplicationEnabled = false, onDeduplicationChange }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            onProcessFile(files[0]);
        }
    }, [onProcessFile]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onProcessFile(e.target.files[0]);
        }
    }, [onProcessFile]);

    return (
        <div className="flex flex-col h-full">
            {/* Header Area inside the component */}
            <div className="px-8 pt-8 pb-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Icon name="database" size={5} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Nhập dữ liệu</h3>
                        <p className="text-xs text-slate-500 font-medium">Hỗ trợ Excel (.xlsx, .xls)</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className={`p-2 rounded-full transition-all duration-200 ${isSettingsOpen ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'} dark:hover:bg-slate-800`}
                    title="Cài đặt cấu hình"
                >
                    <Icon name="settings-2" size={5} />
                </button>
            </div>

            {/* Main Upload Area */}
            <div className="px-8 pb-8">
                {isSettingsOpen ? (
                    <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-fade-in space-y-5">
                        <div>
                            <label htmlFor="config-url" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                                Nguồn cấu hình (Google Sheets CSV)
                            </label>
                            <input
                                type="text"
                                id="config-url"
                                value={configUrl}
                                onChange={(e) => onConfigUrlChange(e.target.value)}
                                className="w-full p-3 text-sm font-medium text-slate-900 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="https://docs.google.com/..."
                            />
                        </div>
                        {onDeduplicationChange && (
                            <div className="flex items-center justify-between">
                                <div>
                                    <label htmlFor="dedupe-toggle" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                        Xử lý trùng lặp thông minh
                                    </label>
                                    <p className="text-xs text-slate-500 mt-0.5">Tự động phát hiện và gộp các dòng dữ liệu giống nhau.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        id="dedupe-toggle"
                                        className="sr-only peer" 
                                        checked={isDeduplicationEnabled}
                                        onChange={(e) => onDeduplicationChange(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        )}
                        <div className="pt-2 text-right">
                            <button onClick={() => setIsSettingsOpen(false)} className="text-xs font-bold text-blue-600 hover:underline">Đóng cài đặt</button>
                        </div>
                    </div>
                ) : (
                    <label
                        htmlFor="file-upload"
                        className={`group relative flex flex-col items-center justify-center w-full h-56 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden
                            ${isDragging 
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 scale-[1.02]' 
                                : 'bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input
                            id="file-upload"
                            type="file"
                            className="hidden"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                        />
                        
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

                        <div className="flex flex-col items-center justify-center relative z-10 space-y-4">
                            <div className={`p-4 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:scale-110 transition-all duration-300`}>
                                <Icon name="upload-cloud" size={8} />
                            </div>
                            <div className="text-center">
                                <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                                    <span className="text-blue-600 dark:text-blue-400 hover:underline">Chọn file</span> hoặc kéo thả vào đây
                                </p>
                                <p className="text-xs text-slate-400 mt-1 font-medium">
                                    Xử lý an toàn • Không tải lên máy chủ
                                </p>
                            </div>
                        </div>
                    </label>
                )}
            </div>
        </div>
    );
};

export default UploadSection;
