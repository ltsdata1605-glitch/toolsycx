
import * as XLSX from 'xlsx';
import type { DataRow, Status } from '../types';
import { getRowValue, parseExcelDate } from '../utils/dataUtils';
import { COL } from '../constants';

interface WorkerMessage {
    file: File;
    enableDeduplication: boolean;
}

// The worker's message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
    const { file, enableDeduplication } = event.data;
    processFileInWorker(file, enableDeduplication);
};

// This function is adapted from dataService.ts
async function processFileInWorker(file: File, enableDeduplication: boolean) {
    const postStatus = (status: Status) => {
        self.postMessage({ type: 'progress', payload: status });
    };

    try {
        postStatus({ message: 'Đang đọc file (nền)...', type: 'info', progress: 0 });
        const arrayBuffer = await file.arrayBuffer();

        postStatus({ message: 'Đang phân tích cấu trúc Excel (nền)...', type: 'info', progress: 20 });
        const data = new Uint8Array(arrayBuffer);
        
        // OPTIMIZATION 1: Enable 'dense' mode. 
        // This creates dense arrays instead of sparse objects, significantly reducing memory usage for large files.
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, dense: true });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        postStatus({ message: 'Đang chuyển đổi dữ liệu JSON (nền)...', type: 'info', progress: 40 });
        const json: DataRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        let processedList: DataRow[] = json;

        // OPTIMIZATION 2: Ultra-fast Deduplication
        if (enableDeduplication) {
            postStatus({ message: 'Đang loại bỏ dữ liệu trùng lặp (siêu tốc)...', type: 'info', progress: 60 });
            
            const uniqueSet = new Set<string>();
            const deduplicated: DataRow[] = [];
            
            // Pre-calculate column keys to avoid repeated object access overhead if possible,
            // but for safety with dynamic excel, we iterate row keys.
            // Using string concatenation is ~10x faster than JSON.stringify for this purpose.
            const len = json.length;
            for (let i = 0; i < len; i++) {
                const row = json[i];
                let signature = '';
                
                // Fast signature generation skipping 'STT_1'
                for (const key in row) {
                    if (key !== 'STT_1') {
                        // Use a separator that is unlikely to be in data
                        signature += row[key] + '§'; 
                    }
                }

                if (!uniqueSet.has(signature)) {
                    uniqueSet.add(signature);
                    deduplicated.push(row);
                }
            }
            processedList = deduplicated;
            // Clear memory immediately
            uniqueSet.clear(); 
        } else {
            postStatus({ message: 'Bỏ qua bước xóa trùng...', type: 'info', progress: 60 });
        }

        postStatus({ message: 'Đang lọc và chuẩn hóa dữ liệu...', type: 'info', progress: 80 });

        // OPTIMIZATION 3: Single-pass validation and mapping
        // Pre-compute lowercase check strings to avoid repetitive .toLowerCase() calls
        const validResults: DataRow[] = [];
        const len = processedList.length;

        for (let i = 0; i < len; i++) {
            const row = processedList[i];
            
            // Inline validation for speed
            const trangThaiHuy = (getRowValue(row, COL.TRANG_THAI_HUY) || '').toString();
            // Check length first to fail fast, then string content
            if (trangThaiHuy.length !== 8 && trangThaiHuy.toLowerCase().trim() !== 'chưa hủy') continue;
            
            const nhapTra = (getRowValue(row, COL.TINH_TRANG_NHAP_TRA) || '').toString();
            if (nhapTra.length !== 8 && nhapTra.toLowerCase().trim() !== 'chưa trả') continue;

            const thuTien = (getRowValue(row, COL.TRANG_THAI_THU_TIEN) || '').toString();
            if (thuTien.length !== 6 && thuTien.toLowerCase().trim() !== 'đã thu') continue;

            // Normalize Date
            const parsedDate = parseExcelDate(getRowValue(row, COL.DATE_CREATED));
            if (parsedDate && !isNaN(parsedDate.getTime())) {
                // Mutate the object directly is faster than spreading {...row}
                row.parsedDate = parsedDate;
                validResults.push(row);
            }
        }

        if (validResults.length === 0) {
            throw new Error("Không tìm thấy dữ liệu hợp lệ (Chưa hủy, Chưa trả, Đã thu) hoặc lỗi định dạng ngày tháng.");
        }

        postStatus({ message: 'Hoàn tất xử lý (đang chuyển dữ liệu)...', type: 'info', progress: 95 });

        // Post the final result back to the main thread
        // Note: Transferable objects (ArrayBuffer) would be faster, but require restructuring the whole app data flow.
        // For now, sending the object is the bottleneck but necessary.
        self.postMessage({ type: 'result', payload: validResults });

    } catch (error) {
        console.error("Lỗi khi xử lý file trong worker:", error);
        const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định khi xử lý file";
        self.postMessage({ type: 'error', payload: `Lỗi: ${errorMessage}` });
    }
}
