
import { useMemo } from 'react';
import type { WarehouseColumnConfig, WarehouseSummaryRow, DataRow, ProductConfig, MetricValues } from '../types';
import { COL, HINH_THUC_XUAT_THU_HO, HINH_THUC_XUAT_TRA_GOP } from '../constants';
import { getRowValue, getHeSoQuyDoi } from '../utils/dataUtils';

interface UseWarehouseLogicProps {
    data: WarehouseSummaryRow[];
    columns: WarehouseColumnConfig[];
    originalData: DataRow[];
    productConfig: ProductConfig | null;
    sortConfig: { key: string; direction: 'asc' | 'desc' };
}

export const useWarehouseLogic = ({
    data,
    columns,
    originalData,
    productConfig,
    sortConfig
}: UseWarehouseLogicProps) => {

    const customProductColumnValues = useMemo(() => {
        const results = new Map<string, Map<string, number>>();
        const dataRows = originalData as DataRow[];
        if (!dataRows || !productConfig) return results;

        const customProductColumns = columns.filter(c => c.isCustom && c.productCodes && c.productCodes.length > 0);
        if (customProductColumns.length === 0) return results;

        const productSetMap = new Map<string, Set<string>>(customProductColumns.map(c => [c.id, new Set(c.productCodes!)]));

        customProductColumns.forEach(c => results.set(c.id, new Map<string, number>()));

        dataRows.forEach(row => {
            const khoName = getRowValue(row, COL.KHO);
            const productCode = getRowValue(row, COL.MA_NHOM_HANG);
            if (!khoName || !productCode) return;

            customProductColumns.forEach(col => {
                const productSet = productSetMap.get(col.id);
                if (productSet && productSet.has(productCode)) {
                    const price = Number(getRowValue(row, COL.PRICE)) || 0;
                    const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
                    const rowRevenue = price * quantity;

                    let value = 0;
                    if (col.metricType === 'quantity') {
                        value = quantity;
                    } else if (col.metricType === 'revenue') {
                        value = rowRevenue;
                    } else if (col.metricType === 'revenueQD') {
                        const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
                        const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
                        const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig);
                        value = rowRevenue * heso;
                    }

                    const khoMap = results.get(col.id)!;
                    khoMap.set(khoName, (khoMap.get(khoName) || 0) + value);
                }
            });
        });

        return results;
    }, [data, columns, originalData, productConfig]);

    const getColumnValue = (row: WarehouseSummaryRow | Partial<WarehouseSummaryRow>, column: WarehouseColumnConfig): number | undefined => {
        if (column.metric) return (row as any)[column.metric];
        if (column.categoryType && (column.categoryName || column.productCodes) && column.metricType) {
            if(column.productCodes) return undefined;
            
            const metrics = (row as any).metrics;
            if (!metrics) return 0;

            if (column.manufacturerName) {
                const primaryKey = column.categoryType === 'industry' ? 'byIndustryAndManufacturer' : 'byGroupAndManufacturer';
                return metrics[primaryKey]?.[column.categoryName!]?.[column.manufacturerName]?.[column.metricType];
            } else {
                const primaryKey = column.categoryType === 'industry' ? 'byIndustry' : column.categoryType === 'group' ? 'byGroup' : 'byManufacturer';
                return metrics[primaryKey]?.[column.categoryName!]?.[column.metricType];
            }
        }
        return 0;
    };

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            let valA: string | number = 0;
            let valB: string | number = 0;
            
            if (sortConfig.key === 'khoName') {
                valA = a.khoName;
                valB = b.khoName;
            } else {
                const column = columns.find(c => c.id === sortConfig.key);
                if (column) {
                    if (column.isCustom && column.productCodes) {
                        valA = customProductColumnValues.get(column.id)?.get(a.khoName) || 0;
                        valB = customProductColumnValues.get(column.id)?.get(b.khoName) || 0;
                    } else {
                        valA = getColumnValue(a, column) || 0;
                        valB = getColumnValue(b, column) || 0;
                    }
                }
            }

            if (typeof valA === 'number' && typeof valB === 'number') {
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            } else {
                return sortConfig.direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
            }
            return 0;
        });
    }, [data, sortConfig, columns, customProductColumnValues]);

    const { totals, customTotals } = useMemo(() => {
        const initialTotals: Partial<WarehouseSummaryRow> & { metrics: any; doanhThuTraCham: number; } = {
            metrics: {
                byIndustry: {},
                byGroup: {},
                byManufacturer: {},
                byIndustryAndManufacturer: {},
                byGroupAndManufacturer: {},
            },
            doanhThuTraCham: 0
        };
        const customTotalsMap = new Map<string, number>();

        const visibleColumns = columns.filter(c => c.isVisible);

        visibleColumns.forEach(col => {
            if (col.isCustom && col.productCodes) {
                const colId = col.id;
                const columnMap = customProductColumnValues.get(colId);
                let total = 0;
                if (columnMap) {
                    for (const val of columnMap.values()) {
                        total += val;
                    }
                }
                customTotalsMap.set(colId, total);
            }
        });
        
        const coreTotals = data.reduce((acc, row) => {
            acc.doanhThuThuc = (acc.doanhThuThuc || 0) + row.doanhThuThuc;
            acc.doanhThuQD = (acc.doanhThuQD || 0) + row.doanhThuQD;
            acc.slTiepCan = (acc.slTiepCan || 0) + row.slTiepCan;
            acc.slThuHo = (acc.slThuHo || 0) + row.slThuHo;
            acc.doanhThuTraCham = (acc.doanhThuTraCham || 0) + row.doanhThuTraCham;
            visibleColumns.forEach(col => {
                if ((!col.isCustom || !col.productCodes) && col.metric !== 'traChamPercent') {
                    const val = getColumnValue(row, col) || 0;
                    customTotalsMap.set(col.id, (customTotalsMap.get(col.id) || 0) + val);
                }
            });
            return acc;
        }, initialTotals);

        if (coreTotals.doanhThuThuc) {
            (coreTotals as any).hieuQuaQD = (coreTotals.doanhThuThuc || 0) > 0 ? (((coreTotals.doanhThuQD || 0) - (coreTotals.doanhThuThuc || 0)) / (coreTotals.doanhThuThuc || 1)) * 100 : 0;
            (coreTotals as any).traChamPercent = (coreTotals.doanhThuThuc || 0) > 0 ? (((coreTotals.doanhThuTraCham || 0)) / (coreTotals.doanhThuThuc || 1)) * 100 : 0;
        }
        
        return { totals: coreTotals, customTotals: customTotalsMap };
    }, [data, columns, customProductColumnValues]);

    return {
        sortedData,
        totals,
        customTotals,
        customProductColumnValues,
        getColumnValue
    };
};
