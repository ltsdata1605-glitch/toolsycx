
import React, { useState, forwardRef, useMemo, useEffect } from 'react';
import type { Employee } from '../../types';
import { abbreviateName, formatCurrency, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { getTopSellerAnalysis } from '../../services/aiService';
import { getTopSellerAnalysisHistory, saveTopSellerAnalysis } from '../../services/dbService';

interface TopSellerListProps {
    fullSellerArray: Employee[];
    onEmployeeClick: (employeeName: string) => void;
    onBatchExport: (employees: Employee[]) => void;
    onExport?: () => void;
    isExporting?: boolean;
}

const getTraChamPercentClass = (percentage: number) => {
    if (isNaN(percentage)) return 'text-slate-600 dark:text-slate-300';
    if (percentage >= 45) return 'text-green-500 font-bold';
    if (percentage >= 35) return 'text-amber-500 font-bold';
    return 'text-red-500 font-bold';
};


const TopSellerList = React.memo(forwardRef<HTMLDivElement, TopSellerListProps>(({ fullSellerArray, onEmployeeClick, onBatchExport, onExport, isExporting }, ref) => {
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
    const [isExpanded, setIsExpanded] = useState(false);
    
    const sortedSellers = useMemo(() => {
        return [...fullSellerArray]
            .filter(s => s && s.doanhThuThuc > 0)
            .sort((a, b) => (b.doanhThuQD || 0) - (a.doanhThuQD || 0));
    }, [fullSellerArray]);

    // Calculate Top 20% and Bottom 20% or show all based on isExpanded
    const displayedSellers = useMemo(() => {
        if (isExpanded) return sortedSellers;
        
        // Changed to 20%
        const count20Percent = Math.ceil(sortedSellers.length * 0.2);
        
        // If list is small, show all anyway to avoid duplication/confusion
        if (sortedSellers.length <= count20Percent * 2) return sortedSellers;

        const top20 = sortedSellers.slice(0, count20Percent);
        const bot20 = sortedSellers.slice(-count20Percent);
        
        return [...top20, ...bot20];
    }, [sortedSellers, isExpanded]);

    const groupedSellers = useMemo(() => {
        return displayedSellers.reduce((acc, seller) => {
            const dept = seller.department || 'Không Phân Ca';
            if (!acc[dept]) {
                acc[dept] = [];
            }
            acc[dept].push(seller);
            return acc;
        }, {} as { [key: string]: Employee[] });
    }, [displayedSellers]);

    const sortedDepartments = useMemo(() => Object.keys(groupedSellers).sort(), [groupedSellers]);
    
    const medals = ['🥇', '🥈', '🥉'];

    const handleBatchExportClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onBatchExport(sortedSellers);
    };

    const handleAiAnalysis = async () => {
        setIsAnalysisLoading(true);
        setAnalysis(null);
        try {
            const history = await getTopSellerAnalysisHistory();
            const result = await getTopSellerAnalysis(sortedSellers, history); 
            setAnalysis(result);
            await saveTopSellerAnalysis(result, sortedSellers);
        } catch (error) {
            console.error("Lỗi khi phân tích top seller:", error);
            setAnalysis("Đã xảy ra lỗi khi phân tích. Vui lòng thử lại.");
        } finally {
            setIsAnalysisLoading(false);
        }
    };

    const handleCopyAnalysis = () => {
        if (analysis) {
            const textArea = document.createElement('textarea');
            textArea.value = analysis;
            textArea.style.position = 'fixed';
            textArea.style.top = '0';
            textArea.style.left = '0';
            textArea.style.width = '2em';
            textArea.style.height = '2em';
            textArea.style.padding = '0';
            textArea.style.border = 'none';
            textArea.style.outline = 'none';
            textArea.style.boxShadow = 'none';
            textArea.style.background = 'transparent';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    setCopyStatus('copied');
                    setTimeout(() => setCopyStatus('idle'), 2000);
                }
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
            }
            document.body.removeChild(textArea);
        }
    };

    return (
        <div ref={ref}>
             <div className="grid grid-cols-3 items-center mb-4">
                <div></div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase text-center">
                    Top Nhân Viên {isExpanded ? '(Toàn bộ)' : '(Top & Bot 20%)'}
                </h2>
                <div className="flex justify-end">
                    <div className="flex items-center gap-2 hide-on-export">
                        <button
                            onClick={handleAiAnalysis}
                            disabled={isAnalysisLoading}
                            className="p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Nhận xét bằng AI"
                        >
                            {isAnalysisLoading ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="sparkles" />}
                        </button>
                        {onExport && (
                            <button onClick={onExport} disabled={isExporting} title="Xuất Ảnh" className="p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                {isExporting ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="camera" />}
                            </button>
                        )}
                        <button 
                            onClick={handleBatchExportClick}
                            className="p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Xuất hàng loạt báo cáo chi tiết"
                        >
                            <Icon name="switch-camera" />
                        </button>
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`p-2 rounded-md transition-colors ${isExpanded ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                            title={isExpanded ? "Thu gọn danh sách" : "Xem toàn bộ nhân viên"}
                        >
                            <Icon name={isExpanded ? "minimize-2" : "maximize-2"} />
                        </button>
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                {sortedDepartments.length === 0 ? (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-8">Không có dữ liệu nhân viên cho bộ phận đã chọn.</p>
                ) : (
                    sortedDepartments.map(dept => {
                        const showHeader = sortedDepartments.length > 1 || dept !== 'Không Phân Ca';
                        return (
                            <div key={dept}>
                                {showHeader && (
                                    <h3 className="text-md font-bold text-indigo-700 dark:text-indigo-400 mb-2 border-b-2 border-indigo-200 dark:border-indigo-800 pb-1 flex items-center gap-2">
                                        <Icon name="users-round" size={4} /> {dept}
                                    </h3>
                                )}
                                <div className="space-y-2">
                                    {groupedSellers[dept].map((seller) => {
                                        const rankIndex = sortedSellers.findIndex(s => s.name === seller.name);
                                        const medal = rankIndex < 3 ? medals[rankIndex] : null;
                                        
                                        let rankDisplay;
                                        if (medal) {
                                            rankDisplay = <div className="w-8 text-2xl font-bold text-center">{medal}</div>;
                                        } else {
                                            rankDisplay = <div className="w-8 text-sm text-slate-500 dark:text-slate-400 font-semibold text-center">#{rankIndex + 1}</div>
                                        }

                                        const hieuQuaClass = Number(seller.hieuQuaValue || 0) < 35 ? 'text-red-500 font-bold' : 'text-green-500 font-bold';
                                        const traChamClass = getTraChamPercentClass(Number(seller.traChamPercent || 0));

                                        return (
                                            <div key={seller.name} onClick={() => onEmployeeClick(seller.name)} className="p-2 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 transition-shadow hover:shadow-md cursor-pointer">
                                                <div className="flex items-center gap-2">
                                                    {rankDisplay}
                                                    <div className="flex-grow min-w-0">
                                                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{abbreviateName(seller.name)}</p>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                                            <span><strong className="text-slate-600 dark:text-slate-300">Thực:</strong> {formatCurrency(seller.doanhThuThuc, 0)}</span>
                                                            <span className="inline-flex items-center"><strong className="text-slate-600 dark:text-slate-300">HQQĐ:</strong><span className={`ml-1 ${hieuQuaClass}`}>{Number(seller.hieuQuaValue || 0).toFixed(0)}%</span></span>
                                                            <span><strong className="text-slate-600 dark:text-slate-300">T.Cận:</strong> {formatQuantity(seller.slTiepCan)}</span>
                                                            <span><strong className="text-slate-600 dark:text-slate-300">T.Chậm:</strong> <span className={traChamClass}>{Number(seller.traChamPercent || 0).toFixed(0)}%</span></span>
                                                            <span><strong className="text-slate-600 dark:text-slate-300">T.Hộ:</strong> {formatQuantity(seller.slThuHo)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">DTQĐ</p>
                                                        <p className="font-bold text-lg text-indigo-600 dark:text-indigo-400">{formatCurrency(seller.doanhThuQD, 0)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
            {(analysis || isAnalysisLoading) && (
                <div className="mt-4 p-4 bg-indigo-50 dark:bg-slate-900/50 border border-indigo-200 dark:border-indigo-900/50 rounded-lg hide-on-export">
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                            <Icon name="sparkles" />
                            AI Nhận Xét
                        </h4>
                        {analysis && !isAnalysisLoading && (
                            <button
                                onClick={handleCopyAnalysis}
                                title={copyStatus === 'copied' ? 'Đã sao chép!' : 'Sao chép nhận xét'}
                                className="flex items-center gap-1.5 text-xs font-semibold py-1 px-2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            >
                                <Icon name={copyStatus === 'copied' ? "check" : "copy"} size={4} />
                                {copyStatus === 'copied' && <span>Đã chép</span>}
                            </button>
                        )}
                    </div>

                    {isAnalysisLoading ? (
                        <div className="space-y-2 mt-2">
                            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded h-4 w-full"></div>
                            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded h-4 w-3/4"></div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">
                            {analysis}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}));

export default TopSellerList;
