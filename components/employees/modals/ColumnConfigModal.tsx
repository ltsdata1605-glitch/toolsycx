
import React, { useState, useEffect, useRef } from 'react';
import ModalWrapper from '../../modals/ModalWrapper';
import { Icon } from '../../common/Icon';
import MultiSelectDropdown from '../../common/MultiSelectDropdown';
import type { ColumnConfig } from '../../../types';

interface ColumnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: ColumnConfig) => void;
    allIndustries: string[];
    allSubgroups: string[];
    allManufacturers: string[];
    existingColumns: ColumnConfig[];
    editingColumn?: ColumnConfig | null;
}

const ColumnConfigModal: React.FC<ColumnModalProps> = ({ isOpen, onClose, onSave, allIndustries, allSubgroups, allManufacturers, existingColumns, editingColumn }) => {
    const [mainHeader, setMainHeader] = useState('');
    const [columnName, setColumnName] = useState('');
    const [columnType, setColumnType] = useState<'data' | 'calculated'>('data');
    
    // Data column state
    const [metricType, setMetricType] = useState<'quantity' | 'revenue' | 'revenueQD'>('quantity');
    const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
    const [selectedSubgroups, setSelectedSubgroups] = useState<string[]>([]);
    const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);
    const [productCodes, setProductCodes] = useState('');
    const [priceType, setPriceType] = useState<'original' | 'discounted'>('discounted');
    const [priceCondition, setPriceCondition] = useState<'greater' | 'less' | 'equal' | 'between' | 'none'>('none');
    const [priceValue1, setPriceValue1] = useState('');
    const [priceValue2, setPriceValue2] = useState('');

    // Calculated column state
    const [operation, setOperation] = useState<'+' | '-' | '/' | '*'>('+');
    const [operand1, setOperand1] = useState('');
    const [operand2, setOperand2] = useState('');
    const [displayAs, setDisplayAs] = useState<'number' | 'percentage'>('number');

    const [formattingRules, setFormattingRules] = useState<{ id: number; condition: string; value1: string; value2: string; color: string; }[]>([]);
    
    const [feedback, setFeedback] = useState<{type: 'error' | 'success', message: string} | null>(null);
    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const resetForm = () => {
        setMainHeader('');
        setColumnName('');
        setColumnType('data');
        setMetricType('quantity');
        setSelectedIndustries([]);
        setSelectedSubgroups([]);
        setSelectedManufacturers([]);
        setProductCodes('');
        setPriceType('discounted');
        setPriceCondition('none');
        setPriceValue1('');
        setPriceValue2('');
        setOperation('+');
        setOperand1('');
        setOperand2('');
        setDisplayAs('number');
        setFormattingRules([]);
    };
    
    useEffect(() => {
        if (isOpen) {
            if (editingColumn) {
                setMainHeader(editingColumn.mainHeader || '');
                setColumnName(editingColumn.columnName);
                setColumnType(editingColumn.type);
                 if (editingColumn.conditionalFormatting) {
                    setFormattingRules(editingColumn.conditionalFormatting.map((rule, index) => ({
                        id: index,
                        condition: rule.condition,
                        value1: String(rule.value1),
                        value2: String(rule.value2 || ''),
                        color: rule.color
                    })));
                } else {
                    setFormattingRules([]);
                }
                if (editingColumn.type === 'data') {
                    setMetricType(editingColumn.metricType || 'quantity');
                    setSelectedIndustries(editingColumn.filters?.selectedIndustries || []);
                    setSelectedSubgroups(editingColumn.filters?.selectedSubgroups || []);
                    setSelectedManufacturers(editingColumn.filters?.selectedManufacturers || []);
                    setProductCodes(editingColumn.filters?.productCodes?.join(', ') || '');
                    setPriceType(editingColumn.filters?.priceType || 'discounted');
                    setPriceCondition(editingColumn.filters?.priceCondition || 'none');
                    setPriceValue1(editingColumn.filters?.priceValue1?.toString() || '');
                    setPriceValue2(editingColumn.filters?.priceValue2?.toString() || '');
                } else {
                    setOperation(editingColumn.operation || '+');
                    setOperand1(editingColumn.operand1_columnId || '');
                    setOperand2(editingColumn.operand2_columnId || '');
                    setDisplayAs(editingColumn.displayAs || 'number');
                }
            } else {
                resetForm();
            }
            setFeedback(null);
        }
    }, [isOpen, editingColumn]);

    const showFeedback = (type: 'error' | 'success', message: string) => {
        setFeedback({ type, message });
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => setFeedback(null), 3500);
    };

    const addFormattingRule = () => {
        setFormattingRules(prev => [...prev, { id: Date.now(), condition: '>', value1: '', value2: '', color: '#ef4444' }]);
    };

    const updateFormattingRule = (id: number, field: string, value: string) => {
        setFormattingRules(prev => prev.map(rule => rule.id === id ? { ...rule, [field]: value } : rule));
    };

    const removeFormattingRule = (id: number) => {
        setFormattingRules(prev => prev.filter(rule => rule.id !== id));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!columnName.trim()) {
            showFeedback('error', 'Vui lòng nhập Tiêu đề phụ.');
            return;
        }
        
        const finalRules = formattingRules
            .filter(rule => rule.condition.includes('avg') || rule.value1.trim() !== '')
            .map(rule => ({
                condition: rule.condition as any,
                value1: parseFloat(rule.value1),
                value2: rule.condition === 'between' && rule.value2.trim() !== '' ? parseFloat(rule.value2) : undefined,
                color: rule.color,
            }));

        let newColumn: ColumnConfig;
        if (columnType === 'data') {
            newColumn = {
                id: editingColumn?.id || `col-${Date.now()}`,
                mainHeader: mainHeader.trim().toUpperCase(),
                columnName: columnName.trim().toUpperCase(),
                type: 'data',
                metricType,
                filters: {
                    selectedIndustries,
                    selectedSubgroups,
                    selectedManufacturers,
                    productCodes: productCodes.split(/[\s,]+/).map(code => code.trim()).filter(Boolean),
                    priceType,
                    priceCondition: priceCondition === 'none' ? undefined : priceCondition,
                    priceValue1: priceValue1 ? parseFloat(priceValue1) : undefined,
                    priceValue2: priceCondition === 'between' && priceValue2 ? parseFloat(priceValue2) : undefined,
                },
                conditionalFormatting: finalRules.length > 0 ? finalRules : undefined,
            };
        } else { // calculated
            if (!operand1 || !operand2) {
                showFeedback('error', 'Vui lòng chọn đủ 2 cột để thực hiện phép tính.');
                return;
            }
            newColumn = {
                id: editingColumn?.id || `col-${Date.now()}`,
                mainHeader: mainHeader.trim().toUpperCase(),
                columnName: columnName.trim().toUpperCase(),
                type: 'calculated',
                operation,
                operand1_columnId: operand1,
                operand2_columnId: operand2,
                displayAs,
                conditionalFormatting: finalRules.length > 0 ? finalRules : undefined,
            };
        }
        
        onSave(newColumn);

        if (editingColumn) {
            // Parent will close modal
        } else {
            // Reset form for next entry
            resetForm();
            showFeedback('success', `Đã lưu cột "${newColumn.columnName}". Bạn có thể thêm cột tiếp theo.`);
        }
    };
    
    const availableOperands = existingColumns.filter(c => c.id !== editingColumn?.id);

    return (
        <ModalWrapper 
            isOpen={isOpen}
            onClose={onClose}
            title={editingColumn ? "Chỉnh Sửa Cột" : "Tạo Cột Mới"}
            subTitle="Cấu hình một cột trong bảng thi đua"
            titleColorClass="text-cyan-600 dark:text-cyan-400"
            maxWidthClass="max-w-4xl"
        >
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900 max-h-[70vh] overflow-y-auto">
                    {feedback && (
                        <div className={`p-3 border rounded-md text-sm font-semibold flex items-center gap-2 ${
                            feedback.type === 'error' 
                            ? 'bg-red-100 dark:bg-red-900/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200'
                            : 'bg-green-100 dark:bg-green-900/50 border-green-200 dark:border-green-800 text-green-700 dark:text-green-200'
                        }`}>
                           <Icon name={feedback.type === 'error' ? 'alert-triangle' : 'check-circle'} size={4} />
                           {feedback.message}
                        </div>
                    )}
                    
                    {/* Common Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label htmlFor="mainHeader" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tiêu đề chính</label>
                            <input id="mainHeader" type="text" value={mainHeader} onChange={e => setMainHeader(e.target.value.toUpperCase())} placeholder="VD: THI ĐUA SIM" className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
                        </div>
                        <div>
                            <label htmlFor="columnName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tiêu đề phụ *</label>
                            <input id="columnName" type="text" value={columnName} onChange={e => setColumnName(e.target.value.toUpperCase())} placeholder="VD: SL Sim Số Đẹp" className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Loại Cột *</label>
                             <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-200/50 dark:bg-slate-800">
                                <button type="button" onClick={() => setColumnType('data')} className={`py-1.5 px-4 text-sm font-semibold rounded-md transition-colors ${columnType === 'data' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'}`}>Dữ liệu</button>
                                <button type="button" onClick={() => setColumnType('calculated')} className={`py-1.5 px-4 text-sm font-semibold rounded-md transition-colors ${columnType === 'calculated' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'}`}>Tính toán</button>
                            </div>
                        </div>
                    </div>

                    {/* Conditional Fields */}
                    {columnType === 'data' ? (
                        <div className="space-y-4 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Chỉ số tính *</label>
                                <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-200/50 dark:bg-slate-800">
                                    <button type="button" onClick={() => setMetricType('quantity')} className={`py-1.5 px-4 text-sm font-semibold rounded-md transition-colors ${metricType === 'quantity' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'}`}>Số lượng</button>
                                    <button type="button" onClick={() => setMetricType('revenue')} className={`py-1.5 px-4 text-sm font-semibold rounded-md transition-colors ${metricType === 'revenue' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'}`}>Doanh thu</button>
                                    <button type="button" onClick={() => setMetricType('revenueQD')} className={`py-1.5 px-4 text-sm font-semibold rounded-md transition-colors ${metricType === 'revenueQD' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'}`}>Doanh thu QĐ</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ngành hàng</label>
                                    <MultiSelectDropdown options={allIndustries} selected={selectedIndustries} onChange={setSelectedIndustries} label="Ngành hàng"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nhóm hàng</label>
                                    <MultiSelectDropdown options={allSubgroups} selected={selectedSubgroups} onChange={setSelectedSubgroups} label="Nhóm hàng"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nhà sản xuất</label>
                                    <MultiSelectDropdown options={allManufacturers} selected={selectedManufacturers} onChange={setSelectedManufacturers} label="Nhà sản xuất" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="productCodes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mã sản phẩm (Nhóm hàng)</label>
                                <textarea id="productCodes" value={productCodes} onChange={(e) => setProductCodes(e.target.value)} rows={2} placeholder="Nhập mã, cách nhau bằng dấu phẩy, khoảng trắng, hoặc xuống dòng." className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"></textarea>
                            </div>
                             <div className="border-t border-slate-200 dark:border-slate-600 pt-4 mt-4">
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Lọc theo giá sản phẩm (tùy chọn)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Loại giá</label>
                                        <select value={priceType} onChange={e => setPriceType(e.target.value as any)} className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                            <option value="discounted">Giá giảm (Giá bán_1)</option>
                                            <option value="original">Giá gốc (Giá bán)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Điều kiện</label>
                                        <select value={priceCondition} onChange={e => setPriceCondition(e.target.value as any)} className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                            <option value="none">Không lọc</option>
                                            <option value="greater">Lớn hơn</option>
                                            <option value="less">Nhỏ hơn</option>
                                            <option value="equal">Bằng</option>
                                            <option value="between">Trong khoảng</option>
                                        </select>
                                    </div>
                                    {priceCondition !== 'none' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{priceCondition === 'between' ? 'Giá từ' : 'Giá trị'}</label>
                                                <input type="number" value={priceValue1} onChange={e => setPriceValue1(e.target.value)} placeholder="0" className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                            </div>
                                            {priceCondition === 'between' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Đến giá</label>
                                                    <input type="number" value={priceValue2} onChange={e => setPriceValue2(e.target.value)} placeholder="0" className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                         <div className="space-y-4 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200">Xây dựng công thức</h4>
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cột 1</label>
                                    <select value={operand1} onChange={e => setOperand1(e.target.value)} className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                        <option value="">-- Chọn cột --</option>
                                        {availableOperands.map(c => <option key={c.id} value={c.id}>{c.columnName}</option>)}
                                    </select>
                                </div>
                                <div className="flex-shrink-0">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phép tính</label>
                                    <select value={operation} onChange={e => setOperation(e.target.value as any)} className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                        <option value="+">+</option>
                                        <option value="-">-</option>
                                        <option value="*">*</option>
                                        <option value="/">/</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cột 2</label>
                                    <select value={operand2} onChange={e => setOperand2(e.target.value)} className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                        <option value="">-- Chọn cột --</option>
                                         {availableOperands.map(c => <option key={c.id} value={c.id}>{c.columnName}</option>)}
                                    </select>
                                </div>
                                {operation === '/' && (
                                     <div className="flex-shrink-0">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hiển thị</label>
                                        <select value={displayAs} onChange={e => setDisplayAs(e.target.value as any)} className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                            <option value="number">Dạng số</option>
                                            <option value="percentage">Dạng %</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                         </div>
                    )}
                    
                    <div className="border-t border-slate-200 dark:border-slate-600 pt-4 mt-4">
                        <div className="flex justify-between items-center mb-2">
                             <h4 className="font-semibold text-slate-800 dark:text-slate-200">Định dạng có điều kiện (tùy chọn)</h4>
                             <button type="button" onClick={addFormattingRule} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1"><Icon name="plus" size={4}/>Thêm luật</button>
                        </div>
                        <div className="space-y-2">
                            {formattingRules.map((rule) => {
                                const valueInputsNeeded = !['>avg', '<avg'].includes(rule.condition);
                                return (
                                <div key={rule.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Điều kiện</label>
                                        <select value={rule.condition} onChange={e => updateFormattingRule(rule.id, 'condition', e.target.value)} className="w-full h-9 mt-1 block rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                            <option value=">">Lớn hơn (&gt;)</option>
                                            <option value="<">Nhỏ hơn (&lt;)</option>
                                            <option value="=">Bằng (=)</option>
                                            <option value="between">Trong khoảng</option>
                                            <option value=">avg">Lớn hơn trung bình cột</option>
                                            <option value="<avg">Nhỏ hơn trung bình cột</option>
                                        </select>
                                    </div>
                                    {valueInputsNeeded ? (
                                        <>
                                            <div className={rule.condition === 'between' ? '' : 'sm:col-span-2'}>
                                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{rule.condition === 'between' ? 'Giá trị từ' : 'Giá trị'}</label>
                                                <input type="number" value={rule.value1} onChange={e => updateFormattingRule(rule.id, 'value1', e.target.value)} placeholder="0" className="w-full h-9 mt-1 block rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"/>
                                            </div>
                                            {rule.condition === 'between' && (
                                                 <div>
                                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">đến</label>
                                                    <input type="number" value={rule.value2} onChange={e => updateFormattingRule(rule.id, 'value2', e.target.value)} placeholder="0" className="w-full h-9 mt-1 block rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"/>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="sm:col-span-2 flex items-end pb-1">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 italic">(So sánh với trung bình của cột)</p>
                                        </div>
                                    )}
                                    <div className="flex items-end gap-2">
                                        <div className="flex-grow">
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Màu</label>
                                            <input type="color" value={rule.color} onChange={e => updateFormattingRule(rule.id, 'color', e.target.value)} className="w-full h-9 mt-1 p-1 block rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm cursor-pointer"/>
                                        </div>
                                        <button type="button" onClick={() => removeFormattingRule(rule.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md"><Icon name="trash-2" size={4}/></button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>

                </div>
                <div className="p-4 flex justify-end gap-3 bg-slate-100 dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors">Đóng</button>
                    <button type="submit" className="py-2 px-6 rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">{editingColumn ? "Lưu Thay Đổi" : "Lưu Cột"}</button>
                </div>
            </form>
        </ModalWrapper>
    );
};

export default ColumnConfigModal;