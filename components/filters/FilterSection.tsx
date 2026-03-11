
import React from 'react';
import type { VisibilityState } from '../../types';
import { toLocalISOString } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { useDashboardContext } from '../../contexts/DashboardContext';
import DropdownFilter from '../common/DropdownFilter';

const ModernSwitch: React.FC<{ label: string; icon: string; isActive: boolean; onToggle: () => void; color: string; debugId?: string; debugInfo?: string; }> = ({ label, icon, isActive, onToggle, color, debugId, debugInfo }) => {
    const bgColor = `bg-${color}-50 dark:bg-${color}-900/20`;
    const hoverBgColor = `hover:bg-${color}-100/60 dark:hover:bg-${color}-800/40`;
    const borderColor = `border-2 border-${color}-300 dark:border-${color}-600`;
    const activeIconColor = `text-${color}-600 dark:text-${color}-400`;
    const activeTextColor = `text-${color}-700 dark:text-${color}-300`;
    const activeSwitchBg = `bg-${color}-600`;

    return (
        <label
            htmlFor={`switch-${label}`}
            title={`Hiển thị/Ẩn ${label}`}
            className={`flex items-center cursor-pointer justify-between w-full p-3 rounded-xl ${bgColor} ${hoverBgColor} ${borderColor} transition-colors ${isActive ? `border-l-${color}-500` : ''}`}
            data-debug-id={debugId}
            data-debug-info={debugInfo}
        >
            <div className="flex items-center gap-3">
                <Icon name={icon} size={5} className={`transition-colors ${isActive ? activeIconColor : 'text-slate-500 dark:text-slate-400'}`}/>
                <span className={`font-bold text-sm transition-colors ${isActive ? activeTextColor : 'text-slate-600 dark:text-slate-400'}`}>{label}</span>
            </div>
            <div className="relative">
                <input id={`switch-${label}`} type="checkbox" className="sr-only" checked={isActive} onChange={onToggle} />
                <div className={`block w-12 h-6 rounded-full transition-colors border ${isActive ? `${activeSwitchBg} border-${color}-600` : 'bg-slate-300 dark:bg-slate-600 border-slate-400 dark:border-slate-500'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${isActive ? 'translate-x-6' : ''}`}></div>
            </div>
        </label>
    );
};


interface FilterSectionProps {
    options: { kho: string[]; trangThai: string[]; nguoiTao: string[]; department: string[] };
    visibility: VisibilityState;
    onVisibilityChange: (component: keyof VisibilityState, isVisible: boolean) => void;
    onClose: () => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({ options, visibility, onVisibilityChange, onClose }) => {
    const { filterState: filters, handleFilterChange: onFilterChange, originalData: allData } = useDashboardContext();
    
    const debugInfo = {
        kho: { name: "Bộ lọc Kho", description: "Lọc toàn bộ dữ liệu theo mã kho được chọn.", design: "Segmented control." },
        xuat: { name: "Bộ lọc Trạng thái Xuất", description: "Lọc dữ liệu dựa trên trạng thái xuất hàng của đơn.", design: "Segmented control." },
        department: { name: "Bộ lọc Bộ phận", description: "Lọc nhân viên theo bộ phận.", design: "Multi-select dropdown." },
        nguoiTao: { name: "Bộ lọc Người Tạo", description: "Lọc dữ liệu theo người tạo đơn hàng.", design: "Multi-select dropdown." },
        trangThai: { name: "Bộ lọc Trạng thái SP", description: "Lọc dữ liệu theo trạng thái hồ sơ.", design: "Multi-select dropdown." },
        dateRange: { name: "Bộ lọc nhanh", description: "Cung cấp các nút chọn nhanh khoảng thời gian.", design: "Pill buttons." },
        dateInputs: { name: "Bộ lọc Tùy chỉnh Ngày", description: "Chọn khoảng thời gian bất kỳ.", design: "Date inputs." },
        visibility: { name: "Công tắc Hiển thị", description: "Bật/tắt các thành phần chính.", design: "Modern switches." }
    };

    const handleResetFilters = () => {
         const allTrangThai = [...new Set(allData.map(r => r['Trạng thái hồ sơ']).filter(Boolean))]; 
         const allNguoiTao = [...new Set(allData.map(r => r['Người tạo']).filter(Boolean))];
        onFilterChange({
            kho: 'all',
            xuat: 'all',
            trangThai: allTrangThai,
            nguoiTao: allNguoiTao,
            department: options.department || [],
            startDate: '',
            endDate: '',
            dateRange: 'all',
        });
    };

    const handleDateRangeClick = (range: string) => {
        let start: Date | null = null, end: Date | null = null;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (range) {
            case 'today': start = today; end = today; break;
            case 'yesterday': start = new Date(today); start.setDate(today.getDate() - 1); end = start; break;
            case 'week': {
                start = new Date(today);
                const day = start.getDay();
                start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                break;
            }
            case 'month':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'all': start = null; end = null; break;
        }
        onFilterChange({
            startDate: start ? toLocalISOString(start) : '',
            endDate: end ? toLocalISOString(end) : '',
            dateRange: range
        });
    };

    const handleDateChange = (type: 'startDate' | 'endDate', value: string) => {
        onFilterChange({ [type]: value, dateRange: '' });
    };
    
    const handleDropdownChange = (type: string, selected: string[]) => {
        onFilterChange({ [type as keyof typeof filters]: selected });
    }

    const visibilityOptions = [
        { key: 'trendChart', label: 'Xu hướng doanh thu', icon: 'area-chart', color: 'violet' },
        { key: 'industryGrid', label: 'Tỷ trọng ngành hàng', icon: 'layout-grid', color: 'emerald' },
        { key: 'employeeAnalysis', label: 'Phân tích nhân viên', icon: 'users-round', color: 'rose' },
        { key: 'summaryTable', label: 'Chi tiết ngành hàng', icon: 'table', color: 'amber' },
    ];

    return (
        <>
            {/* Slide Menu Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 rounded-xl">
                        <Icon name="filter" size={5} />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Bộ Lọc Phân Tích</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleResetFilters}
                        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title="Đặt lại bộ lọc"
                    >
                        <Icon name="rotate-ccw" size={5} />
                    </button>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                    >
                        <Icon name="x" size={6} />
                    </button>
                </div>
            </div>

            {/* Slide Menu Body */}
            <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Basic Segments */}
                <div className="space-y-6">
                    <div data-debug-id="Filter.Kho" data-debug-info={JSON.stringify(debugInfo.kho)} className="space-y-2">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Kho Tạo</label>
                        <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <button onClick={() => onFilterChange({ kho: 'all' })} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${filters.kho === 'all' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>All</button>
                            {options.kho.map(kho => (
                                <button key={kho} onClick={() => onFilterChange({ kho })} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${filters.kho === kho ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>{kho}</button>
                            ))}
                        </div>
                    </div>

                    <div data-debug-id="Filter.Xuat" data-debug-info={JSON.stringify(debugInfo.xuat)} className="space-y-2">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Trạng Thái Xuất</label>
                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            {['all', 'Đã', 'Chưa'].map(val => (
                                <button key={val} onClick={() => onFilterChange({ xuat: val })} className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all ${filters.xuat === val ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>{val === 'all' ? 'Tất cả' : val + ' xuất'}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Dropdowns */}
                <div className="space-y-4">
                    {options.department.length > 0 && (
                        <DropdownFilter 
                            type="department" 
                            label="Bộ phận" 
                            options={options.department} 
                            selected={filters.department} 
                            onChange={handleDropdownChange} 
                        />
                    )}
                    <DropdownFilter type="nguoiTao" label="Người Tạo" options={options.nguoiTao} selected={filters.nguoiTao} onChange={handleDropdownChange} />
                    <DropdownFilter type="trangThai" label="Trạng thái hồ sơ" options={options.trangThai} selected={filters.trangThai} onChange={handleDropdownChange} />
                </div>

                {/* Date Selection */}
                <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-6">
                    <div data-debug-id="Filter.DateRange" data-debug-info={JSON.stringify(debugInfo.dateRange)} className="space-y-2">
                        <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Khoảng Thời Gian Nhanh</label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { range: 'today', label: 'Hôm nay' }, { range: 'yesterday', label: 'Hôm qua' },
                                { range: 'week', label: 'Tuần này' }, { range: 'month', label: 'Tháng này' },
                                { range: 'all', label: 'Tất cả' }
                            ].map(({ range, label }) => (
                                <button key={range} onClick={() => handleDateRangeClick(range)} className={`py-1.5 px-3 text-xs font-bold rounded-full transition-all border ${filters.dateRange === range ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-indigo-400'}`}>{label}</button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4" data-debug-id="Filter.DateInputs" data-debug-info={JSON.stringify(debugInfo.dateInputs)}>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Từ ngày</label>
                            <input type="date" value={filters.startDate} onChange={e => handleDateChange('startDate', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold p-2 focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Đến ngày</label>
                            <input type="date" value={filters.endDate} onChange={e => handleDateChange('endDate', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold p-2 focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </div>
                </div>

                {/* Section Visibility */}
                <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-6">
                    <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Hiển Thị Các Khu Vực</label>
                    <div className="grid grid-cols-1 gap-3">
                        {visibilityOptions.map(opt => (
                            <ModernSwitch
                                key={opt.key}
                                label={opt.label}
                                icon={opt.icon}
                                isActive={visibility[opt.key as keyof VisibilityState]}
                                onToggle={() => onVisibilityChange(opt.key as keyof VisibilityState, !visibility[opt.key as keyof VisibilityState])}
                                color={opt.color}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Slide Menu Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                <button 
                    onClick={onClose}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 transition-all uppercase tracking-widest text-sm"
                >
                    Áp dụng & Đóng
                </button>
            </div>
        </>
    );
};

export default FilterSection;
