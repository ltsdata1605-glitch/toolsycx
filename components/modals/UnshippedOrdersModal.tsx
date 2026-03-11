import React, { useRef, useState, useMemo, useEffect } from 'react';
import type { DataRow } from '../../types';
import ModalWrapper from './ModalWrapper';
import { Icon } from '../common/Icon';
import { getRowValue, formatCurrency, getHeSoQuyDoi, formatQuantity } from '../../utils/dataUtils';
import { COL } from '../../constants';
import { useDashboardContext } from '../../contexts/DashboardContext';

interface UnshippedOrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (element: HTMLElement, filename: string, options?: any) => Promise<void>;
}

// Icons for each industry group
const industryIcons: { [key: string]: string } = {
    'Smartphone': 'smartphone', 'Laptop': 'laptop', 'Tablet': 'tablet',
    'Phụ kiện': 'headphones', 'Gia dụng': 'sofa', 'Wearable': 'watch',
    'CE': 'tv', 'Bảo hiểm': 'shield-check', 'Sim': 'smartphone-nfc',
    'Máy lọc nước': 'droplets', 'Vieon': 'film', 'IT': 'printer', 'Office & Virus': 'file-key-2',
    'Khác': 'package'
};

// Color palette for different industries
const industryColors: { [key: string]: string } = {
    'Smartphone': 'blue', 'Laptop': 'sky', 'Tablet': 'cyan',
    'Phụ kiện': 'violet', 'Gia dụng': 'orange', 'Wearable': 'rose',
    'CE': 'teal', 'Bảo hiểm': 'emerald', 'Sim': 'lime',
    'Máy lọc nước': 'indigo', 'Vieon': 'fuchsia', 'Khác': 'slate'
};

// Tailwind JIT compiler hints
// border-blue-500 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 bg-blue-500
// border-sky-500 bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 bg-sky-500
// border-cyan-500 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400 bg-cyan-500
// border-violet-500 bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 bg-violet-500
// border-orange-500 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 bg-orange-500
// border-rose-500 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 bg-rose-500
// border-teal-500 bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 bg-teal-500
// border-emerald-500 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500
// border-lime-500 bg-lime-100 dark:bg-lime-900/50 text-lime-600 dark:text-lime-400 bg-lime-500
// border-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 bg-indigo-500
// border-fuchsia-500 bg-fuchsia-100 dark:bg-fuchsia-900/50 text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500
// border-slate-500 bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 bg-slate-500


const UnshippedOrdersModal: React.FC<UnshippedOrdersModalProps> = ({ isOpen, onClose, onExport }) => {
    const { processedData, productConfig } = useDashboardContext();
    const salesData = processedData?.unshippedOrders ?? [];

    const modalBodyRef = React.useRef<HTMLDivElement>(null);
    const creatorRefs = useRef<{ [key: string]: HTMLDetailsElement | null }>({});
    const [isExporting, setIsExporting] = useState(false);
    const [isAllExpanded, setIsAllExpanded] = useState(false);
    const [exportScale, setExportScale] = useState(2);
    
    useEffect(() => {
        creatorRefs.current = {};
    }, [salesData]);

    const handleExportAll = async () => {
        const elementToExport = modalBodyRef.current?.closest('.modal-content') as HTMLElement | null;
        if (elementToExport) {
            setIsExporting(true);
            await onExport(elementToExport, `don-hang-cho-xuat-all.png`, { forceOpenDetails: true, scale: exportScale });
            setIsExporting(false);
        }
    };
    
    const handleBatchExport = async () => {
        if (!modalBodyRef.current) return;
        setIsExporting(true);
        for (const creator of creatorData) {
            const creatorElement = creatorRefs.current[creator.name];
            if (creatorElement) {
                const filename = `cho-xuat-${creator.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
                await onExport(creatorElement, filename, {
                    forceOpenDetails: true,
                    scale: exportScale,
                });
            }
        }
        setIsExporting(false);
    };

    const handleExportCreator = async (e: React.MouseEvent, creatorName: string) => {
        e.stopPropagation(); 
        const creatorElement = creatorRefs.current[creatorName];
        if (creatorElement) {
            setIsExporting(true);
            const filename = `cho-xuat-${creatorName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
            await onExport(creatorElement, filename, {
                forceOpenDetails: true,
                scale: exportScale,
            });
            setIsExporting(false);
        }
    };

    const toggleAllDetails = () => {
        const nextState = !isAllExpanded;
        if (modalBodyRef.current) {
            const allDetails = modalBodyRef.current.querySelectorAll('details');
            allDetails.forEach(detail => (detail.open = nextState));
        }
        setIsAllExpanded(nextState);
    };

    const { industryDataForDisplay, totalUnshippedRevenue, totalUnshippedRevenueQD, creatorData } = useMemo(() => {
        if (!productConfig) return { industryDataForDisplay: [], totalUnshippedRevenue: 0, totalUnshippedRevenueQD: 0, creatorData: [] };

        const finalUnshippedOrders = salesData.filter(row =>
            (Number(getRowValue(row, COL.PRICE)) || 0) > 0
        );
        
        let totalUnshippedRevenue = 0;
        let totalUnshippedRevenueQD = 0;
        finalUnshippedOrders.forEach(order => {
            const price = Number(getRowValue(order, COL.PRICE)) || 0;
            const rowRevenue = price; // Doanh thu là giá trị của cột Giá bán_1
            const maNganhHang = getRowValue(order, COL.MA_NGANH_HANG);
            const maNhomHang = getRowValue(order, COL.MA_NHOM_HANG);
            const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig);
            totalUnshippedRevenue += rowRevenue;
            totalUnshippedRevenueQD += rowRevenue * heso;
        });

        const industrySummary = finalUnshippedOrders.reduce((acc, order) => {
            const price = Number(getRowValue(order, COL.PRICE)) || 0;
            const quantity = Number(getRowValue(order, COL.QUANTITY)) || 0;
            const rowRevenue = price; // Doanh thu là giá trị của cột Giá bán_1
            const maNhomHang = getRowValue(order, COL.MA_NHOM_HANG);
            const parentGroup = productConfig.childToParentMap[maNhomHang] || 'Khác';
            if (!acc[parentGroup]) acc[parentGroup] = { revenue: 0, quantity: 0 };
            acc[parentGroup].revenue += rowRevenue;
            acc[parentGroup].quantity += quantity;
            return acc;
        }, {} as { [key: string]: { revenue: number; quantity: number } });
        
        const industryDataForDisplay = Object.entries(industrySummary)
            .map(([name, data]) => ({ name, ...(data as { revenue: number, quantity: number }) }))
            .sort((a, b) => b.revenue - a.revenue);
        
        const groupedByCreator = finalUnshippedOrders.reduce((acc, order) => {
            const creator = getRowValue(order, COL.NGUOI_TAO) || 'Không xác định';
            if (!acc[creator]) acc[creator] = [];
            acc[creator].push(order);
            return acc;
        }, {} as { [key: string]: DataRow[] });

        const creatorData = Object.entries(groupedByCreator).map(([creatorName, creatorOrders]: [string, DataRow[]]) => {
            let totalCreatorRevenue = 0;
            let totalCreatorRevenueQD = 0;
            creatorOrders.forEach(o => {
                const price = Number(getRowValue(o, COL.PRICE)) || 0;
                const rowRevenue = price; // Doanh thu là giá trị của cột Giá bán_1
                const maNganhHang = getRowValue(o, COL.MA_NGANH_HANG);
                const maNhomHang = getRowValue(o, COL.MA_NHOM_HANG);
                const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig);
                totalCreatorRevenue += rowRevenue;
                totalCreatorRevenueQD += rowRevenue * heso;
            });

            const hieuQuaQD = totalCreatorRevenue > 0 ? ((totalCreatorRevenueQD - totalCreatorRevenue) / totalCreatorRevenue) * 100 : 0;

            const groupedByCustomer = creatorOrders.reduce((acc, order) => {
                const customer = getRowValue(order, COL.CUSTOMER_NAME) || 'Khách lẻ';
                if (!acc[customer]) acc[customer] = [];
                acc[customer].push(order);
                return acc;
            }, {} as { [key: string]: DataRow[] });
            
            const customerData = Object.entries(groupedByCustomer).map(([customerName, customerOrders]: [string, DataRow[]]) => {
                let totalCustomerRevenue = 0;
                let totalCustomerRevenueQD = 0;
                customerOrders.forEach(o => {
                    const price = Number(getRowValue(o, COL.PRICE)) || 0;
                    const rowRevenue = price; // Doanh thu là giá trị của cột Giá bán_1
                    const maNganhHang = getRowValue(o, COL.MA_NGANH_HANG);
                    const maNhomHang = getRowValue(o, COL.MA_NHOM_HANG);
                    const heso = getHeSoQuyDoi(maNganhHang, maNhomHang, productConfig);
                    totalCustomerRevenue += rowRevenue;
                    totalCustomerRevenueQD += rowRevenue * heso;
                });

                const customerHieuQuaQD = totalCustomerRevenue > 0 ? ((totalCustomerRevenueQD - totalCustomerRevenue) / totalCustomerRevenue) * 100 : 0;
                const firstOrder = customerOrders[0];
                const scheduledDateRaw = getRowValue(firstOrder, ['TG Hẹn Giao']) || firstOrder.parsedDate;
                const scheduledDate = scheduledDateRaw instanceof Date ? scheduledDateRaw : new Date(scheduledDateRaw);
                const formattedScheduledDate = !isNaN(scheduledDate.getTime()) ? scheduledDate.toLocaleDateString('vi-VN', {day: 'numeric', month: 'numeric'}).replace(/\./g, '/') : 'N/A';
                
                return { name: customerName, orders: customerOrders, totalRevenue: totalCustomerRevenue, totalRevenueQD: totalCustomerRevenueQD, hieuQuaQD: customerHieuQuaQD, scheduledDate: formattedScheduledDate };
            });

            return { 
                name: creatorName, 
                customers: customerData.sort((a,b) => b.totalRevenue - a.totalRevenue), 
                totalRevenue: totalCreatorRevenue,
                totalRevenueQD: totalCreatorRevenueQD,
                hieuQuaQD: hieuQuaQD
            };
        }).sort((a,b) => b.totalRevenue - a.totalRevenue);

        return { industryDataForDisplay, totalUnshippedRevenue, totalUnshippedRevenueQD, creatorData };
    }, [salesData, productConfig]);

    const controls = (
        <div className="flex items-center gap-2 hide-on-export">
            <select
                value={exportScale}
                onChange={(e) => setExportScale(Number(e.target.value))}
                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm px-2 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Chọn chất lượng ảnh xuất"
            >
                <option value={1}>Tiêu chuẩn (1x)</option>
                <option value={2}>Chất lượng cao (2x)</option>
                <option value={3}>Ultra HD (3x)</option>
            </select>
            <button onClick={toggleAllDetails} title={isAllExpanded ? 'Thu gọn tất cả' : 'Hiển thị tất cả'} className="p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center w-10 h-10">
                <Icon name="chevrons-down-up" size={4} />
            </button>
             <button onClick={handleBatchExport} disabled={isExporting} title="Xuất ảnh hàng loạt theo từng nhân viên" className="p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center w-10 h-10">
                 <Icon name="switch-camera" size={4} />
            </button>
            <button onClick={handleExportAll} disabled={isExporting} title="Xuất ảnh toàn bộ danh sách" className="p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center w-10 h-10">
                 <Icon name="camera" />
            </button>
        </div>
    );
    
    return (
        <ModalWrapper 
            isOpen={isOpen} 
            onClose={onClose} 
            title={`DTQĐ Chờ Xuất: ${formatCurrency(totalUnshippedRevenueQD)}`}
            subTitle="Chi Tiết Đơn Hàng"
            titleColorClass="text-red-600 dark:text-red-400"
            controls={controls}
            maxWidthClass="max-w-7xl"
        >
            <div className="p-6 overflow-y-auto bg-slate-100 dark:bg-slate-950" ref={modalBodyRef}>
                {creatorData.length > 0 ? (
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
                            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4 text-center">TỶ TRỌNG NGÀNH HÀNG CHƯA XUẤT</h4>
                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {industryDataForDisplay.map(item => {
                                    const percentage = totalUnshippedRevenue > 0 ? (item.revenue / totalUnshippedRevenue * 100) : 0;
                                    const color = industryColors[item.name] || 'slate';
                                    const icon = industryIcons[item.name] || 'package';

                                    return (
                                        <div
                                            key={item.name}
                                            className={`bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-4 border-${color}-500 text-center transition-all duration-300 ease-in-out transform hover:shadow-lg hover:-translate-y-1`}
                                        >
                                           <div className={`mx-auto w-10 h-10 rounded-full bg-${color}-100 dark:bg-${color}-900/50 flex items-center justify-center text-${color}-600 dark:text-${color}-400 mb-2`}>
                                                <Icon name={icon} size={5} />
                                            </div>
                                            <p className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate" title={item.name}>{item.name}</p>
                                            <p className={`font-bold text-lg text-${color}-600 dark:text-${color}-400`}>{formatCurrency(item.revenue)}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{percentage.toFixed(1)}%</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="mt-6 space-y-3">
                            {creatorData.map(creator => (
                                <details key={creator.name} ref={el => { creatorRefs.current[creator.name] = el; }} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden transition-shadow shadow-sm hover:shadow-md">
                                    <summary className="p-4 cursor-pointer flex justify-between items-center list-none">
                                        <p className="font-bold text-lg text-slate-800 dark:text-slate-200">{creator.name}</p>
                                        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap justify-end text-sm font-semibold">
                                            <span className="text-slate-600 dark:text-slate-300">DT Thực: <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(creator.totalRevenue)}</span></span>
                                            <span className="text-slate-600 dark:text-slate-300">DTQĐ: <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(creator.totalRevenueQD)}</span></span>
                                            <span className="text-slate-600 dark:text-slate-300">HQQĐ: <span className={`font-bold ${creator.hieuQuaQD < 40 ? 'text-red-500' : 'text-green-500'}`}>{creator.hieuQuaQD.toFixed(0)}%</span></span>
                                            <button onClick={(e) => handleExportCreator(e, creator.name)} title={`Xuất ảnh của ${creator.name}`} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors hide-on-export ml-2">
                                                <Icon name="camera" size={4} />
                                            </button>
                                            <div className="accordion-icon text-slate-400 transition-transform duration-300 hide-on-export ml-2">
                                                <Icon name="chevron-down" />
                                            </div>
                                        </div>
                                    </summary>
                                    {creator.customers.map(customer => (
                                        <details key={customer.name} className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                                            <summary className="px-6 py-3 cursor-pointer flex justify-between items-center list-none">
                                                <p className="font-semibold text-slate-800 dark:text-slate-200">{customer.name.toUpperCase()}</p>
                                                <div className="flex items-center gap-x-3 gap-y-1 flex-wrap justify-end text-xs font-semibold">
                                                    <span className="text-slate-600 dark:text-slate-300">Hẹn giao: <span className="font-bold text-slate-800 dark:text-slate-100">{customer.scheduledDate}</span></span>
                                                    <span className="text-slate-600 dark:text-slate-300">DTQĐ: <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(customer.totalRevenueQD)}</span></span>
                                                    <span className="text-slate-600 dark:text-slate-300">HQQĐ: <span className={`font-bold ${customer.hieuQuaQD < 40 ? 'text-red-500' : 'text-green-500'}`}>{customer.hieuQuaQD.toFixed(0)}%</span></span>
                                                    <div className="accordion-icon text-slate-400 transition-transform duration-300 hide-on-export ml-2">
                                                        <Icon name="chevron-down" />
                                                    </div>
                                                </div>
                                            </summary>
                                            <div className="border-t border-slate-200 dark:border-slate-700">
                                                <table className="w-full text-sm table-auto compact-export-table">
                                                    <thead className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs">
                                                        <tr>
                                                            <th className="p-2 text-left font-semibold">Mã ĐH</th>
                                                            <th className="p-2 text-left font-semibold">Sản phẩm</th>
                                                            <th className="p-2 text-center font-semibold">SL</th>
                                                            <th className="p-2 text-right font-semibold whitespace-nowrap">Doanh Thu</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {customer.orders.map((order, index) => {
                                                            const price = Number(getRowValue(order, COL.PRICE)) || 0;
                                                            return (
                                                                <tr key={getRowValue(order, COL.ID) || index} className="border-t border-slate-100 dark:border-slate-700/50">
                                                                    <td className="p-2 text-left text-xs text-slate-500 dark:text-slate-400">{getRowValue(order, COL.ID)}</td>
                                                                    <td className="p-2 text-left text-slate-800 dark:text-slate-200 allow-wrap">{getRowValue(order, COL.PRODUCT)}</td>
                                                                    <td className="p-2 text-center text-slate-600 dark:text-slate-300">{formatQuantity(getRowValue(order, COL.QUANTITY) as number)}</td>
                                                                    <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">{formatCurrency(price)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </details>
                                    ))}
                                </details>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-slate-500 dark:text-slate-400 py-12">Không có đơn hàng nào đang chờ xuất trong khoảng thời gian đã chọn.</p>
                )}
            </div>
        </ModalWrapper>
    );
};

export default UnshippedOrdersModal;