
import React, { useState } from 'react';
import type { DataRow, ProductConfig, Employee, HeadToHeadTableConfig } from '../../../types';
import { abbreviateName, formatQuantity, formatRevenueForHeadToHead, toLocalISOString } from '../../../utils/dataUtils';
import { Icon } from '../../common/Icon';
import { useHeadToHeadLogic } from '../../../hooks/useHeadToHeadLogic';
import { exportElementAsImage } from '../../../services/uiService';

interface HeadToHeadTableProps {
    config: HeadToHeadTableConfig;
    baseFilteredData: DataRow[];
    productConfig: ProductConfig;
    employeeData: Employee[];
    onAdd: () => void;
    onEdit: () => void;
    onDelete: () => void;
    getExportRef?: () => HTMLDivElement | null;
    tableColorTheme: { header: string; row: string; border: string; };
}

const HeadToHeadTable: React.FC<HeadToHeadTableProps> = ({ 
    config, 
    baseFilteredData, 
    productConfig, 
    employeeData, 
    onAdd, 
    onEdit, 
    onDelete, 
    tableColorTheme 
}) => {
    const [sortConfig, setSortConfig] = useState<{ key: string | number; direction: 'asc' | 'desc' }>({ key: 'daysWithNoSales', direction: 'asc' });
    const [includeToday, setIncludeToday] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const tableRef = React.useRef<HTMLDivElement>(null);

    // Use the new hook for data processing
    const { processedData, conditionalFormatData, departmentTotals } = useHeadToHeadLogic({
        config,
        baseFilteredData,
        productConfig,
        employeeData,
        sortConfig,
        includeToday
    });

    const handleSort = (key: string | number) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };
    
    const handleExport = async () => {
        if (tableRef.current) {
            setIsExporting(true);
            await exportElementAsImage(tableRef.current, `7-ngay-${config.tableName}.png`, {
                elementsToHide: ['.hide-on-export'],
                isCompactTable: true
            });
            setIsExporting(false);
        }
    };
    
    const formatValue = (value: number | undefined) => {
        if (value === undefined || value === null || !isFinite(value)) { return '-'; }
        if (config.totalCalculationMethod === 'average' && (config.metricType === 'revenue' || config.metricType === 'revenueQD')) {
            const roundedValue = Math.ceil(value / 1000000);
            return roundedValue.toLocaleString('vi-VN');
        }
        if (config.totalCalculationMethod === 'average' && config.metricType !== 'hieuQuaQD') {
            const roundedValue = Math.ceil(value);
            return formatQuantity(roundedValue);
        }
        if (config.metricType === 'revenue' || config.metricType === 'revenueQD') {
            return formatRevenueForHeadToHead(value);
        }
        if (config.metricType === 'hieuQuaQD') {
            if (value === 0) return '-';
            return `${value.toFixed(0)}%`;
        }
        return formatQuantity(value);
    };

    const getCellStyle = (value: number, row: any, dateKey: string): React.CSSProperties => {
        if (!config.conditionalFormats || value === 0) return {};
        let finalStyle: React.CSSProperties = {};

        for(const rule of config.conditionalFormats) {
            let targetValue: number;
            switch(rule.criteria) {
                case 'specific_value': targetValue = rule.value; break;
                case 'row_avg': targetValue = row.rowAverage; break;
                case 'column_dept_avg': targetValue = conditionalFormatData.deptAvgByDate.get(dateKey)?.get(row.department) ?? 0; break;
                default: continue;
            }

            let conditionMet = false;
            if (rule.operator === '>' && value > targetValue) conditionMet = true;
            if (rule.operator === '<' && value < targetValue) conditionMet = true;
            if (rule.operator === '=' && value === targetValue) conditionMet = true;

            if (conditionMet) {
                finalStyle.backgroundColor = rule.backgroundColor;
                finalStyle.color = rule.textColor;
                finalStyle.borderRadius = '6px';
                finalStyle.fontWeight = 'bold';
            }
        }
        return finalStyle;
    };

    return (
        <div ref={tableRef} className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-600 shadow-sm">
                        <Icon name="swords" size={5} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight uppercase tracking-wide">{config.tableName}</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{processedData.dateRangeString}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 hide-on-export">
                    <button onClick={(e) => { e.stopPropagation(); onAdd(); }} title="Thêm Bảng Mới" className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Icon name="plus-circle" size={4}/></button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Sửa Bảng" className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Icon name="pencil" size={4}/></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Xóa Bảng" className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Icon name="trash-2" size={4}/></button>
                    <button onClick={(e) => { e.stopPropagation(); handleExport(); }} disabled={isExporting} title="Xuất Ảnh" className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        {isExporting ? <Icon name="loader-2" size={4} className="animate-spin" /> : <Icon name="camera" size={4} />}
                    </button>
                </div>
            </div>

            <div className="px-4 py-2 text-[10px] font-bold text-slate-500 bg-slate-50/50 dark:bg-slate-900/30 flex justify-end items-center hide-on-export border-b border-slate-100 dark:border-slate-800">
                 <label className="flex items-center gap-2 cursor-pointer select-none hover:text-indigo-600 transition-colors">
                    <input type="checkbox" checked={includeToday} onChange={() => setIncludeToday(p => !p)} className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span>Bao gồm hôm nay</span>
                </label>
            </div>

            <div className="overflow-x-auto custom-scrollbar flex-grow p-2">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('name')} className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 cursor-pointer select-none min-w-[140px] sticky left-0 bg-white dark:bg-slate-900 z-10">
                                Nhân Viên
                            </th>
                            {processedData.dateHeaders.map(date => {
                                const dateKey = toLocalISOString(date);
                                const isSorted = sortConfig.key === dateKey;
                                return (
                                    <th key={date.toISOString()} onClick={() => handleSort(dateKey)} className={`px-2 py-3 text-center text-[10px] font-black uppercase tracking-wider cursor-pointer select-none ${isSorted ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        <div className="flex flex-col items-center">
                                            <span>{date.toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                                            <span className="text-[9px] opacity-70">{date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                                        </div>
                                    </th>
                                )
                            })}
                            <th onClick={() => handleSort('total')} className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 cursor-pointer select-none">
                                {config.totalCalculationMethod === 'average' ? 'TB' : 'TỔNG'}
                            </th>
                            <th onClick={() => handleSort('daysWithNoSales')} className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 cursor-pointer select-none">
                                NO<br/>SALE
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {processedData.sortedDepartments.map(department => {
                            const rows = processedData.groupedRows[department];
                            const deptTotalData = departmentTotals.get(department);
                            return(
                                <React.Fragment key={department}>
                                     <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                                        <td colSpan={100} className="px-4 py-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                                            <div className="flex items-center gap-2">
                                                <Icon name="users-round" size={3} />
                                                <span>{department}</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {rows.map((row, rowIndex) => {
                                        const medals = ['🥇', '🥈', '🥉'];
                                        const rankIndex = rowIndex; 
                                        const medal = rankIndex < 3 ? medals[rankIndex] : null;
                                        let rankDisplay = medal ? <span className="text-lg w-5 text-center inline-block">{medal}</span> : <span className="text-[10px] font-bold text-slate-300 w-5 text-center inline-block">#{rowIndex + 1}</span>;

                                        return (
                                            <tr key={row.name} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-3 py-3 text-left sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/30 transition-colors border-r border-slate-50 dark:border-slate-800/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                     <div className="flex items-center gap-2">
                                                        {rankDisplay}
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{abbreviateName(row.name)}</span>
                                                    </div>
                                                </td>
                                                {processedData.dateHeaders.map(date => {
                                                    const dateKey = toLocalISOString(date);
                                                    const value = row.dailyValues[dateKey] || 0;
                                                    const cellStyle = getCellStyle(value, row, dateKey);
                                                    return (
                                                        <td key={dateKey} className="px-2 py-3 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
                                                            <div className="inline-block px-2 py-1" style={cellStyle}>
                                                                {formatValue(value)}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className={`px-3 py-3 text-center font-bold text-indigo-600 dark:text-indigo-400 text-sm`}>{formatValue(row.total)}</td>
                                                <td className="px-3 py-3 text-center">
                                                    {row.daysWithNoSales > 0 ? (
                                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${row.daysWithNoSales >= 4 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                            {row.daysWithNoSales}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {deptTotalData && (
                                        <tr className="bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200">
                                            <td className="px-3 py-3 text-left text-xs uppercase font-bold text-slate-500 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">Tổng Nhóm</td>
                                            {processedData.dateHeaders.map(date => {
                                                const dateKey = toLocalISOString(date);
                                                return (
                                                    <td key={dateKey} className="px-2 py-3 text-center text-sm font-bold">
                                                        {formatValue(deptTotalData.daily.get(dateKey) || 0)}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-3 text-center text-sm font-black text-indigo-700 dark:text-indigo-300">{formatValue(deptTotalData.total)}</td>
                                            <td className="px-3 py-3 text-center text-sm font-bold text-slate-500">
                                                {deptTotalData.daysWithNoSales > 0 ? deptTotalData.daysWithNoSales.toFixed(1) : '-'}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700">
                        <tr>
                            <td className="px-3 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-widest sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-sm">TỔNG CỘNG</td>
                            {processedData.dateHeaders.map(date => (
                                <td key={date.toISOString()} className="px-2 py-4 text-center text-sm font-black text-slate-700 dark:text-slate-200">{formatValue(processedData.totals.daily.get(toLocalISOString(date)) || 0)}</td>
                            ))}
                            <td className="px-3 py-4 text-center text-sm font-black text-indigo-700 dark:text-indigo-400">{formatValue(processedData.totals.total)}</td>
                            <td className="px-3 py-4 text-center text-sm font-bold text-slate-500">{processedData.totals.daysWithNoSales.toFixed(1)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default HeadToHeadTable;
