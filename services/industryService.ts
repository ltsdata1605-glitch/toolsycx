import type { DataRow, IndustryData, ProductConfig, FilterState } from '../types';
import { COL } from '../constants';
import { getRowValue, getDisplayParentGroup } from '../utils/dataUtils';

export function processIndustryData(
    salesData: DataRow[],
    productConfig: ProductConfig,
    filters: FilterState
): IndustryData[] {
    const industryRevenue: { [key: string]: { revenue: number, quantity: number } } = {};

    salesData.forEach(row => {
        const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
        const price = Number(getRowValue(row, COL.PRICE)) || 0;
        const revenue = price; // Doanh thu là giá trị của cột Giá bán_1
        const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
        const childGroup = productConfig.childToSubgroupMap[maNhomHang];
        const displayParentGroup = getDisplayParentGroup(maNhomHang, productConfig);

        const isSubgroupSelected = filters.industryGrid.selectedSubgroups.length === 0 || (childGroup && filters.industryGrid.selectedSubgroups.includes(childGroup));
        if (isSubgroupSelected) {
            if (!industryRevenue[displayParentGroup]) industryRevenue[displayParentGroup] = { revenue: 0, quantity: 0 };
            industryRevenue[displayParentGroup].revenue += revenue;
            industryRevenue[displayParentGroup].quantity += quantity;
        }
    });

    return Object.entries(industryRevenue).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue);
}