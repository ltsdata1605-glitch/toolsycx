import React, { useMemo, useRef, useState } from 'react';
import type { DataRow, Employee, ProductConfig, ContestTableConfig, ColumnConfig } from '../../types';
import { getRowValue, getHeSoQuyDoi, abbreviateName, formatQuantity, formatCurrency } from '../../utils/dataUtils';
import { COL, HINH_THUC_XUAT_THU_HO } from '../../constants';
import { Icon } from '../common/Icon';
import { exportElementAsImage } from '../../services/uiService';

interface ContestTableProps {
    config: ContestTableConfig;
    allEmployees: Employee[];
    baseFilteredData: DataRow[];
    productConfig: ProductConfig;
    tableColorTheme: { header: string; row: string; border: string; };
    onManageColumns: () => void;
    onDeleteTable: () => void;
    onAddColumn: () => void;
    onEditColumn: (columnId: string) => void;
    onTriggerDeleteColumn: (columnId: string) => void;
}

const getConditionalStyle = (value: number | undefined, column: ColumnConfig, average: number | undefined): React.CSSProperties => {
    if (value === undefined || !column.conditionalFormatting || column.conditionalFormatting.length === 0) {
        return {};
    }

    for (const rule of column.conditionalFormatting) {
        let match = false;
        switch (rule.condition) {
            case '>':
                match = value > rule.value1;
                break;
            case '<':
                match = value < rule.value1;
                break;
            case '=':
                match = value === rule.value1;
                break;
            case 'between':
                if (rule.value2 !== undefined) {
                    match = value >= rule.value1 && value <= rule.value2;
                }
                break;
            case '>avg':
                match = average !== undefined && value > average;
                break;
            case '<avg':
                match = average !== undefined && value < average;
                break;
        }
        if (match) {
            return { color: rule.color, fontWeight: 'bold' };
        }
    }
    return {};
};


const ContestTable: React.FC<ContestTableProps> = React.memo(({ config, allEmployees, baseFilteredData, productConfig, tableColorTheme, onManageColumns, onDeleteTable, onAddColumn, onEditColumn, onTriggerDeleteColumn }) => {
    const exportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>(() => {
        const defaultSortKey = config.defaultSortColumnId;
        if (defaultSortKey && config.columns.find(c => c.id === defaultSortKey)) {
            return { key: defaultSortKey, direction: 'desc' };
        }
        return { key: 'name', direction: 'asc' };
    });

    const { processedRows, totals, averages, sortedAndGroupedColumns, groupedRows, sortedDepartments, departmentTotals } = useMemo(() => {
        const employeeColumnValues = new Map<string, Map<string, number>>(); // Map<employeeName, Map<columnId, value>>

        const validData = baseFilteredData.filter(row => !HINH_THUC_XUAT_THU_HO.has(getRowValue(row, COL.HINH_THUC_XUAT)));

        // Step 1: Calculate all 'data' columns
        config.columns.forEach(col => {
            if (col.type !== 'data') return;

            const filteredSalesData = validData.filter(row => {
                const industry = productConfig.childToParentMap[getRowValue(row, COL.MA_NHOM_HANG)] || '';
                const subgroup = productConfig.childToSubgroupMap[getRowValue(row, COL.MA_NHOM_HANG)] || '';
                const manufacturer = getRowValue(row, COL.MANUFACTURER) || '';
                const productCode = getRowValue(row, COL.MA_NHOM_HANG) || '';

                const filters = col.filters;
                if (!filters) return true; // No filters, include all data

                const industryMatch = filters.selectedIndustries.length === 0 || filters.selectedIndustries.includes(industry);
                const subgroupMatch = filters.selectedSubgroups.length === 0 || filters.selectedSubgroups.includes(subgroup);
                const manufacturerMatch = filters.selectedManufacturers.length === 0 || filters.selectedManufacturers.includes(manufacturer);
                const productCodeMatch = filters.productCodes.length === 0 || filters.productCodes.includes(productCode);

                const allCategoryFiltersPass = industryMatch && subgroupMatch && manufacturerMatch && productCodeMatch;
                if (!allCategoryFiltersPass) return false;

                // New Price Filter Logic
                if (filters.priceCondition && typeof filters.priceValue1 === 'number') {
                    const priceColumnKey = filters.priceType === 'original' ? COL.ORIGINAL_PRICE : COL.PRICE;
                    const price = Number(getRowValue(row, priceColumnKey)) || 0;
                    const val1 = filters.priceValue1;

                    switch (filters.priceCondition) {
                        case 'greater':
                            if (price <= val1) return false;
                            break;
                        case 'less':
                            if (price >= val1) return false;
                            break;
                        case 'equal':
                            if (price !== val1) return false;
                            break;
                        case 'between':
                            const val2 = filters.priceValue2;
                            if (typeof val2 !== 'number' || price < val1 || price > val2) return false;
                            break;
                    }
                }

                return true;
            });

            filteredSalesData.forEach(row => {
                const employee = getRowValue(row, COL.NGUOI_TAO);
                if (!employee) return;

                if (!employeeColumnValues.has(employee)) {
                    employeeColumnValues.set(employee, new Map<string, number>());
                }
                const employeeValues = employeeColumnValues.get(employee)!;

                const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
                const price = Number(getRowValue(row, COL.PRICE)) || 0;
                const revenue = price; // Doanh thu là giá trị của cột Giá bán_1

                let value = 0;
                if (col.metricType === 'quantity') {
                    value = quantity;
                } else if (col.metricType === 'revenue') {
                    value = revenue;
                } else if (col.metricType === 'revenueQD') {
                    const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
                    const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                    const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig);
                    value = revenue * heso;
                }
                
                employeeValues.set(col.id, (employeeValues.get(col.id) || 0) + value);
            });
        });

        // Step 2: Process all employees and calculate 'calculated' columns
        allEmployees.forEach(emp => {
            const employeeName = emp.name;
            if (!employeeColumnValues.has(employeeName)) {
                employeeColumnValues.set(employeeName, new Map<string, number>());
            }
            const employeeValues = employeeColumnValues.get(employeeName)!;

            config.columns.forEach(col => {
                if (col.type === 'calculated' && col.operand1_columnId && col.operand2_columnId) {
                    const operand1 = employeeValues.get(col.operand1_columnId) || 0;
                    const operand2 = employeeValues.get(col.operand2_columnId) || 0;
                    let result = 0;
                    switch (col.operation) {
                        case '+': result = operand1 + operand2; break;
                        case '-': result = operand1 - operand2; break;
                        case '*': result = operand1 * operand2; break;
                        case '/': result = operand2 !== 0 ? operand1 / operand2 : 0; break;
                        default: result = 0;
                    }
                    if (col.operation === '/' && col.displayAs === 'percentage') {
                        result *= 100;
                    }
                    employeeValues.set(col.id, result);
                }
            });
        });

        // Step 3: Create the final rows for rendering
        let processedRows = allEmployees.map(emp => {
            const values = employeeColumnValues.get(emp.name) || new Map<string, number>();
            return {
                name: emp.name,
                department: emp.department,
                columnValues: values
            };
        });

        // Step 4: Calculate totals and averages
        const totals = new Map<string, number>();
        const averages = new Map<string, number>();
        const validRowCount = processedRows.length > 0 ? processedRows.length : 1;
        
        config.columns.forEach(col => {
            const total = processedRows.reduce((sum, row) => sum + (row.columnValues.get(col.id) || 0), 0);
            totals.set(col.id, total);
            averages.set(col.id, total / validRowCount);
        });
        
        // Re-calculate totals and averages for calculated percentage columns to be accurate
        config.columns.forEach(col => {
            if (col.type === 'calculated' && col.operation === '/' && col.displayAs === 'percentage' && col.operand1_columnId && col.operand2_columnId) {
                const totalOperand1 = totals.get(col.operand1_columnId) || 0;
                const totalOperand2 = totals.get(col.operand2_columnId) || 0;
                const totalResult = totalOperand2 !== 0 ? (totalOperand1 / totalOperand2) * 100 : 0;
                totals.set(col.id, totalResult);
            }
        });

        // Step 5: Sort the data
        processedRows.sort((a, b) => {
            if (sortConfig.key === 'name') {
                const valA = a.name;
                const valB = b.name;
                return sortConfig.direction === 'asc' ? valA.localeCompare(b.name) : b.name.localeCompare(a.name);
            } else {
                const valA = a.columnValues.get(sortConfig.key) || 0;
                const valB = b.columnValues.get(sortConfig.key) || 0;
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
        });

        const grouped = new Map<string, ColumnConfig[]>();
        config.columns.forEach(col => {
            const mainHeader = col.mainHeader || '';
            if (!grouped.has(mainHeader)) {
                grouped.set(mainHeader, []);
            }
            grouped.get(mainHeader)!.push(col);
        });
        
        const mainHeaderOrder: string[] = Array.from(new Set(config.columns.map(c => c.mainHeader || '')));
        
        const sortedAndGroupedColumns = mainHeaderOrder.map(header => ({
            name: header,
            columns: grouped.get(header) || [],
        }));

        const groupedRows = processedRows.reduce((acc, row) => {
            const dept = row.department || 'Không Phân Ca';
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(row);
            return acc;
        }, {} as Record<string, typeof processedRows>);

        const sortedDepartments = Object.keys(groupedRows).sort((a, b) => a.localeCompare(b));

        const departmentTotals = new Map<string, Map<string, number>>();
        sortedDepartments.forEach(dept => {
            const rowsInDept = groupedRows[dept];
            const deptTotals = new Map<string, number>();
            config.columns.forEach(col => {
                const total = rowsInDept.reduce((sum, row) => sum + (row.columnValues.get(col.id) || 0), 0);
                deptTotals.set(col.id, total);
            });

            // Recalculate percentage columns for the group total
            config.columns.forEach(col => {
                if (col.type === 'calculated' && col.operation === '/' && col.displayAs === 'percentage' && col.operand1_columnId && col.operand2_columnId) {
                    const totalOperand1 = deptTotals.get(col.operand1_columnId) || 0;
                    const totalOperand2 = deptTotals.get(col.operand2_columnId) || 0;
                    const totalResult = totalOperand2 !== 0 ? (totalOperand1 / totalOperand2) * 100 : 0;
                    deptTotals.set(col.id, totalResult);
                }
            });

            departmentTotals.set(dept, deptTotals);
        });


        return { processedRows, totals, averages, sortedAndGroupedColumns, groupedRows, sortedDepartments, departmentTotals };
    }, [config, allEmployees, baseFilteredData, productConfig, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const handleExport = async () => {
        if (exportRef.current) {
            setIsExporting(true);
            await exportElementAsImage(exportRef.current, `${config.tableName}.png`, {
                elementsToHide: ['.hide-on-export'],
                isCompactTable: true
            });
            setIsExporting(false);
        }
    };
    
    const formatValue = (value: number | undefined, column: ColumnConfig): string => {
        if (value == null || isNaN(value)) return '-';

        if (column.type === 'calculated') {
            if (column.displayAs === 'percentage') {
                return `${value.toFixed(1)}%`;
            }
            return formatCurrency(value, 1);
        }
        
        const metricType = column.metricType;
        if (metricType === 'revenue' || metricType === 'revenueQD') {
            return formatCurrency(Math.round(value), 0);
        }
        
        return formatQuantity(Math.round(value));
    };
    
    const groupsWithHeader = sortedAndGroupedColumns.filter(g => g.name);
    const groupsWithoutHeader = sortedAndGroupedColumns.find(g => !g.name);
    const columnsWithoutHeader = groupsWithoutHeader ? groupsWithoutHeader.columns : [];
    const columnsWithHeader = groupsWithHeader.flatMap(g => g.columns);

    const showDeptHeaders = sortedDepartments.length > 1 || (sortedDepartments.length === 1 && sortedDepartments[0] !== 'Không Phân Ca');

    return (
        <div ref={exportRef}>
            <div className={`bg-white dark:bg-slate-800 shadow-md border rounded-lg ${tableColorTheme.border} overflow-hidden`}>
                <div
                    className={`p-3 flex justify-between items-center ${tableColorTheme.header} border-b-2 ${tableColorTheme.border}`}
                >
                    <h3 className="text-base font-bold uppercase flex items-center gap-2">
                        <Icon name="target" size={4} />
                        <span>{config.tableName}</span>
                    </h3>
                    <div className="flex items-center gap-1 hide-on-export">
                        <button onClick={(e) => { e.stopPropagation(); onAddColumn(); }} title="Thêm Cột Mới" className="p-1.5 rounded-full text-inherit/70 hover:bg-black/10 transition-colors"><Icon name="plus-circle" size={4}/></button>
                        <button onClick={(e) => { e.stopPropagation(); onManageColumns(); }} title="Sửa tên và cài đặt bảng" className="p-1.5 rounded-full text-inherit/70 hover:bg-black/10 transition-colors"><Icon name="settings-2" size={4}/></button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteTable(); }} title="Xóa Bảng Này" className="p-1.5 rounded-full text-inherit/70 hover:bg-black/10 transition-colors"><Icon name="trash-2" size={4}/></button>
                        <button onClick={(e) => { e.stopPropagation(); handleExport(); }} disabled={isExporting} title="Xuất Ảnh" className="p-1.5 rounded-full text-inherit/70 hover:bg-black/10 transition-colors">
                            {isExporting ? <Icon name="loader-2" size={4} className="animate-spin" /> : <Icon name="camera" size={4} />}
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto table-container">
                    <table className="min-w-full text-sm compact-export-table">
                        <thead className={`${tableColorTheme.header} uppercase`}>
                            <tr className="divide-x divide-slate-200/50 dark:divide-slate-700/50">
                                <th rowSpan={2} className="px-2 py-2 text-center font-bold">#STT</th>
                                <th rowSpan={2} onClick={() => handleSort('name')} className={`px-2 py-2 text-left font-bold cursor-pointer select-none align-middle bg-inherit`}>
                                    Nhân Viên
                                </th>
                                
                                {groupsWithHeader.map(group => (
                                    <th key={group.name} colSpan={group.columns.length} className="px-2 py-2 text-center font-bold">
                                        {group.name}
                                    </th>
                                ))}

                                {columnsWithoutHeader.map(col => (
                                    <th key={col.id} rowSpan={2} onClick={() => handleSort(col.id)} className="px-2 py-2 text-center font-bold cursor-pointer select-none group/th relative align-middle">
                                        {col.columnName}
                                        <div className="absolute top-0 right-0 z-10 flex items-center opacity-0 group-hover/th:opacity-100 transition-opacity hide-on-export">
                                            <button onClick={(e) => { e.stopPropagation(); onEditColumn(col.id); }} className="p-1.5 text-slate-400 hover:text-blue-500 bg-white dark:bg-slate-800 rounded-l-md"><Icon name="edit-3" size={3.5}/></button>
                                            <button onClick={(e) => { e.stopPropagation(); onTriggerDeleteColumn(col.id); }} className="p-1.5 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 rounded-r-md"><Icon name="trash-2" size={3.5}/></button>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                            <tr className={`divide-x divide-slate-200/50 dark:divide-slate-700/50`}>
                                {columnsWithHeader.map(col => (
                                    <th key={col.id} onClick={() => handleSort(col.id)} className="px-2 py-2 text-center font-bold cursor-pointer select-none group/th relative">
                                        {col.columnName}
                                        <div className="absolute top-0 right-0 z-10 flex items-center opacity-0 group-hover/th:opacity-100 transition-opacity hide-on-export">
                                            <button onClick={(e) => { e.stopPropagation(); onEditColumn(col.id); }} className="p-1.5 text-slate-400 hover:text-blue-500 bg-white dark:bg-slate-800 rounded-l-md"><Icon name="edit-3" size={3.5}/></button>
                                            <button onClick={(e) => { e.stopPropagation(); onTriggerDeleteColumn(col.id); }} className="p-1.5 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 rounded-r-md"><Icon name="trash-2" size={3.5}/></button>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedDepartments.map(department => {
                                const rows = groupedRows[department];
                                const deptTotals = departmentTotals.get(department);
                                return (
                                    <React.Fragment key={department}>
                                        {showDeptHeaders && (
                                            <tr className={`${tableColorTheme.row}`}>
                                                <td colSpan={2 + columnsWithHeader.length + columnsWithoutHeader.length} className={`px-4 py-2 text-sm font-bold bg-inherit`}>
                                                    <div className="flex items-center gap-2">
                                                        <Icon name="users-round" size={4} />
                                                        <span>{department}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {rows.map((row, rowIndex) => {
                                            const rowClass = rowIndex % 2 === 0 ? 'bg-white dark:bg-slate-800/50' : tableColorTheme.row;
                                            return (
                                                <tr key={row.name} className={`${rowClass} divide-x divide-slate-200 dark:divide-slate-700`}>
                                                    <td className="px-2 py-2 text-center text-slate-500 dark:text-slate-400">{rowIndex + 1}</td>
                                                    <td className={`px-2 py-2 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap text-left`}>{abbreviateName(row.name)}</td>
                                                    {[...columnsWithHeader, ...columnsWithoutHeader].map(col => {
                                                        const value = row.columnValues.get(col.id);
                                                        const average = averages.get(col.id);
                                                        const style = getConditionalStyle(value, col, average);
                                                        return <td key={col.id} className="px-2 py-2 text-center text-slate-700 dark:text-slate-300" style={style}>{formatValue(value, col)}</td>;
                                                    })}
                                                </tr>
                                            );
                                        })}
                                        {showDeptHeaders && deptTotals && (
                                            <tr className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 divide-x divide-slate-200 dark:divide-slate-700">
                                                <td colSpan={2} className="px-2 py-2 text-left bg-inherit">Tổng Nhóm</td>
                                                {[...columnsWithHeader, ...columnsWithoutHeader].map(col => (
                                                    <td key={col.id} className="px-2 py-2 text-center font-semibold">
                                                        {formatValue(deptTotals.get(col.id), col)}
                                                    </td>
                                                ))}
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                        <tfoot className={`font-extrabold uppercase`}>
                             <tr className={`${tableColorTheme.header}`}>
                                <td colSpan={2} className={`px-2 py-2 text-left border-t-2 ${tableColorTheme.border}`}>TỔNG CỘNG</td>
                                {[...columnsWithHeader, ...columnsWithoutHeader].map(col => {
                                    const value = totals.get(col.id);
                                    const average = averages.get(col.id);
                                    const style = getConditionalStyle(value, col, average);
                                    return <td key={col.id} className={`px-2 py-2 text-center border-t-2 ${tableColorTheme.border}`} style={style}>{formatValue(value, col)}</td>;
                                })}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
});

export default ContestTable;