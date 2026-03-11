
import type { DataRow, ProductConfig, Employee, EmployeeData, ExploitationData } from '../types';
import { COL, HINH_THUC_XUAT_THU_HO } from '../constants';
import { getRowValue, getHeSoQuyDoi, getDisplayParentGroup, getHinhThucThanhToan } from '../utils/dataUtils';
import { DepartmentMap } from './dataService';

function _buildFullEmployeeData(
    employeeStats: { [key: string]: Partial<Employee> & { name: string, customerSet: Set<string>, totalOrders: number, doanhThuTraCham: number, slCE_ICT: number, slTraCham_CE_ICT: number, doanhThu_CE_ICT: number, doanhThuTraCham_CE_ICT: number } },
    exploitationStats: { [creator: string]: Partial<ExploitationData> & { name: string } },
    periodData: DataRow[],
    employeeIndustryStats: { [creator: string]: { [industry: string]: number } },
    employeeDailyTrend: { [creator: string]: { [date: string]: number } },
    departmentMap: DepartmentMap | null
): EmployeeData {

    const allCreatorsInPeriod = new Set(periodData.map(r => getRowValue(r, COL.NGUOI_TAO)).filter(Boolean));

    allCreatorsInPeriod.forEach(creator => {
        const creatorThuHoCount = periodData.filter(r => getRowValue(r, COL.NGUOI_TAO) === creator && HINH_THUC_XUAT_THU_HO.has(getRowValue(r, COL.HINH_THUC_XUAT))).length;
        
        if (employeeStats[creator]) {
             employeeStats[creator].slThuHo = (employeeStats[creator].slThuHo || 0) + creatorThuHoCount;
        } else if (creatorThuHoCount > 0) {
             employeeStats[creator] = { name: creator, doanhThuThuc: 0, doanhThuQD: 0, slTraCham: 0, doanhThuTraCham: 0, slThuHo: creatorThuHoCount, customerSet: new Set(), totalOrders: 0, slCE_ICT: 0, slTraCham_CE_ICT: 0, doanhThu_CE_ICT: 0, doanhThuTraCham_CE_ICT: 0 };
        }

        if (exploitationStats[creator] === undefined && employeeStats[creator] !== undefined) {
             exploitationStats[creator] = { name: creator };
        }

        if (departmentMap && (employeeStats[creator] || exploitationStats[creator])) {
            const creatorId = creator.split(' - ')[0].trim();
            const rawDept = departmentMap[creatorId];
            if (rawDept) {
                // Split to handle encoded "Dept;;Name" values
                const dept = rawDept.split(';;')[0];
                if (employeeStats[creator]) employeeStats[creator].department = dept;
                if (exploitationStats[creator]) exploitationStats[creator].department = dept;
            }
        }
    });

    let finalEmployeeStats = employeeStats;
    let finalExploitationStats = exploitationStats;
    let finalIndustryStats = employeeIndustryStats;
    let finalDailyTrend = employeeDailyTrend;

    if (departmentMap && Object.keys(departmentMap).length > 0) {
        // Logic kept compatible with previous updates
    }

    const fullSellerArray: Employee[] = Object.values(finalEmployeeStats).map(emp => {
        const doanhThuThuc = emp.doanhThuThuc || 0;
        const doanhThuQD = emp.doanhThuQD || 0;
        const slTraCham = emp.slTraCham || 0;
        const doanhThuTraCham = emp.doanhThuTraCham || 0;
        const slTiepCan = emp.customerSet ? emp.customerSet.size : 0;
        const totalOrders = emp.totalOrders || 0;
        const slCE_ICT = emp.slCE_ICT || 0;
        const slTraCham_CE_ICT = emp.slTraCham_CE_ICT || 0;
        const doanhThu_CE_ICT = emp.doanhThu_CE_ICT || 0;
        const doanhThuTraCham_CE_ICT = emp.doanhThuTraCham_CE_ICT || 0;

        return {
            name: emp.name,
            department: emp.department || 'Không Phân Ca',
            doanhThuThuc,
            doanhThuQD,
            doanhThuTraCham,
            hieuQuaValue: doanhThuThuc > 0 ? ((doanhThuQD - doanhThuThuc) / doanhThuThuc) * 100 : 0,
            slTiepCan,
            aov: slTiepCan > 0 ? doanhThuThuc / slTiepCan : 0,
            slThuHo: emp.slThuHo || 0,
            slTraCham,
            totalOrders: totalOrders,
            traChamPercent: doanhThuThuc > 0 ? (doanhThuTraCham / doanhThuThuc) * 100 : 0,
            slCE_ICT,
            slTraCham_CE_ICT,
            traChamPercent_CE_ICT: slCE_ICT > 0 ? (slTraCham_CE_ICT / slCE_ICT) * 100 : 0,
            doanhThu_CE_ICT,
            doanhThuTraCham_CE_ICT,
            dtTraChamPercent_CE_ICT: doanhThu_CE_ICT > 0 ? (doanhThuTraCham_CE_ICT / doanhThu_CE_ICT) * 100 : 0,
            weakPointsRevenue: 0,
            weakPointsExploitation: 0,
        };
    });

    const exploitationData: ExploitationData[] = Object.values(finalExploitationStats)
        .filter(ex => ex.name)
        .map(ex => {
            const doanhThuThuc = ex.doanhThuThuc || 0;
            const doanhThuQD = ex.doanhThuQD || 0;
            const slBaoHiem = ex.slBaoHiem || 0;
            const slSPChinh_Tong = (ex.slICT || 0) + (ex.slCE_main || 0) + (ex.slGiaDung_main || 0);
            return {
                name: ex.name!,
                department: ex.department || 'Không Phân Ca',
                doanhThuThuc,
                doanhThuQD,
                hieuQuaQD: doanhThuThuc > 0 ? (doanhThuQD - doanhThuThuc) / doanhThuThuc * 100 : 0,
                
                slICT: ex.slICT || 0,
                doanhThuICT: ex.doanhThuICT || 0,
                slCE_main: ex.slCE_main || 0,
                doanhThuCE_main: ex.doanhThuCE_main || 0,
                slGiaDung_main: ex.slGiaDung_main || 0,

                slBaoHiem,
                doanhThuBaoHiem: ex.doanhThuBaoHiem || 0,
                percentBaoHiem: slSPChinh_Tong > 0 ? (slBaoHiem / slSPChinh_Tong) * 100 : 0,
                slSim: ex.slSim || 0,
                doanhThuSim: ex.doanhThuSim || 0,
                slDongHo: ex.slDongHo || 0,
                doanhThuDongHo: ex.doanhThuDongHo || 0,
                doanhThuPhuKien: ex.doanhThuPhuKien || 0,
                slPhuKien: ex.slPhuKien || 0,
                slCamera: ex.slCamera || 0,
                slLoa: ex.slLoa || 0,
                slPinSDP: ex.slPinSDP || 0,
                slTaiNgheBLT: ex.slTaiNgheBLT || 0,
                doanhThuGiaDung: ex.doanhThuGiaDung || 0,
                slGiaDung: ex.slGiaDung || 0,
                slMayLocNuoc: ex.slMayLocNuoc || 0,
                slNoiCom: ex.slNoiCom || 0,
                slNoiChien: ex.slNoiChien || 0,
                slQuatDien: ex.slQuatDien || 0,
            };
    });

    const sellersWithSales = fullSellerArray.filter(s => s.doanhThuThuc > 0);
    const totalSellersWithSales = sellersWithSales.length;

    return {
        fullSellerArray,
        exploitationData,
        byIndustry: finalIndustryStats,
        dailyTrend: finalDailyTrend,
        averages: {
            doanhThuThuc: sellersWithSales.reduce((sum, s) => sum + s.doanhThuThuc, 0) / (totalSellersWithSales || 1),
            doanhThuQD: sellersWithSales.reduce((sum, s) => sum + s.doanhThuQD, 0) / (totalSellersWithSales || 1),
            hieuQuaValue: sellersWithSales.reduce((sum, s) => sum + s.hieuQuaValue, 0) / (totalSellersWithSales || 1),
        },
        maxValues: {
            doanhThuThuc: Math.max(0, ...sellersWithSales.map(s => s.doanhThuThuc)),
            doanhThuQD: Math.max(0, ...sellersWithSales.map(s => s.doanhThuQD)),
        },
    };
}


export function processEmployeeData(
    salesData: DataRow[],
    periodData: DataRow[],
    productConfig: ProductConfig,
    departmentMap: DepartmentMap | null
): EmployeeData {

    const employeeStats: { [creator: string]: Partial<Employee> & { name: string, customerSet: Set<string>, totalOrders: number, doanhThuTraCham: number, slCE_ICT: number, slTraCham_CE_ICT: number, doanhThu_CE_ICT: number, doanhThuTraCham_CE_ICT: number } } = {};
    const exploitationStats: { [creator: string]: Partial<ExploitationData> & { name: string } } = {};
    const employeeIndustryStats: { [creator: string]: { [industry: string]: number } } = {};
    const employeeDailyTrend: { [creator: string]: { [date: string]: number } } = {};

    salesData.forEach(row => {
        const creator = getRowValue(row, COL.NGUOI_TAO);
        if (!creator) return;

        const price = Number(getRowValue(row, COL.PRICE)) || 0;
        const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
        const revenue = price; // Doanh thu là giá trị của cột Giá bán_1
        const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
        const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
        const productName = getRowValue(row, COL.PRODUCT);
        
        const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName);
        const revenueQD = revenue * heso;
        const customer = getRowValue(row, COL.CUSTOMER_NAME);
        const dateCreated: Date = row.parsedDate;
        const dateKey = dateCreated.toISOString().split('T')[0];

        // --- Initialize stats objects ---
        if (!employeeStats[creator]) employeeStats[creator] = { name: creator, doanhThuThuc: 0, doanhThuQD: 0, slTraCham: 0, doanhThuTraCham: 0, customerSet: new Set(), totalOrders: 0, slCE_ICT: 0, slTraCham_CE_ICT: 0, doanhThu_CE_ICT: 0, doanhThuTraCham_CE_ICT: 0 };
        if (!exploitationStats[creator]) exploitationStats[creator] = { name: creator, slICT: 0, doanhThuICT: 0, slCE_main: 0, doanhThuCE_main: 0, slGiaDung_main: 0, slBaoHiem: 0, doanhThuBaoHiem: 0, slSim: 0, doanhThuSim: 0, slDongHo: 0, doanhThuDongHo: 0, doanhThuPhuKien: 0, slPhuKien: 0, slCamera: 0, slLoa: 0, slPinSDP: 0, slTaiNgheBLT: 0, doanhThuGiaDung: 0, slGiaDung: 0, slMayLocNuoc: 0, slNoiCom: 0, slNoiChien: 0, slQuatDien: 0 };
        if (!employeeIndustryStats[creator]) employeeIndustryStats[creator] = {};
        if (!employeeDailyTrend[creator]) employeeDailyTrend[creator] = {};
        if (!employeeDailyTrend[creator][dateKey]) employeeDailyTrend[creator][dateKey] = 0;

        // Logic trọng số cho Vieon khi tính số lượng
        const subgroup = productConfig.childToSubgroupMap[maNhomHang];
        const isVieon = subgroup === 'Vieon' || (productName || '').toString().includes('VieON');
        const weightedQuantity = isVieon ? (quantity * heso) : quantity;

        // --- Aggregate general stats ---
        const emp = employeeStats[creator];
        emp.doanhThuThuc! += revenue;
        emp.doanhThuQD! += revenueQD;
        emp.totalOrders! += 1;
        if (customer) emp.customerSet.add(customer);
        if (getHinhThucThanhToan(row) === 'tra_gop') {
            emp.slTraCham! += weightedQuantity; // Cập nhật số lượng trọng số
            emp.doanhThuTraCham! += revenue;
        }
        
        const parentGroupForPerf = productConfig.childToParentMap[maNhomHang] || 'Không xác định';
        if (parentGroupForPerf === 'CE' || parentGroupForPerf === 'ICT') {
            emp.slCE_ICT! += weightedQuantity; // Cập nhật số lượng trọng số
            emp.doanhThu_CE_ICT! += revenue;
            if (getHinhThucThanhToan(row) === 'tra_gop') {
                emp.slTraCham_CE_ICT! += weightedQuantity; // Cập nhật số lượng trọng số
                emp.doanhThuTraCham_CE_ICT! += revenue;
            }
        }

        // --- Aggregate industry stats ---
        const displayGroup = getDisplayParentGroup(maNhomHang, productConfig);
        employeeIndustryStats[creator][displayGroup] = (employeeIndustryStats[creator][displayGroup] || 0) + revenue;
        employeeDailyTrend[creator][dateKey] += revenueQD;
        
        // --- Aggregate exploitation stats ---
        const stats = exploitationStats[creator];
        stats.doanhThuThuc = (stats.doanhThuThuc || 0) + revenue;
        stats.doanhThuQD = (stats.doanhThuQD || 0) + revenueQD;
        
        const parentGroup = productConfig.childToParentMap[maNhomHang] || 'Không xác định';
        const childGroup = productConfig.childToSubgroupMap[maNhomHang] || 'Không xác định';

        // SP Chính
        if (parentGroup === 'ICT') {
            stats.slICT! += weightedQuantity;
            stats.doanhThuICT! += revenue;
        } else if (parentGroup === 'CE') {
            stats.slCE_main! += weightedQuantity;
            stats.doanhThuCE_main! += revenue;
        } else if (parentGroup === 'Gia dụng') {
            stats.slGiaDung_main! += weightedQuantity; 
        }

        // Bán Kèm & Các nhóm khác
        if (parentGroup === 'Bảo hiểm') {
            stats.slBaoHiem! += weightedQuantity;
            stats.doanhThuBaoHiem! += revenue;
        } else if (parentGroup === 'Sim') {
            stats.slSim! += weightedQuantity;
            stats.doanhThuSim! += revenue;
        } else if (parentGroup === 'Đồng hồ' || parentGroup === 'Wearable') { 
            stats.slDongHo! += weightedQuantity;
            stats.doanhThuDongHo! += revenue;
        } else if (parentGroup === 'Phụ kiện') {
            stats.doanhThuPhuKien! += revenue;
            stats.slPhuKien! += weightedQuantity; 
            if (childGroup === 'Camera') stats.slCamera! += weightedQuantity;
            else if (childGroup === 'Loa') stats.slLoa! += weightedQuantity;
            else if (childGroup === 'Pin SDP') stats.slPinSDP! += weightedQuantity;
            else if (childGroup === 'Tai nghe BLT') stats.slTaiNgheBLT! += weightedQuantity;
        } else if (parentGroup === 'Gia dụng') {
            stats.doanhThuGiaDung! += revenue;
            stats.slGiaDung! += weightedQuantity; 
            if (childGroup === 'Máy lọc nước') stats.slMayLocNuoc! += weightedQuantity;
            else if (childGroup === 'NC đ.tử/cao tần' || childGroup === 'NC nắp gài/rời') stats.slNoiCom! += weightedQuantity;
            else if (childGroup === 'Nồi chiên') stats.slNoiChien! += weightedQuantity;
            else if (childGroup === 'Quạt điện') stats.slQuatDien! += weightedQuantity;
        }
    });

    // --- Merge employees from DepartmentMap (Shift File) who have NO SALES ---
    if (departmentMap) {
        // Create a set of IDs that already exist in the sales data (to avoid duplicates)
        // Sales data usually has format "ID - Name", so we extract ID
        const existingIds = new Set<string>();
        Object.keys(employeeStats).forEach(key => {
            const id = key.split(' - ')[0].trim();
            existingIds.add(id);
        });

        for (const [empId, rawVal] of Object.entries(departmentMap)) {
            // Trim ID just in case
            const cleanId = empId.trim();
            
            if (!existingIds.has(cleanId)) {
                // Handle the "Dept;;FullName" format to extract the proper name
                const parts = rawVal.split(';;');
                const dept = parts[0];
                // If FullName exists (from processShiftFile), use it. Otherwise fallback to ID.
                const fullName = parts.length > 1 ? parts[1] : cleanId;

                // This employee is in the shift file but has no sales data
                // We add them with 0 performance so they show up in the "Outstanding" table
                employeeStats[cleanId] = {
                    name: fullName,
                    department: dept,
                    doanhThuThuc: 0,
                    doanhThuQD: 0,
                    slTraCham: 0,
                    doanhThuTraCham: 0,
                    customerSet: new Set(),
                    totalOrders: 0,
                    slCE_ICT: 0,
                    slTraCham_CE_ICT: 0,
                    doanhThu_CE_ICT: 0,
                    doanhThuTraCham_CE_ICT: 0,
                    slThuHo: 0,
                };
                
                // Initialize empty exploitation stats for safety (though not strictly needed for Outstanding table)
                exploitationStats[cleanId] = {
                    name: fullName,
                    department: dept,
                    slICT: 0, doanhThuICT: 0, slCE_main: 0, doanhThuCE_main: 0, slGiaDung_main: 0,
                    slBaoHiem: 0, doanhThuBaoHiem: 0, slSim: 0, doanhThuSim: 0, slDongHo: 0, doanhThuDongHo: 0,
                    doanhThuPhuKien: 0, slPhuKien: 0, slCamera: 0, slLoa: 0, slPinSDP: 0, slTaiNgheBLT: 0,
                    doanhThuGiaDung: 0, slGiaDung: 0, slMayLocNuoc: 0, slNoiCom: 0, slNoiChien: 0, slQuatDien: 0
                };
                
                employeeIndustryStats[cleanId] = {};
                employeeDailyTrend[cleanId] = {};
            }
        }
    }

    const initialEmployeeData = _buildFullEmployeeData(employeeStats, exploitationStats, periodData, employeeIndustryStats, employeeDailyTrend, departmentMap);

    // --- Calculate Weakness Points ---
    const employeesByDept: { [key: string]: Employee[] } = {};
    initialEmployeeData.fullSellerArray.forEach(emp => {
        if (!employeesByDept[emp.department]) {
            employeesByDept[emp.department] = [];
        }
        employeesByDept[emp.department].push(emp);
    });

    const deptThresholds: { [key: string]: any } = {};
    for (const dept in employeesByDept) {
        const deptEmployees = employeesByDept[dept];
        const count = deptEmployees.length;
        if (count > 0) {
            deptThresholds[dept] = {
                dtqd_40p: [...deptEmployees].sort((a, b) => a.doanhThuQD - b.doanhThuQD)[Math.floor(count * 0.4)]?.doanhThuQD,
                slCE_ICT_30p: [...deptEmployees].sort((a, b) => a.slCE_ICT - b.slCE_ICT)[Math.floor(count * 0.3)]?.slCE_ICT,
                slTraCham_CE_ICT_30p: [...deptEmployees].sort((a, b) => a.slTraCham_CE_ICT - b.slTraCham_CE_ICT)[Math.floor(count * 0.3)]?.slTraCham_CE_ICT,
            };
        }
    }

    const finalFullSellerArray = initialEmployeeData.fullSellerArray.map(emp => {
        const thresholds = deptThresholds[emp.department];
        let weakPointsRevenue = 0;
        let weakPointsExploitation = 0;

        if (thresholds) {
            if (emp.doanhThuQD <= thresholds.dtqd_40p) weakPointsRevenue++;
            if (emp.hieuQuaValue < 35) weakPointsRevenue++;
            if (emp.dtTraChamPercent_CE_ICT < 45) weakPointsRevenue++;
            
            if (emp.slCE_ICT <= thresholds.slCE_ICT_30p) weakPointsExploitation++;
            if (emp.slTraCham_CE_ICT <= thresholds.slTraCham_CE_ICT_30p) weakPointsExploitation++;
            if (emp.traChamPercent_CE_ICT < 50) weakPointsExploitation++;
        }
        
        return { ...emp, weakPointsRevenue, weakPointsExploitation };
    });

    return { ...initialEmployeeData, fullSellerArray: finalFullSellerArray };
}
