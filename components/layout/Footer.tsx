
import React from 'react';

interface FooterProps {
    lastUpdated: string;
    onToggleDebug: () => void;
}

const Footer: React.FC<FooterProps> = ({ lastUpdated, onToggleDebug }) => {
    return (
        <footer className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400 pb-4">
            <p>
                Intelligence Hub 2.0 (High Performance Update)
                <button 
                    onClick={onToggleDebug} 
                    className="ml-4 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-mono hover:bg-slate-300 dark:hover:bg-slate-600"
                    title="Bật/Tắt Bảng gỡ lỗi"
                >
                    [Debug]
                </button>
            </p>
            <p className="mt-1">Dữ liệu cập nhật: {lastUpdated}</p>
        </footer>
    );
};

export default Footer;
