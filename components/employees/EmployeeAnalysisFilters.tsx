
import React from 'react';
import { Icon } from '../common/Icon';

interface EmployeeAnalysisFiltersProps {
    allWarehouses: string[];
    selectedWarehouses: string[];
    setSelectedWarehouses: React.Dispatch<React.SetStateAction<string[]>>;
    warehouseSearchTerm: string;
    setWarehouseSearchTerm: (val: string) => void;
    isWarehouseFilterOpen: boolean;
    setIsWarehouseFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
    warehouseFilterRef: React.RefObject<HTMLDivElement | null>;

    allDepartments: string[];
    selectedDepartments: string[];
    setSelectedDepartments: React.Dispatch<React.SetStateAction<string[]>>;
    deptSearchTerm: string;
    setDeptSearchTerm: (val: string) => void;
    isDeptFilterOpen: boolean;
    setIsDeptFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
    deptFilterRef: React.RefObject<HTMLDivElement | null>;
}

const EmployeeAnalysisFilters: React.FC<EmployeeAnalysisFiltersProps> = ({
    allWarehouses,
    selectedWarehouses,
    setSelectedWarehouses,
    warehouseSearchTerm,
    setWarehouseSearchTerm,
    isWarehouseFilterOpen,
    setIsWarehouseFilterOpen,
    warehouseFilterRef,

    allDepartments,
    selectedDepartments,
    setSelectedDepartments,
    deptSearchTerm,
    setDeptSearchTerm,
    isDeptFilterOpen,
    setIsDeptFilterOpen,
    deptFilterRef,
}) => {
    return (
        <div className="flex items-center gap-2 pb-2 hide-on-export">
            {/* Warehouse Filter */}
            {allWarehouses.length > 0 && (
                <div className="relative" ref={warehouseFilterRef}>
                    <button 
                        onClick={() => setIsWarehouseFilterOpen(p => !p)} 
                        title="Lọc theo siêu thị" 
                        className="relative p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Icon name="building-2" />
                        {selectedWarehouses.length > 0 && selectedWarehouses.length < allWarehouses.length && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white pointer-events-none">
                                {selectedWarehouses.length}
                            </span>
                        )}
                    </button>
                    {isWarehouseFilterOpen && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-2 border border-slate-200 dark:border-slate-700 z-20 flex flex-col">
                            <input
                                type="text"
                                placeholder="Tìm kiếm siêu thị..."
                                value={warehouseSearchTerm}
                                onChange={e => setWarehouseSearchTerm(e.target.value)}
                                className="w-full text-sm bg-slate-50 dark:bg-slate-600 border-slate-300 dark:border-slate-500 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mb-2 px-2 py-1.5"
                            />
                            <div className="flex items-center border-b border-slate-200 dark:border-slate-600 pb-2 mb-2">
                                <input 
                                    id="select-all-warehouses" 
                                    type="checkbox" 
                                    checked={selectedWarehouses.length === allWarehouses.length && allWarehouses.length > 0} 
                                    onChange={(e) => setSelectedWarehouses(e.target.checked ? allWarehouses : [])} 
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                                />
                                <label htmlFor="select-all-warehouses" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-100">Chọn tất cả</label>
                            </div>
                            <div className="flex-grow overflow-y-auto max-h-48">
                                {allWarehouses.filter(opt => String(opt).toLowerCase().includes(warehouseSearchTerm.toLowerCase())).map(option => (
                                    <div key={option} className="flex items-center p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600">
                                        <input 
                                            id={`wh-opt-${option}`} 
                                            type="checkbox" 
                                            checked={selectedWarehouses.includes(option)} 
                                            onChange={() => {
                                                setSelectedWarehouses(prev => prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option]);
                                            }} 
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                                        />
                                        <label htmlFor={`wh-opt-${option}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300 truncate">{option}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Department Filter */}
            {allDepartments.length > 0 && (
                <div className="relative" ref={deptFilterRef}>
                    <button 
                        onClick={() => setIsDeptFilterOpen(p => !p)} 
                        title="Lọc theo bộ phận" 
                        className="relative p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Icon name="filter" />
                        {selectedDepartments.length > 0 && selectedDepartments.length < allDepartments.length && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white pointer-events-none">
                                {selectedDepartments.length}
                            </span>
                        )}
                    </button>
                    {isDeptFilterOpen && (
                        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-2 border border-slate-200 dark:border-slate-700 z-20 flex flex-col">
                            <input
                                type="text"
                                placeholder="Tìm kiếm bộ phận..."
                                value={deptSearchTerm}
                                onChange={e => setDeptSearchTerm(e.target.value)}
                                className="w-full text-sm bg-slate-50 dark:bg-slate-600 border-slate-300 dark:border-slate-500 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mb-2 px-2 py-1.5"
                            />
                            <div className="flex items-center border-b border-slate-200 dark:border-slate-600 pb-2 mb-2">
                                <input 
                                    id="select-all-depts" 
                                    type="checkbox" 
                                    checked={selectedDepartments.length === allDepartments.length && allDepartments.length > 0} 
                                    onChange={(e) => setSelectedDepartments(e.target.checked ? allDepartments : [])} 
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                                />
                                <label htmlFor="select-all-depts" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-100">Chọn tất cả</label>
                            </div>
                            <div className="flex-grow overflow-y-auto max-h-48">
                                {allDepartments.filter(opt => String(opt).toLowerCase().includes(deptSearchTerm.toLowerCase())).map(option => (
                                    <div key={option} className="flex items-center p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600">
                                        <input 
                                            id={`dept-opt-${option}`} 
                                            type="checkbox" 
                                            checked={selectedDepartments.includes(option)} 
                                            onChange={() => {
                                                setSelectedDepartments(prev => prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option]);
                                            }} 
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                                        />
                                        <label htmlFor={`dept-opt-${option}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300 truncate">{option}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default EmployeeAnalysisFilters;
