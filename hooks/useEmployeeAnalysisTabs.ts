
import { useState, useEffect, useCallback } from 'react';

export const useEmployeeAnalysisTabs = (allAvailableTabs: any[], isInitialTabsLoaded: boolean, activeTab: string, setActiveTab: (id: string) => void) => {
    const [visibleTabs, setVisibleTabs] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('employeeAnalysis_visibleTabs');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    return new Set(parsed);
                }
            }
        } catch (e) {
            console.error("Failed to load visible tabs from localStorage", e);
        }
        return new Set();
    });
    
    useEffect(() => {
        if (isInitialTabsLoaded) {
            const savedStateExists = localStorage.getItem('employeeAnalysis_visibleTabs') !== null;
            const allIds = new Set(allAvailableTabs.map(t => t.id));

            if (!savedStateExists && visibleTabs.size === 0) {
                setVisibleTabs(allIds);
            } else {
                setVisibleTabs(prev => {
                    const newSet = new Set(prev);
                    let hasChanged = false;
                    allIds.forEach(id => {
                        if (!prev.has(id)) {
                            newSet.add(id);
                            hasChanged = true;
                        }
                    });
                    prev.forEach(id => {
                        if (!allIds.has(id)) {
                            newSet.delete(id);
                            hasChanged = true;
                        }
                    });
                    return hasChanged ? newSet : prev;
                });
            }
        }
    }, [isInitialTabsLoaded, allAvailableTabs]);

    useEffect(() => {
        if (isInitialTabsLoaded && visibleTabs.size > 0) {
            try {
                localStorage.setItem('employeeAnalysis_visibleTabs', JSON.stringify(Array.from(visibleTabs)));
            } catch (e) {
                console.error("Failed to save visible tabs to localStorage", e);
            }
        }
    }, [visibleTabs, isInitialTabsLoaded]);

    const handleToggleTabVisibility = useCallback((tabId: string) => {
        setVisibleTabs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tabId)) {
                if (newSet.size === 1) return prev;
                newSet.delete(tabId);
            } else {
                newSet.add(tabId);
            }
            if (activeTab === tabId && !newSet.has(tabId)) {
                const firstVisibleId = allAvailableTabs.find(t => newSet.has(t.id))?.id;
                if (firstVisibleId) setActiveTab(firstVisibleId);
            }
            return newSet;
        });
    }, [activeTab, allAvailableTabs, setActiveTab]);

    return {
        visibleTabs,
        handleToggleTabVisibility
    };
};
