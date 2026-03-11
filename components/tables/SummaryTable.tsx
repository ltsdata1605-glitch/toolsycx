
import React, { useState, useMemo, useRef, useEffect, useCallback, useTransition, useDeferredValue } from 'react';
import Sortable from 'sortablejs';
import type { SummaryTableNode, GrandTotal } from '../../types';
import { abbreviateName, formatCurrency, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { exportElementAsImage } from '../../services/uiService';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { processSummaryTable } from '../../services/summaryService';
import { saveSummaryTableConfig } from '../../services/dbService';
import RecursiveRow from './SummaryTableRow';

// --- Helper Functions ---

const getTraGopPercentClass = (percentage: number) => {
    if (isNaN(percentage)) return 'text-slate-600 dark:text-slate-300';
    if (percentage >= 45) return 'text-green-600 dark:text-green-500 font-bold';
    if (percentage >= 40) return 'text-amber-600 dark:text-amber-500';
    return 'text-red-600 dark:text-red-500 font-bold';
};

// Returns a formatted string like "15/12 - 21/12"
const formatCompactDateRange = (start: Date, end: Date) => {
    const d1 = start.getDate();
    const m1 = start.getMonth() + 1;
    const d2 = end.getDate();
    const m2 = end.getMonth() + 1;
    const y2 = end.getFullYear();
    
    if (start.getTime() === end.getTime()) {
        return `${d1}/${m1}/${y2}`;
    }
    return `${d1}/${m1} - ${d2}/${m2}/${y2}`;
};

const toInputDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const toInputMonth = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

// UPDATED: Generate weeks for a specific month (Fixed 7-day blocks starting from Day 1)
const getWeeksInMonth = (year: number, month: number) => { 
    const weeks: { id: number, label: string, start: Date, end: Date, shortLabel: string }[] = [];
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    
    let currentDay = 1;
    let weekNum = 1;

    while (currentDay <= lastDayOfMonth) {
        const start = new Date(year, month, currentDay);
        // End day is current + 6 days (total 7 days), but cap at last day of month
        let endDayVal = currentDay + 6;
        if (endDayVal > lastDayOfMonth) endDayVal = lastDayOfMonth;
        
        const end = new Date(year, month, endDayVal);
        end.setHours(23, 59, 59, 999);

        weeks.push({
            id: weekNum,
            shortLabel: `Tuần ${weekNum}`,
            label: `Tuần ${weekNum} (${start.getDate()}/${month + 1}-${end.getDate()}/${month + 1})`,
            start: start,
            end: end
        });
        
        currentDay += 7; // Jump 7 days
        weekNum++;
    }
    return weeks;
};

const getSafeDateInPrevMonth = (date: Date) => {
    const d = date.getDate();
    const m = date.getMonth();
    const y = date.getFullYear();
    const prevMonthDate = new Date(y, m - 1, 1);
    const prevMonthMaxDays = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
    const safeDay = Math.min(d, prevMonthMaxDays);
    return new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), safeDay);
};

const HEADER_CONFIG = [
    { label: 'S.LƯỢNG', key: 'totalQuantity', showInComparison: true, colorClass: 'bg-slate-50 text-slate-600 dark:bg-white/5 dark:text-slate-400', borderColor: 'border-slate-200 dark:border-white/10' },
    { label: 'D.THU', key: 'totalRevenue', showInComparison: true, colorClass: 'bg-slate-50 text-slate-900 dark:bg-white/5 dark:text-white', borderColor: 'border-slate-200 dark:border-white/10' },
    { label: 'DTQĐ', key: 'totalRevenueQD', showInComparison: true, colorClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', borderColor: 'border-emerald-200 dark:border-emerald-500/20' },
    { label: 'GTĐH', key: 'aov', showInComparison: true, colorClass: 'bg-slate-50 text-slate-600 dark:bg-white/5 dark:text-slate-400', borderColor: 'border-slate-200 dark:border-white/10' },
    { label: '% T.Chậm', key: 'traGopPercent', showInComparison: true, colorClass: 'bg-slate-50 text-slate-600 dark:bg-white/5 dark:text-slate-400', borderColor: 'border-slate-200 dark:border-white/10' },
];

const ORDER_LABELS: Record<string, string> = {
    'parent': 'Ngành hàng',
    'child': 'Nhóm hàng',
    'manufacturer': 'Hãng SX',
    'creator': 'Nhân viên',
    'product': 'Tên sản phẩm'
};

const PILL_ICONS: Record<string, string> = {
    'parent': 'layers',
    'child': 'layout-grid',
    'manufacturer': 'factory',
    'creator': 'user',
    'product': 'package'
};

// Enhanced colors for better distinction
const PILL_COLORS: Record<string, string> = {
    'parent': 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700',
    'child': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700',
    'manufacturer': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700',
    'creator': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700',
    'product': 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-700'
};

// --- NEW COMPONENT: FilterPopover for Draggable Pills ---
interface FilterPopoverProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    alignment?: 'left' | 'right';
}

const FilterPopover: React.FC<FilterPopoverProps> = ({ 
    label, options, selected, onChange, isOpen, onToggle, onClose, alignment = 'right' 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Prevent drag when clicking inside the popover or on the button
    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && 
                popoverRef.current && !popoverRef.current.contains(event.target as Node) && 
                triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    // Focus input when opened without scrolling the page (prevents jump)
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            // Use requestAnimationFrame to ensure the DOM is ready, which is smoother than setTimeout
            requestAnimationFrame(() => {
                inputRef.current?.focus({ preventScroll: true });
            });
        }
    }, [isOpen]);

    const toggleOption = (option: string) => {
        const newSelected = selected.includes(option)
            ? selected.filter(item => item !== option)
            : [...selected, option];
        onChange(newSelected);
    };

    const handleSelectAll = () => onChange(options);
    const handleDeselectAll = () => onChange([]);

    const filteredOptions = useMemo(() => {
        return options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [options, searchTerm]);

    const hasFilters = selected.length > 0 && selected.length < options.length;

    return (
        <div className="relative inline-flex items-center ml-1">
            <button
                ref={triggerRef}
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                onMouseDown={stopPropagation} // Prevent drag start on button click
                className={`p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${hasFilters ? 'text-indigo-600 dark:text-indigo-400 bg-white/50' : 'text-inherit opacity-60 hover:opacity-100'}`}
                title={`Lọc ${label}`}
            >
                <Icon name="filter" size={3.5} className={hasFilters ? "fill-current" : ""} />
                {hasFilters && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-slate-800"></span>
                )}
            </button>

            {isOpen && (
                <div 
                    ref={popoverRef}
                    onClick={stopPropagation}
                    onMouseDown={stopPropagation}
                    className={`absolute z-[100] mt-2 w-72 rounded-lg shadow-xl bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10 p-3 top-full cursor-default text-left transition-all duration-200 ease-out origin-top-${alignment === 'left' ? 'left' : 'right'} ${alignment === 'left' ? 'left-0' : 'right-0'}`}
                >
                    <div className="mb-3">
                        <input 
                            ref={inputRef}
                            type="text" 
                            placeholder={`Tìm kiếm ${label}...`} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
                        <button onClick={handleSelectAll} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Chọn tất cả</button>
                        <button onClick={handleDeselectAll} className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:underline">Bỏ chọn</button>
                    </div>
                    <div className="overflow-y-auto max-h-60 space-y-1 custom-scrollbar">
                        {filteredOptions.length > 0 ? filteredOptions.map(option => (
                            <label key={option} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer">
                                <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2 flex-grow" title={option}>{option}</span>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={selected.includes(option)} 
                                        onChange={() => toggleOption(option)} 
                                        className="sr-only peer" 
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                </div>
                            </label>
                        )) : (
                            <div className="text-center text-xs text-slate-500 py-4">Không tìm thấy kết quả</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


interface SummaryTableProps {}

type ComparisonMode = 'day_adjacent' | 'day_same_period' | 'week_adjacent' | 'week_same_period' | 'month_adjacent' | 'custom_range';

const SummaryTable: React.FC<SummaryTableProps> = React.memo(() => {
    // Note: We use baseFilteredData directly for local calculation to avoid full app reload on drilldown change
    const { filterState: filters, handleFilterChange: onFilterChange, baseFilteredData, productConfig } = useDashboardContext();
    const { summaryTable: summaryTableFilters, parent: globalParentFilters } = filters;
    
    // --- Local State for Performance Optimization ---
    // 1. Drilldown Order
    // Initialize from props/context, fallback to 5 levels if available
    const [localDrilldownOrder, setLocalDrilldownOrder] = useState<string[]>(
        (summaryTableFilters.drilldownOrder && summaryTableFilters.drilldownOrder.length > 0)
            ? summaryTableFilters.drilldownOrder
            : ['parent', 'child', 'creator', 'manufacturer', 'product']
    );
    
    // Use deferred value for calculation to prevent UI blocking during drag-and-drop
    // The UI updates instantly (localDrilldownOrder), while heavy calculation happens later (deferredDrilldownOrder)
    const deferredDrilldownOrder = useDeferredValue(localDrilldownOrder);

    // 2. Local Filters for all Dimensions (Isolating filter logic to this component)
    const [localParentFilters, setLocalParentFilters] = useState<string[]>(globalParentFilters || []);
    const [localChildFilters, setLocalChildFilters] = useState<string[]>(summaryTableFilters.child || []);
    const [localManufacturerFilters, setLocalManufacturerFilters] = useState<string[]>(summaryTableFilters.manufacturer || []);
    const [localCreatorFilters, setLocalCreatorFilters] = useState<string[]>(summaryTableFilters.creator || []);
    const [localProductFilters, setLocalProductFilters] = useState<string[]>(summaryTableFilters.product || []);

    // 3. UI State for active filter popover (Single active source of truth)
    const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);

    // Sync local state if global state changes externally (e.g. reset all filters via main filter bar)
    // We only sync if the global filters are DIFFERENT from local filters to avoid loops.
    // However, we DO NOT sync back to global state automatically on local change to prevent full re-render.
    useEffect(() => {
        if (JSON.stringify(globalParentFilters) !== JSON.stringify(localParentFilters)) setLocalParentFilters(globalParentFilters);
        if (JSON.stringify(summaryTableFilters.child) !== JSON.stringify(localChildFilters)) setLocalChildFilters(summaryTableFilters.child);
        if (JSON.stringify(summaryTableFilters.manufacturer) !== JSON.stringify(localManufacturerFilters)) setLocalManufacturerFilters(summaryTableFilters.manufacturer);
        if (JSON.stringify(summaryTableFilters.creator) !== JSON.stringify(localCreatorFilters)) setLocalCreatorFilters(summaryTableFilters.creator);
        if (JSON.stringify(summaryTableFilters.product) !== JSON.stringify(localProductFilters)) setLocalProductFilters(summaryTableFilters.product);
        
        // Also sync order if changed externally
        if (summaryTableFilters.drilldownOrder && summaryTableFilters.drilldownOrder.length > 0 && 
            JSON.stringify(summaryTableFilters.drilldownOrder) !== JSON.stringify(localDrilldownOrder)) {
            setLocalDrilldownOrder(summaryTableFilters.drilldownOrder);
        }
    }, [summaryTableFilters]);

    // Save configuration to DB whenever local state changes
    useEffect(() => {
        const currentConfig = {
            parent: localParentFilters,
            child: localChildFilters,
            manufacturer: localManufacturerFilters,
            creator: localCreatorFilters,
            product: localProductFilters,
            drilldownOrder: localDrilldownOrder,
            sort: filters.summaryTable.sort // Sort is still managed globally or can be local too if needed
        };
        // Debounce saving to avoid too many writes
        const timer = setTimeout(() => {
            saveSummaryTableConfig(currentConfig).catch(err => console.error("Failed to save summary config:", err));
            
            // Sync parent filter back to global state to allow other components to react
            if (JSON.stringify(globalParentFilters) !== JSON.stringify(localParentFilters)) {
                onFilterChange({ parent: localParentFilters });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localParentFilters, localChildFilters, localManufacturerFilters, localCreatorFilters, localProductFilters, localDrilldownOrder, filters.summaryTable.sort]);


    // Comparison State
    const [isComparisonMode, setIsComparisonMode] = useState(false);
    const [compMode, setCompMode] = useState<ComparisonMode>('day_adjacent');
    const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
    const [selectedMonth, setSelectedMonth] = useState(toInputMonth(new Date()));
    const [selectedWeeks, setSelectedWeeks] = useState<number[]>([1]);
    
    // Custom Date Range State
    const [customRangeA, setCustomRangeA] = useState({ start: toInputDate(new Date()), end: toInputDate(new Date()) });
    const [customRangeB, setCustomRangeB] = useState({ start: toInputDate(new Date()), end: toInputDate(new Date()) });

    const [compSortConfig, setCompSortConfig] = useState<{ column: string, type: 'current' | 'delta', direction: 'asc' | 'desc' }>({
        column: 'totalRevenue',
        type: 'current',
        direction: 'desc'
    });

    const [compTree, setCompTree] = useState<{
        current: { data: { [key: string]: SummaryTableNode }, grandTotal: GrandTotal };
        prev: { data: { [key: string]: SummaryTableNode }, grandTotal: GrandTotal };
        title: string;
        description?: string;
    } | null>(null);

    const [dateDisplay, setDateDisplay] = useState({ current: '', prev: '' });
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [isExporting, setIsExporting] = useState(false);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const sortableListRef = useRef<HTMLDivElement>(null);
    
    // Use useTransition for smoother UI updates
    const [isPending, startTransition] = useTransition();

    // 1. CALCULATE SUMMARY DATA LOCALLY
    // NOTE: We use deferredDrilldownOrder here to avoid blocking UI during drag-and-drop
    const standardSummaryData = useMemo(() => {
        if (!baseFilteredData.length || !productConfig) return null;
        
        // Construct a temporary filter state that uses the DEFERRED drilldown order AND LOCAL filters
        // This isolates the calculation from the global context updates
        const localFilterState = {
            ...filters,
            parent: localParentFilters,
            summaryTable: {
                ...filters.summaryTable,
                drilldownOrder: deferredDrilldownOrder, // Use deferred value for calculation
                child: localChildFilters,
                manufacturer: localManufacturerFilters,
                creator: localCreatorFilters,
                product: localProductFilters
            }
        };
        
        return processSummaryTable(baseFilteredData, productConfig, localFilterState);
    }, [baseFilteredData, productConfig, deferredDrilldownOrder, localParentFilters, localChildFilters, localManufacturerFilters, localCreatorFilters, localProductFilters, filters.summaryTable.sort]);


    useEffect(() => {
        try {
            const saved = localStorage.getItem('summaryTableExpandedIds');
            if (saved) setExpandedIds(new Set(JSON.parse(saved)));
        } catch (e) {}
    }, []);

    useEffect(() => {
        try { localStorage.setItem('summaryTableExpandedIds', JSON.stringify(Array.from(expandedIds))); } catch (e) {}
    }, [expandedIds]);

    useEffect(() => {
        if (sortableListRef.current) {
            const sortable = new Sortable(sortableListRef.current, {
                animation: 150,
                ghostClass: 'opacity-0', // Hide the original element while dragging ghost
                chosenClass: 'scale-105', // Slightly enlarge the chosen item
                dragClass: 'opacity-100', // Ensure ghost is visible
                onEnd: (evt: any) => {
                    const newOrder = [...localDrilldownOrder];
                    const [movedItem] = newOrder.splice(evt.oldIndex, 1);
                    newOrder.splice(evt.newIndex, 0, movedItem);
                    
                    // 1. Update LOCAL state immediately -> Trigger local recalculation -> FAST
                    // We DO NOT call onFilterChange here to avoid global re-render
                    setLocalDrilldownOrder(newOrder);
                    
                    // 2. Collapse all to avoid confusion with new structure
                    setExpandedIds(new Set());
                },
            });
            return () => sortable.destroy();
        }
    }, [localDrilldownOrder]); 

    const weeksInSelectedMonth = useMemo(() => {
        const [y, m] = selectedMonth.split('-').map(Number);
        if (isNaN(y) || isNaN(m)) return [];
        return getWeeksInMonth(y, m - 1);
    }, [selectedMonth]);

    useEffect(() => {
        if (compMode === 'week_adjacent' || compMode === 'week_same_period') {
            // Ensure selected week exists in new month, otherwise default to last available
            const hasValidSelection = selectedWeeks.length > 0 && weeksInSelectedMonth.some(w => w.id === selectedWeeks[0]);
            
            if (!hasValidSelection) {
                if (weeksInSelectedMonth.length > 0) {
                    setSelectedWeeks([weeksInSelectedMonth[weeksInSelectedMonth.length - 1].id]);
                } else {
                    setSelectedWeeks([]);
                }
            }
        }
    }, [compMode, weeksInSelectedMonth, selectedMonth]);

    useEffect(() => {
        if (!isComparisonMode || !baseFilteredData.length || !productConfig) {
            setCompTree(null);
            return;
        }

        let currentStart: Date, currentEnd: Date, prevStart: Date, prevEnd: Date;
        let titleSuffix = '';
        let description = '';

        if (compMode === 'day_adjacent') {
            const current = new Date(selectedDate);
            currentStart = new Date(current); currentStart.setHours(0,0,0,0);
            currentEnd = new Date(current); currentEnd.setHours(23,59,59,999);
            
            const prev = new Date(current);
            prev.setDate(current.getDate() - 1);
            prevStart = new Date(prev); prevStart.setHours(0,0,0,0);
            prevEnd = new Date(prev); prevEnd.setHours(23,59,59,999);
            titleSuffix = `NGÀY (LIỀN KỀ)`;
            description = `So sánh ngày ${currentStart.toLocaleDateString('vi-VN')} với ngày hôm trước (${prevStart.toLocaleDateString('vi-VN')}).`;

        } else if (compMode === 'day_same_period') {
            const current = new Date(selectedDate);
            currentStart = new Date(current); currentStart.setHours(0,0,0,0);
            currentEnd = new Date(current); currentEnd.setHours(23,59,59,999);

            const prev = getSafeDateInPrevMonth(current);
            prevStart = new Date(prev); prevStart.setHours(0,0,0,0);
            prevEnd = new Date(prev); prevEnd.setHours(23,59,59,999);
            titleSuffix = `NGÀY (CÙNG KỲ)`;
            description = `So sánh ngày ${currentStart.toLocaleDateString('vi-VN')} với ngày cùng số của tháng trước (${prevStart.toLocaleDateString('vi-VN')}).`;

        } else if (compMode === 'week_adjacent') {
            const wCurrId = selectedWeeks[0];
            const wPrevId = wCurrId - 1;
            
            const wCurr = weeksInSelectedMonth.find(w => w.id === wCurrId);
            const wPrev = weeksInSelectedMonth.find(w => w.id === wPrevId);
            
            if (!wCurr) return;

            currentStart = wCurr.start;
            currentEnd = wCurr.end;
            
            if (wPrev) {
                prevStart = wPrev.start;
                prevEnd = wPrev.end;
                titleSuffix = `TUẦN ${wCurrId} vs TUẦN ${wPrevId}`;
                description = `So sánh ${wCurr.label} với ${wPrev.label}.`;
            } else {
                // If Week 1 (no prev week in month), compare with itself to show 0 delta
                prevStart = currentStart;
                prevEnd = currentEnd;
                titleSuffix = `TUẦN ${wCurrId}`;
                description = `Dữ liệu tuần ${wCurr.id}. (Không có tuần trước liền kề trong tháng).`;
            }

        } else if (compMode === 'week_same_period') {
            const selectedWeekId = selectedWeeks[0];
            const wCurrent = weeksInSelectedMonth.find(w => w.id === selectedWeekId);
            if (!wCurrent) return;

            currentStart = wCurrent.start;
            currentEnd = wCurrent.end;

            const [y, m] = selectedMonth.split('-').map(Number);
            const prevDate = new Date(y, m - 2, 1);
            const prevWeeks = getWeeksInMonth(prevDate.getFullYear(), prevDate.getMonth());
            
            const prevWeekIndex = Math.min(selectedWeekId, prevWeeks.length);
            const prevWeek = prevWeeks.find(w => w.id === prevWeekIndex);
            
            if (!prevWeek) return;

            prevStart = prevWeek.start;
            prevEnd = prevWeek.end;
            titleSuffix = `TUẦN (CÙNG KỲ THÁNG TRƯỚC)`;
            description = `So sánh ${wCurrent.shortLabel} tháng này với ${prevWeek.shortLabel} tháng trước.`;

        } else if (compMode === 'month_adjacent') {
            const [y, m] = selectedMonth.split('-').map(Number);
            currentStart = new Date(y, m - 1, 1);
            currentEnd = new Date(y, m, 0, 23, 59, 59, 999);

            prevStart = new Date(y, m - 2, 1);
            prevEnd = new Date(y, m - 1, 0, 23, 59, 59, 999);
            titleSuffix = `THÁNG (LIỀN KỀ)`;
            description = `So sánh tháng ${m}/${y} với tháng trước đó.`;
        } else if (compMode === 'custom_range') {
            currentStart = new Date(customRangeA.start); currentStart.setHours(0,0,0,0);
            currentEnd = new Date(customRangeA.end); currentEnd.setHours(23,59,59,999);
            
            prevStart = new Date(customRangeB.start); prevStart.setHours(0,0,0,0);
            prevEnd = new Date(customRangeB.end); prevEnd.setHours(23,59,59,999);
            
            titleSuffix = `KHOẢNG THỜI GIAN`;
            description = `So sánh tùy chỉnh giữa 2 khoảng thời gian.`;
        } else {
            return;
        }

        setDateDisplay({
            current: formatCompactDateRange(currentStart, currentEnd),
            prev: formatCompactDateRange(prevStart, prevEnd)
        });

        const currentDataRows = baseFilteredData.filter(row => {
            const date = row.parsedDate;
            return date && date >= currentStart && date <= currentEnd;
        });

        const prevDataRows = baseFilteredData.filter(row => {
            const date = row.parsedDate;
            return date && date >= prevStart && date <= prevEnd;
        });

        // Use deferredDrilldownOrder AND local filters for comparison calculation too
        const mockFilters = { 
            ...filters,
            parent: localParentFilters,
            summaryTable: {
                ...filters.summaryTable,
                drilldownOrder: deferredDrilldownOrder,
                child: localChildFilters,
                manufacturer: localManufacturerFilters,
                creator: localCreatorFilters,
                product: localProductFilters
            }
        }; 
        const currentTree = processSummaryTable(currentDataRows, productConfig, mockFilters);
        const prevTree = processSummaryTable(prevDataRows, productConfig, mockFilters);

        setCompTree({
            current: currentTree,
            prev: prevTree,
            title: `SO SÁNH NGÀNH HÀNG: ${titleSuffix}`,
            description
        });

    }, [isComparisonMode, compMode, selectedDate, selectedMonth, selectedWeeks, baseFilteredData, productConfig, filters.summaryTable, weeksInSelectedMonth, deferredDrilldownOrder, localParentFilters, localChildFilters, localManufacturerFilters, localCreatorFilters, localProductFilters, customRangeA, customRangeB]);

    const handleWeekPillClick = (weekId: number) => {
        // Always set single week selection to avoid state fighting
        setSelectedWeeks([weekId]);
    };

    // --- UPDATED: Handle Local Filter Changes for any type ---
    const handleLocalFilterChange = useCallback((type: string, selected: string[]) => {
        startTransition(() => {
            if (type === 'parent') setLocalParentFilters(selected);
            else if (type === 'child') setLocalChildFilters(selected);
            else if (type === 'manufacturer') setLocalManufacturerFilters(selected);
            else if (type === 'creator') setLocalCreatorFilters(selected);
            else if (type === 'product') setLocalProductFilters(selected);
            
            // If parent changes, clear child filters to avoid invalid state (optional but UX friendly)
            if (type === 'parent') {
                setLocalChildFilters([]);
            }
            // Always collapse on filter change to re-orient
            setExpandedIds(new Set());
        });
    }, []);

    const handleResetAllFilters = () => {
        startTransition(() => {
            setLocalParentFilters([]);
            setLocalChildFilters([]);
            setLocalManufacturerFilters([]);
            setLocalCreatorFilters([]);
            setLocalProductFilters([]);
            setExpandedIds(new Set());
        });
    };

    const hasActiveFilters = localParentFilters.length > 0 || 
                             localChildFilters.length > 0 || 
                             localManufacturerFilters.length > 0 || 
                             localCreatorFilters.length > 0 || 
                             localProductFilters.length > 0;

    const handleSort = useCallback((column: string, type: 'current' | 'delta' = 'current') => {
        if (isComparisonMode) {
            setCompSortConfig(prev => ({
                column,
                type,
                direction: prev.column === column && prev.type === type && prev.direction === 'desc' ? 'asc' : 'desc'
            }));
        } else {
            const direction = summaryTableFilters.sort.column === column && summaryTableFilters.sort.direction === 'desc' ? 'asc' : 'desc';
            startTransition(() => {
                onFilterChange({ summaryTable: { ...summaryTableFilters, sort: { column, direction } } });
            });
        }
    }, [summaryTableFilters, onFilterChange, isComparisonMode]);
    
    const toggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
                const idPrefix = `${id}-`;
                prev.forEach(expandedId => { if (expandedId.startsWith(idPrefix)) newSet.delete(expandedId); });
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);
    
    const toggleAllLevels = () => {
        const shouldExpand = expandedIds.size === 0;
        if (!shouldExpand) setExpandedIds(new Set());
        else {
            const newExpanded = new Set<string>();
            const activeData = isComparisonMode && compTree ? compTree.current.data : standardSummaryData?.data;
            if (activeData) {
                const expandNode = (node: { [key: string]: SummaryTableNode }, parentId: string, level: number) => {
                    if (level > 2) return;
                    Object.keys(node).forEach(key => {
                        const currentId = `${parentId}-${key.replace(/[^a-zA-Z0-9]/g, '-')}`;
                        newExpanded.add(currentId);
                        expandNode(node[key].children, currentId, level + 1);
                    });
                };
                expandNode(activeData, 'root', 1);
            }
            setExpandedIds(newExpanded);
        }
    };
    
    const handleExport = async () => {
        if(tableContainerRef.current) {
            setIsExporting(true);
            await exportElementAsImage(tableContainerRef.current, 'chi-tiet-nganh-hang.png', { elementsToHide: ['.hide-on-export'], fitContent: true });
            setIsExporting(false);
        }
    };
    
    if (!standardSummaryData && !compTree) return null;

    const activeSortConfig = isComparisonMode 
        ? compSortConfig 
        : { ...summaryTableFilters.sort, type: 'current' as const };
    
    let displayKeys: string[] = [];
    if (isComparisonMode && compTree) {
        displayKeys = Array.from(new Set([...Object.keys(compTree.current.data), ...Object.keys(compTree.prev.data)]));
        displayKeys.sort((a, b) => {
            const nodeA = compTree.current.data[a];
            const nodeB = compTree.current.data[b];
            const prevNodeA = compTree.prev.data[a];
            const prevNodeB = compTree.prev.data[b];
            
            const getVal = (node: SummaryTableNode | undefined, key: string) => {
                if (!node) return 0;
                if (key === 'aov') return node.totalQuantity > 0 ? node.totalRevenue / node.totalQuantity : 0;
                if (key === 'traGopPercent') return node.totalRevenue > 0 ? (node.totalTraGop / node.totalRevenue) * 100 : 0;
                return (node as any)[key] || 0;
            };

            const currValA = getVal(nodeA, activeSortConfig.column);
            const currValB = getVal(nodeB, activeSortConfig.column);
            
            let finalValA = currValA;
            let finalValB = currValB;

            if (activeSortConfig.type === 'delta') {
                const prevValA = getVal(prevNodeA, activeSortConfig.column);
                const prevValB = getVal(prevNodeB, activeSortConfig.column);
                finalValA = currValA - prevValA;
                finalValB = currValB - prevValB;
            }
            
            if (finalValA === finalValB) return a.localeCompare(b);
            return activeSortConfig.direction === 'asc' ? finalValA - finalValB : finalValB - finalValA;
        });
    } else {
        displayKeys = Object.keys(standardSummaryData!.data);
    }

    displayKeys = displayKeys.filter(key => key !== 'Không xác định');

    const calculateDisplayedTotal = (sourceData: { [key: string]: SummaryTableNode } | undefined) => {
        if (!sourceData) return { totalQuantity: 0, totalRevenue: 0, totalRevenueQD: 0, totalTraGop: 0, aov: 0, traGopPercent: 0 };
        return displayKeys.reduce((acc, key) => {
            const node = sourceData[key];
            if (node) {
                acc.totalQuantity += node.totalQuantity;
                acc.totalRevenue += node.totalRevenue;
                acc.totalRevenueQD += node.totalRevenueQD;
                acc.totalTraGop += node.totalTraGop;
            }
            return acc;
        }, { totalQuantity: 0, totalRevenue: 0, totalRevenueQD: 0, totalTraGop: 0, aov: 0, traGopPercent: 0 });
    };

    const currentDisplayedTotal = useMemo(() => {
        const source = isComparisonMode && compTree ? compTree.current.data : standardSummaryData?.data;
        const total = calculateDisplayedTotal(source);
        total.aov = total.totalQuantity > 0 ? total.totalRevenue / total.totalQuantity : 0;
        total.traGopPercent = total.totalRevenue > 0 ? (total.totalTraGop / total.totalRevenue) * 100 : 0;
        return total;
    }, [displayKeys, isComparisonMode, compTree, standardSummaryData]);

    const prevDisplayedTotal = useMemo(() => {
        if (!isComparisonMode || !compTree) return null;
        const total = calculateDisplayedTotal(compTree.prev.data);
        total.aov = total.totalQuantity > 0 ? total.totalRevenue / total.totalQuantity : 0;
        total.traGopPercent = total.totalRevenue > 0 ? (total.totalTraGop / total.totalRevenue) * 100 : 0;
        return total;
    }, [displayKeys, isComparisonMode, compTree]);

    const grandTotal = currentDisplayedTotal;
    
    let deltaQuantity = 0, deltaRevenue = 0, deltaRevenueQD = 0, deltaAOV = 0, deltaTraGopPercent = 0;
    if (isComparisonMode && prevDisplayedTotal) {
        deltaQuantity = grandTotal.totalQuantity - prevDisplayedTotal.totalQuantity;
        deltaRevenue = grandTotal.totalRevenue - prevDisplayedTotal.totalRevenue;
        deltaRevenueQD = grandTotal.totalRevenueQD - prevDisplayedTotal.totalRevenueQD;
        deltaAOV = grandTotal.aov - prevDisplayedTotal.aov;
        deltaTraGopPercent = grandTotal.traGopPercent - prevDisplayedTotal.traGopPercent;
    }

    const renderDelta = (val: number, type: 'currency' | 'number' | 'percent') => {
        if (val === 0) return <span className="text-slate-300">-</span>;
        const isPositive = val > 0;
        const colorClass = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
        let formattedVal = '';
        if (type === 'currency') formattedVal = formatCurrency(Math.abs(val));
        else if (type === 'percent') formattedVal = `${Math.abs(val).toFixed(0)}%`; 
        else formattedVal = formatQuantity(Math.abs(val));
        return <span className={`text-[11px] font-bold ${colorClass}`}>{isPositive ? '+' : '-'}{formattedVal}</span>;
    };

    const displayTitle = isComparisonMode && compTree ? compTree.title : "CHI TIẾT NGÀNH HÀNG";
    const displayDescription = isComparisonMode && compTree ? compTree.description : "Thống kê chi tiết theo ngành hàng và nhóm hàng.";
    const traGopDisplayTotal = grandTotal.traGopPercent === 0 ? '-' : `${grandTotal.traGopPercent.toFixed(0)}%`;

    const footerCellClass = "px-4 py-4 text-center";
    const footerDeltaCellClass = "px-2 py-4 text-center"; 
    const separatorClass = "border-r border-slate-300 dark:border-slate-600";

    // --- Helper to get options and selected state dynamically ---
    const getFilterProps = (key: string) => {
        switch(key) {
            case 'parent': return { options: standardSummaryData?.uniqueParentGroups || [], selected: localParentFilters, onChange: (s: string[]) => handleLocalFilterChange('parent', s) };
            case 'child': return { options: standardSummaryData?.uniqueChildGroups || [], selected: localChildFilters, onChange: (s: string[]) => handleLocalFilterChange('child', s) };
            case 'manufacturer': return { options: standardSummaryData?.uniqueManufacturers || [], selected: localManufacturerFilters, onChange: (s: string[]) => handleLocalFilterChange('manufacturer', s) };
            case 'creator': return { options: standardSummaryData?.uniqueCreators || [], selected: localCreatorFilters, onChange: (s: string[]) => handleLocalFilterChange('creator', s) };
            case 'product': return { options: standardSummaryData?.uniqueProducts || [], selected: localProductFilters, onChange: (s: string[]) => handleLocalFilterChange('product', s) };
            default: return { options: [], selected: [], onChange: () => {} };
        }
    };

    return (
        <div className="bg-white dark:bg-[#1c1c1e] rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)]" ref={tableContainerRef}> 
            <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.02]">
                <div className="flex flex-col gap-6">
                    {/* TOP ROW: Title and Toggle */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Icon name="table" size={6} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {displayTitle}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                                    {displayDescription}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 rounded-2xl p-1.5 border border-slate-200 dark:border-white/5 shadow-inner hide-on-export">
                            <button 
                                onClick={() => setIsComparisonMode(false)}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    !isComparisonMode 
                                    ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                Tiêu chuẩn
                            </button>
                            <button 
                                onClick={() => setIsComparisonMode(true)}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    isComparisonMode 
                                    ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                So sánh
                            </button>
                        </div>
                    </div>

                    {/* COMPARISON TOOLBAR */}
                    {isComparisonMode && (
                        <div className="animate-fade-in-down p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-100 dark:border-teal-800 flex flex-col gap-3">
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="flex items-center gap-3 flex-wrap hide-on-export w-full md:w-auto">
                                    {/* Mode Selector */}
                                    <select 
                                        value={compMode} 
                                        onChange={(e) => setCompMode(e.target.value as ComparisonMode)} 
                                        className="text-xs font-bold text-teal-800 bg-white border-teal-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:text-teal-300 dark:border-slate-600 py-1.5 pl-2 pr-8"
                                    >
                                        <option value="day_adjacent">Ngày (Liền kề)</option>
                                        <option value="day_same_period">Ngày (CK tháng trước)</option>
                                        <option value="week_adjacent">Tuần (Liền kề trong tháng)</option>
                                        <option value="week_same_period">Tuần (CK tháng trước)</option>
                                        <option value="month_adjacent">Tháng (Liền kề)</option>
                                        <option value="custom_range">Khoảng thời gian (Tùy chỉnh)</option>
                                    </select>
                                    
                                    {/* Compact Inputs based on Mode */}
                                    {compMode.startsWith('day') && (
                                        <input 
                                            type="date" 
                                            value={selectedDate} 
                                            onChange={e => setSelectedDate(e.target.value)} 
                                            className="text-xs border-slate-300 rounded shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:border-slate-600 py-1 px-2" 
                                        />
                                    )}

                                    {(compMode.startsWith('week') || compMode === 'month_adjacent') && (
                                        <input 
                                            type="month" 
                                            value={selectedMonth} 
                                            onChange={e => setSelectedMonth(e.target.value)} 
                                            className="text-xs border-slate-300 rounded shadow-sm focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:border-slate-600 py-1 px-2" 
                                        />
                                    )}

                                    {/* Pill Selector for Weeks */}
                                    {compMode.startsWith('week') && weeksInSelectedMonth.length > 0 && (
                                        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                                            {weeksInSelectedMonth.map(w => {
                                                const isSelected = selectedWeeks.includes(w.id);
                                                return (
                                                    <button
                                                        key={w.id}
                                                        onClick={() => handleWeekPillClick(w.id)}
                                                        className={`whitespace-nowrap px-3 py-1 text-[10px] sm:text-xs font-semibold rounded-full border transition-colors ${
                                                            isSelected 
                                                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm' 
                                                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                                                        }`}
                                                        title={w.label}
                                                    >
                                                        {w.shortLabel}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Custom Range Inputs */}
                                    {compMode === 'custom_range' && (
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">Kỳ A:</span>
                                                <input type="date" value={customRangeA.start} onChange={e => setCustomRangeA(p => ({ ...p, start: e.target.value }))} className="text-xs border-none bg-transparent focus:ring-0 p-0 w-24" />
                                                <span className="text-slate-400 text-xs">-</span>
                                                <input type="date" value={customRangeA.end} onChange={e => setCustomRangeA(p => ({ ...p, end: e.target.value }))} className="text-xs border-none bg-transparent focus:ring-0 p-0 w-24" />
                                            </div>
                                            <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Kỳ B:</span>
                                                <input type="date" value={customRangeB.start} onChange={e => setCustomRangeB(p => ({ ...p, start: e.target.value }))} className="text-xs border-none bg-transparent focus:ring-0 p-0 w-24" />
                                                <span className="text-slate-400 text-xs">-</span>
                                                <input type="date" value={customRangeB.end} onChange={e => setCustomRangeB(p => ({ ...p, end: e.target.value }))} className="text-xs border-none bg-transparent focus:ring-0 p-0 w-24" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 flex-grow justify-center md:justify-end">
                                    <div className="text-center">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Kỳ hiện tại</p>
                                        <p className="text-sm font-extrabold text-teal-600 dark:text-teal-400 whitespace-nowrap">{dateDisplay.current}</p>
                                    </div>
                                    <div className="text-lg text-slate-300 font-light">vs</div>
                                    <div className="text-center">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Kỳ so sánh</p>
                                        <p className="text-sm font-extrabold text-slate-600 dark:text-slate-300 whitespace-nowrap">{dateDisplay.prev}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Description Logic */}
                            {displayDescription && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 italic border-t border-teal-200 dark:border-teal-800/50 pt-1.5">
                                    <Icon name="info" size={3} className="inline mr-1" />
                                    {displayDescription}
                                </div>
                            )}
                        </div>
                    )}

                    {/* CONTROL BAR */}
                    <div className="relative z-[70] flex flex-wrap items-center justify-between gap-3 hide-on-export pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        {/* New Configurable Level Order UI (Drag & Drop Enabled) */}
                        <div className="flex flex-col gap-1 w-full lg:w-auto">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cấu trúc hiển thị & Lọc (Kéo thả để sắp xếp):</span>
                            <div className={`flex flex-wrap items-center gap-2 ${isPending ? 'opacity-50 pointer-events-none' : ''}`} ref={sortableListRef}>
                                {localDrilldownOrder.map((key, index) => {
                                    const colorClass = PILL_COLORS[key] || 'bg-slate-100 text-slate-700 border-slate-200';
                                    const iconName = PILL_ICONS[key] || 'box';
                                    const { options, selected, onChange } = getFilterProps(key);
                                    
                                    // Determine alignment based on index to prevent overflow
                                    // First 2 items align left, others default to right (via prop default)
                                    const alignment = index < 2 ? 'left' : 'right';

                                    return (
                                        <div key={key} className={`flex items-center ${colorClass} border rounded-full pl-3 pr-2 py-1 cursor-move transition-transform hover:scale-105 shadow-sm select-none group relative`}>
                                            <Icon name={iconName} size={3} className="mr-1.5 opacity-70" />
                                            <span className="text-xs font-bold mr-1">{ORDER_LABELS[key]}</span>
                                            {/* Integrated Filter Popover */}
                                            <FilterPopover 
                                                label={ORDER_LABELS[key]}
                                                options={options}
                                                selected={selected}
                                                onChange={onChange}
                                                isOpen={activeFilterKey === key}
                                                onToggle={() => setActiveFilterKey(prev => prev === key ? null : key)}
                                                onClose={() => setActiveFilterKey(null)}
                                                alignment={alignment}
                                            />
                                        </div>
                                    );
                                })}
                                
                                {/* Reset Button - Only show if any filters are active */}
                                {hasActiveFilters && (
                                    <button
                                        onClick={handleResetAllFilters}
                                        className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ml-1"
                                        title="Làm mới tất cả bộ lọc"
                                    >
                                        <Icon name="rotate-ccw" size={4} />
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3 ml-auto mt-2 lg:mt-0">
                            {/* Removed standalone dropdowns, now integrated into pills */}
                            <button onClick={toggleAllLevels} title={expandedIds.size > 0 ? 'Thu gọn' : 'Mở rộng'} className="p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <Icon name="chevrons-down-up" size={4} />
                            </button>
                            <button onClick={handleExport} disabled={isExporting} title="Xuất Ảnh" className="p-2 text-slate-500 dark:text-slate-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                               {isExporting ? <Icon name="loader-2" className="animate-spin" /> : <Icon name="camera" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

           <div className={`p-5 bg-white dark:bg-slate-800 transition-opacity duration-200 ${isPending ? 'opacity-60' : 'opacity-100'}`}>
              {/* Thicker fresh outer border */}
              <div className="overflow-hidden border-2 border-indigo-400 dark:border-slate-600">
                  <table className="min-w-full compact-export-table border-collapse" id="summary-table">
                      {/* HEADER */}
                      <thead>
                        {isComparisonMode ? (
                            <>
                                <tr>
                                    <th 
                                        rowSpan={2} 
                                        scope="col" 
                                        className={`px-4 py-3 text-center uppercase text-sm font-bold tracking-wider text-indigo-800 dark:text-indigo-200 shadow-md border-b bg-indigo-50 sticky left-0 z-40 border-r border-slate-300 dark:bg-slate-900`}
                                    >
                                        DANH MỤC
                                    </th>
                                    {HEADER_CONFIG.filter(h => h.showInComparison).map(h => (
                                        <th 
                                            key={h.key} 
                                            colSpan={2} 
                                            scope="col" 
                                            className={`px-2 py-2 text-center text-sm font-bold uppercase tracking-wider border-b ${h.colorClass} ${separatorClass}`}
                                        >
                                            {h.label}
                                        </th>
                                    ))}
                                </tr>
                                <tr className="bg-white dark:bg-slate-800 border-b-4 border-indigo-100 dark:border-slate-600">
                                    {HEADER_CONFIG.filter(h => h.showInComparison).map(h => (
                                        <React.Fragment key={`${h.key}-sub`}>
                                            <th 
                                                className={`px-2 py-1 text-center text-[10px] font-bold uppercase ${h.colorClass} border-b border-r border-slate-200/50 cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900/40`}
                                                onClick={() => handleSort(h.key, 'current')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    H.TẠI
                                                    {compSortConfig.column === h.key && compSortConfig.type === 'current' && (
                                                        <Icon name={compSortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />
                                                    )}
                                                </div>
                                            </th>
                                            <th 
                                                className={`px-2 py-1 text-center text-[10px] font-bold uppercase ${h.colorClass} border-b ${separatorClass} cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900/40`}
                                                onClick={() => handleSort(h.key, 'delta')}
                                            >
                                                <div className="flex items-center justify-center gap-1">
                                                    +/-
                                                    {compSortConfig.column === h.key && compSortConfig.type === 'delta' && (
                                                        <Icon name={compSortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />
                                                    )}
                                                </div>
                                            </th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </>
                        ) : (
                            <tr>
                                <th scope="col" className={`px-4 py-3 text-left uppercase text-sm font-bold tracking-wider text-indigo-800 dark:text-indigo-200 border-b-4 border-indigo-100 bg-indigo-50 sticky left-0 z-40 dark:bg-slate-900 ${separatorClass}`}>DANH MỤC</th>
                                {HEADER_CONFIG.map((h, index) => {
                                    return (
                                        <th key={h.key} scope="col" onClick={() => handleSort(h.key)} className={`px-4 py-3 text-center uppercase text-sm font-bold tracking-wider border-b-4 border-slate-200 cursor-pointer hover:opacity-80 transition-opacity ${separatorClass} ${h.colorClass}`}>
                                            <div className="flex items-center justify-center gap-1">
                                                {h.label}
                                                {activeSortConfig.column === h.key && <Icon name={activeSortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={3} />}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        )}
                      </thead>
                       <tbody>
                           {displayKeys.length > 0 ? (
                                displayKeys.map((key, index) => (
                                   <RecursiveRow 
                                        key={key} 
                                        nodeKey={key} 
                                        currentNode={isComparisonMode && compTree ? compTree.current.data[key] : standardSummaryData?.data[key]}
                                        prevNode={isComparisonMode && compTree ? compTree.prev.data[key] : undefined}
                                        level={1} 
                                        parentId="root" 
                                        expandedIds={expandedIds} 
                                        toggleExpand={toggleExpand} 
                                        rootIndex={index} 
                                        isComparisonMode={isComparisonMode}
                                        sortConfig={activeSortConfig}
                                        drilldownOrder={localDrilldownOrder}
                                    />
                                ))
                           ) : (
                                <tr><td colSpan={HEADER_CONFIG.length * 2 + 1} className="text-center p-8 text-slate-500">Không có dữ liệu để hiển thị.</td></tr>
                           )}
                       </tbody>
                       {/* FOOTER */}
                       <tfoot className="bg-indigo-50 dark:bg-indigo-900/50 font-extrabold text-base border-t-2 border-slate-300 dark:border-slate-600">
                           <tr>
                                <td className={`px-4 py-4 text-center sticky left-0 z-40 bg-indigo-50 dark:bg-indigo-900/50 ${separatorClass}`}>TỔNG CỘNG</td>
                                {/* Quantity */}
                                <td className={`${footerCellClass} ${!isComparisonMode ? separatorClass : ''}`}>{formatQuantity(grandTotal.totalQuantity)}</td>
                                {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaQuantity, 'number')}</td>}
                                
                                {/* Revenue */}
                                <td className={`${footerCellClass} ${!isComparisonMode ? separatorClass : ''}`}>{formatCurrency(grandTotal.totalRevenue)}</td>
                                {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaRevenue, 'currency')}</td>}

                                {/* RevenueQD */}
                                <td className={`${footerCellClass} text-indigo-700 dark:text-indigo-300 ${!isComparisonMode ? separatorClass : ''}`}>{formatCurrency(grandTotal.totalRevenueQD)}</td>
                                {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaRevenueQD, 'currency')}</td>}

                                {/* AOV */}
                                <td className={`${footerCellClass} ${!isComparisonMode ? separatorClass : ''}`}>{formatCurrency(grandTotal.aov, 1)}</td>
                                {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaAOV, 'currency')}</td>}

                                {/* Tra Gop */}
                                <td className={`${footerCellClass} ${getTraGopPercentClass(grandTotal.traGopPercent)} ${!isComparisonMode ? separatorClass : ''}`}>{traGopDisplayTotal}</td>
                                {isComparisonMode && <td className={`${footerDeltaCellClass} ${separatorClass}`}>{renderDelta(deltaTraGopPercent, 'percent')}</td>}
                           </tr>
                       </tfoot>
                  </table>
              </div>
           </div>
        </div>
    );
});

SummaryTable.displayName = 'SummaryTable';

export default SummaryTable;
