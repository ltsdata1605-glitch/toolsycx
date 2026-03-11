
import type { DataRow, ProductConfig, FilterState, ProcessedData, EmployeeData, IndustryData } from '../types';
import { COL, HINH_THUC_XUAT_THU_HO, HINH_THUC_XUAT_TIEN_MAT, HINH_THUC_XUAT_TRA_GOP } from '../constants';
import { getRowValue } from '../utils/dataUtils';
import { DepartmentMap } from './dataService';
import { processKpis } from './kpiService';
import { processTrendData } from './trendService';
import { processEmployeeData } from './employeeService';
import { processSummaryTable, calculateWarehouseSummary } from './summaryService';
import { processIndustryData } from './industryService';


/**
 * Processes a filtered subset of data for a specific period to generate all dashboard metrics.
 */
function processDataForPeriod(
    periodData: DataRow[],
    productConfig: ProductConfig,
    filters: FilterState,
    departmentMap: DepartmentMap | null
): Omit<ProcessedData, 'lastUpdated' | 'reportSubTitle' | 'warehouseSummary'> {
    
    // 1. INITIAL DATA FILTERING & PREPARATION
    const isRevenueEligible = (row: DataRow) => {
        const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT) || '';
        return HINH_THUC_XUAT_TIEN_MAT.has(hinhThucXuat) || HINH_THUC_XUAT_TRA_GOP.has(hinhThucXuat);
    };

    // Data is now pre-filtered by isValidSale at the worker level.
    // We only need to filter out 'Thu Hộ' for revenue-specific calculations.
    const filteredValidSalesData = periodData.filter(row => {
        const hinhThucXuat = getRowValue(row, COL.HINH_THUC_XUAT) || '';
        return !HINH_THUC_XUAT_THU_HO.has(hinhThucXuat);
    });

    // The checks for 'chưa hủy', 'chưa trả', 'đã thu' are now redundant as periodData is pre-filtered.
    const unshippedOrders = periodData.filter(row => {
        return getRowValue(row, COL.XUAT) === 'Chưa xuất' && isRevenueEligible(row);
    });

    // 2. DELEGATE TO SPECIALIZED SERVICES
    const kpis = processKpis(filteredValidSalesData, unshippedOrders, periodData, productConfig);
    const trendData = processTrendData(filteredValidSalesData, productConfig);
    const employeeData = processEmployeeData(filteredValidSalesData, periodData, productConfig, departmentMap);
    const industryData = processIndustryData(filteredValidSalesData, productConfig, filters);
    const summaryTable = processSummaryTable(filteredValidSalesData, productConfig, filters);
    
    // 3. ASSEMBLE RESULTS
    return {
        kpis,
        trendData,
        industryData,
        employeeData,
        summaryTable,
        unshippedOrders,
        filteredValidSalesData,
    };
}


/**
 * Applies all filters to the dataset and orchestrates the processing of different data slices.
 */
export function applyFiltersAndProcess(
    allData: DataRow[],
    productConfig: ProductConfig,
    filters: FilterState,
    departmentMap: DepartmentMap | null
): { processedData: ProcessedData, baseFilteredData: DataRow[] } {
    const mainStartDate = filters.startDate ? new Date(filters.startDate) : null;
    if (mainStartDate) mainStartDate.setHours(0, 0, 0, 0);
    const mainEndDate = filters.endDate ? new Date(filters.endDate) : null;
    if (mainEndDate) mainEndDate.setHours(23, 59, 59, 999);
    
    // Base data for the main dashboard (respects all filters)
    const baseFilteredData = allData.filter(row => {
        if (filters.kho !== 'all' && getRowValue(row, COL.KHO) != filters.kho) return false;
        if (filters.xuat !== 'all') {
            const xuatValue = getRowValue(row, COL.XUAT) || '';
            const xuatStatus = xuatValue.toLowerCase().includes('đã') ? 'Đã' : 'Chưa';
            if (xuatStatus !== filters.xuat) return false;
        }
        if (filters.trangThai.length > 0 && !filters.trangThai.includes(getRowValue(row, COL.TRANG_THAI))) return false;
        if (filters.nguoiTao.length > 0 && !filters.nguoiTao.includes(getRowValue(row, COL.NGUOI_TAO))) return false;
        
        if (departmentMap && filters.department && filters.department.length > 0) {
            const creator = getRowValue(row, COL.NGUOI_TAO);
            if (!creator) return false;
            
            const creatorId = creator.split(' - ')[0].trim();
            const rawDept = departmentMap[creatorId];
            // Split to handle encoded "Dept;;Name" values
            const department = rawDept ? rawDept.split(';;')[0] : undefined;
            
            if (!department || !filters.department.includes(department)) {
                return false;
            }
        }

        if (filters.parent && filters.parent.length > 0) {
            const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
            const pGroup = productConfig.childToParentMap[maNhomHang] || 'Khác';
            const cGroup = productConfig.childToSubgroupMap[maNhomHang];

            let displayParentGroup = pGroup;
            if (pGroup === 'ICT' && ['Smartphone', 'Laptop', 'Tablet'].includes(cGroup)) {
                displayParentGroup = cGroup;
            } else if (pGroup === 'Gia dụng' && cGroup === 'Máy lọc nước') {
                displayParentGroup = 'Máy lọc nước';
            }
            if (!filters.parent.includes(displayParentGroup)) return false;
        }
        
        return true;
    });

    const mainPeriodData = baseFilteredData.filter(row => {
        const rowDate = row.parsedDate;
        return (!mainStartDate || rowDate >= mainStartDate) && (!mainEndDate || rowDate <= mainEndDate);
    });
    
    const mainResult = processDataForPeriod(mainPeriodData, productConfig, filters, departmentMap);
    
    const warehouseSummary = calculateWarehouseSummary(allData, filters, productConfig);
    
    const filterParts = [];
    if(filters.kho !== 'all') filterParts.push(`Kho: ${filters.kho}`);
    if(filters.xuat !== 'all') filterParts.push(`Xuất: ${filters.xuat}`);
    
    const processedData: ProcessedData = {
        ...mainResult,
        warehouseSummary,
        lastUpdated: new Date().toLocaleString('vi-VN'),
        reportSubTitle: filterParts.length > 0 ? `Lọc theo: ${filterParts.join(' | ')}` : "Dữ liệu được cập nhật dựa trên các bộ lọc đã chọn."
    };

    return { processedData, baseFilteredData };
}
