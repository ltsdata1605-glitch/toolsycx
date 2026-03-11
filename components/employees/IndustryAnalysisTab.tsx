
import React, { useMemo, useState, forwardRef, useEffect, useRef } from 'react';
import { formatCurrency, abbreviateName, formatQuantityWithFraction, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import type { ExploitationData } from '../../types';
import { getIndustryAnalysis } from '../../services/aiService';
import { getThemeMap, saveThemeMap, getIndustryVisibleGroups, saveIndustryVisibleGroups } from '../../services/dbService';


interface IndustryAnalysisTabProps {
    data: ExploitationData[];
    onExport?: () => void;
    isExporting?: boolean;
    onBatchExport: (data: ExploitationData[]) => void;
}

type SortConfig = {
    key: keyof ExploitationData | 'name' | 'percentBaoHiem' | 'percentSimKT' | 'percentDongHoKT' | 'percentPhuKienKT' | 'percentGiaDungKT' | 'belowAverageCount' | 'slSPChinh_Tong';
    direction: 'asc' | 'desc';
};

const HeaderCell: React.FC<{
    label: string | React.ReactNode;
    sortKey: SortConfig['key'];
    className?: string;
    onSort: (key: SortConfig['key']) => void;
    sortConfig: SortConfig;
}> = ({ label, sortKey, onSort, sortConfig, className }) => {
    const isActive = sortConfig.key === sortKey;
    return (
        <th
            onClick={() => onSort(sortKey)}
            className={`px-3 py-3 text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none text-center ${isActive ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'} transition-colors ${className || ''}`}
        >
            <div className="flex items-center justify-center gap-1">
                {label}
                {isActive && <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />}
            </div>
        </th>
    );
};

const detailQuickFilters: { key: string; label: string }[] = [
    { key: 'doanhThu', label: 'Doanh Thu' },
    { key: 'spChinh', label: 'SP Chính' },
    { key: 'baoHiem', label: 'Bảo Hiểm' },
    { key: 'sim', label: 'SIM' },
    { key: 'dongHo', label: 'Đồng Hồ' },
    { key: 'phuKien', label: 'Phụ Kiện' },
    { key: 'giaDung', label: 'Gia Dụng' },
];

const groupToSortKeyMap: Record<string, SortConfig['key']> = {
    baoHiem: 'percentBaoHiem',
    sim: 'percentSimKT',
    dongHo: 'percentDongHoKT',
    phuKien: 'percentPhuKienKT',
    giaDung: 'percentGiaDungKT',
};

// Data structure for detail view headers
const detailHeaderGroups: Record<string, { label: string; colSpan: number; subHeaders: { label: string; key: SortConfig['key'] }[] }> = {
    doanhThu: { label: 'DOANH THU', colSpan: 3, subHeaders: [
        { label: 'DT Thực', key: 'doanhThuThuc' },
        { label: 'DTQĐ', key: 'doanhThuQD' },
        { label: 'HQQĐ', key: 'hieuQuaQD' }
    ]},
    spChinh: { label: 'SP CHÍNH', colSpan: 4, subHeaders: [
        { label: 'ICT', key: 'slICT' },
        { label: 'CE', key: 'slCE_main' },
        { label: 'ĐGD', key: 'slGiaDung_main' },
        { label: 'Tổng', key: 'slSPChinh_Tong' }
    ]},
    baoHiem: { label: 'BẢO HIỂM', colSpan: 3, subHeaders: [
        { label: 'SL', key: 'slBaoHiem' },
        { label: 'D.Thu', key: 'doanhThuBaoHiem' },
        { label: '%', key: 'percentBaoHiem' }
    ]},
    sim: { label: 'SIM', colSpan: 3, subHeaders: [
        { label: 'SL', key: 'slSim' },
        { label: 'D.Thu', key: 'doanhThuSim' },
        { label: '%', key: 'percentSimKT' }
    ]},
    dongHo: { label: 'ĐỒNG HỒ', colSpan: 3, subHeaders: [
        { label: 'SL', key: 'slDongHo' },
        { label: 'D.Thu', key: 'doanhThuDongHo' },
        { label: '%', key: 'percentDongHoKT' }
    ]},
    phuKien: { label: 'PHỤ KIỆN', colSpan: 6, subHeaders: [
        { label: 'SL Cam', key: 'slCamera' },
        { label: 'SL Loa', key: 'slLoa' },
        { label: 'SL Pin', key: 'slPinSDP' },
        { label: 'SL TNghe', key: 'slTaiNgheBLT' },
        { label: 'D.Thu', key: 'doanhThuPhuKien' },
        { label: '%', key: 'percentPhuKienKT' }
    ]},
    giaDung: { label: 'GIA DỤNG', colSpan: 6, subHeaders: [
        { label: 'SL MLN', key: 'slMayLocNuoc' },
        { label: 'SL NCơm', key: 'slNoiCom' },
        { label: 'SL NChiên', key: 'slNoiChien' },
        { label: 'SL Quạt', key: 'slQuatDien' },
        { label: 'D.Thu', key: 'doanhThuGiaDung' },
        { label: '%', key: 'percentGiaDungKT' }
    ]}
};

const IndustryAnalysisTab = React.memo(forwardRef<HTMLDivElement, IndustryAnalysisTabProps>(({ data, onExport, isExporting, onBatchExport }, ref) => {
    const [viewMode, setViewMode] = useState<'detail' | 'efficiency' | 'efficiency_dt_sl' | 'efficiency_quantity'>('detail');
    const [visibleGroups, setVisibleGroups] = useState<Set<string>>(new Set());
    const [initialGroupsLoaded, setInitialGroupsLoaded] = useState(false);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'percentBaoHiem', direction: 'desc' });
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    
    useEffect(() => {
        getIndustryVisibleGroups().then(savedGroups => {
            if (savedGroups && savedGroups.length > 0) {
                setVisibleGroups(new Set(savedGroups));
            } else {
                setVisibleGroups(new Set(['spChinh', 'baoHiem']));
            }
            setInitialGroupsLoaded(true);
        });
    }, []);

    useEffect(() => {
        if (initialGroupsLoaded) {
            saveIndustryVisibleGroups(Array.from(visibleGroups) as string[]);
        }
    }, [visibleGroups, initialGroupsLoaded]);
    
    useEffect(() => {
        if (viewMode === 'efficiency' || viewMode === 'efficiency_dt_sl' || viewMode === 'efficiency_quantity') {
            setSortConfig({ key: 'slSPChinh_Tong', direction: 'desc' });
        } else {
            setSortConfig({ key: 'percentBaoHiem', direction: 'desc' });
        }
    }, [viewMode]);
    
    const handleToggleGroup = (groupKey: string) => {
        const newVisibleGroups = new Set(visibleGroups);
        const wasAdded = !newVisibleGroups.has(groupKey);

        if (wasAdded) {
            newVisibleGroups.add(groupKey);
        } else {
            if (newVisibleGroups.size > 1) { 
                newVisibleGroups.delete(groupKey);
            }
        }
        
        const setsAreEqual = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every(value => b.has(value));

        if (!setsAreEqual(visibleGroups as Set<string>, newVisibleGroups as Set<string>)) {
            setVisibleGroups(newVisibleGroups);

            const sortKeyForToggledGroup = groupToSortKeyMap[groupKey];
            if (wasAdded && sortKeyForToggledGroup) {
                setSortConfig({ key: sortKeyForToggledGroup, direction: 'desc' });
            } else if (!wasAdded && sortConfig.key === sortKeyForToggledGroup) {
                const remainingSpecialGroups: string[] = detailQuickFilters.map(f => f.key).filter((key) => newVisibleGroups.has(key) && groupToSortKeyMap[key]);
                if (remainingSpecialGroups.length > 0) {
                    const firstKey = remainingSpecialGroups[0];
                    const newSortKey = groupToSortKeyMap[firstKey];
                    if(newSortKey) setSortConfig({ key: newSortKey, direction: 'desc' });
                } else {
                    if (viewMode !== 'detail') {
                        setSortConfig({ key: 'slSPChinh_Tong', direction: 'desc' });
                    } else {
                        setSortConfig({ key: 'percentBaoHiem', direction: 'desc' });
                    }
                }
            }
        }
    };

    const handleAiAnalysis = async () => {
        setIsAnalysisLoading(true);
        setAnalysis(null);
        try {
            const result = await getIndustryAnalysis(data);
            setAnalysis(result);
        } catch (error) {
            console.error("Lỗi khi phân tích khai thác:", error);
            setAnalysis("Đã xảy ra lỗi khi phân tích. Vui lòng thử lại.");
        } finally {
            setIsAnalysisLoading(false);
        }
    };
    
    const { processedData, groupTotals, grandTotal } = useMemo(() => {
        const thresholds = { percentBaoHiem: 40, percentSimKT: 30, percentDongHoKT: 20, percentPhuKienKT: 10, percentGiaDungKT: 30 };

        const enhancedData = data.map(item => {
            const slSPChinh_Tong = (item.slICT || 0) + (item.slCE_main || 0) + (item.slGiaDung_main || 0);
            const percentBaoHiem = slSPChinh_Tong > 0 ? ((item.slBaoHiem || 0) / slSPChinh_Tong) * 100 : 0;
            const percentSimKT = (item.slICT || 0) > 0 ? ((item.slSim || 0) / (item.slICT || 1)) * 100 : 0;
            const percentDongHoKT = slSPChinh_Tong > 0 ? ((item.slDongHo || 0) / slSPChinh_Tong) * 100 : 0;
            const percentPhuKienKT = (item.doanhThuICT || 0) > 0 ? ((item.doanhThuPhuKien || 0) / (item.doanhThuICT || 1)) * 100 : 0;
            const percentGiaDungKT = (item.doanhThuCE_main || 0) > 0 ? ((item.doanhThuGiaDung || 0) / (item.doanhThuCE_main || 1)) * 100 : 0;

            let belowAverageCount = 0;
            if (percentBaoHiem < thresholds.percentBaoHiem) belowAverageCount++;
            if (percentSimKT < thresholds.percentSimKT) belowAverageCount++;
            if (percentDongHoKT < thresholds.percentDongHoKT) belowAverageCount++;
            if (percentPhuKienKT < thresholds.percentPhuKienKT) belowAverageCount++;
            if (percentGiaDungKT < thresholds.percentGiaDungKT) belowAverageCount++;

            return { ...item, slSPChinh_Tong, percentBaoHiem, percentSimKT, percentDongHoKT, percentPhuKienKT, percentGiaDungKT, belowAverageCount };
        });

        const sorted = [...enhancedData].sort((a, b) => {
            if (sortConfig.key === 'name') {
                return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            }
            
            const key = sortConfig.key as keyof typeof a;
            
            const valA = a[key] ?? 0;
            const valB = b[key] ?? 0;

            if (typeof valA === 'number' && typeof valB === 'number') {
                const result = sortConfig.direction === 'asc' ? valA - valB : valB - valA;
                if (result !== 0) return result;
            }
            return a.name.localeCompare(b.name);
        });

        const grouped = sorted.reduce((acc, employee) => {
            const dept = employee.department || 'Không Phân Ca';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(employee);
            return acc;
        }, {} as { [key: string]: typeof sorted });
        
        const sortedGroupKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
        const finalGroupedData: { [key: string]: typeof sorted } = {};
        sortedGroupKeys.forEach(key => { finalGroupedData[key] = grouped[key]; });

        const calculateTotals = (items: typeof enhancedData) => {
             const initialTotals = {
                doanhThuThuc: 0, doanhThuQD: 0,
                slICT: 0, doanhThuICT: 0, slCE_main: 0, doanhThuCE_main: 0, slGiaDung_main: 0,
                slBaoHiem: 0, doanhThuBaoHiem: 0,
                slSim: 0, doanhThuSim: 0, slDongHo: 0, doanhThuDongHo: 0,
                doanhThuPhuKien: 0, slPhuKien: 0, slCamera: 0, slLoa: 0, slPinSDP: 0, slTaiNgheBLT: 0,
                doanhThuGiaDung: 0, slGiaDung: 0, slMayLocNuoc: 0, slNoiCom: 0, slNoiChien: 0, slQuatDien: 0,
                belowAverageCount: 0
            };

            if (items.length === 0) return { ...initialTotals, hieuQuaQD: 0, percentBaoHiem: 0, percentSimKT: 0, percentDongHoKT: 0, percentPhuKienKT: 0, percentGiaDungKT: 0, slSPChinh_Tong: 0 };
            
            const t = items.reduce((acc, item) => {
                const keys = Object.keys(initialTotals) as Array<keyof typeof initialTotals>;
                keys.forEach((key) => {
                    const value = (item as any)[key];
                    if (typeof value === 'number') {
                        (acc as any)[key] += value;
                    }
                });
                return acc;
            }, { ...initialTotals });
            
            const hieuQuaQD = t.doanhThuThuc > 0 ? (t.doanhThuQD - t.doanhThuThuc) / t.doanhThuThuc * 100 : 0;
            const slSPChinh_Tong = t.slICT + t.slCE_main + t.slGiaDung_main;
            const percentBaoHiem = slSPChinh_Tong > 0 ? (t.slBaoHiem / slSPChinh_Tong) * 100 : 0;
            const percentSimKT = t.slICT > 0 ? (t.slSim / t.slICT) * 100 : 0;
            const percentDongHoKT = slSPChinh_Tong > 0 ? (t.slDongHo / slSPChinh_Tong) * 100 : 0;
            const percentPhuKienKT = t.doanhThuICT > 0 ? (t.doanhThuPhuKien / t.doanhThuICT) * 100 : 0;
            const percentGiaDungKT = t.doanhThuCE_main > 0 ? (t.doanhThuGiaDung / t.doanhThuCE_main) * 100 : 0;
            
            return { ...t, slSPChinh_Tong, hieuQuaQD, percentBaoHiem, percentSimKT, percentDongHoKT, percentPhuKienKT, percentGiaDungKT };
        };

        const groupTotals: { [key: string]: any } = {};
        for (const dept in finalGroupedData) { groupTotals[dept] = calculateTotals(finalGroupedData[dept]); }
        const grandTotal = calculateTotals(enhancedData);

        return { processedData: finalGroupedData, groupTotals, grandTotal };
    }, [data, sortConfig]);

    const handleSort = (key: SortConfig['key']) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') { direction = 'asc'; }
        setSortConfig({ key, direction });
    };
    
    const showDeptHeaders = Object.keys(processedData).length > 1 || (Object.keys(processedData).length === 1 && Object.keys(processedData)[0] !== 'Không Phân Ca');
    
    const formatPct = (value: number) => value > 0 ? `${value.toFixed(0)}%` : '-';
    const formatNum = (value: number) => value > 0 ? formatQuantityWithFraction(value) : '-';
    const formatC = (value: number) => value > 0 ? formatCurrency(value) : '-';
    const boldBlueText = 'font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg';
    const warningText = 'text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-lg';
    
    const renderDetailModeCells = (rowData: any) => (
        <>
            {visibleGroups.has('doanhThu') && <>
                <td className="px-3 py-4 text-center text-sm font-medium text-slate-500">{formatC(rowData.doanhThuThuc)}</td>
                <td className="px-3 py-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">{formatC(rowData.doanhThuQD)}</td>
                <td className={`px-3 py-4 text-center text-sm font-bold text-blue-600 dark:text-blue-400`}>{formatPct(rowData.hieuQuaQD)}</td>
            </>}
            {visibleGroups.has('spChinh') && <>
                <td className="px-3 py-4 text-center text-sm text-slate-600 dark:text-slate-400">{formatNum(rowData.slICT)}</td>
                <td className="px-3 py-4 text-center text-sm text-slate-600 dark:text-slate-400">{formatNum(rowData.slCE_main)}</td>
                <td className="px-3 py-4 text-center text-sm text-slate-600 dark:text-slate-400">{formatNum(rowData.slGiaDung_main)}</td>
                <td className={`px-3 py-4 text-center text-sm font-bold text-indigo-600 dark:text-indigo-400`}>{formatNum(rowData.slSPChinh_Tong)}</td>
            </>}
            {visibleGroups.has('baoHiem') && <>
                <td className="px-3 py-4 text-center text-sm text-slate-600 dark:text-slate-400">{formatNum(rowData.slBaoHiem)}</td>
                <td className="px-3 py-4 text-center text-sm font-medium text-slate-500">{formatC(rowData.doanhThuBaoHiem)}</td>
                <td className={`px-3 py-4 text-center text-sm`}><span className={rowData.percentBaoHiem < 40 ? warningText : boldBlueText}>{formatPct(rowData.percentBaoHiem)}</span></td>
            </>}
            {visibleGroups.has('sim') && <>
                <td className="px-3 py-4 text-center text-sm text-slate-600 dark:text-slate-400">{formatNum(rowData.slSim)}</td>
                <td className="px-3 py-4 text-center text-sm font-medium text-slate-500">{formatC(rowData.doanhThuSim)}</td>
                <td className={`px-3 py-4 text-center text-sm`}><span className={rowData.percentSimKT < 30 ? warningText : boldBlueText}>{formatPct(rowData.percentSimKT)}</span></td>
            </>}
            {visibleGroups.has('dongHo') && <>
                <td className="px-3 py-4 text-center text-sm text-slate-600 dark:text-slate-400">{formatNum(rowData.slDongHo)}</td>
                <td className="px-3 py-4 text-center text-sm font-medium text-slate-500">{formatC(rowData.doanhThuDongHo)}</td>
                <td className={`px-3 py-4 text-center text-sm`}><span className={rowData.percentDongHoKT < 20 ? warningText : boldBlueText}>{formatPct(rowData.percentDongHoKT)}</span></td>
            </>}
            {visibleGroups.has('phuKien') && <>
                <td className="px-3 py-4 text-center text-sm text-slate-500">{formatNum(rowData.slCamera)}</td>
                <td className="px-3 py-4 text-center text-sm text-slate-500">{formatNum(rowData.slLoa)}</td>
                <td className="px-3 py-4 text-center text-sm text-slate-500">{formatNum(rowData.slPinSDP)}</td>
                <td className="px-3 py-4 text-center text-sm text-slate-500">{formatNum(rowData.slTaiNgheBLT)}</td>
                <td className="px-3 py-4 text-center text-sm font-medium text-slate-600 dark:text-slate-300">{formatC(rowData.doanhThuPhuKien)}</td>
                <td className={`px-3 py-4 text-center text-sm`}><span className={rowData.percentPhuKienKT < 10 ? warningText : boldBlueText}>{formatPct(rowData.percentPhuKienKT)}</span></td>
            </>}
            {visibleGroups.has('giaDung') && <>
                <td className="px-3 py-4 text-center text-sm text-slate-500">{formatNum(rowData.slMayLocNuoc)}</td>
                <td className="px-3 py-4 text-center text-sm text-slate-500">{formatNum(rowData.slNoiCom)}</td>
                <td className="px-3 py-4 text-center text-sm text-slate-500">{formatNum(rowData.slNoiChien)}</td>
                <td className="px-3 py-4 text-center text-sm text-slate-500">{formatNum(rowData.slQuatDien)}</td>
                <td className="px-3 py-4 text-center text-sm font-medium text-slate-600 dark:text-slate-300">{formatC(rowData.doanhThuGiaDung)}</td>
                <td className={`px-3 py-4 text-center text-sm`}><span className={rowData.percentGiaDungKT < 30 ? warningText : boldBlueText}>{formatPct(rowData.percentGiaDungKT)}</span></td>
            </>}
        </>
    );

    const efficiencyKtHeaders = [
        { label: '# Yếu', key: 'belowAverageCount' }, { label: '%BH', key: 'percentBaoHiem' }, { label: '%SIM', key: 'percentSimKT' },
        { label: '%PK', key: 'percentPhuKienKT' }, { label: '%ĐHồ', key: 'percentDongHoKT' }, { label: '%GD', key: 'percentGiaDungKT' }
    ];

    const efficiencyDtHeaders = [
        { label: 'SIM', key: 'doanhThuSim' }, { label: 'ĐHồ', key: 'doanhThuDongHo' }, { label: 'DT BH', key: 'doanhThuBaoHiem' },
        { label: 'DT PK', key: 'doanhThuPhuKien' }, { label: 'DT GD', key: 'doanhThuGiaDung' }
    ];

    const efficiencyQuantityHeaders = [
        { label: 'SL SIM', key: 'slSim' }, { label: 'SL ĐH', key: 'slDongHo' }, { label: 'SL BH', key: 'slBaoHiem' },
        { label: 'SL PK', key: 'slPhuKien' }, { label: 'SL GD', key: 'slGiaDung' }
    ];

    return (
        <div ref={ref} className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full">
            {/* Apple-style Card Header */}
            <div className={`px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-20 group/header`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 shadow-sm`}>
                        <Icon name="gantt-chart-square" size={6} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Phân Tích Khai Thác</h3>
                        <p className="text-xs font-medium text-slate-400">Chi tiết sản phẩm & hiệu quả bán kèm</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 hide-on-export opacity-0 group-hover:header:opacity-100 transition-opacity">
                    <div className="inline-flex rounded-xl shadow-sm p-1 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                        <button onClick={() => setViewMode('detail')} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${viewMode === 'detail' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Chi tiết</button>
                        <button onClick={() => setViewMode('efficiency')} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${viewMode === 'efficiency' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Hiệu quả %</button>
                        <button onClick={() => setViewMode('efficiency_dt_sl')} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${viewMode === 'efficiency_dt_sl' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Doanh thu</button>
                        <button onClick={() => setViewMode('efficiency_quantity')} className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${viewMode === 'efficiency_quantity' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Số lượng</button>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
                    <button onClick={handleAiAnalysis} disabled={isAnalysisLoading} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all" title="Phân tích bằng AI">
                        {isAnalysisLoading ? <Icon name="loader-2" size={5} className="animate-spin" /> : <Icon name="sparkles" size={5} />}
                    </button>
                     <button onClick={() => onBatchExport(data)} title="Xuất hàng loạt báo cáo chi tiết" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <Icon name="switch-camera" size={5} />
                    </button>
                    {onExport && (
                        <button onClick={onExport} disabled={isExporting} title="Xuất Ảnh Tab" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                            {isExporting ? <Icon name="loader-2" size={5} className="animate-spin" /> : <Icon name="camera" size={5} />}
                        </button>
                    )}
                </div>
            </div>
            
            {viewMode === 'detail' && (
                <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 hide-on-export overflow-x-auto">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider mr-2">Hiển thị:</span>
                        {detailQuickFilters.map(f => (
                            <button 
                                key={f.key} 
                                onClick={() => handleToggleGroup(f.key)}
                                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all border ${
                                    visibleGroups.has(f.key)
                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 border-indigo-200 dark:border-indigo-800 shadow-sm'
                                    : 'bg-transparent text-slate-500 border-transparent hover:bg-white hover:shadow-sm'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}


            <div className="overflow-x-auto custom-scrollbar flex-grow p-0">
                <table className="w-full text-left border-collapse">
                     <thead className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                        {viewMode === 'detail' ? (
                            <>
                                <tr>
                                    <th rowSpan={2} onClick={() => handleSort('name')} className={`px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none min-w-[180px] align-bottom`}>Nhân Viên</th>
                                    {detailQuickFilters.filter(f => visibleGroups.has(f.key)).map(f => <th key={f.key} colSpan={detailHeaderGroups[f.key].colSpan} className="px-2 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">{detailHeaderGroups[f.key].label}</th>)}
                                </tr>
                                <tr>
                                    {detailQuickFilters.filter(f => visibleGroups.has(f.key)).flatMap(f => detailHeaderGroups[f.key].subHeaders).map(subHeader => <HeaderCell key={subHeader.key} label={subHeader.label} sortKey={subHeader.key} onSort={handleSort} sortConfig={sortConfig}/>)}
                                </tr>
                            </>
                        ) : (
                            <>
                                 <tr>
                                    <th rowSpan={2} onClick={() => handleSort('name')} className={`px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none min-w-[180px] align-bottom`}>Nhân Viên</th>
                                    <th colSpan={4} className="px-2 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">SỐ LƯỢNG SẢN PHẨM CHÍNH</th>
                                    {viewMode === 'efficiency' ? (
                                        <th colSpan={6} className="px-2 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">HIỆU QUẢ KHAI THÁC BÁN KÈM</th>
                                    ) : viewMode === 'efficiency_dt_sl' ? (
                                        <th colSpan={5} className="px-2 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">HIỆU QUẢ DOANH THU</th>
                                    ) : (
                                        <th colSpan={5} className="px-2 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">HIỆU QUẢ SỐ LƯỢNG</th>
                                    )}
                                </tr>
                                <tr>
                                    <HeaderCell label="ICT" sortKey="slICT" onSort={handleSort} sortConfig={sortConfig} />
                                    <HeaderCell label="CE" sortKey="slCE_main" onSort={handleSort} sortConfig={sortConfig} />
                                    <HeaderCell label="ĐGD" sortKey="slGiaDung_main" onSort={handleSort} sortConfig={sortConfig} />
                                    <HeaderCell label="Tổng" sortKey="slSPChinh_Tong" onSort={handleSort} sortConfig={sortConfig} />
                                    {(viewMode === 'efficiency' ? efficiencyKtHeaders : viewMode === 'efficiency_dt_sl' ? efficiencyDtHeaders : efficiencyQuantityHeaders).map(h => <HeaderCell key={h.key} label={h.label} sortKey={h.key as SortConfig['key']} onSort={handleSort} sortConfig={sortConfig} />)}
                                </tr>
                            </>
                        )}
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {Object.entries(processedData).map(([dept, employees]) => (
                            <React.Fragment key={dept}>
                                {showDeptHeaders && (
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                                        <td colSpan={100} className="px-6 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">
                                            <div className="flex items-center gap-2"><Icon name="users" size={3} /> {dept}</div>
                                        </td>
                                    </tr>
                                )}
                                {(employees as (ExploitationData & { slSPChinh_Tong: number, belowAverageCount: number })[]).map((employee, index) => {
                                    const medals = ['🥇', '🥈', '🥉'];
                                    const rankIndex = (processedData[dept] as any[]).findIndex(e => e.name === employee.name);
                                    const medal = rankIndex < 3 ? medals[rankIndex] : null;
                                    let rankDisplay = medal ? <span className="text-lg w-6 text-center inline-block">{medal}</span> : <span className="text-xs w-6 text-center inline-block text-slate-400 font-bold">#{rankIndex + 1}</span>;

                                    return (
                                        <tr key={employee.name} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 text-left">
                                                <div className="flex items-center gap-2">
                                                    {rankDisplay}
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors truncate">{abbreviateName(employee.name)}</span>
                                                </div>
                                            </td>
                                            {viewMode === 'detail' ? renderDetailModeCells(employee) : viewMode === 'efficiency' ? (
                                                <>
                                                    <td className="px-3 py-4 text-center text-sm font-medium text-slate-500">{formatNum(employee.slICT)}</td><td className="px-3 py-4 text-center text-sm font-medium text-slate-500">{formatNum(employee.slCE_main)}</td><td className="px-3 py-4 text-center text-sm font-medium text-slate-500">{formatNum(employee.slGiaDung_main)}</td><td className="px-3 py-4 text-center text-sm font-bold text-slate-700 dark:text-slate-200">{formatNum((employee as any).slSPChinh_Tong)}</td>
                                                    <td className="px-3 py-4 text-center text-sm font-bold text-red-500">{((employee as any).belowAverageCount) > 0 ? (employee as any).belowAverageCount : '-'}</td>
                                                    <td className={`px-3 py-4 text-center text-sm`}><span className={employee.percentBaoHiem < 40 ? warningText : boldBlueText}>{formatPct(employee.percentBaoHiem)}</span></td>
                                                    <td className={`px-3 py-4 text-center text-sm`}><span className={(employee as any).percentSimKT < 30 ? warningText : boldBlueText}>{formatPct((employee as any).percentSimKT)}</span></td>
                                                    <td className={`px-3 py-4 text-center text-sm`}><span className={(employee as any).percentPhuKienKT < 10 ? warningText : boldBlueText}>{formatPct((employee as any).percentPhuKienKT)}</span></td>
                                                    <td className={`px-3 py-4 text-center text-sm`}><span className={(employee as any).percentDongHoKT < 20 ? warningText : boldBlueText}>{formatPct((employee as any).percentDongHoKT)}</span></td>
                                                    <td className={`px-3 py-4 text-center text-sm`}><span className={(employee as any).percentGiaDungKT < 30 ? warningText : boldBlueText}>{formatPct((employee as any).percentGiaDungKT)}</span></td>
                                                </>
                                            ) : viewMode === 'efficiency_dt_sl' ? (
                                                 <>
                                                    <td className="px-3 py-4 text-center text-sm font-medium text-slate-500">{formatNum(employee.slICT)}</td><td className="px-3 py-4 text-center text-sm font-medium text-slate-500">{formatNum(employee.slCE_main)}</td><td className="px-3 py-4 text-center text-sm font-medium text-slate-500">{formatNum(employee.slGiaDung_main)}</td><td className="px-3 py-4 text-center text-sm font-bold text-slate-700 dark:text-slate-200">{formatNum((employee as any).slSPChinh_Tong)}</td>
                                                    <td className="px-3 py-4 text-center text-sm text-slate-600 dark:text-slate-300">{formatC(employee.doanhThuSim)}</td>
                                                    <td className="px-3 py-4 text-center text-sm text-slate-600 dark:text-slate-300">{formatC(employee.doanhThuDongHo)}</td>
                                                    <td className="px-3 py-4 text-center text-sm text-slate-600 dark:text-slate-300">{formatC(employee.doanhThuBaoHiem)}</td>
                                                    <td className="px-3 py-4 text-center text-sm text-slate-600 dark:text-slate-300">{formatC(employee.doanhThuPhuKien)}</td>
                                                    <td className="px-3 py-4 text-center text-sm text-slate-600 dark:text-slate-300">{formatC(employee.doanhThuGiaDung)}</td>
                                                </>
                                            ) : ( // efficiency_quantity
                                                <>
                                                    <td className="px-3 py-4 text-center text-sm font-medium text-slate-500">{formatNum(employee.slICT)}</td><td className="px-3 py-4 text-center text-sm font-medium text-slate-500">{formatNum(employee.slCE_main)}</td><td className="px-3 py-4 text-center text-sm font-medium text-slate-500">{formatNum(employee.slGiaDung_main)}</td><td className="px-3 py-4 text-center text-sm font-bold text-slate-700 dark:text-slate-200">{formatNum((employee as any).slSPChinh_Tong)}</td>
                                                    <td className="px-3 py-4 text-center text-sm font-medium text-slate-600 dark:text-slate-300">{formatNum(employee.slSim)}</td>
                                                    <td className="px-3 py-4 text-center text-sm font-medium text-slate-600 dark:text-slate-300">{formatNum(employee.slDongHo)}</td>
                                                    <td className="px-3 py-4 text-center text-sm font-medium text-slate-600 dark:text-slate-300">{formatNum(employee.slBaoHiem)}</td>
                                                    <td className="px-3 py-4 text-center text-sm font-medium text-slate-600 dark:text-slate-300">{formatNum(employee.slPhuKien)}</td>
                                                    <td className="px-3 py-4 text-center text-sm font-medium text-slate-600 dark:text-slate-300">{formatNum(employee.slGiaDung)}</td>
                                                </>
                                            )}
                                        </tr>
                                    )
                                })}
                                {showDeptHeaders && groupTotals[dept] && (
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                                        <td className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Tổng Nhóm</td>
                                        {viewMode === 'detail' ? renderDetailModeCells(groupTotals[dept]) : viewMode === 'efficiency' ? (
                                            <>
                                                <td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatNum(groupTotals[dept].slICT)}</td><td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatNum(groupTotals[dept].slCE_main)}</td><td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatNum(groupTotals[dept].slGiaDung_main)}</td><td className="px-3 py-4 text-center text-sm font-bold text-slate-800">{formatNum(groupTotals[dept].slSPChinh_Tong)}</td>
                                                <td className="px-3 py-4 text-center"></td>
                                                <td className={`px-3 py-4 text-center text-sm`}><span className={groupTotals[dept].percentBaoHiem < 40 ? warningText : boldBlueText}>{formatPct(groupTotals[dept].percentBaoHiem)}</span></td>
                                                <td className={`px-3 py-4 text-center text-sm`}><span className={groupTotals[dept].percentSimKT < 30 ? warningText : boldBlueText}>{formatPct(groupTotals[dept].percentSimKT)}</span></td>
                                                <td className={`px-3 py-4 text-center text-sm`}><span className={groupTotals[dept].percentPhuKienKT < 10 ? warningText : boldBlueText}>{formatPct(groupTotals[dept].percentPhuKienKT)}</span></td>
                                                <td className={`px-3 py-4 text-center text-sm`}><span className={groupTotals[dept].percentDongHoKT < 20 ? warningText : boldBlueText}>{formatPct(groupTotals[dept].percentDongHoKT)}</span></td>
                                                <td className={`px-3 py-4 text-center text-sm`}><span className={groupTotals[dept].percentGiaDungKT < 30 ? warningText : boldBlueText}>{formatPct(groupTotals[dept].percentGiaDungKT)}</span></td>
                                            </>
                                        ) : viewMode === 'efficiency_dt_sl' ? (
                                            <>
                                                <td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatNum(groupTotals[dept].slICT)}</td><td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatNum(groupTotals[dept].slCE_main)}</td><td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatNum(groupTotals[dept].slGiaDung_main)}</td><td className="px-3 py-4 text-center text-sm font-bold text-slate-800">{formatNum(groupTotals[dept].slSPChinh_Tong)}</td>
                                                <td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatC(groupTotals[dept].doanhThuSim)}</td>
                                                <td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatC(groupTotals[dept].doanhThuDongHo)}</td>
                                                <td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatC(groupTotals[dept].doanhThuBaoHiem)}</td>
                                                <td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatC(groupTotals[dept].doanhThuPhuKien)}</td>
                                                <td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatC(groupTotals[dept].doanhThuGiaDung)}</td>
                                            </>
                                        ) : ( // efficiency_quantity
                                            <>
                                                <td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatNum(groupTotals[dept].slICT)}</td><td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatNum(groupTotals[dept].slCE_main)}</td><td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatNum(groupTotals[dept].slGiaDung_main)}</td><td className="px-3 py-4 text-center text-sm font-bold text-slate-800">{formatNum(groupTotals[dept].slSPChinh_Tong)}</td>
                                                <td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatNum(groupTotals[dept].slSim)}</td>
                                                <td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatNum(groupTotals[dept].slDongHo)}</td>
                                                <td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatNum(groupTotals[dept].slBaoHiem)}</td>
                                                <td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatNum(groupTotals[dept].slPhuKien)}</td>
                                                <td className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatNum(groupTotals[dept].slGiaDung)}</td>
                                            </>
                                        )}
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                         <tr>
                            <td className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest sticky left-0 bg-inherit z-10">Tổng cộng</td>
                            {viewMode === 'detail' ? renderDetailModeCells(grandTotal) : viewMode === 'efficiency' ? (
                                <>
                                    <td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slICT)}</td><td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slCE_main)}</td><td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slGiaDung_main)}</td><td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slSPChinh_Tong)}</td>
                                    <td className="px-3 py-4 text-center"></td>
                                    <td className={`px-3 py-4 text-center text-sm`}><span className={grandTotal.percentBaoHiem < 40 ? warningText : boldBlueText}>{formatPct(grandTotal.percentBaoHiem)}</span></td>
                                    <td className={`px-3 py-4 text-center text-sm`}><span className={grandTotal.percentSimKT < 30 ? warningText : boldBlueText}>{formatPct(grandTotal.percentSimKT)}</span></td>
                                    <td className={`px-3 py-4 text-center text-sm`}><span className={grandTotal.percentPhuKienKT < 10 ? warningText : boldBlueText}>{formatPct(grandTotal.percentPhuKienKT)}</span></td>
                                    <td className={`px-3 py-4 text-center text-sm`}><span className={grandTotal.percentDongHoKT < 20 ? warningText : boldBlueText}>{formatPct(grandTotal.percentDongHoKT)}</span></td>
                                    <td className={`px-3 py-4 text-center text-sm`}><span className={grandTotal.percentGiaDungKT < 30 ? warningText : boldBlueText}>{formatPct(grandTotal.percentGiaDungKT)}</span></td>
                                </>
                            ) : viewMode === 'efficiency_dt_sl' ? (
                                <>
                                    <td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slICT)}</td><td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slCE_main)}</td><td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slGiaDung_main)}</td><td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slSPChinh_Tong)}</td>
                                    <td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatC(grandTotal.doanhThuSim)}</td>
                                    <td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatC(grandTotal.doanhThuDongHo)}</td>
                                    <td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatC(grandTotal.doanhThuBaoHiem)}</td>
                                    <td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatC(grandTotal.doanhThuPhuKien)}</td>
                                    <td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatC(grandTotal.doanhThuGiaDung)}</td>
                                </>
                            ) : ( // efficiency_quantity
                                <>
                                    <td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slICT)}</td><td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slCE_main)}</td><td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slGiaDung_main)}</td><td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slSPChinh_Tong)}</td>
                                    <td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slSim)}</td>
                                    <td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slDongHo)}</td>
                                    <td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slBaoHiem)}</td>
                                    <td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slPhuKien)}</td>
                                    <td className="px-3 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatNum(grandTotal.slGiaDung)}</td>
                                </>
                            )}
                        </tr>
                    </tfoot>
                </table>
            </div>
             {(analysis || isAnalysisLoading) && (
                <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-600"></div>
                    <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-3 mb-3 text-sm uppercase tracking-widest">
                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg text-purple-600"><Icon name="sparkles" size={4} /></div>
                        AI Phân Tích Khai Thác
                    </h4>
                    {isAnalysisLoading ? (
                        <div className="space-y-3 animate-pulse">
                            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4"></div>
                            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2"></div>
                        </div>
                    ) : (
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {analysis}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}));

export default IndustryAnalysisTab;
