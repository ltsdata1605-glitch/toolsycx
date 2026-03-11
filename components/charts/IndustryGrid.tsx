
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { exportElementAsImage } from '../../services/uiService';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { useIndustryGridLogic } from '../../hooks/useIndustryGridLogic';
import MultiSelectDropdown from '../common/MultiSelectDropdown';

declare const google: any;

interface IndustryGridProps {}

const IndustryGrid: React.FC<IndustryGridProps> = React.memo(() => {
    const { processedData, productConfig, filterState: filters, handleFilterChange: onFilterChange } = useDashboardContext();
    const industryData = processedData?.industryData ?? [];
    const filteredValidSalesData = processedData?.filteredValidSalesData ?? [];
    const globalParentFilters = filters.parent;

    const cardRef = useRef<HTMLDivElement>(null);
    const pieChartRef = useRef<HTMLDivElement>(null);
    const barChartRef = useRef<HTMLDivElement>(null);
    const isInitialFilterSet = useRef(false);
    const isSyncing = useRef(false);

    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'card' | 'chart'>('card');
    const lastDrawnSize = useRef({ width: 0, height: 0 });
    const resizeTimeout = useRef<NodeJS.Timeout | null>(null);

    // Use Custom Hook to handle logic
    const {
        drilldownPath,
        setDrilldownPath,
        currentView,
        allSubgroups,
        selectedChartSubgroups,
        setSelectedChartSubgroups,
        manufacturerDataForChart,
        getTitle
    } = useIndustryGridLogic({ industryData, filteredValidSalesData, productConfig });

    // --- Effects & Handlers ---

    // Sync drilldownPath with globalParentFilters
    useEffect(() => {
        if (isSyncing.current) return;
        
        if (globalParentFilters.length === 1) {
            const selectedParent = globalParentFilters[0];
            if (drilldownPath.length === 0 || drilldownPath[0] !== selectedParent) {
                isSyncing.current = true;
                setDrilldownPath([selectedParent]);
                setTimeout(() => { isSyncing.current = false; }, 50);
            }
        } else if (globalParentFilters.length === 0) {
            if (drilldownPath.length > 0) {
                isSyncing.current = true;
                setDrilldownPath([]);
                setTimeout(() => { isSyncing.current = false; }, 50);
            }
        }
    }, [globalParentFilters, setDrilldownPath, drilldownPath]);

    // Sync globalParentFilters with drilldownPath
    useEffect(() => {
        if (isSyncing.current) return;

        if (drilldownPath.length === 1) {
            const currentParent = drilldownPath[0];
            if (globalParentFilters.length !== 1 || globalParentFilters[0] !== currentParent) {
                isSyncing.current = true;
                onFilterChange({ parent: [currentParent] });
                setTimeout(() => { isSyncing.current = false; }, 50);
            }
        } else if (drilldownPath.length === 0 && globalParentFilters.length === 1) {
             // If user goes back to "All" in IndustryGrid, clear global parent filter
             isSyncing.current = true;
             onFilterChange({ parent: [] });
             setTimeout(() => { isSyncing.current = false; }, 50);
        }
    }, [drilldownPath, globalParentFilters, onFilterChange]);

    useEffect(() => {
        if (!isInitialFilterSet.current && allSubgroups.includes('Smartphone')) {
            setSelectedChartSubgroups(['Smartphone']);
            isInitialFilterSet.current = true;
        }
    }, [allSubgroups, setSelectedChartSubgroups]);

    const drawCharts = useCallback(() => {
        if (!(window as any).google?.visualization) return;
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#f1f5f9' : '#0f172a';
        
        // Draw Pie Chart
        if (pieChartRef.current && industryData.length > 0) {
            let pieChartData = [...industryData];
            if (industryData.length > 10) {
                const top10 = industryData.slice(0, 10);
                const otherSlice = industryData.slice(10).reduce((acc, item) => {
                    acc.revenue += item.revenue;
                    acc.quantity += item.quantity;
                    return acc;
                }, { revenue: 0, quantity: 0 });
                pieChartData = [...top10, { name: 'Ngành hàng khác', ...otherSlice }];
            }

            const pieData = new (window as any).google.visualization.DataTable();
            pieData.addColumn('string', 'Ngành hàng');
            pieData.addColumn('number', 'Doanh thu');
            pieData.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });

            pieData.addRows(pieChartData.map(item => {
                const legendLabel = `${item.name}: ${formatCurrency(item.revenue)} (${formatQuantity(item.quantity)} SP)`;
                const tooltip = `
                    <div class="p-2 shadow-lg rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm font-sans">
                        <div class="font-bold text-slate-800 dark:text-slate-100 mb-1">${item.name}</div>
                        <div class="text-slate-600 dark:text-slate-300">Doanh thu: <span class="font-bold text-indigo-600 dark:text-indigo-400">${formatCurrency(item.revenue)}</span></div>
                        <div class="text-slate-600 dark:text-slate-300">Số lượng: <span class="font-bold text-indigo-600 dark:text-indigo-400">${formatQuantity(item.quantity)} SP</span></div>
                    </div>`;
                return [legendLabel, item.revenue, tooltip];
            }));
            
            const pieOptions = {
                title: 'Top 10 Tỷ Trọng Doanh Thu',
                pieHole: 0.4,
                backgroundColor: 'transparent',
                colors: isDark 
                    ? ['#60a5fa', '#4ade80', '#facc15', '#f87171', '#a78bfa', '#22d3ee', '#fb923c', '#f472b6', '#34d399', '#93c5fd']
                    : ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#10b981', '#60a5fa'],
                legend: { 
                    position: 'right', 
                    alignment: 'center',
                    textStyle: { color: textColor, fontSize: 12 },
                    maxLines: 1
                },
                titleTextStyle: { color: textColor, fontSize: 16, bold: true },
                chartArea: { left: 10, top: 40, width: '95%', height: '85%' },
                tooltip: { isHtml: true }
            };
            const pieChart = new (window as any).google.visualization.PieChart(pieChartRef.current);
            pieChart.draw(pieData, pieOptions);
        }

        // Draw Bar Chart
        if (barChartRef.current && manufacturerDataForChart.length > 0) {
            const barChartColors = isDark 
                ? ['#a78bfa', '#7dd3fc', '#6ee7b7', '#fde047', '#f9a8d4', '#fda4af', '#fca5a5', '#d8b4fe', '#bfdbfe', '#a7f3d0', '#fef08a', '#fbcfe8', '#fed7aa', '#bae6fd', '#bbf7d0']
                : ['#818cf8', '#38bdf8', '#34d399', '#facc15', '#f472b6', '#fb7185', '#f87171', '#c084fc', '#93c5fd', '#6ee7b7', '#fde047', '#f9a8d4', '#fdba74', '#7dd3fc', '#86efac'];
            
            const barData = new (window as any).google.visualization.DataTable();
            barData.addColumn('string', 'Nhà sản xuất');
            barData.addColumn('number', 'Doanh thu');
            barData.addColumn({ type: 'string', role: 'style' });
            barData.addColumn({ type: 'string', role: 'annotation' });
            barData.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });

            const top15Manufacturers = manufacturerDataForChart.slice(0, 15);
            top15Manufacturers.forEach((item, index) => {
                const color = barChartColors[index % barChartColors.length];
                const annotation = `${formatCurrency(item.revenue)} | ${formatQuantity(item.quantity)} SP`;
                const tooltip = `
                    <div class="p-2 shadow-lg rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm font-sans">
                        <div class="font-bold text-slate-800 dark:text-slate-100 mb-1">${item.name}</div>
                        <div class="text-slate-600 dark:text-slate-300">Doanh thu: <span class="font-bold text-indigo-600 dark:text-indigo-400">${formatCurrency(item.revenue)}</span></div>
                        <div class="text-slate-600 dark:text-slate-300">Số lượng: <span class="font-bold text-indigo-600 dark:text-indigo-400">${formatQuantity(item.quantity)} SP</span></div>
                    </div>`;
                barData.addRow([item.name, item.revenue, `color: ${color}`, annotation, tooltip]);
            });

            let barChartTitle = 'Top 15 Nhà Sản Xuất (Tất cả)';
            if (selectedChartSubgroups.length === 1) {
                barChartTitle = `Top 15 Nhà Sản Xuất - ${selectedChartSubgroups[0]}`;
            } else if (selectedChartSubgroups.length > 1) {
                barChartTitle = `Top 15 Nhà Sản Xuất - ${selectedChartSubgroups.length} nhóm con`;
            }

            const barOptions = {
                title: barChartTitle,
                backgroundColor: 'transparent',
                legend: { position: 'none' },
                titleTextStyle: { color: textColor, fontSize: 16, bold: true },
                chartArea: { left: 120, top: 40, width: '70%', height: '80%' },
                hAxis: { textStyle: { color: textColor }, gridlines: { color: isDark ? '#334155' : '#e2e8f0' } },
                vAxis: { textStyle: { color: textColor } },
                animation: { startup: true, duration: 1000, easing: 'out' },
                tooltip: { isHtml: true },
                annotations: {
                    alwaysOutside: true,
                    textStyle: { fontSize: 10, color: textColor, auraColor: 'none' }
                }
            };
            const barChart = new (window as any).google.visualization.BarChart(barChartRef.current);
            barChart.draw(barData, barOptions);
        }
    }, [industryData, manufacturerDataForChart, selectedChartSubgroups]);

    // Load Google Charts once
    useEffect(() => {
        if (activeTab === 'chart' && !(window as any).google?.visualization) {
            const script = document.createElement('script');
            script.src = 'https://www.gstatic.com/charts/loader.js';
            script.onload = () => {
                (window as any).google.charts.load('current', { 'packages': ['corechart'] });
                (window as any).google.charts.setOnLoadCallback(() => {
                    drawCharts();
                });
            };
            document.head.appendChild(script);
        }
    }, [activeTab, drawCharts]);

    useEffect(() => {
        const chartCardElement = cardRef.current;
        if (activeTab !== 'chart' || !chartCardElement) return;

        const handleResize = () => {
            if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
            resizeTimeout.current = setTimeout(() => {
                if (!chartCardElement) return;
                const { offsetWidth, offsetHeight } = chartCardElement;
                
                if (Math.abs(offsetWidth - lastDrawnSize.current.width) > 10 || 
                    Math.abs(offsetHeight - lastDrawnSize.current.height) > 10) {
                    
                    lastDrawnSize.current = { width: offsetWidth, height: offsetHeight };
                    drawCharts();
                }
            }, 300);
        };

        if ((window as any).google?.visualization) {
            drawCharts();
        }

        const observer = new ResizeObserver(handleResize);
        observer.observe(chartCardElement);

        return () => {
            if (observer) observer.disconnect();
            if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
        };
    }, [activeTab, drawCharts]);

    const handleExport = async () => {
        if (cardRef.current) {
            setIsExporting(true);
            await exportElementAsImage(cardRef.current, 'ty-trong-nganh-hang.png', {
                elementsToHide: ['.hide-on-export'],
            });
            setIsExporting(false);
        }
    };

    const handleCardClick = (itemName: string) => {
        if (drilldownPath.length < 2) {
            setDrilldownPath(prev => [...prev, itemName]);
        }
    };
    
    const handleBreadcrumbClick = (index: number) => {
        setDrilldownPath(prev => prev.slice(0, index));
    };

    return (
        <div 
            ref={cardRef}
            className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-white/5 p-6 mb-8 transition-all duration-300"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center">
                        <Icon name="layout-grid" size={5} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                            {getTitle(activeTab)}
                        </h2>
                        {activeTab === 'card' && (
                            <div className="flex items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5 hide-on-export">
                                <button onClick={() => handleBreadcrumbClick(0)} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">TẤT CẢ</button>
                                {drilldownPath.map((item, index) => (
                                    <div key={index} className="flex items-center">
                                        <Icon name="chevron-right" size={3} className="mx-1 opacity-50" />
                                        <button onClick={() => handleBreadcrumbClick(index + 1)} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate max-w-[120px]">{item.toUpperCase()}</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 hide-on-export">
                    {activeTab === 'chart' && (
                        <div className="w-48">
                            <MultiSelectDropdown 
                                options={allSubgroups}
                                selected={selectedChartSubgroups}
                                onChange={setSelectedChartSubgroups}
                                label="nhóm con"
                            />
                        </div>
                    )}
                    
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                        <button 
                            onClick={() => setActiveTab('card')} 
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                activeTab === 'card' 
                                ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            Dạng Thẻ
                        </button>
                        <button 
                            onClick={() => setActiveTab('chart')} 
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                activeTab === 'chart' 
                                ? 'bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            Biểu Đồ
                        </button>
                    </div>

                    <button 
                        onClick={handleExport} 
                        disabled={isExporting} 
                        className="p-2.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95"
                    >
                        {isExporting ? <Icon name="loader-2" size={4} className="animate-spin" /> : <Icon name="camera" size={4} />}
                    </button>
                </div>
            </div>

            {activeTab === 'card' ? (
                currentView.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                        <Icon name="search-x" size={8} className="text-slate-300 dark:text-slate-700 mb-3" />
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Không có dữ liệu hiển thị</p>
                    </div>
                ) : (
                    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 industry-cards-grid">
                        {currentView.data.map(({ name, revenue, quantity, icon, color }) => {
                            const percentage = currentView.totalRevenue > 0 ? (revenue / currentView.totalRevenue * 100) : 0;
                            const isDrillable = drilldownPath.length < 2;
                            
                            // Map dynamic colors to Tailwind classes safely
                            const colorClasses: Record<string, string> = {
                                blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
                                emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
                                amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
                                rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
                                indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
                                cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400',
                                orange: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
                                pink: 'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400',
                                teal: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400',
                                sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
                            };

                            const iconClass = colorClasses[color] || colorClasses['blue'];

                            return (
                                <div
                                    key={name}
                                    onClick={isDrillable ? () => handleCardClick(name) : undefined}
                                    className={`group relative flex flex-col justify-between p-4 bg-white dark:bg-[#2c2c2e]/30 border border-slate-100 dark:border-white/5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 ${isDrillable ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconClass} transition-transform group-hover:scale-110`}>
                                            <Icon name={icon} size={4.5} />
                                        </div>
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 tracking-tighter">
                                            {percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                    
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 truncate mb-1" title={name}>{name}</div>
                                        <div className="text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none truncate">{formatCurrency(revenue)}</div>
                                        <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-slate-400 dark:text-slate-600">
                                            <Icon name="package" size={3} /> {formatQuantity(quantity)} SP
                                        </div>
                                    </div>

                                    {isDrillable && (
                                        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Icon name="chevron-right" size={3} className="text-emerald-500" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            ) : (
                <div className="flex flex-col lg:flex-row items-stretch gap-6">
                    <div className="lg:w-[45%] bg-slate-50/30 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5" ref={pieChartRef} style={{ minHeight: '450px' }}></div>
                    <div className="lg:w-[55%] bg-slate-50/30 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5" ref={barChartRef} style={{ minHeight: '450px' }}></div>
                </div>
            )}
        </div>
    );
});

IndustryGrid.displayName = 'IndustryGrid';

export default IndustryGrid;
