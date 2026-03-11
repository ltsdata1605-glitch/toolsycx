
import React, { useState, useMemo, forwardRef, useEffect } from 'react';
import { Icon } from '../common/Icon';
import { formatCurrency, abbreviateName, formatQuantity, getHeSoQuyDoi, getRowValue } from '../../utils/dataUtils';
import type { DataRow, ProductConfig, Employee } from '../../types';
import { COL, HINH_THUC_XUAT_THU_HO } from '../../constants';
import { getSummarySynthesisAnalysis } from '../../services/aiService';
import MultiSelectDropdown from '../common/MultiSelectDropdown';

interface CustomTabConfig {
    label: string;
    metricType: 'quantity' | 'revenue' | 'revenueQD';
    selectedIndustries: string[];
    selectedSubgroups: string[];
    selectedManufacturers: string[];
    productCodes: string[];
}

interface SummarySynthesisTabProps {
    baseFilteredData: DataRow[];
    productConfig: ProductConfig;
    employeeData: Employee[];
    isCustomTab?: boolean;
    customConfig?: CustomTabConfig;
    onExport?: () => void;
    isExporting?: boolean;
}

const SummarySynthesisTab = React.memo(forwardRef<HTMLDivElement, SummarySynthesisTabProps>(({ baseFilteredData, productConfig, employeeData, isCustomTab, customConfig, onExport, isExporting }, ref) => {
    const [internalMetricType, setInternalMetricType] = useState<'revenue' | 'quantity'>('quantity');
    const [internalGroupMode, setInternalGroupMode] = useState<'parent' | 'subgroup'>('subgroup'); 
    const [internalSelectedGroups, setInternalSelectedGroups] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: isCustomTab ? 'value' : 'name', direction: isCustomTab ? 'desc' : 'asc' });
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

    const metricType = customConfig ? customConfig.metricType : internalMetricType;
    const selectedGroups = customConfig ? customConfig.selectedSubgroups : internalSelectedGroups;
    
    const productSubgroups = useMemo(() => {
        const subgroups = new Set<string>();
        Object.values(productConfig.subgroups).forEach(parent => {
            Object.keys(parent).forEach(subgroup => subgroups.add(subgroup));
        });
        return Array.from(subgroups).sort();
    }, [productConfig]);

    const productParentGroups = useMemo(() => {
        return Array.from(new Set(Object.values(productConfig.childToParentMap))).sort();
    }, [productConfig]);

    const availableOptions = internalGroupMode === 'parent' ? productParentGroups : productSubgroups;

    useEffect(() => {
        if (!isCustomTab && availableOptions.length > 0) {
            if (internalGroupMode === 'subgroup') {
                 const defaultGroups = availableOptions.filter(g => ['Sim Online', 'Bảo hiểm', 'Đồng hồ Nam', 'Camera'].includes(g));
                 setInternalSelectedGroups(defaultGroups.length > 0 ? defaultGroups : availableOptions.slice(0, 4));
            } else {
                 const defaultParents = availableOptions.filter(g => ['Sim', 'Bảo hiểm', 'Wearable', 'Phụ kiện'].includes(g));
                 setInternalSelectedGroups(defaultParents.length > 0 ? defaultParents : availableOptions.slice(0, 4));
            }
        }
    }, [availableOptions, internalGroupMode, isCustomTab]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const { rows, subgroupTotals, groupedRows, sortedDepartments, departmentTotals } = useMemo(() => {
        if (!baseFilteredData.length || !employeeData.length) {
            return { rows: [], subgroupTotals: new Map(), groupedRows: {}, sortedDepartments: [], departmentTotals: new Map() };
        }
    
        const validData = baseFilteredData.filter(row => !HINH_THUC_XUAT_THU_HO.has(getRowValue(row, COL.HINH_THUC_XUAT)));
    
        let tableRows;
    
        if (isCustomTab && customConfig) {
             const filteredSalesData = validData.filter(row => {
                const industry = productConfig.childToParentMap[getRowValue(row, COL.MA_NHOM_HANG)] || '';
                const subgroup = productConfig.childToSubgroupMap[getRowValue(row, COL.MA_NHOM_HANG)] || '';
                const manufacturer = getRowValue(row, COL.MANUFACTURER) || '';
                const productCode = getRowValue(row, COL.MA_NHOM_HANG) || '';
                const filters = customConfig;
    
                if (!filters) return true;
    
                const industryMatch = filters.selectedIndustries.length === 0 || filters.selectedIndustries.includes(industry);
                const subgroupMatch = filters.selectedSubgroups.length === 0 || filters.selectedSubgroups.includes(subgroup);
                const manufacturerMatch = filters.selectedManufacturers.length === 0 || filters.selectedManufacturers.includes(manufacturer);
                const productCodeMatch = filters.productCodes.length === 0 || filters.productCodes.includes(productCode);
    
                return industryMatch && subgroupMatch && manufacturerMatch && productCodeMatch;
            });
    
            const salesByEmployee: { [emp: string]: number } = {};
            filteredSalesData.forEach(row => {
                const employee = getRowValue(row, COL.NGUOI_TAO);
                if (!employee) return;
                if (!salesByEmployee[employee]) salesByEmployee[employee] = 0;
    
                const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
                const price = Number(getRowValue(row, COL.PRICE)) || 0;
                const revenue = price;
    
                if (metricType === 'quantity') {
                    salesByEmployee[employee] += quantity;
                } else if (metricType === 'revenue') {
                    salesByEmployee[employee] += revenue;
                } else {
                    const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
                    const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                    const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig);
                    salesByEmployee[employee] += revenue * heso;
                }
            });
    
            tableRows = employeeData.map(emp => ({
                name: emp.name,
                department: emp.department,
                value: salesByEmployee[emp.name] || 0,
                subgroupMetrics: new Map([['value', salesByEmployee[emp.name] || 0]])
            }));

        } else {
            if (selectedGroups.length === 0) return { rows: [], subgroupTotals: new Map(), groupedRows: {}, sortedDepartments: [], departmentTotals: new Map() };
    
            const salesByEmployeeByGroup: { [emp: string]: { [group: string]: { revenue: number, quantity: number } } } = {};
            
            validData.forEach(row => {
                const employee = getRowValue(row, COL.NGUOI_TAO);
                if (!employee) return;
                
                const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                let groupKey = '';
                
                if (internalGroupMode === 'parent') {
                    groupKey = productConfig.childToParentMap[maNhomHang];
                } else {
                    groupKey = productConfig.childToSubgroupMap[maNhomHang];
                }

                if (groupKey && selectedGroups.includes(groupKey)) {
                    if (!salesByEmployeeByGroup[employee]) salesByEmployeeByGroup[employee] = {};
                    if (!salesByEmployeeByGroup[employee][groupKey]) salesByEmployeeByGroup[employee][groupKey] = { revenue: 0, quantity: 0 };
                    
                    const price = Number(getRowValue(row, COL.PRICE)) || 0;
                    const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
                    salesByEmployeeByGroup[employee][groupKey].revenue += price;
                    salesByEmployeeByGroup[employee][groupKey].quantity += quantity;
                }
            });
    
            tableRows = employeeData.map(emp => {
                const empSales = salesByEmployeeByGroup[emp.name] || {};
                const subgroupMetrics = new Map<string, number>();
                let totalValue = 0;
                
                selectedGroups.forEach(group => {
                    const metric = empSales[group] || { revenue: 0, quantity: 0 };
                    const value = metricType === 'revenue' ? metric.revenue : metric.quantity;
                    subgroupMetrics.set(group, value);
                    totalValue += value;
                });
    
                return {
                    name: emp.name,
                    department: emp.department,
                    value: totalValue,
                    subgroupMetrics
                };
            });
        }

        const subgroupTotals = new Map<string, number>();
        if (isCustomTab) {
             const total = tableRows.reduce((sum, r) => sum + r.value, 0);
             subgroupTotals.set('value', total);
        } else {
            selectedGroups.forEach(group => {
                const total = tableRows.reduce((sum, r) => sum + (r.subgroupMetrics.get(group) || 0), 0);
                subgroupTotals.set(group, total);
            });
        }

        // Group rows by department
        const groupedRows: { [key: string]: typeof tableRows } = tableRows.reduce((acc, row) => {
            if (!acc[row.department]) acc[row.department] = [];
            acc[row.department].push(row);
            return acc;
        }, {} as { [key: string]: typeof tableRows });

        // Calculate department totals
        const departmentTotals = new Map<string, Map<string, number>>();
        Object.entries(groupedRows).forEach(([dept, rows]) => {
            const deptTotal = new Map<string, number>();
            if (isCustomTab) {
                const total = rows.reduce((sum, r) => sum + r.value, 0);
                deptTotal.set('value', total);
            } else {
                selectedGroups.forEach(group => {
                    const total = rows.reduce((sum, r) => sum + (r.subgroupMetrics.get(group) || 0), 0);
                    deptTotal.set(group, total);
                });
            }
            departmentTotals.set(dept, deptTotal);
        });

        // Sort departments
        const sortedDepartments = Object.keys(groupedRows).sort();

        // Sort rows within departments
        Object.keys(groupedRows).forEach(dept => {
            groupedRows[dept].sort((a, b) => {
               if (sortConfig.key === 'name') {
                   return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
               } else {
                   const valA = sortConfig.key === 'value' ? a.value : (a.subgroupMetrics.get(sortConfig.key) || 0);
                   const valB = sortConfig.key === 'value' ? b.value : (b.subgroupMetrics.get(sortConfig.key) || 0);
                   return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
               }
            });
        });

        return { rows: tableRows, subgroupTotals, groupedRows, sortedDepartments, departmentTotals };
    }, [baseFilteredData, productConfig, employeeData, isCustomTab, customConfig, metricType, internalGroupMode, selectedGroups, sortConfig]);

    const handleAiAnalysis = async () => {
        setIsAnalysisLoading(true);
        setAnalysis(null);
        try {
            const result = await getSummarySynthesisAnalysis(rows, selectedGroups, metricType);
            setAnalysis(result);
        } catch (error) {
            console.error("AI Error:", error);
            setAnalysis("Đã xảy ra lỗi khi phân tích.");
        } finally {
            setIsAnalysisLoading(false);
        }
    };

    return (
        <div ref={ref} className="space-y-4">
            {!isCustomTab && (
                <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hide-on-export">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-500">Chế độ:</span>
                        <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100 dark:bg-slate-700">
                            <button onClick={() => setInternalGroupMode('subgroup')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${internalGroupMode === 'subgroup' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Nhóm con</button>
                            <button onClick={() => setInternalGroupMode('parent')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${internalGroupMode === 'parent' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Ngành hàng</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-500">Chỉ số:</span>
                        <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100 dark:bg-slate-700">
                            <button onClick={() => setInternalMetricType('quantity')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${internalMetricType === 'quantity' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Số lượng</button>
                            <button onClick={() => setInternalMetricType('revenue')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${internalMetricType === 'revenue' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Doanh thu</button>
                        </div>
                    </div>
                    <div className="flex-grow max-w-md">
                        <MultiSelectDropdown 
                            label={internalGroupMode === 'parent' ? 'Ngành hàng' : 'Nhóm hàng'} 
                            options={availableOptions} 
                            selected={internalSelectedGroups} 
                            onChange={setInternalSelectedGroups} 
                        />
                    </div>
                    <button onClick={handleAiAnalysis} disabled={isAnalysisLoading} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all" title="Phân tích AI">
                        {isAnalysisLoading ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="sparkles" />}
                    </button>
                    {onExport && (
                        <button onClick={onExport} disabled={isExporting} title="Xuất Ảnh" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                            {isExporting ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="camera" />}
                        </button>
                    )}
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left compact-export-table">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th onClick={() => handleSort('name')} className="px-4 py-3 font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">Nhân Viên</th>
                                {isCustomTab ? (
                                    <th onClick={() => handleSort('value')} className="px-4 py-3 font-bold text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">{customConfig?.label || 'Giá trị'}</th>
                                ) : (
                                    selectedGroups.map(group => (
                                        <th key={group} onClick={() => handleSort(group)} className="px-4 py-3 font-bold text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">{group}</th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {sortedDepartments.map(dept => (
                                <React.Fragment key={dept}>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/30 font-semibold text-slate-600 dark:text-slate-300">
                                        <td className="px-4 py-2" colSpan={isCustomTab ? 2 : selectedGroups.length + 1}>{dept}</td>
                                    </tr>
                                    {groupedRows[dept].map((row, idx) => (
                                        <tr key={row.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="px-4 py-2 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{abbreviateName(row.name)}</td>
                                            {isCustomTab ? (
                                                <td className="px-4 py-2 text-center text-indigo-600 font-bold">
                                                    {metricType === 'quantity' ? formatQuantity(row.value) : formatCurrency(row.value)}
                                                </td>
                                            ) : (
                                                selectedGroups.map(group => {
                                                    const val = row.subgroupMetrics.get(group) || 0;
                                                    return (
                                                        <td key={group} className="px-4 py-2 text-center">
                                                            {metricType === 'quantity' ? (val > 0 ? formatQuantity(val) : '-') : (val > 0 ? formatCurrency(val) : '-')}
                                                        </td>
                                                    );
                                                })
                                            )}
                                        </tr>
                                    ))}
                                    {/* Department Total */}
                                    <tr className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-100 dark:border-slate-800">
                                        <td className="px-4 py-2 text-slate-500">Tổng {dept}</td>
                                        {isCustomTab ? (
                                            <td className="px-4 py-2 text-center text-indigo-700">
                                                {metricType === 'quantity' ? formatQuantity(departmentTotals.get(dept)?.get('value')) : formatCurrency(departmentTotals.get(dept)?.get('value') || 0)}
                                            </td>
                                        ) : (
                                            selectedGroups.map(group => (
                                                <td key={group} className="px-4 py-2 text-center text-slate-700 dark:text-slate-300">
                                                    {metricType === 'quantity' ? formatQuantity(departmentTotals.get(dept)?.get(group)) : formatCurrency(departmentTotals.get(dept)?.get(group) || 0)}
                                                </td>
                                            ))
                                        )}
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 border-t-2 border-slate-200 dark:border-slate-700">
                            <tr>
                                <td className="px-4 py-3">TỔNG CỘNG</td>
                                {isCustomTab ? (
                                    <td className="px-4 py-3 text-center text-indigo-700">
                                        {metricType === 'quantity' ? formatQuantity(subgroupTotals.get('value')) : formatCurrency(subgroupTotals.get('value') || 0)}
                                    </td>
                                ) : (
                                    selectedGroups.map(group => (
                                        <td key={group} className="px-4 py-3 text-center">
                                            {metricType === 'quantity' ? formatQuantity(subgroupTotals.get(group)) : formatCurrency(subgroupTotals.get(group) || 0)}
                                        </td>
                                    ))
                                )}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {analysis && (
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-purple-800 dark:text-purple-300 font-bold">
                        <Icon name="sparkles" />
                        <span>AI Phân Tích</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{analysis}</p>
                </div>
            )}
        </div>
    );
}));

export default SummarySynthesisTab;
