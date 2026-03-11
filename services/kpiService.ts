
import type { DataRow, KpiData, ProductConfig } from '../types';
import { COL, HINH_THUC_XUAT_THU_HO } from '../constants';
import { getRowValue, getHeSoQuyDoi, getHinhThucThanhToan } from '../utils/dataUtils';

/**
 * Calculates key performance indicators from various data sources.
 */
export function processKpis(
    validSalesData: DataRow[],
    unshippedOrders: DataRow[],
    allPeriodData: DataRow[],
    productConfig: ProductConfig | null
): KpiData {
    let doanhThuQD = 0;
    let totalRevenue = 0;
    let traGopValue = 0;
    let traGopCount = 0;

    validSalesData.forEach(row => {
        const price = Number(getRowValue(row, COL.PRICE)) || 0;
        const rowRevenue = price; // Doanh thu là giá trị của cột Giá bán_1
        const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
        const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
        const productName = getRowValue(row, COL.PRODUCT);
        
        const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName);

        totalRevenue += rowRevenue;
        doanhThuQD += rowRevenue * heso;

        if (getHinhThucThanhToan(row) === 'tra_gop') {
            traGopValue += rowRevenue;
            traGopCount++;
        }
    });

    const { doanhThuThucChoXuat, doanhThuQDChoXuat } = unshippedOrders.reduce((acc, row) => {
        const price = Number(getRowValue(row, COL.PRICE)) || 0;
        const rowRevenue = price; // Doanh thu là giá trị của cột Giá bán_1
        const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
        const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
        const productName = getRowValue(row, COL.PRODUCT);
        
        const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName);
        acc.doanhThuThucChoXuat += rowRevenue;
        acc.doanhThuQDChoXuat += rowRevenue * heso;
        return acc;
    }, { doanhThuThucChoXuat: 0, doanhThuQDChoXuat: 0 });

    const soLuongThuHo = allPeriodData.filter(row => HINH_THUC_XUAT_THU_HO.has(getRowValue(row, COL.HINH_THUC_XUAT))).length;

    return {
        doanhThuQD,
        totalRevenue,
        soLuongThuHo,
        hieuQuaQD: totalRevenue > 0 ? (doanhThuQD - totalRevenue) / totalRevenue : 0,
        traGopPercent: totalRevenue > 0 ? (traGopValue / totalRevenue) * 100 : 0,
        traGopValue,
        traGopCount,
        doanhThuThucChoXuat,
        doanhThuQDChoXuat,
    };
}
