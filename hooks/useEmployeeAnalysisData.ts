
import { useState, useEffect, useMemo } from 'react';
import { useDashboardContext } from '../contexts/DashboardContext';
import { getRowValue } from '../utils/dataUtils';
import { COL } from '../constants';
import type { EmployeeData } from '../types';

export const useEmployeeAnalysisData = () => {
    const { 
        employeeAnalysisData, 
        baseFilteredData, 
        productConfig, 
        originalData 
    } = useDashboardContext();

    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
    
    const [deptSearchTerm, setDeptSearchTerm] = useState('');
    const [warehouseSearchTerm, setWarehouseSearchTerm] = useState('');

    const { 
        allIndustries, 
        allSubgroups, 
        allManufacturers, 
        allDepartments, 
        allWarehouses, 
        employeeWarehouseMap 
    } = useMemo(() => {
        if (!productConfig || !originalData || !employeeAnalysisData) {
            return { 
                allIndustries: [], 
                allSubgroups: [], 
                allManufacturers: [], 
                allDepartments: [], 
                allWarehouses: [], 
                employeeWarehouseMap: new Map<string, Set<string>>() 
            };
        }
        
        const industries = new Set(Object.values(productConfig.childToParentMap));
        const subgroups = new Set<string>();
        Object.values(productConfig.subgroups).forEach(parent => {
            Object.keys(parent).forEach(subgroup => subgroups.add(subgroup));
        });
        const manufacturers = new Set<string>(originalData.map(row => String(getRowValue(row, COL.MANUFACTURER) || '')).filter(Boolean));
        const depts = new Set<string>(employeeAnalysisData.fullSellerArray.map(emp => String(emp.department || '')).filter(Boolean));
        
        const warehouses = new Set<string>();
        const empMap = new Map<string, Set<string>>();

        baseFilteredData.forEach(row => {
            const rawKho = getRowValue(row, COL.KHO);
            const empName = getRowValue(row, COL.NGUOI_TAO);
            
            if (rawKho !== undefined && rawKho !== null && rawKho !== '') {
                const kho = String(rawKho).trim();
                warehouses.add(kho);
                
                if (empName) {
                    if (!empMap.has(empName)) {
                        empMap.set(empName, new Set());
                    }
                    empMap.get(empName)!.add(kho);
                }
            }
        });

        return { 
            allIndustries: Array.from(industries).sort(), 
            allSubgroups: Array.from(subgroups).sort(),
            allManufacturers: Array.from(manufacturers).sort(),
            allDepartments: Array.from(depts).sort(),
            allWarehouses: Array.from(warehouses).sort(),
            employeeWarehouseMap: empMap
        };
    }, [productConfig, originalData, employeeAnalysisData, baseFilteredData]);

    // Restore selected departments
    useEffect(() => {
        try {
            const saved = localStorage.getItem('employeeAnalysis_selectedDepartments');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && allDepartments.length > 0) {
                    const validDepts = parsed.filter(d => allDepartments.includes(d));
                    setSelectedDepartments(validDepts);
                }
            }
        } catch (e) {
            console.error("Failed to load selected departments", e);
        }
        if (allDepartments.length > 0 && selectedDepartments.length === 0) {
            setSelectedDepartments(allDepartments);
        }
    }, [allDepartments]);

    // Restore selected warehouses
    useEffect(() => {
        try {
            const saved = localStorage.getItem('employeeAnalysis_selectedWarehouses');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && allWarehouses.length > 0) {
                    const validWarehouses = parsed.filter(w => allWarehouses.includes(w));
                    setSelectedWarehouses(validWarehouses);
                }
            }
        } catch (e) {
            console.error("Failed to load selected warehouses", e);
        }
        if (allWarehouses.length > 0 && selectedWarehouses.length === 0) {
            setSelectedWarehouses(allWarehouses);
        }
    }, [allWarehouses]);

    // Save filters
    useEffect(() => {
        try {
            localStorage.setItem('employeeAnalysis_selectedDepartments', JSON.stringify(selectedDepartments));
        } catch (e) {}
    }, [selectedDepartments]);

    useEffect(() => {
        try {
            localStorage.setItem('employeeAnalysis_selectedWarehouses', JSON.stringify(selectedWarehouses));
        } catch (e) {}
    }, [selectedWarehouses]);

    const filteredEmployeeAnalysisData = useMemo(() => {
        if (!employeeAnalysisData) return null;
        
        const isAllDepartments = selectedDepartments.length === 0 || selectedDepartments.length === allDepartments.length;
        const isAllWarehouses = selectedWarehouses.length === 0 || selectedWarehouses.length === allWarehouses.length;

        if (isAllDepartments && isAllWarehouses) {
            return employeeAnalysisData;
        }

        const filterEmployee = (empName: string, empDept: string) => {
            const deptMatch = selectedDepartments.length === 0 || selectedDepartments.includes(empDept);
            const empWarehouses = employeeWarehouseMap.get(empName);
            const warehouseMatch = selectedWarehouses.length === 0 || 
                                   (empWarehouses && Array.from(empWarehouses).some(w => selectedWarehouses.includes(w)));
            
            if (!empWarehouses && !isAllWarehouses) return false;
            return deptMatch && warehouseMatch;
        };

        const filteredFullSellerArray = employeeAnalysisData.fullSellerArray.filter(emp => filterEmployee(emp.name, emp.department));
        const filteredExploitationData = employeeAnalysisData.exploitationData.filter(emp => filterEmployee(emp.name, emp.department));
        
        // Filter baseFilteredData as well
        const filteredBaseData = baseFilteredData.filter(row => {
            const rawKho = getRowValue(row, COL.KHO);
            const empName = getRowValue(row, COL.NGUOI_TAO);
            const empDept = empName ? (employeeAnalysisData.fullSellerArray.find(e => e.name === empName)?.department || '') : '';
            
            const khoMatch = selectedWarehouses.length === 0 || (rawKho && selectedWarehouses.includes(String(rawKho).trim()));
            const deptMatch = selectedDepartments.length === 0 || selectedDepartments.includes(empDept);
            
            return khoMatch && deptMatch;
        });

        return {
            ...employeeAnalysisData,
            fullSellerArray: filteredFullSellerArray,
            exploitationData: filteredExploitationData,
            filteredBaseData
        } as any;
    }, [employeeAnalysisData, selectedDepartments, selectedWarehouses, allDepartments, allWarehouses, employeeWarehouseMap, baseFilteredData]);

    return {
        allIndustries,
        allSubgroups,
        allManufacturers,
        allDepartments,
        allWarehouses,
        selectedDepartments,
        setSelectedDepartments,
        selectedWarehouses,
        setSelectedWarehouses,
        deptSearchTerm,
        setDeptSearchTerm,
        warehouseSearchTerm,
        setWarehouseSearchTerm,
        filteredEmployeeAnalysisData: filteredEmployeeAnalysisData ? {
            ...filteredEmployeeAnalysisData,
            filteredBaseData: filteredEmployeeAnalysisData.filteredBaseData
        } : null
    };
};
