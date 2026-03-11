
import type { DataRow, ProductConfig, Status } from '../types';
import { getRowValue, parseExcelDate } from '../utils/dataUtils';
import { COL } from '../constants';
import * as XLSX from 'xlsx';

type StatusUpdater = (status: Status) => void;

export type DepartmentMap = { [employeeId: string]: string };

function robustCsvParse(text: string): string[][] {
    const lines = text.split(/\r?\n/);
    const result: string[][] = [];

    for (const line of lines) {
        if (!line.trim()) continue;

        const row: string[] = [];
        let cell = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                    // Handle escaped quote ""
                    cell += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                row.push(cell.trim());
                cell = '';
            } else {
                cell += char;
            }
        }
        row.push(cell.trim());
        result.push(row);
    }
    return result;
}


export async function loadConfigFromSheet(url: string, setStatus: StatusUpdater): Promise<ProductConfig> {
    setStatus({ message: 'Đang tải file cấu hình...', type: 'info', progress: 0 });
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Không thể tải file cấu hình. Status: ${response.status}`);
        }
        const csvText = await response.text();
        setStatus({ message: 'Đang xử lý file cấu hình...', type: 'info', progress: 50 });
        
        const parsedRows = robustCsvParse(csvText);

        if (parsedRows.length < 2) {
             throw new Error('File cấu hình không hợp lệ hoặc không có dữ liệu.');
        }
        
        const headers = parsedRows[0].map(h => h.trim());
        const data = parsedRows.slice(1);

        const config: ProductConfig = {
            groups: {},
            subgroups: {},
            childToParentMap: {},
            childToSubgroupMap: {}
        };

        const groupIndex = headers.indexOf('NhomCha');
        const subgroupIndex = headers.indexOf('NhomCon');
        const productCodeIndex = headers.indexOf('NhomHang');
        
        if (groupIndex === -1 || subgroupIndex === -1 || productCodeIndex === -1) {
            console.error('Headers found:', headers);
            throw new Error('File cấu hình thiếu các cột bắt buộc: NhomCha, NhomCon, NhomHang');
        }

        data.forEach(row => {
            if (row.length > Math.max(groupIndex, subgroupIndex, productCodeIndex)) {
                const parentGroup = row[groupIndex];
                const childGroup = row[subgroupIndex];
                const productCode = row[productCodeIndex];

                if (parentGroup && childGroup && productCode) {
                    if (!config.groups[parentGroup]) {
                        config.groups[parentGroup] = new Set();
                    }
                    config.groups[parentGroup].add(productCode);

                    if (!config.subgroups[parentGroup]) {
                        config.subgroups[parentGroup] = {};
                    }
                    if (!config.subgroups[parentGroup][childGroup]) {
                        config.subgroups[parentGroup][childGroup] = [];
                    }
                    config.subgroups[parentGroup][childGroup].push(productCode);
                    
                    config.childToParentMap[productCode] = parentGroup;
                    config.childToSubgroupMap[productCode] = childGroup;
                }
            }
        });
        
        if (Object.keys(config.groups).length === 0) {
            throw new Error("Không thể xử lý dữ liệu từ file cấu hình. Vui lòng kiểm tra định dạng.");
        }

        setStatus({ message: 'Tải cấu hình thành công.', type: 'success', progress: 100 });
        return config;
    } catch (error) {
        console.error("Lỗi khi tải cấu hình:", error);
        const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định khi tải cấu hình";
        setStatus({ message: errorMessage, type: 'error', progress: 0 });
        throw error;
    }
}

export async function processShiftFile(file: File): Promise<{ map: DepartmentMap, uniqueDepartments: string[] }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                if (!e.target?.result) throw new Error("Không thể đọc file phân ca.");
                
                const data = new Uint8Array(e.target.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

                const map: DepartmentMap = {};
                let currentDepartment: string | null = null;
                const departments = new Set<string>();

                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (row[0] && typeof row[0] === 'string' && row[0].trim() !== '') {
                        currentDepartment = row[0].trim();
                    }
                    
                    const userId = row[1];

                    if (userId && currentDepartment) {
                        const userIdStr = String(userId).trim();
                        // Handle generic ID extraction to be robust against various separators
                        const idMatch = userIdStr.match(/^(\d+)/);
                        const cleanId = idMatch ? idMatch[1] : userIdStr.split(' - ')[0].trim();
                        
                        if (cleanId) {
                             // Always store the full string to preserve name information
                             // Previously this was conditional on ' - ', which caused issues with non-standard separators
                             const storedValue = `${currentDepartment};;${userIdStr}`;
                             map[cleanId] = storedValue;
                             departments.add(currentDepartment);
                        }
                    }
                }
                
                if (Object.keys(map).length === 0) {
                    throw new Error("File phân ca không hợp lệ hoặc không chứa dữ liệu nhân viên và bộ phận.");
                }

                resolve({ map, uniqueDepartments: Array.from(departments).sort() });

            } catch (error) {
                console.error("Lỗi khi xử lý file phân ca:", error);
                const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định khi xử lý file phân ca";
                reject(new Error(errorMessage));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Xử lý file YCX trực tiếp trên Main Thread (Tốc độ cao cho file < 50MB)
 * Thay thế Worker để tránh overhead load thư viện.
 */
export async function processSalesFile(file: File, enableDeduplication: boolean, setStatus: StatusUpdater): Promise<DataRow[]> {
    setStatus({ message: 'Đang đọc file...', type: 'info', progress: 10 });
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        
        setStatus({ message: 'Đang phân tích Excel...', type: 'info', progress: 30 });
        const data = new Uint8Array(arrayBuffer);
        // Use dense mode for memory efficiency
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, dense: true });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        setStatus({ message: 'Đang chuyển đổi dữ liệu...', type: 'info', progress: 50 });
        const json: DataRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        let processedList: DataRow[] = json;

        if (enableDeduplication) {
            setStatus({ message: 'Đang xóa dữ liệu trùng...', type: 'info', progress: 70 });
            const uniqueSet = new Set<string>();
            const deduplicated: DataRow[] = [];
            
            const len = json.length;
            for (let i = 0; i < len; i++) {
                const row = json[i];
                let signature = '';
                // Fast signature generation
                for (const key in row) {
                    if (key !== 'STT_1') {
                        signature += row[key] + '§'; 
                    }
                }

                if (!uniqueSet.has(signature)) {
                    uniqueSet.add(signature);
                    deduplicated.push(row);
                }
            }
            processedList = deduplicated;
            uniqueSet.clear(); 
        }

        setStatus({ message: 'Đang chuẩn hóa dữ liệu...', type: 'info', progress: 90 });
        
        const validResults: DataRow[] = [];
        const len = processedList.length;

        for (let i = 0; i < len; i++) {
            const row = processedList[i];
            
            // Inline validation logic
            const trangThaiHuy = (getRowValue(row, COL.TRANG_THAI_HUY) || '').toString();
            if (trangThaiHuy.length !== 8 && trangThaiHuy.toLowerCase().trim() !== 'chưa hủy') continue;
            
            const nhapTra = (getRowValue(row, COL.TINH_TRANG_NHAP_TRA) || '').toString();
            if (nhapTra.length !== 8 && nhapTra.toLowerCase().trim() !== 'chưa trả') continue;

            const thuTien = (getRowValue(row, COL.TRANG_THAI_THU_TIEN) || '').toString();
            if (thuTien.length !== 6 && thuTien.toLowerCase().trim() !== 'đã thu') continue;

            // Normalize Date
            const parsedDate = parseExcelDate(getRowValue(row, COL.DATE_CREATED));
            if (parsedDate && !isNaN(parsedDate.getTime())) {
                row.parsedDate = parsedDate;
                validResults.push(row);
            }
        }

        if (validResults.length === 0) {
            throw new Error("Không tìm thấy dữ liệu hợp lệ (Chưa hủy, Chưa trả, Đã thu) hoặc lỗi ngày tháng.");
        }

        setStatus({ message: 'Hoàn tất xử lý.', type: 'success', progress: 100 });
        return validResults;

    } catch (error) {
        console.error("Lỗi xử lý file:", error);
        throw error;
    }
}
