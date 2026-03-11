
// Added a global declaration for the 'google' object to resolve TypeScript errors about 'google' not being found.
declare const google: any;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatCurrency } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { getTrendAnalysis } from '../../services/aiService';
import { useTrendChartLogic } from '../../hooks/useTrendChartLogic';

const TrendChart: React.FC = React.memo(() => {
  const { processedData } = useDashboardContext();
  const trendData = processedData?.trendData;

  const chartDivRef = useRef<HTMLDivElement>(null);
  const chartCardRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [trendState, setTrendState] = useState({ view: 'shift', metric: 'thuc' });
  
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  // Use the custom hook to get prepared data
  const { totalValue, chartData, hasData, metricName } = useTrendChartLogic({
      trendData,
      view: trendState.view,
      metric: trendState.metric
  });
  
  const handleAiAnalysis = async () => {
    if (!trendData) return;
    setIsAnalysisLoading(true);
    setAnalysis(null); // Clear previous analysis
    try {
        const result = await getTrendAnalysis(trendData, trendState.view);
        setAnalysis(result);
    } catch (error) {
        setAnalysis("Đã xảy ra lỗi khi phân tích. Vui lòng thử lại.");
    } finally {
        setIsAnalysisLoading(false);
    }
  };

  const drawChart = useCallback(() => {
    if (!chartDivRef.current || !(window as any).google?.visualization) {
      if (chartDivRef.current) chartDivRef.current.innerHTML = ''; // Clear previous content
      return;
    }
    if (!trendData || !hasData) {
        chartDivRef.current.innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center text-slate-500 dark:text-slate-400">Không có dữ liệu xu hướng.</p></div>';
        return;
    }

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#f1f5f9' : '#0f172a';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    const dailyBaseColor = isDark ? '#818cf8' : '#4f46e5';
    const chartAreaBg = isDark ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc';
    const decreaseAnnotationColor = isDark ? '#f87171' : '#dc2626';

    const dataTable = new (window as any).google.visualization.DataTable();

    // Define columns based on view type
    if (trendState.view === 'daily') {
        dataTable.addColumn('date', 'Ngày');
        dataTable.addColumn('number', metricName);
        dataTable.addColumn({ type: 'string', role: 'annotation' });
        dataTable.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });
        dataTable.addRows(chartData);
    } else if (trendState.view === 'shift') {
        dataTable.addColumn('string', 'Ca');
        dataTable.addColumn('number', metricName);
        dataTable.addColumn({ type: 'string', role: 'style' });
        dataTable.addColumn({ type: 'string', role: 'annotation' });
        dataTable.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });
        dataTable.addRows(chartData);
    } else { // Weekly or Monthly
        dataTable.addColumn('string', trendState.view === 'weekly' ? 'Tuần' : 'Tháng');
        dataTable.addColumn('number', metricName); // Series 0: Increase/Same
        dataTable.addColumn({ type: 'string', role: 'style' });
        dataTable.addColumn({ type: 'string', role: 'annotation' });
        dataTable.addColumn('number', metricName); // Series 1: Decrease
        dataTable.addColumn({ type: 'string', role: 'style' });
        dataTable.addColumn({ type: 'string', role: 'annotation' });
        dataTable.addColumn({ type: 'string', role: 'tooltip', p: { html: true } });
        dataTable.addRows(chartData);
    }

    const baseOptions = {
        backgroundColor: 'transparent',
        legend: { position: 'none' },
        chartArea: {
            width: '90%',
            height: '75%',
            left: 70,
            top: 40,
            backgroundColor: chartAreaBg
        },
        hAxis: {
            textStyle: { color: textColor, fontSize: 12 },
            gridlines: { color: 'transparent' },
            baselineColor: 'transparent',
            slantedText: trendState.view !== 'shift',
            slantedTextAngle: 30
        },
        vAxis: {
            textStyle: { color: textColor, fontSize: 12 },
            format: 'short',
            gridlines: { color: gridColor },
            minorGridlines: { count: 0 },
            viewWindow: { min: 0 },
            baselineColor: 'transparent',
        },
        tooltip: { isHtml: true, trigger: 'focus' },
        animation: {
            startup: true,
            duration: 1200,
            easing: 'out',
        },
    };

    let finalOptions;
    let ChartClass;

    if (trendState.view === 'daily') {
        ChartClass = (window as any).google.visualization.AreaChart;
        finalOptions = {
            ...baseOptions,
            hAxis: { ...baseOptions.hAxis, format: 'dd/MM' },
            lineWidth: 2,
            pointSize: 5,
            areaOpacity: 0.15,
            colors: [dailyBaseColor],
            crosshair: { trigger: 'both', orientation: 'vertical', color: gridColor },
            curveType: 'function',
            series: {
                0: {
                    color: dailyBaseColor,
                    pointShape: { type: 'circle' },
                    pointsVisible: true,
                }
            },
            annotations: {
                textStyle: { fontSize: 11, bold: false, color: textColor, auraColor: 'none' },
                stem: { color: 'transparent' },
                style: 'point'
            },
        };
    } else if (trendState.view === 'shift') {
        ChartClass = (window as any).google.visualization.ColumnChart;
        finalOptions = {
            ...baseOptions,
            bar: { groupWidth: '60%' },
            annotations: {
                textStyle: { fontSize: 12, bold: true, color: textColor, auraColor: 'none' },
                alwaysOutside: true,
            },
        };
    } else { // weekly or monthly
         ChartClass = (window as any).google.visualization.ColumnChart;
         finalOptions = {
            ...baseOptions,
            isStacked: true,
            bar: { groupWidth: '60%' },
            series: {
                0: { // Series 0 for Increase/Same
                    annotations: {
                        textStyle: { fontSize: 11, bold: true, color: textColor, auraColor: 'none' },
                        alwaysOutside: true,
                    }
                },
                1: { // Series 1 for Decrease
                    annotations: {
                        textStyle: { fontSize: 11, bold: true, color: decreaseAnnotationColor, auraColor: 'none' },
                        alwaysOutside: true,
                    }
                }
            }
        };
    }
    
    if (chartInstanceRef.current) {
        chartInstanceRef.current.clearChart();
    }
    chartInstanceRef.current = new ChartClass(chartDivRef.current);
    chartInstanceRef.current.draw(dataTable, finalOptions);
    
    // Update Title
    const titleEl = chartCardRef.current?.querySelector('#trend-chart-title');
    if(titleEl) {
        titleEl.innerHTML = `XU HƯỚNG DOANH THU <span class="text-slate-500 dark:text-slate-400 font-medium text-base ml-2"> - TỔNG: ${formatCurrency(totalValue)}</span>`;
    }

  }, [trendData, trendState, chartData, hasData, totalValue, metricName]);

  useEffect(() => {
    let observer: ResizeObserver;
    
    const drawAndObserve = () => {
        drawChart();
        if (chartCardRef.current) {
            observer = new ResizeObserver(() => {
                setTimeout(() => drawChart(), 150);
            });
            observer.observe(chartCardRef.current);
        }
    };

    if ((window as any).google?.visualization) {
        drawAndObserve();
    } else {
        (window as any).google?.charts?.load('current', { 'packages': ['corechart'] });
        (window as any).google?.charts?.setOnLoadCallback(drawAndObserve);
    }

    return () => {
        if (observer && chartCardRef.current) {
            observer.unobserve(chartCardRef.current);
        }
        if (chartInstanceRef.current) {
            chartInstanceRef.current.clearChart();
        }
    };
  }, [drawChart]);

  return (
    <div 
      ref={chartCardRef}
      className="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 dark:border-white/5 p-6 mb-8 transition-all duration-300"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center">
            <Icon name="trending-up" size={5} />
          </div>
          <div>
            <h2 id="trend-chart-title" className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
              XU HƯỚNG DOANH THU
            </h2>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Phân tích theo thời gian & ca làm việc</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 hide-on-export">
          {/* Metric Selector */}
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setTrendState(prev => ({ ...prev, metric: 'thuc' }))}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                trendState.metric === 'thuc' 
                ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Thực tế
            </button>
            <button
              onClick={() => setTrendState(prev => ({ ...prev, metric: 'qd' }))}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                trendState.metric === 'qd' 
                ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Quy đổi
            </button>
          </div>

          {/* View Selector */}
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            {(['shift', 'daily', 'weekly', 'monthly'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setTrendState(prev => ({ ...prev, view: v }))}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  trendState.view === v 
                  ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {v === 'shift' ? 'Ca' : v === 'daily' ? 'Ngày' : v === 'weekly' ? 'Tuần' : 'Tháng'}
              </button>
            ))}
          </div>

          <button
            onClick={handleAiAnalysis}
            disabled={isAnalysisLoading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-md shadow-indigo-200 dark:shadow-none active:scale-95"
          >
            {isAnalysisLoading ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Icon name="sparkles" size={3} />
            )}
            AI Phân tích
          </button>
        </div>
      </div>

      <div className="relative">
        <div 
          ref={chartDivRef} 
          className="w-full h-[350px] transition-opacity duration-500"
          style={{ opacity: hasData ? 1 : 0.5 }}
        />
        
        {(analysis || isAnalysisLoading) && (
          <div className="mt-6 p-5 bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Icon name="sparkles" size={3} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400">Nhận xét từ AI</h3>
            </div>
            {isAnalysisLoading ? (
              <div className="space-y-2 mt-1">
                <div className="animate-pulse bg-indigo-100/50 dark:bg-indigo-500/10 rounded h-4 w-full"></div>
                <div className="animate-pulse bg-indigo-100/50 dark:bg-indigo-500/10 rounded h-4 w-3/4"></div>
              </div>
            ) : (
              <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line font-medium">
                {analysis}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

TrendChart.displayName = 'TrendChart';

export default TrendChart;
