import React from 'react';
import type { DataRow, ProductConfig } from '../../types';
import ModalWrapper from './ModalWrapper';
import { Icon } from '../common/Icon';

interface IndustryDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupName: string;
    validSalesData: DataRow[];
    productConfig: ProductConfig;
    onExport: (element: HTMLElement, filename: string, options?: any) => Promise<void>;
}

const IndustryDetailModal: React.FC<IndustryDetailModalProps> = ({ isOpen, onClose, groupName, ...props }) => {
    const modalBodyRef = React.useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = React.useState(false);
    const [exportScale, setExportScale] = React.useState(2);

    const handleExport = async () => {
        if (modalBodyRef.current) {
            setIsExporting(true);
            await props.onExport(modalBodyRef.current, `chi-tiet-nganh-${groupName}.png`, { forceOpenDetails: true, scale: exportScale });
            setIsExporting(false);
        }
    };
    
    const controls = (
        <div className="flex items-center gap-2">
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
            <button onClick={handleExport} disabled={isExporting} title="Xuất Ảnh Chi Tiết" className="p-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 transition-colors flex items-center justify-center w-[42px] h-[42px]">
                {isExporting ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="download" />}
            </button>
        </div>
    );

    return (
        <ModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={groupName}
            subTitle="Phân Tích Ngành Hàng"
            titleColorClass="text-indigo-600 dark:text-indigo-400"
            controls={controls}
        >
            <div ref={modalBodyRef} className="p-6 overflow-y-auto">
                <p>Chi tiết ngành hàng {groupName} sẽ được hiển thị ở đây.</p>
            </div>
        </ModalWrapper>
    );
};

export default IndustryDetailModal;