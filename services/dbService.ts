
import type {
    DataRow,
    StoredSalesData,
    ProductConfig,
    ContestTableConfig,
    CustomContestTab,
    WarehouseColumnConfig,
    AnalysisRecord,
    Employee,
    HeadToHeadTableConfig,
    FilterState
} from '../types';
import { DepartmentMap } from './dataService';

const DB_NAME = 'BI_HUB_DATABASE_V2';
const DB_VERSION = 3;
const APP_STORE = 'appStorage';
const SETTINGS_STORE = 'settings';

export const DEDUPLICATION_SETTING_KEY = 'isDeduplicationEnabled';
export const SUMMARY_TABLE_CONFIG_KEY = 'summaryTableConfig';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(APP_STORE)) db.createObjectStore(APP_STORE);
            if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return dbPromise;
}

export async function saveSetting(key: string, value: any): Promise<void> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SETTINGS_STORE, 'readwrite');
        const store = tx.objectStore(SETTINGS_STORE);
        store.put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getSetting<T>(key: string): Promise<T | null> {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SETTINGS_STORE, 'readonly');
        const store = tx.objectStore(SETTINGS_STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result === undefined ? null : request.result);
        request.onerror = () => reject(request.error);
    });
}

// Alias for compatibility
export const getValue = getSetting;
export const setValue = saveSetting;

// --- Sales Data ---
export async function saveSalesData(data: DataRow[], filename: string): Promise<void> {
    const stored: StoredSalesData = { data, filename, savedAt: new Date() };
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(APP_STORE, 'readwrite');
        tx.objectStore(APP_STORE).put(stored, 'salesData');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getSalesData(): Promise<StoredSalesData | null> {
    const db = await getDb();
    return new Promise((resolve) => {
        const tx = db.transaction(APP_STORE, 'readonly');
        const request = tx.objectStore(APP_STORE).get('salesData');
        request.onsuccess = () => resolve(request.result || null);
    });
}

export async function clearSalesData(): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(APP_STORE, 'readwrite');
    tx.objectStore(APP_STORE).delete('salesData');
}

// --- Department Map ---
export async function saveDepartmentMap(map: DepartmentMap): Promise<void> {
    return saveSetting('departmentMap', map);
}

export async function getDepartmentMap(): Promise<DepartmentMap | null> {
    return getSetting<DepartmentMap>('departmentMap');
}

export async function clearDepartmentMap(): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    tx.objectStore(SETTINGS_STORE).delete('departmentMap');
}

// --- Product Config ---
export async function saveProductConfig(config: ProductConfig, url: string): Promise<void> {
    await saveSetting('productConfig', { config, url, fetchedAt: new Date() });
}

export async function getProductConfig(): Promise<{ config: ProductConfig, url: string, fetchedAt: Date } | null> {
    return getSetting('productConfig');
}

export async function clearProductConfig(): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    tx.objectStore(SETTINGS_STORE).delete('productConfig');
}

// --- KPI Targets ---
export async function saveKpiTargets(targets: { hieuQua: number, traGop: number, doanhThu?: number }): Promise<void> {
    return saveSetting('kpiTargets', targets);
}

export async function getKpiTargets(): Promise<{ hieuQua: number, traGop: number, doanhThu?: number } | null> {
    return getSetting('kpiTargets');
}

// --- Warehouse Targets ---
export async function saveWarehouseTargets(targets: Record<string, number>): Promise<void> {
    return saveSetting('warehouseTargets', targets);
}

export async function getWarehouseTargets(): Promise<Record<string, number> | null> {
    return getSetting('warehouseTargets');
}

// --- Top Seller Analysis ---
export async function saveTopSellerAnalysis(analysis: string, dataUsed: Employee[]): Promise<void> {
    const record: AnalysisRecord = { timestamp: Date.now(), type: 'topSeller', analysis, dataUsed };
    const history = (await getSetting<AnalysisRecord[]>('topSellerAnalysisHistory')) || [];
    history.unshift(record);
    if (history.length > 20) history.pop();
    await saveSetting('topSellerAnalysisHistory', history);
}

export async function getTopSellerAnalysisHistory(): Promise<AnalysisRecord[]> {
    return (await getSetting<AnalysisRecord[]>('topSellerAnalysisHistory')) || [];
}

// --- Theme Map ---
export async function saveThemeMap(type: string, map: Record<string, number>): Promise<void> {
    return saveSetting(`themeMap_${type}`, map);
}

export async function getThemeMap(type: string): Promise<Record<string, number> | null> {
    return getSetting(`themeMap_${type}`);
}

// --- Daily Target ---
export async function saveDailyTarget(target: number): Promise<void> {
    return saveSetting('dailyTarget', target);
}

export async function getDailyTarget(): Promise<number | null> {
    return getSetting('dailyTarget');
}

// --- Industry Visible Groups ---
export async function saveIndustryVisibleGroups(groups: string[]): Promise<void> {
    return saveSetting('industryVisibleGroups', groups);
}

export async function getIndustryVisibleGroups(): Promise<string[] | null> {
    return getSetting('industryVisibleGroups');
}

// --- Head to Head Custom Tables ---
export async function saveHeadToHeadCustomTables(tables: HeadToHeadTableConfig[]): Promise<void> {
    return saveSetting('headToHeadTables', tables);
}

export async function getHeadToHeadCustomTables(): Promise<HeadToHeadTableConfig[] | null> {
    return getSetting('headToHeadTables');
}

// --- Warehouse Config ---
export async function saveWarehouseColumnConfig(config: WarehouseColumnConfig[]): Promise<void> {
    return saveSetting('warehouseColumnConfig', config);
}

export async function getWarehouseColumnConfig(): Promise<WarehouseColumnConfig[] | null> {
    return getSetting('warehouseColumnConfig');
}

// --- Summary Table Config ---
export async function saveSummaryTableConfig(config: FilterState['summaryTable']): Promise<void> {
    return saveSetting(SUMMARY_TABLE_CONFIG_KEY, config);
}

export async function getSummaryTableConfig(): Promise<FilterState['summaryTable'] | null> {
    return getSetting(SUMMARY_TABLE_CONFIG_KEY);
}

// --- Custom Tabs ---
export async function saveCustomTabs(tabs: CustomContestTab[]): Promise<void> {
    return saveSetting('customTabs', tabs);
}

export async function getCustomTabs(): Promise<CustomContestTab[] | null> {
    return getSetting('customTabs');
}

export async function clearCustomTabs(): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    tx.objectStore(SETTINGS_STORE).delete('customTabs');
    tx.objectStore(SETTINGS_STORE).delete('industryAnalysisCustomTables');
}

// --- Industry Analysis Custom Tables ---
export async function saveIndustryAnalysisCustomTables(tables: ContestTableConfig[]): Promise<void> {
    return saveSetting('industryAnalysisCustomTables', tables);
}

export async function getIndustryAnalysisCustomTables(): Promise<ContestTableConfig[] | null> {
    return getSetting('industryAnalysisCustomTables');
}

// --- Industry Grid Filters ---
export async function saveIndustryGridFilters(filters: FilterState['industryGrid']): Promise<void> {
    return saveSetting('industryGridFilters', filters);
}

export async function getIndustryGridFilters(): Promise<FilterState['industryGrid'] | null> {
    return getSetting('industryGridFilters');
}

// --- Deduplication Setting ---
export async function getDeduplicationSetting(): Promise<boolean> {
    const value = await getSetting<boolean>(DEDUPLICATION_SETTING_KEY);
    return value !== null ? value : true;
}

export async function saveDeduplicationSetting(enabled: boolean): Promise<void> {
    return saveSetting(DEDUPLICATION_SETTING_KEY, enabled);
}
