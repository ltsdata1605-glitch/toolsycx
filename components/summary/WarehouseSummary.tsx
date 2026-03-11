
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { WarehouseColumnConfig, WarehouseMetricType } from '../../types';
import { Icon } from '../common/Icon';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { getWarehouseColumnConfig, saveWarehouseColumnConfig } from '../../services/dbService';
import { COL, WAREHOUSE_HEADER_COLORS, DEFAULT_WAREHOUSE_COLUMNS } from '../../constants';
import { getRowValue, formatCurrency, formatQuantity } from '../../utils/dataUtils';
import LoadingOverlay from '../common/LoadingOverlay';
import WarehouseSettingsModal from './WarehouseSettingsModal';
import { useWarehouseLogic } from '../../hooks/useWarehouseLogic';
import ModalWrapper from '../modals/ModalWrapper';

interface WarehouseSummaryProps {
    onBatchExport: () => Promise<void>;
}

const WarehouseSummary: React.FC<WarehouseSummaryProps> = ({ onBatchExport }) => {
    const { processedData, productConfig, originalData, handleExport, isExporting, isProcessing, uniqueFilterOptions, warehouseTargets, updateWarehouseTarget } = useDashboardContext();
    const data = processedData?.warehouseSummary ?? [];
    
    const summaryRef = useRef<HTMLDivElement>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'doanhThuQD', direction: 'desc' });
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    
    const [columns, setColumns] = useState<WarehouseColumnConfig[]>([]);
    
    // State for editing target
    const [editingTargetKho, setEditingTargetKho] = useState<{ id: string, name: string, value: string } | null>(null);
    const targetInputRef = useRef<HTMLInputElement>(null);

    const { sortedData, totals, customTotals, customProductColumnValues, getColumnValue } = useWarehouseLogic({
        data,
        columns,
        originalData,
        productConfig,
        sortConfig
    });

    const getHqqdClass = (hqqdValue: number | undefined): string => {
        if (hqqdValue === undefined || isNaN(hqqdValue)) return 'text-slate-400 dark:text-slate-500';
        if (hqqdValue < 30) return 'text-rose-500 font-black';
        if (hqqdValue < 40) return 'text-amber-500 font-bold';
        return 'text-emerald-500 font-black';
    };

    const formatRevenueForKho = (value: number | undefined): string => {
        if (value === undefined || isNaN(value) || value === 0) return '-';
        if (value >= 1000000000) return `${(value / 1000000000).toFixed(2)} Tỷ`;
        return Math.round(value / 1000000).toLocaleString('vi-VN');
    };
    
    const formatQuantityForKho = (value: number | undefined): string => {
        if (value === undefined || isNaN(value) || value === 0) return '-';
        return Math.round(value).toLocaleString('vi-VN');
    };
    
    const handleSingleExport = async () => {
        if (summaryRef.current) {
            await handleExport(summaryRef.current, 'bao-cao-kho.png', {
                elementsToHide: ['.hide-on-export'],
                isCompactTable: true, // Fixes columns to content width
                scale: 2
            });
        }
    };

    const { allIndustries, allGroups, allManufacturers } = useMemo(() => {
        if (!productConfig || !originalData) return { allIndustries: [], allGroups: [], allManufacturers: [] };
        const industries = new Set<string>();
        const groups = new Set<string>();
        Object.keys(productConfig.childToParentMap).forEach(childKey => industries.add(productConfig.childToParentMap[childKey]));
        Object.values(productConfig.subgroups).forEach(parent => Object.keys(parent).forEach(subgroup => groups.add(subgroup)));
        const dataRows = originalData;
        const manufacturers = new Set<string>(dataRows.map(row => getRowValue(row, COL.MANUFACTURER)).filter(Boolean));
        return { 
            allIndustries: Array.from(industries).sort(), 
            allGroups: Array.from(groups).sort(),
            allManufacturers: Array.from(manufacturers).sort(),
        };
    }, [productConfig, originalData]);

    useEffect(() => {
        const loadConfig = async () => {
            let config = await getWarehouseColumnConfig();
            if (!config || config.length === 0) {
                config = [...DEFAULT_WAREHOUSE_COLUMNS];
                await saveWarehouseColumnConfig(config);
            }
            setColumns(config);
        };
        loadConfig();
    }, [allIndustries, allGroups]);

    const handleSaveColumns = (newColumns: WarehouseColumnConfig[]) => {
        setColumns(newColumns);
        saveWarehouseColumnConfig(newColumns).catch(err => console.error("Failed to save column config:", err));
    };
    
    const handleTargetClick = (kho: string) => {
        const currentTarget = warehouseTargets[kho] || 0;
        // Format initial value with commas
        const formattedValue = currentTarget > 0 ? currentTarget.toLocaleString('en-US') : '';
        setEditingTargetKho({ id: kho, name: kho, value: formattedValue });
    };

    const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove non-digit characters
        const rawValue = e.target.value.replace(/\D/g, '');
        // Format with commas
        const formattedValue = rawValue ? parseInt(rawValue, 10).toLocaleString('en-US') : '';
        
        setEditingTargetKho(prev => prev ? { ...prev, value: formattedValue } : null);
    };

    const handleTargetSave = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (editingTargetKho) {
            // Remove commas before parsing to float
            const val = parseFloat(editingTargetKho.value.replace(/,/g, ''));
            if (!isNaN(val)) {
                updateWarehouseTarget(editingTargetKho.id, val);
            }
            setEditingTargetKho(null);
        }
    };

    useEffect(() => {
        if (editingTargetKho && targetInputRef.current) {
            targetInputRef.current.focus();
            // Optional: Move cursor to end if needed, but select() is often good for overwriting
            // targetInputRef.current.select(); 
        }
    }, [editingTargetKho]);
    
    if (!data || data.length === 0) return null;

    const handleSort = (columnId: string) => {
        setSortConfig(prev => ({ key: columnId, direction: (prev?.key === columnId && prev.direction === 'desc') ? 'asc' : 'desc' }));
    };
    
    const visibleColumns = columns.filter(c => c.isVisible).sort((a,b) => a.order - b.order);

    const groupedHeaders = useMemo(() => {
        const groups: { name: string; colSpan: number; }[] = [];
        if (visibleColumns.length === 0) return groups;
        
        let currentGroup = { name: visibleColumns[0].mainHeader, colSpan: 1 };
        for (let i = 1; i < visibleColumns.length; i++) {
            if (visibleColumns[i].mainHeader === currentGroup.name) {
                currentGroup.colSpan++;
            } else {
                groups.push(currentGroup);
                currentGroup = { name: visibleColumns[i].mainHeader, colSpan: 1 };
            }
        }
        groups.push(currentGroup);
        return groups;
    }, [visibleColumns]);

    // Helper to check if a column is the start of a new group to apply the vertical separator
    const isGroupStart = (index: number) => {
        if (index === 0) return true;
        return visibleColumns[index].mainHeader !== visibleColumns[index - 1].mainHeader;
    };
    
    // Calculate total target for footer
    const totalTarget = uniqueFilterOptions.kho.reduce((sum, kho) => sum + (warehouseTargets[kho] || 0), 0);

    return (
        <>
            <div id="warehouse-summary-view" className="flex flex-col gap-6 mb-8" ref={summaryRef}>
                {(isProcessing || isExporting) && (
                    <div className="hide-on-export">
                        <LoadingOverlay />
                    </div>
                )}

                {/* --- MAIN TABLE SURFACE --- */}
                <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                    {/* Header Toolbar */}
                    <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Chi tiết theo kho</h2>
                            <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Phân tích hiệu suất từng siêu thị</p>
                        </div>
                        <div className="flex items-center gap-2 hide-on-export">
                            <button onClick={() => setIsSettingsModalOpen(true)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all">
                                <Icon name="settings-2" size={5} />
                            </button>
                            <button onClick={handleSingleExport} disabled={isExporting} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-all">
                                {isExporting ? <Icon name="loader-2" className="animate-spin" size={5} /> : <Icon name="camera" size={5} />}
                            </button>
                            {uniqueFilterOptions.kho.length > 1 && (
                                <button onClick={onBatchExport} disabled={isExporting} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all" title="Xuất hàng loạt">
                                    <Icon name="images" size={5} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* The Table */}
                    <div className="overflow-x-auto custom-scrollbar p-4">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                            <thead>
                                {/* Group Headers */}
                                <tr className="text-[10px] uppercase tracking-widest">
                                    <th className="px-4 py-3 w-32 sticky left-0 z-20 bg-rose-200 dark:bg-rose-900 border-b-2 border-rose-300 dark:border-rose-800 font-black text-rose-900 dark:text-rose-100 text-center align-middle shadow-[4px_0_12px_-4px_rgba(0,0,0,0.2)]">
                                        KHO
                                    </th>
                                    {groupedHeaders.map((group, i) => {
                                        const styles = WAREHOUSE_HEADER_COLORS[group.name] || WAREHOUSE_HEADER_COLORS.DEFAULT;
                                        // Override border color for the group header row to match the theme
                                        const borderColor = styles.border.replace('border-', 'border-b-'); 
                                        
                                        return (
                                            <th key={i} colSpan={group.colSpan} className={`px-2 py-3 text-center align-middle border-l-2 border-white dark:border-slate-900 first:border-l-0 ${styles.sub} ${borderColor} border-b-2`}>
                                                <span className={`font-extrabold ${styles.sub.includes('slate') ? 'text-slate-600 dark:text-slate-300' : 'text-slate-800 dark:text-white'} opacity-90`}>{group.name}</span>
                                            </th>
                                        );
                                    })}
                                </tr>
                                {/* Column Headers */}
                                <tr>
                                    <th onClick={() => handleSort('khoName')} className="px-4 py-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 transition-colors sticky left-0 z-10 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)] text-center">
                                        Mã Kho
                                    </th>
                                    {visibleColumns.map((col, index) => {
                                        const isStart = isGroupStart(index);
                                        return (
                                            <th key={col.id} onClick={() => handleSort(col.id)} className={`px-2 py-3 bg-slate-50 dark:bg-slate-800 first:rounded-l-xl last:rounded-r-xl text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight text-center cursor-pointer hover:bg-slate-100 transition-colors ${isStart ? 'border-l-2 border-slate-200 dark:border-slate-700' : ''}`}>
                                                {col.subHeader}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((row) => (
                                    <tr key={row.khoName} data-kho-id={row.khoName} className="group hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                                        <td 
                                            className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 text-center sticky left-0 z-10 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)] group-hover:bg-indigo-50 dark:group-hover:bg-slate-800 transition-colors cursor-pointer hover:text-indigo-600 underline decoration-dotted"
                                            onClick={() => handleTargetClick(row.khoName)}
                                            title="Nhấp để nhập Target"
                                        >
                                            {row.khoName}
                                        </td>
                                        {visibleColumns.map((col, index) => {
                                            const isHqqd = col.metric === 'hieuQuaQD';
                                            const isRevenueColumn = col.metric === 'doanhThuThuc' || col.metric === 'doanhThuQD' || col.metricType === 'revenue' || col.metricType === 'revenueQD';
                                            const isPrimaryMetric = col.metric === 'doanhThuQD' || col.metric === 'hieuQuaQD';
                                            const isTarget = col.metric === 'target';
                                            const isPercentHT = col.metric === 'percentHT';
                                            const isStart = isGroupStart(index);

                                            let value = (col.isCustom && col.productCodes) ? customProductColumnValues.get(col.id)?.get(row.khoName) : getColumnValue(row, col);
                                            
                                            // Handle special injected values that use Context
                                            if (col.metric === 'target') {
                                                value = warehouseTargets[row.khoName] || 0;
                                            } else if (col.metric === 'percentHT') {
                                                const target = warehouseTargets[row.khoName] || 0;
                                                const dtqd = row.doanhThuQD || 0;
                                                value = target > 0 ? (dtqd / target) * 100 : 0;
                                            }

                                            let content;
                                            if (isHqqd) content = <span className={getHqqdClass(value)}>{`${(value || 0).toFixed(0)}%`}</span>;
                                            else if (col.metric === 'traChamPercent') content = <span className={`font-bold ${value >= 40 ? 'text-emerald-500' : 'text-slate-500'}`}>{`${(value || 0).toFixed(0)}%`}</span>;
                                            else if (isPercentHT) content = <span className={`font-black ${value >= 100 ? 'text-emerald-600' : (value >= 80 ? 'text-indigo-600' : 'text-amber-600')}`}>{`${(value || 0).toFixed(0)}%`}</span>;
                                            else if (isTarget) content = <span className="text-slate-500 font-mono text-xs">{formatRevenueForKho(value)}</span>;
                                            else if (isRevenueColumn) content = <span className={isPrimaryMetric ? 'font-black text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 font-medium'}>{formatRevenueForKho(value)}</span>;
                                            else content = <span className="text-slate-500 dark:text-slate-400 font-medium">{formatQuantityForKho(value)}</span>;

                                            return (
                                                <td key={`${row.khoName}-${col.id}`} className={`px-2 py-3 text-center text-sm border-b border-slate-50 dark:border-slate-800 ${isPrimaryMetric ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''} ${isStart ? 'border-l-2 border-slate-100 dark:border-slate-800' : ''}`}>
                                                    {content}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                            {/* --- FOOTER (TOTALS) --- */}
                            <tfoot>
                                <tr>
                                    <td className="px-4 py-4 bg-slate-100 dark:bg-slate-800 font-black text-slate-800 dark:text-white text-center sticky left-0 z-10 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.05)] uppercase text-xs tracking-wider">
                                        Tổng cộng
                                    </td>
                                    {visibleColumns.map((col, index) => {
                                        let value;
                                        if (col.isCustom && col.productCodes) {
                                            value = customTotals.get(col.id) || 0;
                                        } else if (col.metric && (totals as any)[col.metric] !== undefined) {
                                            value = (totals as any)[col.metric];
                                        } else if (col.metric === 'target') {
                                            value = totalTarget;
                                        } else if (col.metric === 'percentHT') {
                                            const totalDTQD = (totals as any).doanhThuQD || 0;
                                            value = totalTarget > 0 ? (totalDTQD / totalTarget) * 100 : 0;
                                        } else {
                                            value = customTotals.get(col.id) || 0;
                                        }

                                        const isHqqd = col.metric === 'hieuQuaQD';
                                        const isRevenueColumn = col.metric === 'doanhThuThuc' || col.metric === 'doanhThuQD' || col.metricType === 'revenue' || col.metricType === 'revenueQD';
                                        const isPrimaryMetric = col.metric === 'doanhThuQD' || col.metric === 'hieuQuaQD';
                                        const isTarget = col.metric === 'target';
                                        const isPercentHT = col.metric === 'percentHT';
                                        const isStart = isGroupStart(index);

                                        let content;
                                        if (isHqqd) content = <span className={getHqqdClass(value)}>{`${(value || 0).toFixed(0)}%`}</span>;
                                        else if (col.metric === 'traChamPercent') content = <span className={`font-bold ${value >= 40 ? 'text-emerald-500' : 'text-slate-500'}`}>{`${(value || 0).toFixed(0)}%`}</span>;
                                        else if (isPercentHT) content = <span className={`font-black ${value >= 100 ? 'text-emerald-600' : (value >= 80 ? 'text-indigo-600' : 'text-amber-600')}`}>{`${(value || 0).toFixed(0)}%`}</span>;
                                        else if (isTarget) content = <span className="text-slate-500 font-mono text-xs">{formatRevenueForKho(value)}</span>;
                                        else if (isRevenueColumn) content = <span className={isPrimaryMetric ? 'font-black text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300 font-bold'}>{formatRevenueForKho(value)}</span>;
                                        else content = <span className="text-slate-600 dark:text-slate-300 font-bold">{formatQuantityForKho(value)}</span>;

                                        return (
                                            <td key={`total-${col.id}`} className={`px-2 py-4 text-center text-sm bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700 ${isPrimaryMetric ? 'bg-slate-100/50 dark:bg-slate-800' : ''} ${isStart ? 'border-l-2 border-slate-200 dark:border-slate-700' : ''}`}>
                                                {content}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

             <WarehouseSettingsModal 
                isOpen={isSettingsModalOpen} 
                onClose={() => setIsSettingsModalOpen(false)}
                onSave={handleSaveColumns}
                columns={columns}
                allIndustries={allIndustries}
                allGroups={allGroups}
                allManufacturers={allManufacturers}
            />

            {/* Target Edit Modal */}
            <ModalWrapper
                isOpen={!!editingTargetKho}
                onClose={() => setEditingTargetKho(null)}
                title="Nhập Target"
                subTitle={`Đặt chỉ tiêu doanh thu cho kho ${editingTargetKho?.name}`}
                titleColorClass="text-indigo-600 dark:text-indigo-400"
                maxWidthClass="max-w-md"
            >
                <form onSubmit={handleTargetSave} className="p-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Doanh thu mục tiêu (VNĐ)
                    </label>
                    <input
                        ref={targetInputRef}
                        type="text"
                        value={editingTargetKho?.value || ''}
                        onChange={handleTargetChange}
                        className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 mb-6 text-lg font-semibold"
                        placeholder="Nhập số tiền..."
                    />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setEditingTargetKho(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Hủy</button>
                        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold">Lưu</button>
                    </div>
                </form>
            </ModalWrapper>
        </>
    );
};

export default WarehouseSummary;
