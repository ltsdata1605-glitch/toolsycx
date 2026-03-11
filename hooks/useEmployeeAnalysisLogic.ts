
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CustomContestTab, ContestTableConfig, ColumnConfig, Employee } from '../types';
import { getCustomTabs, saveCustomTabs, getIndustryAnalysisCustomTables, saveIndustryAnalysisCustomTables } from '../services/dbService';

export const useEmployeeAnalysisLogic = (activeTab: string, setActiveTab: (id: string) => void, defaultTabs: any[]) => {
    const [customTabs, setCustomTabs] = useState<CustomContestTab[]>([]);
    const [industryAnalysisTables, setIndustryAnalysisTables] = useState<ContestTableConfig[]>([]);
    const [isInitialTabsLoaded, setIsInitialTabsLoaded] = useState(false);
    
    // Modal state management
    const [modalState, setModalState] = useState<{
        type: 'CREATE_TAB' | 'EDIT_TAB' | 'CREATE_TABLE' | 'EDIT_TABLE' | 'CREATE_COLUMN' | 'EDIT_COLUMN' | 'CONFIRM_DELETE_TAB' | 'CONFIRM_DELETE_TABLE' | 'CONFIRM_DELETE_COLUMN' | null, 
        data?: any
    }>({type: null});
    
    const [isClosingModal, setIsClosingModal] = useState(false);

    // Load tabs from DB on mount
    useEffect(() => {
        const loadData = async () => {
            const savedTabs = await getCustomTabs();
            if (savedTabs) {
                const migratedTabs = savedTabs.map(tab => ({
                    ...tab,
                    icon: tab.icon || 'bar-chart-3'
                }));
                setCustomTabs(migratedTabs);
            }
            const savedIndustryTables = await getIndustryAnalysisCustomTables();
            if (savedIndustryTables) {
                setIndustryAnalysisTables(savedIndustryTables);
            }
            setIsInitialTabsLoaded(true);
        };
        loadData();
    }, []);

    // Save tabs to DB on change
    useEffect(() => {
        if (isInitialTabsLoaded) {
            saveCustomTabs(customTabs);
            saveIndustryAnalysisCustomTables(industryAnalysisTables);
        }
    }, [customTabs, industryAnalysisTables, isInitialTabsLoaded]);

    const getIconForTabName = (name: string): string => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('sim')) return 'smartphone-nfc';
        if (lowerName.includes('bảo hiểm')) return 'shield-check';
        if (lowerName.includes('đồng hồ')) return 'watch';
        if (lowerName.includes('camera')) return 'camera';
        if (lowerName.includes('gia dụng') || lowerName.includes('nước') || lowerName.includes('quạt') || lowerName.includes('nồi')) return 'blender';
        if (lowerName.includes('doanh thu')) return 'dollar-sign';
        if (lowerName.includes('top')) return 'award';
        if (lowerName.includes('phụ kiện')) return 'headphones';
        if (lowerName.includes('laptop')) return 'laptop';
        return 'bar-chart-3';
    };

    // --- MODAL SAVE HANDLERS ---
    const handleSaveTab = useCallback((tabName: string, icon: string, tabId?: string) => {
        if (tabId) {
            setCustomTabs(prev => prev.map(t => t.id === tabId ? { ...t, name: tabName, icon: icon || t.icon } : t));
        } else {
            const newTab: CustomContestTab = {
                id: `tab-${Date.now()}`,
                name: tabName,
                icon: icon || getIconForTabName(tabName),
                tables: []
            };
            setCustomTabs(prev => [...prev, newTab]);
            setActiveTab(newTab.id);
        }
        setIsClosingModal(true);
    }, [setActiveTab]);

    const handleSaveTable = useCallback((tableName: string, defaultSortColumnId?: string) => {
        const { tabId, tableId } = modalState.data || {};
        if (!tabId) return;

        const tableUpdater = (prevTables: ContestTableConfig[]) => {
            if (tableId) { // Editing existing table
                return prevTables.map(t => t.id === tableId ? { ...t, tableName, defaultSortColumnId: defaultSortColumnId || t.defaultSortColumnId } : t);
            } else { // Creating new table
                const newTable: ContestTableConfig = { id: `table-${Date.now()}`, tableName, columns: [], defaultSortColumnId: defaultSortColumnId || undefined };
                return [...prevTables, newTable];
            }
        };

        if (tabId === 'industryAnalysis') {
            setIndustryAnalysisTables(tableUpdater);
        } else {
            setCustomTabs(prevTabs => {
                const newTabs = [...prevTabs];
                const tabIndex = newTabs.findIndex(t => t.id === tabId);
                if (tabIndex === -1) return prevTabs;

                const updatedTab = { ...newTabs[tabIndex], tables: tableUpdater(newTabs[tabIndex].tables) };
                newTabs[tabIndex] = updatedTab;
                return newTabs;
            });
        }
        setIsClosingModal(true);
    }, [modalState.data]);

    const handleSaveColumn = useCallback((columnConfig: ColumnConfig) => {
        const { tabId, tableId } = modalState.data || {};
        if (!tabId || !tableId) return;

        const columnUpdater = (prevTables: ContestTableConfig[]) => {
            const newTables = [...prevTables];
            const tableIndex = newTables.findIndex(t => t.id === tableId);
            if (tableIndex === -1) return prevTables;

            const updatedTable = { ...newTables[tableIndex] };
            const columnIndex = updatedTable.columns.findIndex(c => c.id === columnConfig.id);

            if (columnIndex > -1) { // Editing
                updatedTable.columns[columnIndex] = columnConfig;
            } else { // Creating
                updatedTable.columns.push(columnConfig);
            }
            newTables[tableIndex] = updatedTable;
            return newTables;
        };
        
        if (tabId === 'industryAnalysis') {
            setIndustryAnalysisTables(columnUpdater);
        } else {
            setCustomTabs(prev => {
                const newTabs = [...prev];
                const tabIndex = newTabs.findIndex(t => t.id === tabId);
                if (tabIndex === -1) return prev;
                
                const updatedTab = { ...newTabs[tabIndex], tables: columnUpdater(newTabs[tabIndex].tables) };
                newTabs[tabIndex] = updatedTab;
                return newTabs;
            });
        }
        
        if (modalState.data?.editingColumn) {
            setIsClosingModal(true);
        }
    }, [modalState.data]);

    // --- MODAL DELETE HANDLERS ---
    const handleDeleteTab = useCallback(() => {
        if (modalState.data?.tabId) {
            const tabIdToDelete = modalState.data.tabId;
            setCustomTabs(prev => prev.filter(t => t.id !== tabIdToDelete));
            
            if (activeTab === tabIdToDelete) {
                const allTabIds = defaultTabs.map(t => t.id);
                const remainingCustomIds = customTabs.filter(t => t.id !== tabIdToDelete).map(t => t.id);
                setActiveTab(remainingCustomIds[0] || allTabIds[0]);
            }
            setIsClosingModal(true);
        }
    }, [modalState.data, activeTab, defaultTabs, customTabs, setActiveTab]);
    
    const handleDeleteTable = useCallback(() => {
        if (modalState.data?.tabId && modalState.data?.tableId) {
            const { tabId, tableId } = modalState.data;

            if (tabId === 'industryAnalysis') {
                setIndustryAnalysisTables(prev => prev.filter(t => t.id !== tableId));
            } else {
                setCustomTabs(prev => {
                    const newTabs = [...prev];
                    const tabIndex = newTabs.findIndex(t => t.id === tabId);
                    if (tabIndex > -1) {
                        const updatedTab = { ...newTabs[tabIndex] };
                        updatedTab.tables = updatedTab.tables.filter(t => t.id !== tableId);
                        newTabs[tabIndex] = updatedTab;
                    }
                    return newTabs;
                });
            }
            setIsClosingModal(true);
        }
    }, [modalState.data]);
    
    const handleConfirmDeleteColumn = useCallback(() => {
        if (modalState.data?.tabId && modalState.data?.tableId && modalState.data?.columnId) {
            const { tabId, tableId, columnId } = modalState.data;

            const columnDeleter = (prevTables: ContestTableConfig[]) => {
                const newTables = [...prevTables];
                const tableIndex = newTables.findIndex(t => t.id === tableId);
                if (tableIndex > -1) {
                    const updatedTable = { ...newTables[tableIndex] };
                    updatedTable.columns = updatedTable.columns.filter(c => c.id !== columnId);
                    newTables[tableIndex] = updatedTable;
                }
                return newTables;
            };

            if (tabId === 'industryAnalysis') {
                setIndustryAnalysisTables(columnDeleter);
            } else {
                setCustomTabs(prev => {
                    const newTabs = [...prev];
                    const tabIndex = newTabs.findIndex(t => t.id === tabId);
                    if (tabIndex > -1) {
                        const updatedTab = { ...newTabs[tabIndex], tables: columnDeleter(newTabs[tabIndex].tables) };
                        newTabs[tabIndex] = updatedTab;
                    }
                    return newTabs;
                });
            }
            setIsClosingModal(true);
        }
    }, [modalState.data]);

    return {
        customTabs,
        industryAnalysisTables,
        isInitialTabsLoaded,
        modalState,
        setModalState,
        isClosingModal,
        setIsClosingModal,
        handleSaveTab,
        handleSaveTable,
        handleSaveColumn,
        handleDeleteTab,
        handleDeleteTable,
        handleConfirmDeleteColumn
    };
};
