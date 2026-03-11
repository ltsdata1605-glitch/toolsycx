
import React from 'react';
import TopSellerList from './TopSellerList';
import PerformanceTable from './PerformanceTable';
import IndustryAnalysisTab from './IndustryAnalysisTab';
import HeadToHeadTab from './HeadToHeadTab';
import SummarySynthesisTab from './SummarySynthesisTab';
import ContestTable from './ContestTable';
import { Icon } from '../common/Icon';
import type { ExploitationData } from '../../types';

interface EmployeeAnalysisContentProps {
    activeTab: string;
    filteredEmployeeAnalysisData: any;
    isInitialTabsLoaded: boolean;
    industryAnalysisTables: any[];
    customTabs: any[];
    baseFilteredData: any[];
    productConfig: any;
    isExporting: boolean;
    handleMainExport: () => Promise<void>;
    handleIndustryTabExport: () => Promise<void>;
    handleBatchExport: (data: any) => void;
    openPerformanceModal: (emp: any) => void;
    setModalState: (state: any) => void;
    exportRef: React.RefObject<HTMLDivElement | null>;
    industryAnalysisTabRef: React.RefObject<HTMLDivElement | null>;
    colorThemes: any[];
    defaultTabs: any[];
}

const EmployeeAnalysisContent: React.FC<EmployeeAnalysisContentProps> = React.memo(({
    activeTab,
    filteredEmployeeAnalysisData,
    isInitialTabsLoaded,
    industryAnalysisTables,
    customTabs,
    baseFilteredData,
    productConfig,
    isExporting,
    handleMainExport,
    handleIndustryTabExport,
    handleBatchExport,
    openPerformanceModal,
    setModalState,
    exportRef,
    industryAnalysisTabRef,
    colorThemes,
    defaultTabs
}) => {
    if (!isInitialTabsLoaded || !filteredEmployeeAnalysisData) return null;

    switch (activeTab) {
        case 'topSellers': 
            return <TopSellerList ref={exportRef} fullSellerArray={filteredEmployeeAnalysisData.fullSellerArray} onEmployeeClick={openPerformanceModal} onBatchExport={handleBatchExport} onExport={handleMainExport} isExporting={isExporting} />;
        case 'performanceTable': 
            return <PerformanceTable ref={exportRef} employeeData={filteredEmployeeAnalysisData} onEmployeeClick={openPerformanceModal} onExport={handleMainExport} isExporting={isExporting} />;
        case 'industryAnalysis': 
            return (
                <div>
                    <IndustryAnalysisTab 
                        ref={industryAnalysisTabRef}
                        data={filteredEmployeeAnalysisData.exploitationData} 
                        onExport={handleIndustryTabExport} 
                        isExporting={isExporting}
                        onBatchExport={(exploitationData: ExploitationData[]) => {
                            const names = new Set(exploitationData.map(d => d.name));
                            if (filteredEmployeeAnalysisData?.fullSellerArray) {
                                const employeesToExport = filteredEmployeeAnalysisData.fullSellerArray.filter(e => names.has(e.name));
                                handleBatchExport(employeesToExport);
                            }
                        }}
                    />
                    <div className="mt-8">
                        <div className="flex justify-between items-center hide-on-export mb-4 flex-wrap gap-4">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Bảng Thi Đua Tùy Chỉnh (Khai Thác)</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setModalState({ type: 'CREATE_TABLE', data: { tabId: 'industryAnalysis' } })} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                                    <Icon name="plus" size={4} /> Tạo Bảng Thi Đua Mới
                                </button>
                            </div>
                        </div>
                        {industryAnalysisTables.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">Chưa có bảng thi đua tùy chỉnh nào.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {industryAnalysisTables.map((tableConfig, index) => (
                                    <ContestTable
                                        key={tableConfig.id}
                                        config={tableConfig}
                                        allEmployees={filteredEmployeeAnalysisData.fullSellerArray}
                                        baseFilteredData={baseFilteredData}
                                        productConfig={productConfig!}
                                        tableColorTheme={colorThemes[(index + 1) % colorThemes.length]}
                                        onManageColumns={() => setModalState({ type: 'EDIT_TABLE', data: { tabId: 'industryAnalysis', tableId: tableConfig.id, tableName: tableConfig.tableName, columns: tableConfig.columns, initialSortColumnId: tableConfig.defaultSortColumnId } })}
                                        onDeleteTable={() => setModalState({ type: 'CONFIRM_DELETE_TABLE', data: { tabId: 'industryAnalysis', tableId: tableConfig.id, tableName: tableConfig.tableName } })}
                                        onAddColumn={() => setModalState({ type: 'CREATE_COLUMN', data: { tabId: 'industryAnalysis', tableId: tableConfig.id, existingColumns: tableConfig.columns } })}
                                        onEditColumn={(columnId) => setModalState({ type: 'EDIT_COLUMN', data: { tabId: 'industryAnalysis', tableId: tableConfig.id, existingColumns: tableConfig.columns, editingColumn: tableConfig.columns.find(c => c.id === columnId) } })}
                                        onTriggerDeleteColumn={(columnId) => setModalState({ type: 'CONFIRM_DELETE_COLUMN', data: { tabId: 'industryAnalysis', tableId: tableConfig.id, columnId: columnId, columnName: tableConfig.columns.find(c => c.id === columnId)?.columnName } })}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        case 'headToHead': 
            return <HeadToHeadTab ref={exportRef} baseFilteredData={baseFilteredData} productConfig={productConfig!} employeeData={filteredEmployeeAnalysisData.fullSellerArray} onExport={handleMainExport} isExporting={isExporting} colorThemes={colorThemes} />;
        case 'summarySynthesis': 
            return <SummarySynthesisTab ref={exportRef} baseFilteredData={baseFilteredData} productConfig={productConfig!} employeeData={filteredEmployeeAnalysisData.fullSellerArray} onExport={handleMainExport} isExporting={isExporting} />;
        default:
            const customTab = customTabs.find(t => t.id === activeTab);
            if (customTab) {
                return (
                    <div ref={exportRef}>
                        <div className="flex justify-between items-center hide-on-export mb-4 flex-wrap gap-4">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{customTab.name}</h3>
                            <div className="flex items-center gap-2">
                                 <button onClick={() => setModalState({ type: 'CREATE_TABLE', data: { tabId: customTab.id }})} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                                    <Icon name="plus" size={4}/> Tạo Bảng Thi Đua Mới
                                </button>
                                <button onClick={handleMainExport} disabled={isExporting} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors">
                                    {isExporting ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="camera" />} Xuất Ảnh Tab
                                </button>
                            </div>
                        </div>
                        {customTab.tables.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">Chưa có bảng thi đua nào trong tab này.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {customTab.tables.map((tableConfig, index) => (
                                    <ContestTable
                                        key={tableConfig.id}
                                        config={tableConfig}
                                        allEmployees={filteredEmployeeAnalysisData.fullSellerArray}
                                        baseFilteredData={baseFilteredData}
                                        productConfig={productConfig!}
                                        tableColorTheme={colorThemes[(index + 2) % colorThemes.length]}
                                        onManageColumns={() => setModalState({ type: 'EDIT_TABLE', data: { tabId: customTab.id, tableId: tableConfig.id, tableName: tableConfig.tableName, columns: tableConfig.columns, initialSortColumnId: tableConfig.defaultSortColumnId }})}
                                        onDeleteTable={() => setModalState({ type: 'CONFIRM_DELETE_TABLE', data: { tabId: customTab.id, tableId: tableConfig.id, tableName: tableConfig.tableName }})}
                                        onAddColumn={() => setModalState({ type: 'CREATE_COLUMN', data: { tabId: customTab.id, tableId: tableConfig.id, existingColumns: tableConfig.columns }})}
                                        onEditColumn={(columnId) => setModalState({ type: 'EDIT_COLUMN', data: { tabId: customTab.id, tableId: tableConfig.id, existingColumns: tableConfig.columns, editingColumn: tableConfig.columns.find(c => c.id === columnId) }})}
                                        onTriggerDeleteColumn={(columnId) => setModalState({ type: 'CONFIRM_DELETE_COLUMN', data: { tabId: customTab.id, columnId: columnId, columnName: tableConfig.columns.find(c => c.id === columnId)?.columnName }})}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            }
            return null;
    }
});

export default EmployeeAnalysisContent;
