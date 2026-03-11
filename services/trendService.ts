
import type { DataRow, TrendData, ProductConfig } from '../types';
import { COL } from '../constants';
import { getRowValue, getHeSoQuyDoi } from '../utils/dataUtils';

export function processTrendData(
    salesData: DataRow[],
    productConfig: ProductConfig | null
): TrendData {
    const daily: { [key: string]: { revenue: number, revenueQD: number, date: Date } } = {};
    const shifts: { [key: string]: { revenue: number, revenueQD: number } } = { "Ca 1": { revenue: 0, revenueQD: 0 }, "Ca 2": { revenue: 0, revenueQD: 0 }, "Ca 3": { revenue: 0, revenueQD: 0 }, "Ca 4": { revenue: 0, revenueQD: 0 }, "Ca 5": { revenue: 0, revenueQD: 0 }, "Ca 6": { revenue: 0, revenueQD: 0 } };

    salesData.forEach(row => {
        const price = Number(getRowValue(row, COL.PRICE)) || 0;
        const maNganhHang = getRowValue(row, COL.MA_NGANH_HANG);
        const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
        const productName = getRowValue(row, COL.PRODUCT);
        
        const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig, productName);
        const revenue = price; // Doanh thu là giá trị của cột Giá bán_1
        const revenueQD = revenue * heso;

        const dateCreated: Date = row.parsedDate;
        if (dateCreated && !isNaN(dateCreated.getTime())) {
             const dayKey = dateCreated.toISOString().split('T')[0];
            if (!daily[dayKey]) daily[dayKey] = { revenue: 0, revenueQD: 0, date: dateCreated };
            daily[dayKey].revenue += revenue;
            daily[dayKey].revenueQD += revenueQD;
            
            const hour = dateCreated.getHours();
            const minute = dateCreated.getMinutes();

            let ca: string | null = null;

            if (hour === 8) { // Ca 1: 8:00 - 8:59
                ca = "Ca 1";
            } else if (hour >= 9 && hour < 12) { // Ca 2: 9:00 - 11:59
                ca = "Ca 2";
            } else if (hour >= 12 && hour < 15) { // Ca 3: 12:00 - 14:59
                ca = "Ca 3";
            } else if (hour >= 15 && hour < 18) { // Ca 4: 15:00 - 17:59
                ca = "Ca 4";
            } else if (hour >= 18 && hour < 21) { // Ca 5: 18:00 - 20:59
                ca = "Ca 5";
            } else if (hour === 21 && minute < 30) { // Ca 6: 21:00 - 21:29
                ca = "Ca 6";
            }

            if (ca && shifts[ca]) {
                shifts[ca].revenue += revenue;
                shifts[ca].revenueQD += revenueQD;
            }
        }
    });

    return { daily, shifts };
}
