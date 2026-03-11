
import { useState, useRef } from 'react';
import type { DataRow, Status, AppState, ProductConfig } from '../types';
import { processShiftFile, processSalesFile, DepartmentMap } from '../services/dataService';
import { 
    saveDepartmentMap, clearDepartmentMap, 
    saveSalesData, clearSalesData, 
    clearCustomTabs 
} from '../services/dbService';

interface FileUploadLogicProps {
    isDeduplicationEnabled: boolean;
    originalData: DataRow[];
    setOriginalData: (data: DataRow[]) => void;
    setDepartmentMap: (map: DepartmentMap | null) => void;
    setProcessedData: (data: any) => void;
    setFileInfo: (info: { filename: string; savedAt: string } | null) => void;
    setAppState: (state: AppState) => void;
    setStatus: (status: Status) => void;
}

export const useFileUploadLogic = ({
    isDeduplicationEnabled,
    originalData,
    setOriginalData,
    setDepartmentMap,
    setProcessedData,
    setFileInfo,
    setAppState,
    setStatus
}: FileUploadLogicProps) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isClearingDepartments, setIsClearingDepartments] = useState(false);
    const [processingTime, setProcessingTime] = useState(0);
    const timerRef = useRef<number | undefined>(undefined);

    const startTimer = () => {
        setProcessingTime(0);
        const startTime = Date.now();
        timerRef.current = window.setInterval(() => {
            setProcessingTime(Date.now() - startTime);
        }, 100);
    };

    const stopTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = undefined;
        }
    };

    const handleClearDepartments = async () => {
        setIsClearingDepartments(true);
        try {
            await clearDepartmentMap();
            setDepartmentMap(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsClearingDepartments(false);
        }
    };
    
    const handleClearData = async () => {
        try {
            await clearSalesData();
            await clearCustomTabs();
            setOriginalData([]);
            setProcessedData(null);
            setFileInfo(null);
            setAppState('upload');
        } catch (error) {
            console.error(error);
        }
    };

    const handleShiftFileProcessing = async (files: File[]) => {
        if (files.length === 0) return;
        setAppState('loading');
        setIsProcessing(true);
        setStatus({ message: `Đang xử lý ${files.length} file phân ca...`, type: 'info', progress: 20 });
        try {
            // Note: In a real app, we might want to get the current map from a ref or state passed in
            // For now, we'll just assume it's handled via the setDepartmentMap callback
            let mergedMap: DepartmentMap = {}; 

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setStatus({ message: `Đang xử lý file ${i + 1}/${files.length}: ${file.name}`, type: 'info', progress: 20 + (60 * (i + 1) / files.length) });
                const { map } = await processShiftFile(file); 
                mergedMap = { ...mergedMap, ...map }; 
            }
            
            await saveDepartmentMap(mergedMap);
            setDepartmentMap(mergedMap);
            setStatus({ message: `Đã xử lý và gộp ${files.length} file phân ca!`, type: 'success', progress: 100 });
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Lỗi không xác định";
            setStatus({ message: msg, type: 'error', progress: 0 });
        } finally {
            setIsProcessing(false);
            if(originalData.length > 0) setAppState('dashboard');
            else setAppState('upload');
        }
    };

    const handleFileProcessing = async (file: File) => {
        setAppState('loading');
        setIsProcessing(true);
        startTimer();
        
        setTimeout(async () => {
            try {
                const data = await processSalesFile(file, isDeduplicationEnabled, setStatus);
                
                setStatus({ message: 'Đang lưu dữ liệu...', type: 'info', progress: 95 });
                await saveSalesData(data, file.name);
                setFileInfo({ filename: file.name, savedAt: new Date().toLocaleString('vi-VN') });
                setOriginalData(data);
                setStatus({ message: 'Đang tổng hợp báo cáo...', type: 'info', progress: 98 });
                setAppState('dashboard');
                setIsProcessing(false);
                stopTimer();
            } catch (error) {
                console.error("Lỗi xử lý file:", error);
                const msg = error instanceof Error ? error.message : "Lỗi không xác định";
                setStatus({ message: msg, type: 'error', progress: 0 });
                setAppState('upload');
                setIsProcessing(false);
                stopTimer();
            }
        }, 100);
    };

    return {
        isProcessing,
        isClearingDepartments,
        processingTime,
        handleFileProcessing,
        handleShiftFileProcessing,
        handleClearData,
        handleClearDepartments
    };
};
