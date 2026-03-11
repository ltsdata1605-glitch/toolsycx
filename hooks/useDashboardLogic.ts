
import { useState, useEffect, useCallback } from 'react';
import type { Status, AppState } from '../types';

// Import specialized hooks
import { useAiChatLogic } from './useAiChatLogic';
import { useExportLogic } from './useExportLogic';
import { useFileUploadLogic } from './useFileUploadLogic';
import { useFilterState } from './useFilterState';
import { useDataManagement } from './useDataManagement';
import { useWarehouseTargets } from './useWarehouseTargets';

export const useDashboardLogic = () => {
    const [status, setStatus] = useState<Status>({ message: '', type: 'info', progress: 0 });
    const [appState, setAppState] = useState<AppState>('loading');
    const [configUrl, setConfigUrl] = useState('https://docs.google.com/spreadsheets/d/e/2PACX-1vRhes_lcas8n2_xYHKylsjyD3PIVbdchCiL2XDKJ4OYfgUZlVjAT7ZGWDHrYRzQVrK2w50W86Da3l48/pub?output=csv');
    const [isDeduplicationEnabled, setIsDeduplicationEnabled] = useState(true);
    const [activeModal, setActiveModal] = useState<'performance' | 'unshipped' | null>(null);
    const [modalData, setModalData] = useState<any>(null);

    // 1. Filter State Management
    const { filterState, setFilterState, handleFilterChange, isFilterLoaded } = useFilterState();

    // 2. Data Management (Loading, Processing, Unique Options)
    const {
        originalData, setOriginalData,
        baseFilteredData,
        departmentMap, setDepartmentMap,
        productConfig, setProductConfig,
        processedData, setProcessedData,
        employeeAnalysisData,
        warehouseTargets, setWarehouseTargets,
        uniqueFilterOptions,
        isInternalProcessing,
        fileInfo, setFileInfo
    } = useDataManagement({ filterState, configUrl, setStatus, setAppState });

    // 3. Warehouse Targets Management
    const { handleSaveWarehouseTargets } = useWarehouseTargets(setWarehouseTargets);

    // 4. AI Chat Logic
    const {
        isChatOpen, setIsChatOpen, chatHistory, isAiResponding, handleSendMessage
    } = useAiChatLogic(processedData);

    // 5. File Upload Logic
    const {
        isProcessing: isFileProcessing,
        isClearingDepartments,
        processingTime,
        handleFileProcessing,
        handleShiftFileProcessing,
        handleClearData,
        handleClearDepartments
    } = useFileUploadLogic({
        isDeduplicationEnabled,
        originalData,
        setOriginalData,
        setDepartmentMap,
        setProcessedData,
        setFileInfo,
        setAppState,
        setStatus
    });

    // 6. Export Logic
    const {
        isExporting, handleExport, handleBatchExport, handleBatchKhoExport
    } = useExportLogic({
        productConfig,
        processedData,
        uniqueFilterOptions,
        filterState,
        handleFilterChange,
        setStatus
    });

    // Filter Options Setup Effect - Only overwrite if empty to avoid resetting user preferences
    useEffect(() => {
        if (originalData.length > 0 && isFilterLoaded) {
            setFilterState(prev => {
                const newState = { ...prev };
                if (newState.trangThai.length === 0) newState.trangThai = uniqueFilterOptions.trangThai;
                if (newState.nguoiTao.length === 0) newState.nguoiTao = uniqueFilterOptions.nguoiTao;
                if (newState.department.length === 0) newState.department = uniqueFilterOptions.department;
                return newState;
            });
        }
    }, [originalData, uniqueFilterOptions, isFilterLoaded, setFilterState]);
    
    const openPerformanceModal = (employeeName: string) => {
        setModalData({ employeeName });
        setActiveModal('performance');
    };

    const openUnshippedModal = () => setActiveModal('unshipped');

    const handleDeduplicationChange = (enabled: boolean) => {
        setIsDeduplicationEnabled(enabled);
    };

    const updateWarehouseTarget = (kho: string, target: number) => {
        handleSaveWarehouseTargets({ ...warehouseTargets, [kho]: target });
    };
    
    const isProcessing = isInternalProcessing || isFileProcessing;

    return {
        status, appState, isProcessing, isClearingDepartments, isExporting, fileInfo,
        departmentMap, originalData, baseFilteredData, productConfig, processedData, employeeAnalysisData,
        configUrl, setConfigUrl, uniqueFilterOptions,
        filterState, handleFilterChange,
        activeModal, setActiveModal, modalData,
        isChatOpen, setIsChatOpen, chatHistory, isAiResponding,
        handleClearDepartments, handleClearData, handleShiftFileProcessing, handleFileProcessing,
        handleSendMessage, openPerformanceModal, openUnshippedModal, handleExport,
        handleBatchExport,
        handleBatchKhoExport,
        isDeduplicationEnabled,
        handleDeduplicationChange,
        processingTime,
        warehouseTargets,
        updateWarehouseTarget
    };
};

