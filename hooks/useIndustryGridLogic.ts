
import { useState, useMemo } from 'react';
import type { DataRow, ProductConfig, IndustryData } from '../types';
import { getRowValue } from '../utils/dataUtils';
import { COL } from '../constants';

export interface GridItem {
    name: string;
    revenue: number;
    quantity: number;
    icon: string;
    color: string;
}

// Icons for each industry group (parent groups)
const industryIcons: { [key: string]: string } = {
    'Smartphone': 'smartphone', 'Laptop': 'laptop', 'Tablet': 'tablet',
    'Phụ kiện': 'headphones', 'Gia dụng': 'sofa', 'Wearable': 'watch',
    'CE': 'tv', 'Bảo hiểm': 'shield-check', 'Sim': 'smartphone-nfc',
    'Máy lọc nước': 'droplets', 'Vieon': 'film', 'IT': 'printer', 'Office & Virus': 'file-key-2',
    'Khác': 'package'
};

// Icons for subgroups (nhóm con)
const subgroupIcons: { [key: string]: string } = {
    'Smartphone': 'smartphone',
    'Laptop': 'laptop',
    'Tablet': 'tablet',
    'Phụ kiện Laptop, PC': 'keyboard-mouse',
    'Phụ kiện Gaming': 'gamepad-2',
    'Thiết bị mạng': 'router',
    'Linh kiện PC, Laptop': 'cpu',
    'Loa': 'speaker',
    'Tai nghe': 'headphones',
    'Webcam': 'webcam',
    'Bàn phím': 'keyboard',
    'Chuột': 'mouse',
    'Apple': 'apple',
    'Sạc dự phòng': 'battery-charging',
    'Cáp sạc': 'cable',
    'Thẻ nhớ': 'sd-card',
    'Bếp điện': 'heater',
    'Tủ lạnh': 'fridge',
    'Máy giặt': 'washing-machine',
    'Máy lạnh': 'air-vent',
    'Nồi cơm điện': 'cooking-pot',
    'Máy xay sinh tố': 'blender',
    'Lò vi sóng': 'microwave',
    'Máy hút bụi': 'wind',
    'Quạt điều hòa': 'fan',
    'Đồng hồ thông minh': 'watch',
    'Vòng đeo tay thông minh': 'activity',
    'Đồng hồ định vị trẻ em': 'map-pin',
    'Tivi': 'tv',
    'Máy lọc nước': 'droplets',
    'Phụ kiện Apple': 'apple',
    'Bao da, ốp lưng': 'smartphone',
    'Miếng dán màn hình': 'tablet-smartphone',
    'Túi chống sốc': 'briefcase',
    'Balo': 'backpack'
};

// Color palette for different industries
const industryColors: { [key: string]: string } = {
    'Smartphone': 'blue', 'Laptop': 'sky', 'Tablet': 'cyan',
    'Phụ kiện': 'violet', 'Gia dụng': 'orange', 'Wearable': 'rose',
    'CE': 'teal', 'Bảo hiểm': 'emerald', 'Sim': 'lime',
    'Máy lọc nước': 'indigo', 'Vieon': 'fuchsia', 'Khác': 'slate'
};

// List of unimportant groups to hide from the main view
const hiddenGroups = new Set(['IT', 'DCNB', 'Software', 'Thẻ cào', 'Phụ kiện lắp đặt', 'Office & Virus', 'Khác', 'ICT', 'Vieon']);
const specialGroups = new Set(['Smartphone', 'Laptop', 'Tablet', 'Máy lọc nước']);

interface UseIndustryGridLogicProps {
    industryData: IndustryData[];
    filteredValidSalesData: DataRow[];
    productConfig: ProductConfig | null;
}

export const useIndustryGridLogic = ({ industryData, filteredValidSalesData, productConfig }: UseIndustryGridLogicProps) => {
    const [drilldownPath, setDrilldownPath] = useState<string[]>([]);
    
    // State for chart tab logic (moved here for consistency if needed, but primarily for Grid view now)
    const [selectedChartSubgroups, setSelectedChartSubgroups] = useState<string[]>([]);

    const currentView = useMemo(() => {
        if (!productConfig) return { data: [], totalRevenue: 0, levelType: 'end' };

        const level = drilldownPath.length;

        // Level 0: Top-level Industries
        if (level === 0) {
            const displayData = industryData.filter(item => !hiddenGroups.has(item.name));
            const topData = displayData.slice(0, 12);
            const totalRevenue = topData.reduce((sum, item) => sum + item.revenue, 0);
            const finalData: GridItem[] = topData.map(item => ({
                ...item,
                icon: industryIcons[item.name] || 'package',
                color: industryColors[item.name] || 'slate'
            }));
            return { data: finalData, totalRevenue, levelType: 'industry' };
        }

        const parentGroup = drilldownPath[0];
        const parentIcon = industryIcons[parentGroup] || 'package';
        const parentColor = industryColors[parentGroup] || 'slate';
        
        // Filter data relevant to the selected top-level industry
        const dataForParent = filteredValidSalesData.filter(row => {
            const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);
            const pGroup = productConfig.childToParentMap[maNhomHang] || 'Khác';
            const cGroup = productConfig.childToSubgroupMap[maNhomHang];

            let displayParentGroup = pGroup;
            if (pGroup === 'ICT' && ['Smartphone', 'Laptop', 'Tablet'].includes(cGroup)) {
                displayParentGroup = cGroup;
            } else if (pGroup === 'Gia dụng' && cGroup === 'Máy lọc nước') {
                displayParentGroup = 'Máy lọc nước';
            }
            return displayParentGroup === parentGroup;
        });
        
        const totalRevenueForPath = dataForParent.reduce((sum, row) => sum + (Number(getRowValue(row, COL.PRICE)) || 0), 0);
        
        // Level 1: Subgroups or Special Choices
        if (level === 1) {
            if (specialGroups.has(parentGroup)) {
                const totalQuantity = dataForParent.reduce((sum, row) => sum + (Number(getRowValue(row, COL.QUANTITY)) || 0), 0);
                const choiceData: GridItem[] = [
                    { name: 'Hãng sản xuất', revenue: totalRevenueForPath, quantity: totalQuantity, icon: 'factory', color: parentColor },
                    { name: 'Người tạo', revenue: totalRevenueForPath, quantity: totalQuantity, icon: 'user-cog', color: parentColor }
                ];
                return { data: choiceData, totalRevenue: totalRevenueForPath, levelType: 'choice' };
            } else {
                const groupedData = dataForParent.reduce((acc, row) => {
                    const subgroup = productConfig.childToSubgroupMap[getRowValue(row, COL.MA_NHOM_HANG)] || 'Khác';
                    if (!acc[subgroup]) acc[subgroup] = { revenue: 0, quantity: 0 };
                    acc[subgroup].revenue += Number(getRowValue(row, COL.PRICE)) || 0;
                    acc[subgroup].quantity += Number(getRowValue(row, COL.QUANTITY)) || 0;
                    return acc;
                }, {} as { [key: string]: { revenue: number; quantity: number } });

                const formattedData: GridItem[] = Object.entries(groupedData).map(([name, values]) => ({
                    name, 
                    revenue: values.revenue,
                    quantity: values.quantity, 
                    icon: subgroupIcons[name] || 'package',
                    color: parentColor
                }));
                formattedData.sort((a,b) => b.revenue - a.revenue);
                return { data: formattedData, totalRevenue: totalRevenueForPath, levelType: 'subgroup' };
            }
        }

        // Level 2: Manufacturer or Creator Breakdown
        if (level === 2) {
            const childItem = drilldownPath[1];
            let dataToProcess = dataForParent;
            let groupByFn: (row: DataRow) => string;

            if (specialGroups.has(parentGroup)) {
                groupByFn = (row: DataRow) => (childItem === 'Hãng sản xuất' 
                    ? getRowValue(row, COL.MANUFACTURER) 
                    : getRowValue(row, COL.NGUOI_TAO)) || 'Không rõ';
            } else {
                dataToProcess = dataToProcess.filter(row => (productConfig.childToSubgroupMap[getRowValue(row, COL.MA_NHOM_HANG)] || 'Khác') === childItem);
                groupByFn = (row: DataRow) => getRowValue(row, COL.MANUFACTURER) || 'Không rõ';
            }

            const groupedData = dataToProcess.reduce((acc, row) => {
                const key = groupByFn(row);
                if (!acc[key]) acc[key] = { revenue: 0, quantity: 0 };
                acc[key].revenue += Number(getRowValue(row, COL.PRICE)) || 0;
                acc[key].quantity += Number(getRowValue(row, COL.QUANTITY)) || 0;
                return acc;
            }, {} as { [key: string]: { revenue: number; quantity: number } });
            
            const inheritedIcon = specialGroups.has(parentGroup) 
                ? parentIcon 
                : (subgroupIcons[childItem] || 'package');
            
            const formattedData: GridItem[] = Object.entries(groupedData).map(([name, values]) => ({
                name, 
                revenue: values.revenue,
                quantity: values.quantity, 
                icon: inheritedIcon, 
                color: parentColor
            }));
            formattedData.sort((a,b) => b.revenue - a.revenue);
            const totalRevenueForSubpath = formattedData.reduce((sum, item) => sum + item.revenue, 0);
            return { data: formattedData, totalRevenue: totalRevenueForSubpath, levelType: 'breakdown' };
        }

        return { data: [], totalRevenue: 0, levelType: 'end' };
    }, [drilldownPath, industryData, filteredValidSalesData, productConfig]);

    // Data preparation for charts
    const allSubgroups = useMemo(() => {
        if (!productConfig) return [];
        const subgroups = new Set<string>();
        Object.values(productConfig.subgroups).forEach(parent => {
            Object.keys(parent).forEach(subgroup => subgroups.add(subgroup));
        });
        return Array.from(subgroups).sort();
    }, [productConfig]);

    const manufacturerDataForChart = useMemo(() => {
        if (!productConfig) return [];
        const dataToFilter = selectedChartSubgroups.length > 0
            ? filteredValidSalesData.filter(row => {
                const subgroup = productConfig.childToSubgroupMap[getRowValue(row, COL.MA_NHOM_HANG)];
                return subgroup && selectedChartSubgroups.includes(subgroup);
            })
            : filteredValidSalesData;

        const dataByManufacturer = dataToFilter.reduce((acc, row) => {
            const manufacturer = getRowValue(row, COL.MANUFACTURER) || 'Không rõ';
            const revenue = Number(getRowValue(row, COL.PRICE)) || 0;
            const quantity = Number(getRowValue(row, COL.QUANTITY)) || 0;
            if (!acc[manufacturer]) acc[manufacturer] = { revenue: 0, quantity: 0 };
            acc[manufacturer].revenue += revenue;
            acc[manufacturer].quantity += quantity;
            return acc;
        }, {} as { [key: string]: { revenue: number, quantity: number } });
        
        return Object.entries(dataByManufacturer)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a,b) => b.revenue - a.revenue);
    }, [filteredValidSalesData, selectedChartSubgroups, productConfig]);

    const getTitle = (activeTab: 'card' | 'chart') => {
        if (activeTab === 'chart') return "BIỂU ĐỒ TỶ TRỌNG";
        const level = drilldownPath.length;
        if (level === 0) return "Tỷ Trọng Ngành Hàng";
        
        const [parent, child] = drilldownPath;
        if (level === 1) return `CHI TIẾT: ${parent}`;

        if (level === 2) {
            if (specialGroups.has(parent)) {
                return `${child.toUpperCase()} TRONG ${parent}`;
            }
            return `HÃNG SẢN XUẤT TRONG ${child}`;
        }
        return "";
    };

    return {
        drilldownPath,
        setDrilldownPath,
        currentView,
        allSubgroups,
        selectedChartSubgroups,
        setSelectedChartSubgroups,
        manufacturerDataForChart,
        getTitle,
        specialGroups
    };
};
