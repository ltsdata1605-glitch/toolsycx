
import React from 'react';
import type { ProcessedData, FilterState, ProductConfig, DataRow, Employee, EmployeeData } from '../types';
import { DepartmentMap } from '../services/dataService';

interface DashboardContextType {
    processedData: ProcessedData | null;
    filterState: FilterState;
    handleFilterChange: (newFilters: Partial<FilterState>) => void;
    productConfig: ProductConfig | null;
    originalData: DataRow[];
    baseFilteredData: DataRow[];
    departmentMap: DepartmentMap | null;
    employeeAnalysisData: EmployeeData | null;
    openPerformanceModal: (employeeName: string) => void;
    handleBatchExport: (employees: Employee[]) => void;
    handleBatchKhoExport: (element: HTMLElement | null, filenamePrefix: string, options?: any) => Promise<void>;
    handleExport: (element: HTMLElement | null, filename: string, options?: any) => Promise<void>;
    isProcessing: boolean;
    isExporting: boolean;
    uniqueFilterOptions: { kho: string[]; trangThai: string[]; nguoiTao: string[], department: string[] };
    warehouseTargets: Record<string, number>;
    updateWarehouseTarget: (kho: string, target: number) => void;
}

export const DashboardContext = React.createContext<DashboardContextType | undefined>(undefined);

export const useDashboardContext = () => {
    const context = React.useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboardContext must be used within a DashboardProvider');
    }
    return context;
};
