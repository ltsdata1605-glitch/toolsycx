
import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../common/Icon';

interface HeaderProps {
    onNewFile: () => void;
    onLoadShiftFile: () => void;
    onClearDepartments: () => void;
    isClearingDepartments: boolean;
    hasDepartmentData: boolean;
    showNewFileButton: boolean;
    onClearData: () => void;
    fileInfo: { filename: string; savedAt: string } | null;
    onToggleFilters?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNewFile, onLoadShiftFile, onClearDepartments, isClearingDepartments, hasDepartmentData, showNewFileButton, onClearData, fileInfo, onToggleFilters }) => {
    const [deptClearSuccess, setDeptClearSuccess] = useState(false);
    const [dataClearSuccess, setDataClearSuccess] = useState(false);
    const [isDeptInfoVisible, setIsDeptInfoVisible] = useState(false);
    const deptInfoRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (fileInfo) {
            setDataClearSuccess(false);
        }
    }, [fileInfo]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (deptInfoRef.current && !deptInfoRef.current.contains(event.target as Node)) {
                setIsDeptInfoVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleDeptClear = () => {
        onClearDepartments();
        setDeptClearSuccess(true);
        setTimeout(() => setDeptClearSuccess(false), 3000);
    };

    const handleDataClear = () => {
        setDataClearSuccess(true);
        setTimeout(() => {
            onClearData();
        }, 1500);
    };
    
    const debugInfo = {
        title: {
            name: "Tiêu đề chính",
            description: "Tiêu đề chính của dashboard, cung cấp ngữ cảnh cho người dùng.",
            design: "Sử dụng thẻ h1, font chữ lớn và đậm để tạo điểm nhấn chính cho trang."
        },
        filters: {
            name: "Nút Bộ lọc Phân tích",
            description: "Mở Slide Menu bên phải để cấu hình các bộ lọc dữ liệu.",
            design: "Nút nổi bật với icon filter."
        }
    };
    
    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
                <div data-debug-id="Header.Title" data-debug-info={JSON.stringify(debugInfo.title)}>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary-color)' }}>Báo Cáo YCX</h1>
                    {fileInfo ? (
                        <p style={{ color: 'var(--text-secondary-color)' }} className="mt-1 text-sm">
                            Dữ liệu: <strong className="text-slate-700 dark:text-slate-200">{fileInfo.savedAt}</strong>
                        </p>
                    ) : (
                        <p style={{ color: 'var(--text-secondary-color)' }} className="mt-1">Dữ liệu thời gian thực</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                {showNewFileButton && (
                    <div className="flex items-center gap-3">
                        {/* Nút Bộ lọc chính được tích hợp vào Header */}
                        <button 
                            onClick={onToggleFilters}
                            data-debug-id="Header.FilterButton"
                            data-debug-info={JSON.stringify(debugInfo.filters)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none font-bold text-sm hover:bg-indigo-700 transition-all active:scale-95"
                        >
                            <Icon name="filter" size={4} />
                            <span>Bộ lọc</span>
                        </button>

                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

                        <div className="flex items-center gap-1.5">
                            <div className="inline-flex rounded-lg shadow-sm border border-slate-200 dark:border-slate-700" role="group">
                                <button 
                                    onClick={onLoadShiftFile}
                                    className="relative inline-flex items-center gap-2 rounded-l-lg bg-blue-50 dark:bg-blue-900/20 px-4 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 focus:z-10 transition-colors"
                                    title="Tải lên file phân ca của cụm"
                                >
                                    <Icon name="users-round" size={4} />
                                    <span className="hidden lg:inline">Phân ca</span>
                                </button>
                                <a 
                                    href="https://office.thegioididong.com/quan-ly-phan-ca" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`relative -ml-px inline-flex items-center bg-slate-100 dark:bg-slate-700 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 focus:z-10 transition-colors ${!hasDepartmentData || deptClearSuccess ? 'rounded-r-lg' : ''}`}
                                >
                                    <Icon name="link" size={4} />
                                </a>
                                {hasDepartmentData && (
                                     deptClearSuccess ? (
                                        <span className="relative -ml-px inline-flex items-center gap-1.5 rounded-r-lg bg-green-100 dark:bg-green-900/50 px-3 py-2 text-green-700 dark:text-green-300 text-sm font-semibold transition-all">
                                            <Icon name="check-circle" size={4} />
                                        </span>
                                     ) : (
                                        <button 
                                            onClick={handleDeptClear}
                                            disabled={isClearingDepartments}
                                            className="relative -ml-px inline-flex items-center rounded-r-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 focus:z-10 transition-colors" 
                                        >
                                            <Icon name={isClearingDepartments ? 'loader-2' : 'trash-2'} size={4} className={isClearingDepartments ? 'animate-spin' : ''} />
                                        </button>
                                     )
                                )}
                            </div>
                        </div>
                        
                        <div className="inline-flex rounded-lg shadow-sm border border-slate-200 dark:border-slate-700" role="group">
                            <button 
                                id="new-file-btn" 
                                onClick={onNewFile}
                                className="flex items-center gap-2 rounded-l-lg bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 focus:z-10 transition-colors" 
                            >
                                <Icon name="file-plus-2" size={4} />
                                <span className="hidden lg:inline">Nhập YCX</span>
                            </button>
                             {dataClearSuccess ? (
                                <span className="relative -ml-px inline-flex items-center gap-1.5 rounded-r-lg bg-green-100 dark:bg-green-900/50 px-3 py-2 text-green-700 dark:text-green-300 text-sm font-semibold transition-all">
                                    <Icon name="check-circle" size={4} />
                                </span>
                             ) : (
                                <button 
                                    onClick={handleDataClear}
                                    className="-ml-px flex items-center rounded-r-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 focus:z-10 transition-colors" 
                                >
                                    <Icon name="trash-2" size={4} />
                                </button>
                             )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
