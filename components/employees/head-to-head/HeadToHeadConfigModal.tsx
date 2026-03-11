import React, { useState, useEffect } from 'react';
import type { HeadToHeadTableConfig, HeadToHeadConditionalFormatRule } from '../../../types';
import ModalWrapper from '../../modals/ModalWrapper';
import { Icon } from '../../common/Icon';
import MultiSelectDropdown from '../../common/MultiSelectDropdown';

interface ConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: Omit<HeadToHeadTableConfig, 'id'>) => void;
    allSubgroups: string[];
    allParentGroups: string[];
    editingConfig?: HeadToHeadTableConfig;
}

const HeadToHeadConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, onSave, allSubgroups, allParentGroups, editingConfig }) => {
    const [tableName, setTableName] = useState('');
    const [metricType, setMetricType] = useState<HeadToHeadTableConfig['metricType']>('quantity');
    const [selectedSubgroups, setSelectedSubgroups] = useState<string[]>([]);
    const [selectedParentGroups, setSelectedParentGroups] = useState<string[]>([]);
    const [totalCalculationMethod, setTotalCalculationMethod] = useState<'sum' | 'average'>('sum');
    const [conditionalFormats, setConditionalFormats] = useState<HeadToHeadConditionalFormatRule[]>([]);

    useEffect(() => {
        if (isOpen) {
            if (editingConfig) {
                setTableName(editingConfig.tableName);
                setMetricType(editingConfig.metricType);
                setSelectedSubgroups(editingConfig.selectedSubgroups);
                setSelectedParentGroups(editingConfig.selectedParentGroups || []);
                setTotalCalculationMethod(editingConfig.totalCalculationMethod || 'sum');
                setConditionalFormats(editingConfig.conditionalFormats || []);
            } else {
                setTableName('');
                setMetricType('quantity');
                setSelectedSubgroups([]);
                setSelectedParentGroups([]);
                setTotalCalculationMethod('sum');
                setConditionalFormats([]);
            }
        }
    }, [isOpen, editingConfig]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (tableName.trim()) {
            let finalTableName = tableName.trim().toUpperCase();
            if (!editingConfig) {
                finalTableName = `7 NGÀY - ${finalTableName}`;
            }
            onSave({ tableName: finalTableName, metricType, selectedSubgroups, selectedParentGroups, totalCalculationMethod, conditionalFormats });
        }
    };

    const addRule = () => {
        const newRule: HeadToHeadConditionalFormatRule = {
            id: `rule-${Date.now()}`,
            criteria: 'specific_value',
            operator: '>',
            value: 0,
            textColor: '#000000',
            backgroundColor: '#ffff00'
        };
        setConditionalFormats(prev => [...prev, newRule]);
    };

    const updateRule = (id: string, field: keyof HeadToHeadConditionalFormatRule, value: any) => {
        setConditionalFormats(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const removeRule = (id: string) => {
        setConditionalFormats(prev => prev.filter(r => r.id !== id));
    };

    return (
        <ModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={editingConfig ? "Sửa Bảng Theo Dõi" : "Tạo Bảng Theo Dõi Mới"}
            subTitle="Tùy chỉnh bảng so sánh hiệu suất trong 7 ngày"
            titleColorClass="text-teal-600 dark:text-teal-400"
            maxWidthClass="max-w-3xl"
        >
            <form onSubmit={handleSave}>
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label htmlFor="tableName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên Bảng *</label>
                            <input id="tableName" type="text" value={tableName} onChange={e => setTableName(e.target.value)} placeholder="VD: Thi Đua Sim Số" className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-colors" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chỉ số chính</label>
                            <select value={metricType} onChange={e => setMetricType(e.target.value as any)} className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-colors">
                                <option value="quantity">Số lượng</option>
                                <option value="revenue">Doanh thu</option>
                                <option value="revenueQD">Doanh thu QĐ</option>
                                <option value="hieuQuaQD">Hiệu quả QĐ</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ngành hàng (Cha)</label>
                             <MultiSelectDropdown options={allParentGroups} selected={selectedParentGroups} onChange={setSelectedParentGroups} label="ngành hàng" placeholder="Lọc theo ngành hàng cha (tùy chọn)"/>
                        </div>
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nhóm hàng (Con)</label>
                             <MultiSelectDropdown options={allSubgroups} selected={selectedSubgroups} onChange={setSelectedSubgroups} label="nhóm hàng" placeholder="Lọc theo nhóm hàng con (tùy chọn)"/>
                        </div>
                    </div>

                    {/* Total Calculation */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Cách tính cột "TỔNG"</h4>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" value="sum" checked={totalCalculationMethod === 'sum'} onChange={e => setTotalCalculationMethod(e.target.value as any)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" /> Tính Tổng 7 ngày</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" value="average" checked={totalCalculationMethod === 'average'} onChange={e => setTotalCalculationMethod(e.target.value as any)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" /> Tính Trung bình 7 ngày</label>
                        </div>
                    </div>

                    {/* Conditional Formatting */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200">Định dạng có điều kiện (Cảnh báo)</h4>
                            <button type="button" onClick={addRule} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1"><Icon name="plus" size={4}/>Thêm luật</button>
                        </div>
                        <div className="space-y-3">
                            {conditionalFormats.map(rule => (
                                <div key={rule.id} className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-6 gap-3 items-end p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-fade-in-up">
                                    <div className="sm:col-span-2 lg:col-span-2">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Tiêu chí</label>
                                        <select value={rule.criteria} onChange={e => updateRule(rule.id, 'criteria', e.target.value)} className="w-full h-9 mt-1 block rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                            <option value="specific_value">So với giá trị cụ thể</option>
                                            <option value="column_dept_avg">So với T.Bình bộ phận</option>
                                            <option value="row_avg">So với T.Bình nhân viên</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Điều kiện</label>
                                        <select value={rule.operator} onChange={e => updateRule(rule.id, 'operator', e.target.value)} className="w-full h-9 mt-1 block rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                                            <option value=">">&gt;</option>
                                            <option value="<">&lt;</option>
                                            <option value="=">=</option>
                                        </select>
                                    </div>
                                    <div className={`${rule.criteria !== 'specific_value' ? 'hidden' : ''}`}>
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Giá trị</label>
                                        <input type="number" value={rule.value} onChange={e => updateRule(rule.id, 'value', Number(e.target.value))} className="w-full h-9 mt-1 block rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                                    </div>
                                    <div className="flex items-end gap-2 lg:col-span-2">
                                        <div className="flex-grow">
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Màu chữ</label>
                                            <input type="color" value={rule.textColor} onChange={e => updateRule(rule.id, 'textColor', e.target.value)} className="w-full h-9 mt-1 p-1 block rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm cursor-pointer"/>
                                        </div>
                                        <div className="flex-grow">
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Màu nền</label>
                                            <input type="color" value={rule.backgroundColor} onChange={e => updateRule(rule.id, 'backgroundColor', e.target.value)} className="w-full h-9 mt-1 p-1 block rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm cursor-pointer"/>
                                        </div>
                                        <button type="button" onClick={() => removeRule(rule.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors"><Icon name="trash-2" size={4}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 flex justify-end gap-3 bg-slate-100 dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors">Hủy</button>
                    <button type="submit" className="py-2 px-6 rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">{editingConfig ? "Lưu" : "Tạo"}</button>
                </div>
            </form>
        </ModalWrapper>
    );
};

export default HeadToHeadConfigModal;