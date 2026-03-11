
import { useState, useCallback, useEffect } from 'react';
import type { FilterState } from '../types';
import * as dbService from '../services/dbService';

export const initialFilterState: FilterState = {
    kho: 'all',
    xuat: 'all',
    trangThai: [],
    nguoiTao: [],
    department: [],
    parent: [],
    startDate: '',
    endDate: '',
    dateRange: 'all',
    industryGrid: {
        selectedGroups: [],
        selectedSubgroups: [],
    },
    summaryTable: {
        child: [],
        manufacturer: [],
        creator: [],
        product: [],
        drilldownOrder: ['parent', 'child', 'creator', 'manufacturer', 'product'],
        sort: { column: 'totalRevenue', direction: 'desc' }
    }
};

export const useFilterState = () => {
    const [filterState, setFilterState] = useState<FilterState>(initialFilterState);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load initial state from IndexedDB
    useEffect(() => {
        const loadSavedFilters = async () => {
            try {
                const savedIndustry = await dbService.getIndustryGridFilters();
                const savedSummary = await dbService.getSummaryTableConfig();
                
                setFilterState(prev => ({
                    ...prev,
                    industryGrid: savedIndustry || prev.industryGrid,
                    summaryTable: savedSummary || prev.summaryTable
                }));
            } catch (error) {
                console.error("Failed to load filters from IndexedDB:", error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadSavedFilters();
    }, []);

    const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
        setFilterState(prev => {
            const updated = { ...prev, ...newFilters };
            
            // Persist changes to IndexedDB
            if (newFilters.industryGrid) {
                const industryGrid = { ...prev.industryGrid, ...newFilters.industryGrid };
                updated.industryGrid = industryGrid;
                dbService.saveIndustryGridFilters(industryGrid).catch(console.error);
            }
            
            if (newFilters.summaryTable) {
                const summaryTable = { ...prev.summaryTable, ...newFilters.summaryTable };
                updated.summaryTable = summaryTable;
                dbService.saveSummaryTableConfig(summaryTable).catch(console.error);
            }
            
            return updated;
        });
    }, []);

    return {
        filterState,
        setFilterState,
        handleFilterChange,
        isFilterLoaded: isLoaded
    };
};
