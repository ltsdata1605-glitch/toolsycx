
import { useMemo } from 'react';
import type { DataRow, ProductConfig, Employee, HeadToHeadTableConfig } from '../types';
import { getRowValue, toLocalISOString, getHeSoQuyDoi } from '../utils/dataUtils';
import { COL, HINH_THUC_XUAT_THU_HO } from '../constants';

interface UseHeadToHeadLogicProps {
    config: HeadToHeadTableConfig;
    baseFilteredData: DataRow[];
    productConfig: ProductConfig;
    employeeData: Employee[];
    sortConfig: { key: string | number; direction: 'asc' | 'desc' };
    includeToday: boolean;
}

export const useHeadToHeadLogic = ({
    config,
    baseFilteredData,
    productConfig,
    employeeData,
    sortConfig,
    includeToday
}: UseHeadToHeadLogicProps) => {
    return useMemo(() => {
        const employeeDepartments = new Map(employeeData.map(e => [e.name, e.department]));
        const baseDate = new Date();
        baseDate.setHours(0, 0, 0, 0);
        if (!includeToday) baseDate.setDate(baseDate.getDate() - 1);
        
        const dateHeaders = Array.from({ length: 7 }).map((_, i) => { const d = new Date(baseDate); d.setDate(d.getDate() - i); return d; }).reverse();
        const startDate = dateHeaders[0];
        const endDate = new Date(baseDate);
        endDate.setHours(23, 59, 59, 999);
        const dateRangeString = `${startDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${endDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
        
        const isValidSale = (row: DataRow): boolean => 
            (getRowValue(row, COL.TRANG_THAI_HUY) || '').toString().trim().toLowerCase() === 'chưa hủy' && 
            (getRowValue(row, COL.TINH_TRANG_NHAP_TRA) || '').toString().trim().toLowerCase() === 'chưa trả' && 
            (getRowValue(row, COL.TRANG_THAI_THU_TIEN) || '').toString().trim().toLowerCase() === 'đã thu';

        const dataForTab = baseFilteredData.filter(row => !HINH_THUC_XUAT_THU_HO.has(getRowValue(row, COL.HINH_THUC_XUAT)) && isValidSale(row));
        
        const groupFilteredData = (config.selectedSubgroups.length === 0 && (!config.selectedParentGroups || config.selectedParentGroups.length === 0))
            ? dataForTab
            : dataForTab.filter(row => {
                const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                const parentGroup = productConfig.childToParentMap[maNhomHang];
                const subgroup = productConfig.childToSubgroupMap[maNhomHang];
                
                const parentMatch = config.selectedParentGroups && parentGroup && config.selectedParentGroups.includes(parentGroup);
                const subgroupMatch = config.selectedSubgroups && subgroup && config.selectedSubgroups.includes(subgroup);

                return !!(parentMatch || subgroupMatch);
            });

        const salesByEmployeeByDate: { [emp: string]: { [dateKey: string]: { revenue: number, revenueQD: number, quantity: number } } } = {};

        groupFilteredData.forEach(row => {
            const date = row.parsedDate;
            if (!date || date < startDate || date > endDate) return;

            const employee = getRowValue(row, COL.NGUOI_TAO);
            const dateKey = toLocalISOString(date);
            if (!employee) return;

            if (!salesByEmployeeByDate[employee]) salesByEmployeeByDate[employee] = {};
            if (!salesByEmployeeByDate[employee][dateKey]) salesByEmployeeByDate[employee][dateKey] = { revenue: 0, revenueQD: 0, quantity: 0 };
            
            const price = Number(getRowValue(row, COL.PRICE)) || 0;
            const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
            const revenue = price; 
            const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
            const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
            const productName = getRowValue(row, COL.PRODUCT);
            
            const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName);
            const revenueQD = revenue * heso;

            // Logic: Với Vieon, nhân Số lượng với hệ số quy đổi
            const subgroup = productConfig.childToSubgroupMap[maNhomHang];
            const parentGroup = productConfig.childToParentMap[maNhomHang];
            const isVieon = subgroup === 'Vieon' || parentGroup === 'Vieon' || (productName || '').toString().includes('VieON');
            
            const weightedQuantity = isVieon ? (quantity * heso) : quantity;

            salesByEmployeeByDate[employee][dateKey].revenue += revenue;
            salesByEmployeeByDate[employee][dateKey].revenueQD += revenueQD;
            salesByEmployeeByDate[employee][dateKey].quantity += weightedQuantity;
        });
        
        // Pre-calculate daily totals for all employees for HQQD calculation
        const dailyGrandTotals = new Map<string, { revenue: number, revenueQD: number }>();
        if (config.metricType === 'hieuQuaQD') {
            dateHeaders.forEach(date => {
                const dateKey = toLocalISOString(date);
                dailyGrandTotals.set(dateKey, { revenue: 0, revenueQD: 0 });
            });

            Object.values(salesByEmployeeByDate).forEach(empSales => {
                Object.entries(empSales).forEach(([dateKey, dailyMetrics]) => {
                    const dayTotal = dailyGrandTotals.get(dateKey);
                    if (dayTotal) {
                        dayTotal.revenue += dailyMetrics.revenue;
                        dayTotal.revenueQD += dailyMetrics.revenueQD;
                    }
                });
            });
        }


        let tableRows = employeeData.map(emp => {
            const empSales = salesByEmployeeByDate[emp.name] || {};
            let total = 0;
            let daysWithSales = 0;
            const dailyValues: { [dateKey: string]: number } = {};
            
            let totalRevenue7Days = 0;
            let totalRevenueQD7Days = 0;

            dateHeaders.forEach(date => {
                const dateKey = toLocalISOString(date);
                const dailyMetrics = empSales[dateKey] || { revenue: 0, revenueQD: 0, quantity: 0 };
                
                totalRevenue7Days += dailyMetrics.revenue;
                totalRevenueQD7Days += dailyMetrics.revenueQD;
                
                let value = 0;
                switch(config.metricType) {
                    case 'quantity': value = dailyMetrics.quantity; break;
                    case 'revenue': value = dailyMetrics.revenue; break;
                    case 'revenueQD': value = dailyMetrics.revenueQD; break;
                    case 'hieuQuaQD':
                        value = dailyMetrics.revenue > 0 ? ((dailyMetrics.revenueQD / dailyMetrics.revenue) - 1) * 100 : 0;
                        break;
                }
                
                dailyValues[dateKey] = value;
                if (value > 0) daysWithSales++;
                if (config.metricType !== 'hieuQuaQD') {
                    total += value;
                }
            });

            if (config.metricType === 'hieuQuaQD') {
                total = totalRevenue7Days > 0 ? ((totalRevenueQD7Days / totalRevenue7Days) - 1) * 100 : 0;
            }

            if (config.totalCalculationMethod === 'average' && config.metricType !== 'hieuQuaQD') {
                total /= 7;
            }

            const rowValues = Object.values(dailyValues);
            const rowAverage = rowValues.reduce((a, b) => a + b, 0) / (rowValues.filter(v => v > 0).length || 1);

            return { 
                name: emp.name, 
                department: employeeDepartments.get(emp.name) || 'Không Phân Ca',
                dailyValues, 
                total, 
                daysWithNoSales: 7 - daysWithSales,
                rowAverage
            };
        });
        
        // --- START: BOTTOM 30% CALCULATION ---
        const rowsByDept: { [key: string]: typeof tableRows } = {};
        tableRows.forEach(row => {
            const dept = row.department;
            if (!rowsByDept[dept]) rowsByDept[dept] = [];
            rowsByDept[dept].push(row);
        });

        const bottom30PercentNames = new Set<string>();
        Object.values(rowsByDept).forEach(deptRows => {
            if (deptRows.length > 3) { // Only apply if there's a meaningful number of employees
                const sortedByTotal = [...deptRows].sort((a, b) => a.total - b.total); // Sort ascending
                const thresholdIndex = Math.floor(deptRows.length * 0.3);
                const thresholdValue = sortedByTotal[thresholdIndex].total;
                
                // Add all employees at or below the threshold, including ties
                sortedByTotal.forEach(row => {
                    if (row.total <= thresholdValue && row.total > 0) { // only highlight if they sold something
                        bottom30PercentNames.add(row.name);
                    }
                });
            }
        });

        tableRows.forEach(row => {
            (row as any).isBottom30 = bottom30PercentNames.has(row.name);
        });
        
        const top30PercentNoSalesNames = new Set<string>();
        const rowsWithActivity = tableRows.filter(r => r.daysWithNoSales < 7);
        if (rowsWithActivity.length > 3) {
            const sortedByNoSales = [...rowsWithActivity].sort((a,b) => b.daysWithNoSales - a.daysWithNoSales);
            const thresholdIndex = Math.floor(sortedByNoSales.length * 0.3);
            if (thresholdIndex < sortedByNoSales.length) {
                const thresholdValue = sortedByNoSales[thresholdIndex].daysWithNoSales;
                sortedByNoSales.forEach(r => {
                    if (r.daysWithNoSales >= thresholdValue && r.daysWithNoSales > 0) {
                        top30PercentNoSalesNames.add(r.name);
                    }
                });
            }
        }
        
        const deptAvgByDate = new Map<string, Map<string, number>>();
        dateHeaders.forEach(date => {
            const dateKey = toLocalISOString(date);
            const dailyDeptStats = new Map<string, { sum: number, count: number }>();
            tableRows.forEach(row => {
                const dept = row.department;
                const value = row.dailyValues[dateKey] || 0;
                if (!dailyDeptStats.has(dept)) dailyDeptStats.set(dept, { sum: 0, count: 0 });
                const stats = dailyDeptStats.get(dept)!;
                stats.sum += value;
                stats.count++;
            });
            const avgMap = new Map<string, number>();
            dailyDeptStats.forEach((stats, dept) => {
                avgMap.set(dept, stats.count > 0 ? stats.sum / stats.count : 0);
            });
            deptAvgByDate.set(dateKey, avgMap);
        });

        tableRows.sort((a, b) => {
            const valA = a[sortConfig.key as keyof typeof a];
            const valB = b[sortConfig.key as keyof typeof b];

            if (typeof valA === 'number' && typeof valB === 'number') {
                if (valA !== valB) return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
            return b.total - a.total; 
        });

        const groupedRows: { [key: string]: typeof tableRows } = tableRows.reduce((acc, row) => {
            const dept = row.department;
            if (!acc[dept]) acc[dept] = [];
            acc[dept].push(row);
            return acc;
        }, {} as { [key: string]: typeof tableRows });

        const sortedDepartments = Object.keys(groupedRows).sort((a,b) => a.localeCompare(b));

        const departmentTotals = new Map<string, any>();
        sortedDepartments.forEach(dept => {
            const rowsInDept = groupedRows[dept];
            const deptTotals = { daily: new Map<string, number>(), total: 0, daysWithNoSales: 0 };

            if (rowsInDept.length > 0) {
                dateHeaders.forEach(date => {
                    const dateKey = toLocalISOString(date);
                    if (config.metricType === 'hieuQuaQD') {
                        let dailyDeptRevenue = 0;
                        let dailyDeptRevenueQD = 0;
                        rowsInDept.forEach(row => {
                            const dailyMetrics = salesByEmployeeByDate[row.name]?.[dateKey];
                            if (dailyMetrics) {
                                dailyDeptRevenue += dailyMetrics.revenue;
                                dailyDeptRevenueQD += dailyMetrics.revenueQD;
                            }
                        });
                        const dailyDeptHqqd = dailyDeptRevenue > 0 ? ((dailyDeptRevenueQD / dailyDeptRevenue) - 1) * 100 : 0;
                        deptTotals.daily.set(dateKey, dailyDeptHqqd);
                    } else {
                        const dailyDeptTotal = rowsInDept.reduce((sum, row) => sum + (row.dailyValues[dateKey] || 0), 0);
                        deptTotals.daily.set(dateKey, dailyDeptTotal);
                    }
                });

                if (config.metricType === 'hieuQuaQD') {
                    const deptTotalRevenue = rowsInDept.reduce((sum, r) => sum + Object.values(salesByEmployeeByDate[r.name] || {}).reduce((s, d) => s + d.revenue, 0), 0);
                    const deptTotalRevenueQD = rowsInDept.reduce((sum, r) => sum + Object.values(salesByEmployeeByDate[r.name] || {}).reduce((s, d) => s + d.revenueQD, 0), 0);
                    const totalHqqd = deptTotalRevenue > 0 ? ((deptTotalRevenueQD / deptTotalRevenue) - 1) * 100 : 0;
                    
                    if (config.totalCalculationMethod === 'average') {
                        deptTotals.total = rowsInDept.reduce((sum, r) => sum + r.total, 0) / (rowsInDept.length || 1);
                    } else {
                        deptTotals.total = totalHqqd;
                    }
                } else {
                    deptTotals.total = rowsInDept.reduce((sum, r) => sum + r.total, 0);
                    if (config.totalCalculationMethod === 'average') {
                        deptTotals.total /= (rowsInDept.length || 1);
                    }
                }
                deptTotals.daysWithNoSales = rowsInDept.reduce((sum, r) => sum + r.daysWithNoSales, 0) / (rowsInDept.length || 1);
            }
            departmentTotals.set(dept, deptTotals);
        });
        
        const totals = { daily: new Map<string, number>(), total: 0, daysWithNoSales: 0 };
        let grandTotalRevenue = 0;
        let grandTotalRevenueQD = 0;

        if (tableRows.length > 0) {
            tableRows.forEach(row => {
                dateHeaders.forEach(date => { const dateKey = toLocalISOString(date); const value = row.dailyValues[dateKey] || 0; totals.daily.set(dateKey, (totals.daily.get(dateKey) || 0) + value); });
                if (config.metricType !== 'hieuQuaQD') { totals.total += row.total; }
                totals.daysWithNoSales += row.daysWithNoSales;
            });
            totals.daysWithNoSales /= tableRows.length;
        }

        if (config.metricType === 'hieuQuaQD') {
             dateHeaders.forEach(date => {
                const dateKey = toLocalISOString(date);
                const dayTotal = dailyGrandTotals.get(dateKey);
                if (dayTotal && dayTotal.revenue > 0) {
                    totals.daily.set(dateKey, ((dayTotal.revenueQD / dayTotal.revenue) - 1) * 100);
                } else {
                    totals.daily.set(dateKey, 0);
                }
            });

             Object.values(salesByEmployeeByDate).forEach(empSales => { Object.values(empSales).forEach(dailyMetrics => { grandTotalRevenue += dailyMetrics.revenue; grandTotalRevenueQD += dailyMetrics.revenueQD; }); });
            const totalHqqd = grandTotalRevenue > 0 ? ((grandTotalRevenueQD / grandTotalRevenue) - 1) * 100 : 0;
             if (config.totalCalculationMethod === 'average') { totals.total = tableRows.reduce((sum, r) => sum + r.total, 0) / (tableRows.length || 1);
            } else { totals.total = totalHqqd; }
        } else if (config.totalCalculationMethod === 'average') { totals.total = tableRows.reduce((sum, r) => sum + r.total, 0) / (tableRows.length || 1); }

        return { 
            processedData: { tableRows, dateHeaders, dateRangeString, totals, top30PercentNoSalesNames, groupedRows, sortedDepartments },
            conditionalFormatData: { deptAvgByDate },
            departmentTotals
        };
    }, [config, baseFilteredData, productConfig, employeeData, includeToday, sortConfig]);
};
