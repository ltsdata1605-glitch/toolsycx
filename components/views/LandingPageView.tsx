
import React from 'react';
import UploadSection from '../upload/UploadSection';
import { Icon } from '../common/Icon';

interface LandingPageViewProps {
    onProcessFile: (file: File) => void;
    configUrl: string;
    onConfigUrlChange: (url: string) => void;
    isDeduplicationEnabled?: boolean;
    onDeduplicationChange?: (enabled: boolean) => void;
}

const LandingPageView: React.FC<LandingPageViewProps> = ({ onProcessFile, configUrl, onConfigUrlChange, isDeduplicationEnabled, onDeduplicationChange }) => {
    return (
        <div className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden font-sans bg-[#F5F5F7] dark:bg-black selection:bg-blue-500/20 selection:text-blue-600">
            
            {/* Ambient Light - Very subtle */}
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-white to-transparent dark:from-white/5 dark:to-transparent rounded-[100%] blur-[80px] pointer-events-none opacity-60"></div>

            <div className="relative z-10 w-full max-w-[1000px] px-6 flex flex-col items-center text-center">
                
                {/* Badge */}
                <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-sm">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Intelligence Hub 2.0</span>
                    </div>
                </div>

                {/* Hero Typography */}
                <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <h1 className="text-6xl sm:text-7xl lg:text-8xl font-semibold tracking-tighter text-[#1d1d1f] dark:text-[#f5f5f7] leading-[1.05] mb-6">
                        Dữ liệu phức tạp.<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-violet-600">Phân tích đơn giản.</span>
                    </h1>
                    <p className="text-xl sm:text-2xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed tracking-tight">
                        Biến file Excel thô thành báo cáo quản trị chuyên sâu. Bảo mật tuyệt đối, xử lý cục bộ ngay trên trình duyệt của bạn.
                    </p>
                </div>

                {/* Main Action Area - Glass Card */}
                <div className="w-full max-w-2xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <div className="relative group">
                        {/* Glow effect behind */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                        
                        <div className="relative bg-white dark:bg-[#1c1c1e] rounded-[30px] p-2 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
                            <div className="bg-slate-50 dark:bg-[#000] rounded-[24px] overflow-hidden">
                                <UploadSection 
                                    onProcessFile={onProcessFile}
                                    configUrl={configUrl}
                                    onConfigUrlChange={onConfigUrlChange}
                                    isDeduplicationEnabled={isDeduplicationEnabled}
                                    onDeduplicationChange={onDeduplicationChange}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer / Trust Indicators */}
                <div className="mt-16 grid grid-cols-3 gap-8 text-center animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                    <div className="space-y-1">
                        <div className="flex justify-center text-slate-400 mb-2"><Icon name="shield-check" size={5} /></div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Local Processing</p>
                        <p className="text-[10px] text-slate-500">Dữ liệu không rời khỏi máy</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-center text-slate-400 mb-2"><Icon name="zap" size={5} /></div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Instant Speed</p>
                        <p className="text-[10px] text-slate-500">Xử lý hàng vạn dòng/giây</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-center text-slate-400 mb-2"><Icon name="sparkles" size={5} /></div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">AI Powered</p>
                        <p className="text-[10px] text-slate-500">Phân tích thông minh</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LandingPageView;
