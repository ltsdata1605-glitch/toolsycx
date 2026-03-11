
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useDashboardLogic } from '../../hooks/useDashboardLogic';
import type { VisibilityState } from '../../types';
import { DashboardContext } from '../../contexts/DashboardContext';

import Header from '../layout/Header';
import Footer from '../layout/Footer';
import LandingPageView from './LandingPageView';
import StatusDisplay from '../upload/StatusDisplay';
import FilterSection from '../filters/FilterSection';
import KpiCards from '../kpis/KpiCards';
import ProcessingLoader from '../common/ProcessingLoader';
import ExportLoader from '../common/ExportLoader';
import ChatFab from '../ai/ChatFab';
import { Icon } from '../common/Icon';
import { KpiCardsSkeleton, ChartSkeleton, TableSkeleton, TabbedTableSkeleton } from '../common/SkeletonLoader';
import { DebugPanel } from '../common/DebugPanel';
import ErrorBoundary from '../common/ErrorBoundary';

// Lazy load heavy components
const TrendChart = lazy(() => import('../charts/TrendChart'));
const IndustryGrid = lazy(() => import('../charts/IndustryGrid'));
const EmployeeAnalysis = lazy(() => import('../employees/EmployeeAnalysis'));
const SummaryTable = lazy(() => import('../tables/SummaryTable'));
const WarehouseSummary = lazy(() => import('../summary/WarehouseSummary'));
const PerformanceModal = lazy(() => import('../modals/PerformanceModal'));
const UnshippedOrdersModal = lazy(() => import('../modals/UnshippedOrdersModal'));
const ChatModal = lazy(() => import('../ai/ChatModal'));

const defaultVisibilityState: VisibilityState = {
    trendChart: false,
    industryGrid: true,
    employeeAnalysis: true,
    summaryTable: true,
};

const debugInitialData = {
    Header: { name: "Khu vực Header (Header.tsx)", description: "...", design: "..." },
    FilterSection: { name: "Slide Menu Bộ lọc (FilterSection.tsx)", description: "...", design: "..." },
    WarehouseSummary: { name: "Bảng tóm tắt theo kho (WarehouseSummary.tsx)", description: "...", design: "..." },
    KpiCards: { name: "Các thẻ chỉ số KPI (KpiCards.tsx)", description: "...", design: "..." },
    TrendChart: { name: "Biểu đồ Xu hướng Doanh thu (TrendChart.tsx)", description: "...", design: "..." },
    IndustryGrid: { name: "Lưới/Biểu đồ Tỷ trọng Ngành hàng (IndustryGrid.tsx)", description: "...", design: "..." },
    EmployeeAnalysis: { name: "Phân tích Hiệu suất Nhân viên (EmployeeAnalysis.tsx)", description: "...", design: "..." },
    SummaryTable: { name: "Bảng Chi tiết Ngành hàng (SummaryTable.tsx)", description: "...", design: "..." },
};

export default function DashboardView() {
    const logic = useDashboardLogic();
    const {
        status, appState, isProcessing, isClearingDepartments, isExporting, fileInfo,
        departmentMap, processedData,
        configUrl, setConfigUrl, uniqueFilterOptions,
        activeModal, setActiveModal, modalData,
        isChatOpen, setIsChatOpen, chatHistory, isAiResponding,
        handleClearDepartments, handleClearData, handleShiftFileProcessing, handleFileProcessing,
        handleSendMessage, openUnshippedModal, handleExport, handleBatchKhoExport,
        filterState,
        isDeduplicationEnabled,
        handleDeduplicationChange,
        processingTime
    } = logic;

    const [visibleComponents, setVisibleComponents] = useState<VisibilityState>(() => {
        try {
            const saved = localStorage.getItem('dashboard_visibleComponents');
            return saved ? JSON.parse(saved) : defaultVisibilityState;
        } catch (e) {
            return defaultVisibilityState;
        }
    });

    const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
    const [isDebugPanelVisible, setIsDebugPanelVisible] = useState(false);
    const [isInspectorActive, setIsInspectorActive] = useState(false);
    const [debugInfo, setDebugInfo] = useState<any | null>(null);

    const dashboardContainerRef = useRef<HTMLDivElement>(null);
    const businessOverviewRef = useRef<HTMLDivElement>(null);
    const mainFileInputRef = useRef<HTMLInputElement>(null);
    const shiftFileInputRef = useRef<HTMLInputElement>(null);

    const handleNewFileClick = () => mainFileInputRef.current?.click();
    const handleShiftFileClick = () => shiftFileInputRef.current?.click();
    
    const handleVisibilityChange = (component: keyof VisibilityState, isVisible: boolean) => {
        setVisibleComponents(prev => {
            const newState = { ...prev, [component]: isVisible };
            localStorage.setItem('dashboard_visibleComponents', JSON.stringify(newState));
            return newState;
        });
    };

    const handleBusinessOverviewExport = async () => {
        if (businessOverviewRef.current) {
            await handleExport(businessOverviewRef.current, 'tong-quan-kinh-doanh.png', {
                captureAsDisplayed: false,
                isCompactTable: true,
                forcedWidth: 700, 
            });
        }
    };

    useEffect(() => {
        document.body.classList.remove('is-capturing');
        document.querySelectorAll('.hide-on-export').forEach((el) => {
            (el as HTMLElement).style.visibility = '';
            (el as HTMLElement).style.display = '';
        });
    }, [appState]);

    useEffect(() => {
        const handleInspectClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            let target = e.target as HTMLElement | null;
            while(target && !target.hasAttribute('data-debug-id')) {
                target = target.parentElement;
            }

            if (target) {
                const infoString = target.getAttribute('data-debug-info');
                if (infoString) {
                    try {
                        const info = JSON.parse(infoString);
                        setDebugInfo(info);
                    } catch (err) {
                        console.error("Failed to parse debug info JSON:", err);
                        setDebugInfo({ name: "Lỗi", description: "Không thể đọc thông tin gỡ lỗi.", design: "Kiểm tra console để biết chi tiết." });
                    }
                }
            } else {
                 setDebugInfo(null);
            }
        };

        if (isInspectorActive) {
            document.body.classList.add('inspector-active');
            document.addEventListener('click', handleInspectClick, { capture: true });
        } else {
            document.body.classList.remove('inspector-active');
        }

        return () => {
            document.body.classList.remove('inspector-active');
            document.removeEventListener('click', handleInspectClick, { capture: true });
        };
    }, [isInspectorActive]);


    useEffect(() => {
        // Lucide icon initialization is now handled by the Icon component using lucide-react
    }, [appState, processedData, activeModal, isExporting, isChatOpen, isDebugPanelVisible, uniqueFilterOptions, isProcessing, filterState, isFilterSidebarOpen]);
    
    const showDashboard = appState === 'dashboard' && processedData;
    const showProcessingOverlay = appState === 'loading' || (appState === 'processing' && !processedData);
    const showLanding = appState === 'upload' || showProcessingOverlay;

    return (
        <div className="min-h-screen flex flex-col items-center">
            <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 w-full pt-8">
                <input type="file" ref={mainFileInputRef} className="hidden" accept=".xlsx, .xls" onChange={(e) => e.target.files?.[0] && handleFileProcessing(e.target.files[0])} />
                <input type="file" ref={shiftFileInputRef} className="hidden" accept=".xlsx, .xls" multiple onChange={(e) => e.target.files?.length && handleShiftFileProcessing(Array.from(e.target.files))} />

                <div data-debug-id="Header" data-debug-info={JSON.stringify(debugInitialData.Header)}>
                    <Header 
                        onNewFile={handleNewFileClick} 
                        onLoadShiftFile={handleShiftFileClick} 
                        onClearDepartments={handleClearDepartments} 
                        isClearingDepartments={isClearingDepartments} 
                        hasDepartmentData={!!departmentMap} 
                        showNewFileButton={appState === 'dashboard'} 
                        onClearData={handleClearData} 
                        fileInfo={fileInfo}
                        onToggleFilters={() => setIsFilterSidebarOpen(true)}
                    />
                </div>
                
                {status.message && status.type === 'error' && <StatusDisplay status={status} />}
                
                {showLanding && (
                    <LandingPageView 
                        onProcessFile={handleFileProcessing} 
                        configUrl={configUrl} 
                        onConfigUrlChange={setConfigUrl}
                        isDeduplicationEnabled={isDeduplicationEnabled}
                        onDeduplicationChange={handleDeduplicationChange}
                    />
                )}
                
                {showProcessingOverlay && <ProcessingLoader status={status} processingTime={processingTime} />}
                
                <DashboardContext.Provider value={logic as any}>
                    {showDashboard && (
                        <>
                            <main id="dashboard-container" border-slate-200 dark:border-slate-800 ref={dashboardContainerRef}>
                                
                                {processedData.warehouseSummary && processedData.warehouseSummary.length > 0 && (
                                    <div data-debug-id="WarehouseSummary" data-debug-info={JSON.stringify(debugInitialData.WarehouseSummary)}>
                                        <ErrorBoundary name="Tóm tắt kho">
                                            <Suspense fallback={<TableSkeleton />}>
                                                <WarehouseSummary onBatchExport={handleBatchKhoExport} />
                                            </Suspense>
                                        </ErrorBoundary>
                                    </div>
                                )}
                                
                                <div ref={businessOverviewRef} id="business-overview">
                                    <div className="bg-white dark:bg-slate-800 shadow-lg p-5 mb-6 border border-slate-200 dark:border-slate-700 flex justify-between items-center rounded-2xl">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Tổng Quan Kết Quả Kinh Doanh</h2>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{processedData.reportSubTitle}</p>
                                        </div>
                                        <div className="flex items-center gap-2 hide-on-export">
                                            <button onClick={handleBusinessOverviewExport} disabled={isExporting} title="Xuất Ảnh Tổng Quan" className="p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
                                                <Icon name="camera" />
                                            </button>
                                        </div>
                                    </div>

                                    <div data-debug-id="KpiCards" data-debug-info={JSON.stringify(debugInitialData.KpiCards)}>
                                        <ErrorBoundary name="Thẻ KPI">
                                            {isProcessing ? <KpiCardsSkeleton /> : <KpiCards onUnshippedClick={openUnshippedModal} />}
                                        </ErrorBoundary>
                                    </div>

                                    <div className="flex flex-col gap-6">
                                        {visibleComponents.trendChart && (
                                            <div data-debug-id="TrendChart" data-debug-info={JSON.stringify(debugInitialData.TrendChart)} id="trend-chart-section">
                                                <ErrorBoundary name="Biểu đồ xu hướng">
                                                    {isProcessing ? <ChartSkeleton /> : (
                                                        <Suspense fallback={<ChartSkeleton />}>
                                                            <TrendChart />
                                                        </Suspense>
                                                    )}
                                                </ErrorBoundary>
                                            </div>
                                        )}
                                        
                                        {visibleComponents.industryGrid && (
                                            <div data-debug-id="IndustryGrid" data-debug-info={JSON.stringify(debugInitialData.IndustryGrid)} id="industry-grid-section">
                                                <ErrorBoundary name="Lưới ngành hàng">
                                                    {isProcessing ? <ChartSkeleton height="h-[580px]" /> : (
                                                        <Suspense fallback={<ChartSkeleton height="h-[580px]" />}>
                                                            <IndustryGrid />
                                                        </Suspense>
                                                    )}
                                                </ErrorBoundary>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="mt-6">
                                        {visibleComponents.employeeAnalysis && (
                                            <div data-debug-id="EmployeeAnalysis" data-debug-info={JSON.stringify(debugInitialData.EmployeeAnalysis)} id="employee-analysis-section">
                                                <ErrorBoundary name="Phân tích nhân viên">
                                                    {isProcessing ? <TabbedTableSkeleton /> : (
                                                        <Suspense fallback={<TabbedTableSkeleton />}>
                                                            <EmployeeAnalysis />
                                                        </Suspense>
                                                    )}
                                                </ErrorBoundary>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-6 mt-6">
                                    {visibleComponents.summaryTable && (
                                        <div data-debug-id="SummaryTable" data-debug-info={JSON.stringify(debugInitialData.SummaryTable)} id="summary-table-section">
                                            <ErrorBoundary name="Bảng tổng hợp">
                                                {isProcessing ? <TableSkeleton /> : (
                                                    <Suspense fallback={<TableSkeleton />}>
                                                        <SummaryTable />
                                                    </Suspense>
                                                )}
                                            </ErrorBoundary>
                                        </div>
                                    )}
                                </div>
                            </main>
                            <Footer lastUpdated={processedData.lastUpdated} onToggleDebug={() => setIsDebugPanelVisible(p => !p)} />
                            <ChatFab onClick={() => setIsChatOpen(true)} />

                            {/* Right Slide Menu Filters */}
                            <div className={`fixed inset-0 z-[150] transition-opacity duration-300 ${isFilterSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFilterSidebarOpen(false)}></div>
                                <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-500 ease-in-out transform ${isFilterSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                                    <div className="h-full flex flex-col" data-debug-id="FilterSection" data-debug-info={JSON.stringify(debugInitialData.FilterSection)}>
                                        <FilterSection 
                                            options={uniqueFilterOptions} 
                                            visibility={visibleComponents} 
                                            onVisibilityChange={handleVisibilityChange} 
                                            onClose={() => setIsFilterSidebarOpen(false)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {isExporting && <ExportLoader />}
                    <Suspense fallback={null}>
                        {activeModal === 'performance' && processedData && <PerformanceModal isOpen={true} onClose={() => setActiveModal(null)} employeeName={modalData.employeeName} onExport={handleExport}/>}
                        {activeModal === 'unshipped' && processedData && <UnshippedOrdersModal isOpen={true} onClose={() => setActiveModal(null)} onExport={handleExport} />}
                        {isChatOpen && <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} history={chatHistory} isSending={isAiResponding} onSendMessage={handleSendMessage} />}
                    </Suspense>
                </DashboardContext.Provider>
                
                <DebugPanel 
                    isVisible={isDebugPanelVisible} 
                    isInspectorActive={isInspectorActive} 
                    info={debugInfo} 
                    onClose={() => setIsDebugPanelVisible(false)} 
                    onToggleInspector={() => setIsInspectorActive(p => !p)} 
                />
            </div>
        </div>
    );
}
