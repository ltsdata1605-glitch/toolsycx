
import { GoogleGenAI, Chat } from "@google/genai";
import type { ProcessedData, Employee, KpiData, TrendData, EmployeeData, ExploitationData, AnalysisRecord } from '../types';

// Initialize the AI client lazily to prevent crashing if the API key is missing during module load.
let aiInstance: GoogleGenAI | null = null;

function getAi(): GoogleGenAI {
    if (!aiInstance) {
        const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not defined in environment variables.");
        }
        aiInstance = new GoogleGenAI({ apiKey });
    }
    return aiInstance;
}

/**
 * Creates and initializes a new chat session with the Gemini model.
 * @param data The processed data from the dashboard to be used as context.
 * @returns An initialized Chat instance.
 */
export function createChatSession(data: ProcessedData): Chat {
    const ai = getAi();
    const systemInstruction = `You are a helpful AI assistant for a sales dashboard named 'Dashboard Phân Tích Bán Hàng'.
Your goal is to help users understand their sales data.
Use the provided JSON data to answer user questions. Be concise, friendly, and answer in Vietnamese.
All monetary values are in Vietnamese Dong (VND). Format large numbers in a readable way (e.g., 1.5 Tỷ, 250 Tr).
Do not just repeat the data, provide insightful summaries.
When referring to yourself, use "Trợ lý AI".
IMPORTANT: You MUST answer all questions and follow all instructions in Vietnamese. Do not use English under any circumstances.`;

    // We send a summarized version of the data to be more token-efficient
    const modelData = {
        kpis: data.kpis,
        top5Industries: data.industryData.slice(0, 5),
        top5SellersByRevenueQD: data.employeeData.fullSellerArray
            .sort((a, b) => b.doanhThuQD - a.doanhThuQD)
            .slice(0, 5)
            .map(e => ({ name: e.name, doanhThuQD: e.doanhThuQD, hieuQuaValue: e.hieuQuaValue })),
        reportSubTitle: data.reportSubTitle,
        grandTotal: data.summaryTable.grandTotal
    };

    // The initial history primes the model with the data and a confirmation.
    // This makes the first user interaction smoother.
    const initialHistory = [
        {
            role: 'user',
            parts: [{ text: `Đây là dữ liệu tổng quan hiện tại trên dashboard: ${JSON.stringify(modelData)}. Hãy ghi nhớ và sử dụng dữ liệu này để trả lời các câu hỏi. Hãy xác nhận rằng bạn đã sẵn sàng bằng tiếng Việt.` }],
        },
        {
            role: 'model',
            parts: [{ text: `Tôi đã sẵn sàng. Bạn muốn biết thông tin gì về dữ liệu bán hàng?` }],
        }
    ];

    return ai.chats.create({
        // Use correct model name gemini-3-flash-preview for text tasks
        model: 'gemini-3-flash-preview',
        config: { systemInstruction },
        history: initialHistory,
    });
}


/**
 * Generates a brief, insightful summary based on key performance indicators.
 * @param kpis The KPI data object.
 * @returns A string containing the AI-generated summary.
 */
export async function getKpiSummary(kpis: KpiData): Promise<string> {
    const ai = getAi();
    const prompt = `Dựa vào dữ liệu KPI này: ${JSON.stringify(kpis)}, hãy viết một nhận xét ngắn gọn (2-3 câu) bằng tiếng Việt về tình hình kinh doanh tổng quan. Nhấn mạnh vào các điểm tốt và các điểm cần cải thiện. Ví dụ: "Doanh thu quy đổi đạt X, vượt trội nhờ hiệu quả quy đổi cao (Y%). Tuy nhiên, tỷ lệ trả chậm đang ở mức Z%, cao hơn mục tiêu."`;
    
    try {
        const response = await ai.models.generateContent({
            // Use gemini-3-flash-preview for simple text tasks
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        // Access .text property directly
        return response.text || "Không thể tạo nhận xét.";
    } catch (error) {
        console.error("AI KPI Summary error:", error);
        return "Không thể tạo nhận xét tự động vào lúc này.";
    }
}

/**
 * Analyzes trend data to find patterns or anomalies.
 * @param trendData The trend data from the dashboard.
 * @param view The current view type ('shift', 'daily', 'weekly', 'monthly').
 * @returns A string containing the AI-generated analysis.
 */
export async function getTrendAnalysis(trendData: TrendData, view: string): Promise<string> {
    const ai = getAi();
    const viewType = view === 'shift' ? 'theo ca' : view === 'daily' ? 'theo ngày' : view === 'weekly' ? 'theo tuần' : 'theo tháng';
    const dataSample = JSON.stringify(view === 'shift' ? trendData.shifts : trendData.daily);

    const prompt = `Dựa vào dữ liệu xu hướng doanh thu sau đây (xem ${viewType}): ${dataSample}. Hãy đưa ra phân tích ngắn gọn bằng tiếng Việt về các xu hướng, quy luật, hoặc điểm bất thường đáng chú ý. Ví dụ: "Doanh thu có xu hướng tăng mạnh vào cuối tuần... Có sự sụt giảm bất thường vào ngày X..."`;

    try {
        const response = await ai.models.generateContent({
            // Use gemini-3-flash-preview
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        // Access .text property directly
        return response.text || "Không thể phân tích dữ liệu.";
    } catch (error) {
        console.error("AI Trend Analysis error:", error);
        return "Không thể phân tích xu hướng vào lúc này.";
    }
}

/**
 * Generates a short, actionable suggestion for an employee based on their metrics.
 * @param employee The employee data object.
 * @returns A string containing the AI-generated suggestion.
 */
export async function getEmployeeSuggestion(employee: Employee): Promise<string> {
    const ai = getAi();
    const simplifiedEmployee = {
        hieuQuaValue: employee.hieuQuaValue,
        traChamPercent: employee.traChamPercent,
        doanhThuQD: employee.doanhThuQD,
    };
    
    const prompt = `Một nhân viên có các chỉ số hiệu suất sau: ${JSON.stringify(simplifiedEmployee)}. 
    Dựa vào đây, hãy đưa ra một gợi ý hành động ngắn gọn (tối đa 15 từ) bằng tiếng Việt để giúp họ cải thiện.
    - Nếu 'hieuQuaValue' (Hiệu quả QĐ) thấp hơn 35, gợi ý "Tập trung bán thêm phụ kiện, gia dụng."
    - Nếu 'traChamPercent' (Tỷ lệ trả góp) thấp hơn 40, gợi ý "Cần đẩy mạnh tư vấn trả góp."
    - Nếu các chỉ số đều tốt, hãy khen ngợi, ví dụ "Phát huy tốt, có thể chia sẻ kinh nghiệm."
    Chỉ trả về câu gợi ý, không thêm bất kỳ lời dẫn nào.`;
    
    try {
        const response = await ai.models.generateContent({
            // Use gemini-3-flash-preview
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        // Access .text property directly
        return response.text || "Không có gợi ý.";
    } catch (error) {
        console.error("AI Employee Suggestion error:", error);
        return "Lỗi khi tạo gợi ý.";
    }
}

export async function getTopSellerAnalysis(sellers: Employee[], history: AnalysisRecord[]): Promise<string> {
    const ai = getAi();
    const getIdFromName = (name: string) => name.split(' - ')[0];

    const isLateNight = new Date().getHours() >= 21 && new Date().getMinutes() >= 30;

    const sortedByDTQD = [...sellers].sort((a, b) => b.doanhThuQD - a.doanhThuQD);
    const sortedByHQQD = [...sellers].filter(e => e.doanhThuThuc > 0).sort((a, b) => b.hieuQuaValue - a.hieuQuaValue);

    const top5_DTQD = sortedByDTQD.slice(0, 5).map(e => ({ id: getIdFromName(e.name), DTQĐ: e.doanhThuQD, HQQĐ: e.hieuQuaValue }));
    const bottom5_DTQD = sortedByDTQD.slice(-5).map(e => ({ id: getIdFromName(e.name), DTQĐ: e.doanhThuQD }));
    const bottom5_HQQD = sortedByHQQD.slice(-5).map(e => ({ id: getIdFromName(e.name), HQQĐ: e.hieuQuaValue }));
    
    const persistentUnderperformers: { lowDtqd: Set<string>, lowHqqd: Set<string> } = { lowDtqd: new Set(), lowHqqd: new Set() };
    const underperformanceCount: Map<string, { dtqd: number, hqqd: number }> = new Map();
    
    if (history.length >= 2) {
        const historyToCheck = history.slice(0, 5); 
        for (const record of historyToCheck) {
            const historicalSellers = record.dataUsed;
            if (!historicalSellers || historicalSellers.length === 0) continue;
            const histSortedByDTQD = [...historicalSellers].sort((a, b) => b.doanhThuQD - a.doanhThuQD);
            const histSortedByHQQD = [...historicalSellers].filter(e => e.doanhThuThuc > 0).sort((a, b) => b.hieuQuaValue - a.hieuQuaValue);
            const histBottom5DTQD_IDs = histSortedByDTQD.slice(-5).map(e => getIdFromName(e.name));
            const histBottom5HQQD_IDs = histSortedByHQQD.slice(-5).map(e => getIdFromName(e.name));

            for (const id of histBottom5DTQD_IDs) {
                const current = underperformanceCount.get(id) || { dtqd: 0, hqqd: 0 };
                current.dtqd++;
                underperformanceCount.set(id, current);
            }
             for (const id of histBottom5HQQD_IDs) {
                const current = underperformanceCount.get(id) || { dtqd: 0, hqqd: 0 };
                current.hqqd++;
                underperformanceCount.set(id, current);
            }
        }
    }

    for (const [id, counts] of underperformanceCount.entries()) {
        if (counts.dtqd >= 3) persistentUnderperformers.lowDtqd.add(`@${id}`);
        if (counts.hqqd >= 3) persistentUnderperformers.lowHqqd.add(`@${id}`);
    }

    let prompt = `Bạn là một trợ lý AI phân tích dữ liệu bán hàng. Hãy đưa ra nhận xét súc tích và đi thẳng vào trọng tâm về hiệu suất của các bạn bán hàng.
Dữ liệu hiện tại: ${JSON.stringify({ top5_DTQD })}.

Hãy phân tích theo các quy tắc sau:

**1. Định dạng & Giọng văn:**
- Định dạng mỗi câu trên một dòng riêng biệt (kết thúc bằng dấu "." và xuống dòng).
- Bắt đầu với tiêu đề "🏆 TOP 3 BEST SELLER 🏆".
- Liệt kê 3 bạn đứng đầu, nêu bật DTQĐ của họ.
- Dùng định dạng "@" + ID cho mỗi bạn (ví dụ: "@17952").
- Rút gọn tiền tệ (ví dụ: 36,610,000 -> "36tr").
- Không dùng markdown (*, -, #).
- Dùng từ "Các bạn" khi nói về nhóm, và "bạn" khi nói chung hoặc cá nhân.

**2. Quy tắc phân tích HQQĐ (Hiệu quả Quy đổi):**
- HQQĐ là tiêu chí chính đánh giá hiệu quả bán kèm. Mục tiêu là 35%.
- HQQĐ < 20%: bạn đó không quan tâm bán kèm.
- HQQĐ < 30%: bán kèm không hiệu quả.

**3. Nội dung phân tích:**
- Nhận xét về các bạn có DT Thực cao nhưng HQQĐ thấp.
- Nhận xét về các bạn có doanh thu thấp nhưng HQQĐ cao.
- Nhấn mạnh những bạn có cả DTQĐ và HQQĐ thấp, gọi là "cực kỳ báo động".
- Phân tích chỉ số "Tiếp Cận" nếu có điểm bất thường.
`;

    if (isLateNight && history.length > 0) {
        const lastRecord = history[0];
        const lastSellers = lastRecord.dataUsed;
        const lastSortedByDTQD = [...lastSellers].sort((a, b) => b.doanhThuQD - a.doanhThuQD);
        const lastTop3 = lastSortedByDTQD.slice(0, 3).map(e => ({ id: getIdFromName(e.name), DTQĐ: e.doanhThuQD }));
        
        prompt += `
**4. So sánh Lịch sử (Vì sau 21h30):**
- Dữ liệu lần phân tích trước: Top 3 gồm ${lastTop3.map(e => `@${e.id} (${(e.DTQĐ / 1000000).toFixed(1)}tr)`).join(', ')}.
- Dựa vào đó, hãy ghi nhận sự cải thiện hoặc sa sút của các bạn trong top đầu. Ví dụ: "Ghi nhận bạn @12345 đã cải thiện vượt bậc để lọt vào top 3." hoặc "Bạn @67890 đã giữ vững phong độ."
`;
    }

    if (persistentUnderperformers.lowDtqd.size > 0 || persistentUnderperformers.lowHqqd.size > 0) {
         prompt += `
**5. Cảnh báo hiệu suất kém kéo dài (>= 3 ngày):**`;
        if (persistentUnderperformers.lowDtqd.size > 0) {
            prompt += `\n- Các bạn ${Array.from(persistentUnderperformers.lowDtqd).join(', ')} cần có biện pháp cải thiện DTQĐ ngay lập tức.`;
        }
        if (persistentUnderperformers.lowHqqd.size > 0) {
            prompt += `\n- Các bạn ${Array.from(persistentUnderperformers.lowHqqd).join(', ')} bán kèm rất yếu, cần xem lại cách tư vấn.`;
        }
    }

    prompt += `
**6. Cảnh báo cuối cùng (Bắt buộc):**
- Liệt kê 2 danh sách cảnh báo riêng biệt, rõ ràng ở cuối cùng.
- Danh sách 1: "Cảnh báo 5 bạn DTQĐ thấp nhất: ${bottom5_DTQD.map(e => `@${e.id}`).join(', ')}.".
- Danh sách 2: "Cảnh báo 5 bạn HQQĐ thấp nhất: ${bottom5_HQQD.map(e => `@${e.id}`).join(', ')}.".
`;

    if (isLateNight) {
        prompt += `
**7. "Cú hích" Cuối ngày:**
- Vì bây giờ đã sau 21h30, hãy kết thúc toàn bộ bài phân tích bằng một câu châm ngôn ngắn gọn, sâu sắc về sự cố gắng, nỗ lực hoặc đánh thức năng lực bản thân.
`;
    }
    
    try {
        // Use gemini-3-flash-preview
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        // Access .text property directly
        return response.text || "AI không tạo được nhận xét.";
    } catch (error) {
        console.error("AI Top Seller Analysis error:", error);
        return "Không thể tạo phân tích vào lúc này.";
    }
}

export async function getPerformanceTableAnalysis(employeeData: EmployeeData): Promise<string> {
    const ai = getAi();
    const { averages, maxValues, fullSellerArray } = employeeData;
    const top3 = fullSellerArray.slice(0, 3).map(e => ({ name: e.name, DTQĐ: e.doanhThuQD, HQQĐ: e.hieuQuaValue, 'Tiếp Cận': e.slTiepCan }));
    const data = { averages, maxValues, top3 };
    
    const prompt = `Dựa vào bảng hiệu suất nhân viên này, bao gồm cả giá trị trung bình và cao nhất, hãy đưa ra phân tích tổng quan bằng tiếng Việt.
    Dữ liệu: ${JSON.stringify(data)}.
    Hãy tập trung vào:
    1. So sánh Doanh thu Quy đổi (DTQĐ) trung bình với các nhân viên top đầu.
    2. Nhận xét về chỉ số Hiệu quả Quy đổi (HQQĐ) trung bình. Có ai dưới mức trung bình nhiều không?
    3. Nhân viên nào có chỉ số Tiếp cận (slTiepCan) cao nhất và nó có tương quan với doanh thu không?`;

    try {
        // Use gemini-3-flash-preview
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        // Access .text property directly
        return response.text || "Không có phản hồi từ AI.";
    } catch (error) {
        console.error("AI Performance Table Analysis error:", error);
        return "Không thể tạo phân tích vào lúc này.";
    }
}

export async function getIndustryAnalysis(exploitationData: ExploitationData[]): Promise<string> {
    const ai = getAi();
    const dataSample = exploitationData.slice(0, 10).map(e => ({
        name: e.name,
        '% Khai thác BH': e.percentBaoHiem,
        'SL Bảo Hiểm': e.slBaoHiem,
        'DT Phụ Kiện': e.doanhThuPhuKien,
        'DT Gia Dụng': e.doanhThuGiaDung,
        'SL Sim': e.slSim,
        'SL Đồng Hồ': e.slDongHo
    }));
    
    const prompt = `Dựa vào dữ liệu khai thác ngành hàng này, hãy phân tích bằng tiếng Việt.
    Dữ liệu: ${JSON.stringify(dataSample)}.
    Hãy trả lời các câu hỏi sau:
    1. Nhân viên nào mạnh nhất về bán Bảo hiểm (dựa trên % Khai thác BH và SL Bảo Hiểm)?
    2. Ai có doanh thu Phụ kiện và Gia dụng cao nhất?
    3. Có ai yếu kém rõ rệt ở các mảng bán kèm (Sim, Đồng hồ) không?`;

    try {
        // Use gemini-3-flash-preview
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        // Access .text property directly
        return response.text || "AI không thể phân tích ngành hàng.";
    } catch (error) {
        console.error("AI Industry Analysis error:", error);
        return "Không thể tạo phân tích vào lúc này.";
    }
}

export async function getHeadToHeadAnalysis(
    rows: any[],
    metricType: 'revenue' | 'quantity' | 'revenueQD' | 'hieuQuaQD',
    selectedSubgroups: string[]
): Promise<string> {
    const ai = getAi();
    const dataSample = rows.slice(0, 10).map(r => ({ name: r.name, 'Ngày K.Bán': r.daysWithNoSales, 'Tổng 7 ngày': r.total }));
    const groupText = selectedSubgroups.length > 2 ? `${selectedSubgroups.length} nhóm hàng` : selectedSubgroups.join(', ');
    
    const metricTypeText =
        metricType === 'revenue' ? 'doanh thu' :
        metricType === 'revenueQD' ? 'doanh thu quy đổi' :
        metricType === 'hieuQuaQD' ? 'hiệu quả quy đổi' :
        'số lượng';

    const prompt = `Dựa vào dữ liệu theo dõi 7 ngày này cho nhóm hàng "${groupText}" theo chỉ số "${metricTypeText}", hãy phân tích ngắn gọn bằng tiếng Việt.
    Dữ liệu: ${JSON.stringify(dataSample)}.
    Hãy tập trung vào:
    1. Nhân viên nào có hiệu suất ổn định nhất (dựa vào tổng và số ngày không bán được)?
    2. Có ai có tổng 7 ngày vượt trội so với phần còn lại không?
    3. Nhận xét chung về tình hình bán các sản phẩm này trong 7 ngày qua.`;

    try {
        // Use gemini-3-flash-preview
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        // Access .text property directly
        return response.text || "Không có phản hồi.";
    } catch (error) {
        console.error("AI Head to Head Analysis error:", error);
        return "Không thể tạo phân tích vào lúc này.";
    }
}

export async function getSummarySynthesisAnalysis(
    rows: any[],
    selectedSubgroups: string[],
    metricType: 'revenue' | 'quantity' | 'revenueQD'
): Promise<string> {
    const ai = getAi();
    const dataSample = rows.slice(0, 10).map(r => {
        const rowData: any = { name: r.name };
        selectedSubgroups.forEach(sg => {
            rowData[sg] = r.subgroupMetrics.get(sg) || 0;
        });
        return rowData;
    });
    const groupText = selectedSubgroups.length > 2 ? `${selectedSubgroups.length} nhóm hàng` : selectedSubgroups.join(', ');

    const metricTypeText = 
        metricType === 'revenue' ? 'doanh thu' : 
        metricType === 'revenueQD' ? 'doanh thu quy đổi' : 
        'số lượng';

    const prompt = `Dựa vào bảng tổng hợp này cho các nhóm hàng "${groupText}" theo chỉ số "${metricTypeText}", hãy phân tích bằng tiếng Việt.
    Dữ liệu: ${JSON.stringify(dataSample)}.
    Hãy trả lời các câu hỏi:
    1. Ai là người bán tốt nhất cho từng nhóm hàng được chọn?
    2. Có sự chênh lệch lớn giữa người bán tốt nhất và phần còn lại không?
    3. Có nhân viên nào bán đều các sản phẩm được chọn không?`;

    try {
        // Use gemini-3-flash-preview
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
        // Access .text property directly
        return response.text || "Không thể phân tích dữ liệu.";
    } catch (error) {
        console.error("AI Summary Synthesis Analysis error:", error);
        return "Không thể tạo phân tích vào lúc này.";
    }
}
