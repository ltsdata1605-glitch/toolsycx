
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { formatCurrency, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { saveKpiTargets, getKpiTargets } from '../../services/dbService';

interface KpiCardsProps {
    onUnshippedClick: () => void;
}

// Compact Horizontal Card with Apple Bento Style
const KpiCard = React.memo<{
    icon: string;
    iconColor: string;
    title: string;
    onClick?: (e: React.MouseEvent) => void;
    children: React.ReactNode;
    trendLabel?: string;
    trendValue?: string | React.ReactNode;
}>(({ icon, iconColor, title, onClick, children, trendLabel, trendValue }) => {
    const isClickable = !!onClick;
    
    // Apple-style vivid colors with subtle backgrounds
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
        teal: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
        pink: 'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400',
        red:  'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    };

    const iconClass = colorMap[iconColor] || colorMap['blue'];

    return (
        <div
            onClick={onClick}
            className={`relative h-full bg-white dark:bg-[#1c1c1e] rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-white/5 transition-all duration-300 flex items-center justify-between group ${isClickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-95' : ''}`}
        >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconClass} shrink-0 transition-transform group-hover:scale-105`}>
                    <Icon name={icon} size={5} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5 truncate pr-1">{title}</h3>
                    <div className="flex flex-col">
                        {children}
                    </div>
                </div>
            </div>

            {(trendLabel || trendValue) && (
                <div className="text-right pl-3 border-l border-slate-100 dark:border-white/5 shrink-0 min-w-[70px]">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide whitespace-nowrap">{trendLabel}</p>
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5 font-mono whitespace-nowrap">
                        {trendValue}
                    </div>
                </div>
            )}
        </div>
    );
});

KpiCard.displayName = 'KpiCard';

// Inline Editor Component for Percentage (Small Width)
const KpiTargetEditor: React.FC<{ 
    value: string; 
    onChange: (val: string) => void; 
    onFinish: () => void; 
    onCancel: () => void;
}> = ({ value, onChange, onFinish, onCancel }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    return (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
                ref={inputRef}
                type="number"
                min="0"
                max="100"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onFinish}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onFinish();
                    if (e.key === 'Escape') onCancel();
                    e.stopPropagation(); 
                }}
                className="w-10 px-1 py-0.5 text-center text-xs font-bold text-slate-900 bg-slate-100 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-[10px] font-bold text-slate-500">%</span>
        </div>
    );
};

const KpiCards: React.FC<KpiCardsProps> = ({ onUnshippedClick }) => {
    const { processedData, filterState, warehouseTargets } = useDashboardContext();
    const kpis = processedData?.kpis;
    const [targets, setTargets] = useState({ hieuQua: 40, traGop: 45 });
    
    const [editingState, setEditingState] = useState<{ field: 'hieuQua' | 'traGop' | null, value: string }>({ field: null, value: '' });

    useEffect(() => {
        getKpiTargets().then(saved => {
            if (saved) {
                setTargets(prev => ({ ...prev, ...saved }));
            }
        });
    }, []);

    const startEditing = (e: React.MouseEvent, field: 'hieuQua' | 'traGop') => {
        e.preventDefault();
        e.stopPropagation();
        setEditingState({ field, value: targets[field].toString() });
    };

    const handleEditChange = (val: string) => {
        setEditingState(prev => ({ ...prev, value: val }));
    };

    const submitEditing = () => {
        if (!editingState.field) return;
        const newVal = parseFloat(editingState.value);
        if (!isNaN(newVal) && newVal >= 0) {
            const newTargets = { ...targets, [editingState.field]: newVal };
            setTargets(newTargets);
            // Save including dummy doanhThu to match type, though not used here anymore
            saveKpiTargets({ ...newTargets, doanhThu: 0 }).catch(console.error);
        }
        setEditingState({ field: null, value: '' });
    };

    const cancelEditing = () => {
        setEditingState({ field: null, value: '' });
    };

    // Calculate dynamic Revenue Target based on Warehouse Summary
    const revenueTarget = useMemo(() => {
        if (filterState.kho !== 'all') {
            // If filtering by a specific warehouse, use its specific target
            return warehouseTargets[filterState.kho] || 0;
        } else {
            // If 'all', sum up all available warehouse targets
            // Note: This sums all targets in the DB. 
            // If the filtered data excludes some warehouses via other filters (unlikely for top-level 'kho' filter), this might be slightly off, 
            // but standard behavior is sum of all configured targets.
            return Object.values(warehouseTargets).reduce((acc: number, val: number) => acc + (val || 0), 0);
        }
    }, [filterState.kho, warehouseTargets]);

    if (!kpis) {
        return null;
    }

    const hieuQuaValue = kpis.hieuQuaQD * 100;
    const isHieuQuaGood = hieuQuaValue >= targets.hieuQua;
    const isTraGopGood = kpis.traGopPercent >= targets.traGop;
    
    // Revenue Target Logic
    const revenuePercentHT = revenueTarget > 0 ? (kpis.doanhThuQD / revenueTarget) * 100 : 0;
    const isRevenueGood = revenuePercentHT >= 100;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 kpi-grid-for-export">
            
            {/* CARD 1: DOANH THU QUY ĐỔI */}
            <KpiCard 
                icon="wallet-cards" 
                iconColor="blue" 
                title="Doanh Thu Quy Đổi"
                trendLabel={revenueTarget > 0 ? "% Hoàn Thành" : "Mục tiêu"}
                trendValue={
                    revenueTarget > 0 
                    ? <span className={isRevenueGood ? 'text-emerald-500 font-bold' : 'text-slate-500'}>
                        {formatCurrency(revenueTarget)} / {revenuePercentHT.toFixed(1)}%
                      </span> 
                    : <span className="text-slate-400 italic text-[10px]">Chưa thiết lập</span>
                }
            >
                <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight tracking-tighter">
                    {formatCurrency(kpis.doanhThuQD)}
                </div>
            </KpiCard>
            
            {/* CARD 2: HIỆU QUẢ QUY ĐỔI */}
            <KpiCard 
                icon="trending-up" 
                iconColor="teal" 
                title="Hiệu Quả QĐ"
                onClick={(e) => startEditing(e, 'hieuQua')}
                trendLabel="Mục tiêu"
                trendValue={editingState.field === 'hieuQua' ? (
                    <KpiTargetEditor value={editingState.value} onChange={handleEditChange} onFinish={submitEditing} onCancel={cancelEditing} />
                ) : (
                    <span className={isHieuQuaGood ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                        {targets.hieuQua}%
                    </span>
                )}
            >
                <div className="text-2xl font-bold text-slate-900 dark:text-white leading-none tracking-tight truncate">
                    {hieuQuaValue.toFixed(1)}%
                </div>
            </KpiCard>
            
            {/* CARD 3: TỶ LỆ TRẢ GÓP */}
            <KpiCard 
                icon="receipt" 
                iconColor="pink" 
                title="Tỷ Lệ Trả Góp"
                onClick={(e) => startEditing(e, 'traGop')}
                trendLabel="Mục tiêu"
                trendValue={editingState.field === 'traGop' ? (
                    <KpiTargetEditor value={editingState.value} onChange={handleEditChange} onFinish={submitEditing} onCancel={cancelEditing} />
                ) : (
                    <span className={isTraGopGood ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                        {targets.traGop}%
                    </span>
                )}
            >
                <div className="text-2xl font-bold text-slate-900 dark:text-white leading-none tracking-tight truncate">
                    {kpis.traGopPercent.toFixed(1)}%
                </div>
            </KpiCard>

            {/* CARD 4: DOANH THU CHỜ XUẤT */}
            <KpiCard 
                icon="archive-restore" 
                iconColor="red" 
                title="Chờ Xuất QĐ"
                onClick={onUnshippedClick}
                trendLabel="Thực tế"
                trendValue={formatCurrency(kpis.doanhThuThucChoXuat)}
            >
                <div className="text-2xl font-bold text-slate-900 dark:text-white leading-none tracking-tight truncate">
                    {formatCurrency(kpis.doanhThuQDChoXuat)}
                </div>
            </KpiCard>
        </div>
    );
};

export default KpiCards;
