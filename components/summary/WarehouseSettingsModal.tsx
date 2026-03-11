
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { WarehouseColumnConfig, WarehouseCategoryType, WarehouseMetricType } from '../../types';
import ModalWrapper from '../modals/ModalWrapper';
import { Icon } from '../common/Icon';
import SearchableSelect from '../common/SearchableSelect';
import { WAREHOUSE_METRIC_TYPE_MAP, DEFAULT_WAREHOUSE_COLUMNS } from '../../constants';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    columns: WarehouseColumnConfig[];
    onSave: (newColumns: WarehouseColumnConfig[]) => void;
    allIndustries: string[];
    allGroups: string[];
    allManufacturers: string[];
}

const WarehouseSettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, columns, onSave, allIndustries, allGroups, allManufacturers }) => {
    const [internalColumns, setInternalColumns] = useState<WarehouseColumnConfig[]>([]);
    const [view, setView] = useState<'picker' | 'form'>('picker');
    
    // Form state
    const [editingColumn, setEditingColumn] = useState<WarehouseColumnConfig | null>(null);
    const [mainHeader, setMainHeader] = useState('');
    const [subHeader, setSubHeader] = useState('');
    const [categoryType, setCategoryType] = useState<WarehouseCategoryType>('industry');
    const [categoryName, setCategoryName] = useState('');
    const [manufacturerName, setManufacturerName] = useState('');
    const [productCodesInput, setProductCodesInput] = useState<string>('');
    const [metricType, setMetricType] = useState<WarehouseMetricType>('quantity');
    
    const mainHeaderInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const sortedColumns = [...columns].sort((a, b) => a.order - b.order);
            setInternalColumns(sortedColumns);
            setView('picker');
            resetForm(false);
        }
    }, [isOpen, columns]);
    
    useEffect(() => {
        if (view === 'form' && editingColumn === null) {
            mainHeaderInputRef.current?.focus();
        }
    }, [view, editingColumn]);

    const groupedColumns = useMemo(() => {
        return internalColumns.reduce<Record<string, WarehouseColumnConfig[]>>((acc, col) => {
            const key = col.mainHeader || 'Khác';
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(col);
            return acc;
        }, {});
    }, [internalColumns]);

    const resetForm = (switchToPicker = true) => {
        setEditingColumn(null);
        setMainHeader(''); setSubHeader(''); setCategoryType('industry');
        setCategoryName(''); setManufacturerName(''); setMetricType('quantity');
        setProductCodesInput('');
        if (switchToPicker) {
            setView('picker');
        }
    };

    const handleEdit = (column: WarehouseColumnConfig) => {
        setEditingColumn(column);
        setMainHeader(column.mainHeader);
        setSubHeader(column.subHeader);
        setCategoryType(column.categoryType || 'industry');
        setCategoryName(column.categoryName || '');
        setManufacturerName(column.manufacturerName || '');
        setProductCodesInput(column.productCodes?.join(', ') || '');
        setMetricType(column.metricType || 'quantity');
        setView('form');
    };
    
    const handleSaveAndClose = () => {
        const reorderedColumns = internalColumns.map((c, i) => ({ ...c, order: i }));
        onSave(reorderedColumns);
        onClose();
    };

    const handleToggleVisibility = (id: string) => {
        setInternalColumns(prev => prev.map(c => c.id === id ? { ...c, isVisible: !c.isVisible } : c));
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa cột tùy chỉnh này?')) {
            setInternalColumns(prev => prev.filter(c => c.id !== id));
        }
    };
    
    const handleDeleteGroup = (groupName: string) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa nhóm "${groupName}" và tất cả các cột bên trong?`)) {
            setInternalColumns(prev => prev.filter(c => c.mainHeader !== groupName));
        }
    };

    const handleToggleGroupVisibility = (mainHeader: string, shouldBeVisible: boolean) => {
        setInternalColumns(prev => prev.map(c => c.mainHeader === mainHeader ? { ...c, isVisible: shouldBeVisible } : c));
    };
    
    const handleSaveColumn = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!mainHeader.trim() || !subHeader.trim()) {
            alert('Vui lòng điền đầy đủ Tiêu đề chính và Tiêu đề phụ.');
            return;
        }

        const productCodes = productCodesInput.split(/[\s,]+/).map(code => code.trim()).filter(Boolean);

        const newColumnData = {
            mainHeader: mainHeader.trim(), subHeader: subHeader.trim(), categoryType, 
            categoryName: categoryName || undefined, 
            manufacturerName: manufacturerName || undefined, 
            productCodes: productCodes.length > 0 ? productCodes : undefined,
            metricType 
        };

        if (editingColumn) {
            setInternalColumns(prev => prev.map(col => col.id === editingColumn.id ? { ...col, ...newColumnData } : col));
        } else {
            const newColumn: WarehouseColumnConfig = {
                id: `custom_${Date.now()}`,
                order: internalColumns.length, isVisible: true, isCustom: true,
                ...newColumnData
            };
            setInternalColumns(prev => [...prev, newColumn]);
        }
        resetForm();
    };
    
    const handleSelectAll = (select: boolean) => {
        setInternalColumns(prev => prev.map(c => ({...c, isVisible: select})));
    };

    const handleRestoreDefaults = () => {
        if (window.confirm('Thao tác này sẽ xóa tất cả các tùy chỉnh và khôi phục lại bố cục cột mặc định. Bạn có chắc chắn?')) {
            setInternalColumns([...DEFAULT_WAREHOUSE_COLUMNS]);
            resetForm();
        }
    };

    // Soft Apple-like Colors (Lighter backgrounds, cleaner text)
    const groupColorMap: Record<string, { bg: string, text: string, indicator: string }> = {
        'Doanh Thu': { bg: 'bg-blue-50/60 dark:bg-blue-900/10', text: 'text-blue-600 dark:text-blue-300', indicator: 'bg-blue-500' },
        'TRAFFIC & TỶ LỆ TC/DT': { bg: 'bg-cyan-50/60 dark:bg-cyan-900/10', text: 'text-cyan-600 dark:text-cyan-300', indicator: 'bg-cyan-500' },
        'S.PHẨM CHÍNH': { bg: 'bg-emerald-50/60 dark:bg-emerald-900/10', text: 'text-emerald-600 dark:text-emerald-300', indicator: 'bg-emerald-500' },
        'SL BÁN KÈM': { bg: 'bg-violet-50/60 dark:bg-violet-900/10', text: 'text-violet-600 dark:text-violet-300', indicator: 'bg-violet-500' },
        'DT THỰC NGÀNH HÀNG': { bg: 'bg-purple-50/60 dark:bg-purple-900/10', text: 'text-purple-600 dark:text-purple-300', indicator: 'bg-purple-500' },
        'Phụ Kiện': { bg: 'bg-amber-50/60 dark:bg-amber-900/10', text: 'text-amber-600 dark:text-amber-300', indicator: 'bg-amber-500' },
        'Gia Dụng': { bg: 'bg-orange-50/60 dark:bg-orange-900/10', text: 'text-orange-600 dark:text-orange-300', indicator: 'bg-orange-500' },
        'DEFAULT': { bg: 'bg-slate-50/60 dark:bg-slate-800/30', text: 'text-slate-600 dark:text-slate-300', indicator: 'bg-slate-500' },
    };

    const renderPickerView = () => (
        <>
            <div className="flex items-center justify-between gap-3 mb-6 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-20 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button onClick={() => handleSelectAll(true)} className="px-4 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all shadow-sm">Hiện tất cả</button>
                    <div className="w-px h-3 bg-slate-300 dark:bg-slate-600"></div>
                    <button onClick={() => handleSelectAll(false)} className="px-4 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all">Ẩn tất cả</button>
                </div>
                 <button onClick={() => { resetForm(false); setView('form'); }} className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold text-white bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 transition-all shadow-lg hover:shadow-xl active:scale-95">
                    <Icon name="plus" size={3.5} /> Thêm cột
                </button>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-4">
                 {Object.entries(groupedColumns).map(([mainHeader, cols]) => {
                    if (!Array.isArray(cols)) return null;
                    const visibleCount = cols.filter(c => c.isVisible).length;
                    const isCustomGroup = cols.every(c => c.isCustom);
                    const styles = groupColorMap[mainHeader] || groupColorMap.DEFAULT;

                    return (
                        <div key={mainHeader} className={`group relative flex flex-col h-full rounded-[1.75rem] ${styles.bg} transition-all duration-500 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/5`}>
                            <div className="px-5 py-4 flex justify-between items-center">
                                <div className="flex flex-col">
                                    {/* Typography: Light & Elegant */}
                                    <h4 className={`text-xs font-semibold uppercase tracking-wider ${styles.text} opacity-90`}>{mainHeader}</h4>
                                    <span className="text-[10px] font-medium text-slate-400 mt-0.5 tracking-wide">
                                        Hiển thị {visibleCount}/{cols.length}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                    <button onClick={() => handleToggleGroupVisibility(mainHeader, true)} title="Hiện nhóm" className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-emerald-500 rounded-full transition-colors"><Icon name="eye" size={3.5}/></button>
                                    <button onClick={() => handleToggleGroupVisibility(mainHeader, false)} title="Ẩn nhóm" className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><Icon name="eye-off" size={3.5}/></button>
                                    {isCustomGroup && (
                                        <button onClick={() => handleDeleteGroup(mainHeader)} title="Xóa nhóm" className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 rounded-full transition-colors"><Icon name="trash-2" size={3.5}/></button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="px-5 pb-5 pt-0 flex flex-wrap content-start gap-2 flex-grow">
                                {cols.map(col => (
                                    <div 
                                        key={col.id} 
                                        className={`relative group/item inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl text-[11px] font-medium transition-all cursor-pointer select-none border
                                            ${col.isVisible 
                                                ? 'bg-white dark:bg-slate-800 border-transparent text-slate-700 dark:text-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]' 
                                                : 'bg-white/40 dark:bg-slate-800/30 border-transparent text-slate-400 dark:text-slate-500'
                                            }`}
                                        onClick={() => handleToggleVisibility(col.id)}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${col.isVisible ? styles.indicator : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                        <span className="truncate max-w-[130px] tracking-tight">{col.subHeader}</span>
                                        
                                        {col.isCustom && (
                                            <div className="flex items-center ml-1 pl-1 border-l border-slate-100 dark:border-slate-700 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); handleEdit(col); }} className="p-0.5 hover:text-blue-500"><Icon name="edit-3" size={3} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(col.id); }} className="p-0.5 hover:text-red-500"><Icon name="x" size={3} /></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </>
    );
    
    const renderFormView = () => (
        <form onSubmit={handleSaveColumn} className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => resetForm()} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500">
                        <Icon name="arrow-left" size={5} />
                    </button>
                    <div>
                        <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100 tracking-tight">{editingColumn ? 'Chỉnh sửa cột' : 'Tạo cột mới'}</h3>
                        <p className="text-xs text-slate-400 font-medium">{editingColumn ? editingColumn.subHeader : 'Thiết lập thông số cho cột báo cáo'}</p>
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 space-y-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-slate-800">
                    
                    <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-1">
                            {/* Typography: Small, Uppercase, Widest tracking for labels */}
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Nhóm (Cha)</label>
                            {/* Inputs: iOS style, gray background, borderless until focus */}
                            <input ref={mainHeaderInputRef} value={mainHeader} onChange={e => setMainHeader(e.target.value)} placeholder="VD: Phụ Kiện" className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium text-slate-700 placeholder:text-slate-400 transition-all" required />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Cột (Con)</label>
                            <input value={subHeader} onChange={e => setSubHeader(e.target.value)} placeholder="VD: SL Camera" className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium text-slate-700 placeholder:text-slate-400 transition-all" required />
                        </div>

                        <div className="col-span-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Loại danh mục</label>
                            <div className="relative">
                                <select value={categoryType} onChange={e => { setCategoryType(e.target.value as WarehouseCategoryType); setCategoryName(''); }} className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium text-slate-700 appearance-none cursor-pointer">
                                    <option value="industry">Ngành hàng (Lớn)</option>
                                    <option value="group">Nhóm hàng (Nhỏ)</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><Icon name="chevron-down" size={4}/></div>
                            </div>
                        </div>
                        
                        <div className="col-span-1">
                             <SearchableSelect
                                label="Danh mục chính"
                                options={(categoryType === 'industry' ? allIndustries : allGroups)}
                                value={categoryName}
                                onChange={setCategoryName}
                                placeholder="Chọn danh mục"
                            />
                        </div>

                        <div className="col-span-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Chỉ số tính</label>
                            <div className="flex rounded-xl bg-slate-50 dark:bg-slate-900 p-1">
                                {Object.entries(WAREHOUSE_METRIC_TYPE_MAP).map(([key, label]) => (
                                    <button
                                        type="button"
                                        key={key}
                                        onClick={() => setMetricType(key as WarehouseMetricType)}
                                        className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-all ${metricType === key ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="col-span-1">
                            <SearchableSelect
                                label="Nhà sản xuất (Tùy chọn)"
                                options={allManufacturers}
                                value={manufacturerName}
                                onChange={setManufacturerName}
                                placeholder="Tất cả"
                            />
                        </div>

                        <div className="col-span-2 pt-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                Mã sản phẩm (Nâng cao) 
                            </label>
                            <textarea 
                                value={productCodesInput} 
                                onChange={e => setProductCodesInput(e.target.value)} 
                                placeholder="Nhập các mã nhóm hàng, cách nhau bằng dấu phẩy..." 
                                rows={3} 
                                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium text-slate-700 placeholder:text-slate-400 transition-all resize-none" 
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-6 mt-2 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button type="button" onClick={() => resetForm()} className="flex-1 h-12 rounded-xl font-semibold text-sm text-slate-500 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-all">
                    Hủy bỏ
                </button>
                <button type="submit" className="flex-1 h-12 rounded-xl font-semibold text-sm text-white bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                    <Icon name={editingColumn ? 'save' : 'plus'} size={4} />
                    {editingColumn ? 'Lưu thay đổi' : 'Tạo cột'}
                </button>
            </div>
        </form>
    );

    return (
        <ModalWrapper 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Cấu Hình Cột Báo Cáo" 
            subTitle="Tùy chỉnh hiển thị dữ liệu kho" 
            titleColorClass="text-slate-800 dark:text-white" 
            maxWidthClass="max-w-4xl"
        >
            <div className="p-6 flex flex-col h-[80vh] max-h-[750px] bg-[#FAFAFA]/50 dark:bg-slate-950/50 backdrop-blur-3xl">
                <div className="flex-grow overflow-y-auto custom-scrollbar px-1">
                   {view === 'picker' ? renderPickerView() : renderFormView()}
                </div>
                
                {view === 'picker' && (
                    <div className="pt-6 mt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <button onClick={handleRestoreDefaults} className="text-[11px] font-semibold text-slate-400 hover:text-amber-600 transition-colors flex items-center gap-1.5">
                            <Icon name="rotate-ccw" size={3.5} /> Khôi phục mặc định
                        </button>
                        <button onClick={handleSaveAndClose} className="px-8 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 shadow-xl transition-all hover:scale-105 active:scale-95">
                            Hoàn tất & Đóng
                        </button>
                    </div>
                )}
            </div>
        </ModalWrapper>
    );
};

export default WarehouseSettingsModal;
