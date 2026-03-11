
import React from 'react';
import { Icon } from '../common/Icon';
import EmployeeAnalysisFilters from './EmployeeAnalysisFilters';

interface Tab {
    id: string;
    label: string;
    icon: string;
    name?: string;
}

interface EmployeeAnalysisTabsProps {
    renderedDefaultTabs: Tab[];
    renderedCustomTabs: any[];
    activeTab: string;
    setActiveTab: (id: string) => void;
    setModalState: (state: any) => void;
    visibleTabs: Set<string>;
    handleToggleTabVisibility: (id: string) => void;
    allAvailableTabs: any[];
    isSettingsOpen: boolean;
    setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    settingsRef: React.RefObject<HTMLDivElement | null>;

    // Filter Props
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

const EmployeeAnalysisTabs: React.FC<EmployeeAnalysisTabsProps> = ({
    renderedDefaultTabs,
    renderedCustomTabs,
    activeTab,
    setActiveTab,
    setModalState,
    visibleTabs,
    handleToggleTabVisibility,
    allAvailableTabs,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsRef,
    
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
    deptFilterRef
}) => {
    return (
        <div className="flex justify-between items-end gap-y-2 border-b-2 border-slate-200 dark:border-slate-700 px-4 bg-white dark:bg-slate-900 rounded-t-xl">
            <div className="flex items-end gap-1 overflow-x-auto">
                {renderedDefaultTabs.map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id)} 
                        className={`flex items-center gap-2 py-3 px-3 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <Icon name={tab.icon} /> {tab.label}
                    </button>
                ))}
                {renderedCustomTabs.map(tab => (
                    <div key={tab.id} className="group relative">
                        <button 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`flex items-center gap-2 py-3 px-3 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            <Icon name={tab.icon} /> {tab.name}
                        </button>
                        <div className="absolute top-0 right-0 flex items-center transition-opacity hide-on-export">
                            <button 
                                onClick={() => setModalState({ type: 'EDIT_TAB', data: { tabId: tab.id, initialName: tab.name, initialIcon: tab.icon }})} 
                                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                                <Icon name="edit-3" size={3.5}/>
                            </button>
                            <button 
                                onClick={() => setModalState({ type: 'CONFIRM_DELETE_TAB', data: { tabId: tab.id, tabName: tab.name }})} 
                                className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                                <Icon name="trash-2" size={3.5}/>
                            </button>
                        </div>
                    </div>
                ))}
                <button 
                    onClick={() => setModalState({type: 'CREATE_TAB'})} 
                    title="Tạo tab thi đua mới" 
                    className="ml-2 mb-1 p-2 text-slate-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <Icon name="plus-circle" />
                </button>
            </div>
            <div className="flex items-center gap-2 pb-2 hide-on-export">
                {/* Render Filters here */}
                <EmployeeAnalysisFilters 
                    allWarehouses={allWarehouses}
                    selectedWarehouses={selectedWarehouses}
                    setSelectedWarehouses={setSelectedWarehouses}
                    warehouseSearchTerm={warehouseSearchTerm}
                    setWarehouseSearchTerm={setWarehouseSearchTerm}
                    isWarehouseFilterOpen={isWarehouseFilterOpen}
                    setIsWarehouseFilterOpen={setIsWarehouseFilterOpen}
                    warehouseFilterRef={warehouseFilterRef}
                    allDepartments={allDepartments}
                    selectedDepartments={selectedDepartments}
                    setSelectedDepartments={setSelectedDepartments}
                    deptSearchTerm={deptSearchTerm}
                    setDeptSearchTerm={setDeptSearchTerm}
                    isDeptFilterOpen={isDeptFilterOpen}
                    setIsDeptFilterOpen={setIsDeptFilterOpen}
                    deptFilterRef={deptFilterRef}
                />

                <div ref={settingsRef} className="relative">
                    <button 
                        onClick={() => setIsSettingsOpen(prev => !prev)} 
                        title="Tùy chọn hiển thị" 
                        className="p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Icon name="settings" />
                    </button>
                    {isSettingsOpen && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-2 border border-slate-200 dark:border-slate-700 z-20">
                            <h4 className="font-bold text-sm mb-2 px-2 pt-2 text-slate-800 dark:text-slate-100">Ẩn/Hiện Tab</h4>
                            <div className="space-y-1 max-h-60 overflow-y-auto">
                                {allAvailableTabs.map(tab => (
                                    <label key={tab.id} htmlFor={`vis-toggle-${tab.id}`} className="flex items-center justify-between cursor-pointer p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{tab.label || tab.name}</span>
                                        <div className="relative inline-flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={visibleTabs.has(tab.id)}
                                                onChange={() => handleToggleTabVisibility(tab.id)}
                                                className="sr-only peer"
                                                id={`vis-toggle-${tab.id}`}
                                            />
                                            <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-500 peer-checked:bg-indigo-600"></div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmployeeAnalysisTabs;
