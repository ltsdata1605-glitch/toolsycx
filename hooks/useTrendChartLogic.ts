import { useMemo } from 'react';
import type { TrendData } from '../types';
import { formatCurrency } from '../utils/dataUtils';

interface UseTrendChartLogicProps {
    trendData: TrendData | undefined;
    view: string;
    metric: string;
}

export const useTrendChartLogic = ({ trendData, view, metric }: UseTrendChartLogicProps) => {
    return useMemo(() => {
        if (!trendData) return { totalValue: 0, chartData: [], hasData: false };

        const metricKey = metric === 'qd' ? 'revenueQD' : 'revenue';
        const metricName = metric === 'qd' ? 'DTQĐ' : 'Doanh thu';
        let totalValue = 0;
        let hasData = false;
        
        // Data format for Google Charts: [Label, Value1, Style1, Annotation1, Value2, Style2, Annotation2, Tooltip]
        // This generic structure works for most bar/column charts.
        // Area chart (daily) needs a slightly different structure which we handle in the component.
        const rows: any[] = [];

        const isDark = document.documentElement.classList.contains('dark');
        // UPDATE: Changed colors to a fresh pastel theme for Weekly/Monthly charts.
        const increaseColor = isDark ? '#48BB78' : '#68D391'; // Darker pastel green
        const decreaseColor = isDark ? '#F56565' : '#FC8181'; // Darker pastel red
        const shiftColors = isDark 
            ? ['#a78bfa', '#7dd3fc', '#6ee7b7', '#fde047', '#f9a8d4', '#fda4af']
            : ['#818cf8', '#38bdf8', '#34d399', '#facc15', '#f472b6', '#fb7185'];

        const createTooltip = (label: string, value: number, change?: number) => {
            let changeHtml = '';
            if (change !== undefined && !isNaN(change)) {
                const changeClass = change < 0 ? 'text-red-500' : 'text-green-500';
                const changeIcon = change < 0 ? '▼' : '▲';
                changeHtml = `<div class="mt-1">So với kỳ trước: <span class="font-bold ${changeClass}">${changeIcon} ${Math.abs(change).toFixed(1)}%</span></div>`;
            }
            return `
            <div class="p-2 shadow-lg rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-sm font-sans">
                <div class="font-bold text-slate-800 dark:text-slate-100 mb-1">${label}</div>
                <div class="text-slate-600 dark:text-slate-300">${metricName}: <span class="font-bold text-indigo-600 dark:text-indigo-400">${value.toLocaleString('vi-VN')}</span></div>
                ${changeHtml}
            </div>`;
        };

        if (view === 'daily') {
            const dailyData = (Object.values(trendData.daily || {}) as Array<{ date: Date; revenue: number; revenueQD: number; }>).sort((a, b) => a.date.getTime() - b.date.getTime());
            dailyData.forEach(day => {
                const value = day[metricKey];
                totalValue += value;
                if (value > 0) hasData = true;
                const formattedDate = day.date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                const tooltip = createTooltip(`Ngày ${formattedDate}`, value);
                rows.push([day.date, value, formatCurrency(value), tooltip]);
            });
        } else if (view === 'weekly') {
            const weeklyData = Object.values(trendData.daily || {}).reduce((acc: { [key: string]: { date: Date; value: number } }, day: any) => {
                const date = new Date(day.date);
                date.setHours(0, 0, 0, 0);
                const dayOfWeek = date.getDay();
                const dateOfMonday = new Date(date);
                dateOfMonday.setDate(date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
                const key = dateOfMonday.toISOString().split('T')[0];
                if (!acc[key]) acc[key] = { date: dateOfMonday, value: 0 };
                acc[key].value += day[metricKey];
                return acc;
            }, {});

            const sortedWeeklyData = Object.values(weeklyData).sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
            sortedWeeklyData.forEach((week: any, index: number) => {
                totalValue += week.value;
                if (week.value > 0) hasData = true;

                const startDate = week.date;
                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                const formatDate = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }).replace(/\./g, '/');
                const label = `${formatDate(startDate)}-${formatDate(endDate)}`;
                
                let annotation = formatCurrency(week.value);
                let changePercent: number | undefined = undefined;
                let isDecrease = false;

                if (index > 0) {
                    const prevValue = sortedWeeklyData[index - 1].value;
                    if (prevValue > 0) {
                        changePercent = ((week.value - prevValue) / prevValue) * 100;
                        if (changePercent < 0) {
                            isDecrease = true;
                            annotation += ` ▼ ${Math.abs(changePercent).toFixed(0)}%`;
                        } else {
                            annotation += ` ▲ ${changePercent.toFixed(0)}%`;
                        }
                    }
                }
                const tooltip = createTooltip(`Tuần ${label}`, week.value, changePercent);
                if (isDecrease) {
                    rows.push([label, null, null, null, week.value, `color: ${decreaseColor}`, annotation, tooltip]);
                } else {
                    rows.push([label, week.value, `color: ${increaseColor}`, annotation, null, null, null, tooltip]);
                }
            });
        } else if (view === 'monthly') {
            const monthlyData = Object.values(trendData.daily || {}).reduce((acc: { [key: string]: { date: Date; value: number } }, day: any) => {
                const date = new Date(day.date);
                const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                const key = firstDayOfMonth.toISOString().split('T')[0];
                if (!acc[key]) acc[key] = { date: firstDayOfMonth, value: 0 };
                acc[key].value += day[metricKey];
                return acc;
            }, {});

            const sortedMonthlyData = Object.values(monthlyData).sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
            sortedMonthlyData.forEach((month: any, index: number) => {
                totalValue += month.value;
                if (month.value > 0) hasData = true;
                const label = month.date.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
                
                let annotation = formatCurrency(month.value);
                let changePercent: number | undefined = undefined;
                let isDecrease = false;

                if (index > 0) {
                    const prevValue = sortedMonthlyData[index - 1].value;
                    if (prevValue > 0) {
                        changePercent = ((month.value - prevValue) / prevValue) * 100;
                        if (changePercent < 0) {
                            isDecrease = true;
                            annotation += ` ▼ ${Math.abs(changePercent).toFixed(0)}%`;
                        } else {
                            annotation += ` ▲ ${changePercent.toFixed(0)}%`;
                        }
                    }
                }
                const tooltip = createTooltip(`Tháng ${label}`, month.value, changePercent);
                if (isDecrease) {
                    rows.push([label, null, null, null, month.value, `color: ${decreaseColor}`, annotation, tooltip]);
                } else {
                    rows.push([label, month.value, `color: ${increaseColor}`, annotation, null, null, null, tooltip]);
                }
            });
        } else { // shift view
            const shiftData = trendData.shifts || {};
            for (let i = 1; i <= 6; i++) {
                const value = shiftData[`Ca ${i}`]?.[metricKey] || 0;
                totalValue += value;
                if (value > 0) hasData = true;
                const color = shiftColors[i - 1];
                const tooltipContent = createTooltip(`Ca ${i}`, value);
                rows.push([`Ca ${i}`, value, `color: ${color}`, formatCurrency(value), tooltipContent]);
            }
        }

        return { totalValue, chartData: rows, hasData, metricName };
    }, [trendData, view, metric]);
};
