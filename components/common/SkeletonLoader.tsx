import React from 'react';

// Base component for the pulsing animation
export const SkeletonPulse: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`}></div>
);

// Skeleton for a single KPI card
const KpiCardSkeleton: React.FC = () => (
    <div className="chart-card p-4 flex flex-col justify-between gap-2">
        <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700"></div>
            <SkeletonPulse className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-4">
            <SkeletonPulse className="h-8 w-1/2" />
            <SkeletonPulse className="h-6 w-1/4" />
        </div>
    </div>
);

// Skeleton for the entire KPI cards section
export const KpiCardsSkeleton: React.FC = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
    </div>
);

// Skeleton for chart-like components (TrendChart, IndustryGrid)
export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-[442px]' }) => (
    <div className={`chart-card p-4 flex flex-col ${height}`}>
        <div className="flex justify-between items-center mb-2 px-2">
            <div>
                <SkeletonPulse className="h-6 w-48 mb-2" />
                <SkeletonPulse className="h-4 w-64" />
            </div>
            <div className="flex items-center gap-2">
                <SkeletonPulse className="h-9 w-24 rounded-lg" />
                <SkeletonPulse className="h-9 w-32 rounded-lg" />
            </div>
        </div>
        <div className="border-b border-slate-200 dark:border-slate-700 my-4"></div>
        <SkeletonPulse className="w-full flex-grow" />
    </div>
);

// Generic Skeleton for table-like components (SummaryTable, WarehouseSummary)
export const TableSkeleton: React.FC<{rows?: number}> = ({ rows = 5 }) => (
    <div className="chart-card">
        <div className="px-5 py-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
            <div>
                <SkeletonPulse className="h-7 w-56 mb-2" />
                <SkeletonPulse className="h-4 w-72" />
            </div>
            <div className="flex items-center gap-3">
                <SkeletonPulse className="h-10 w-28 rounded-md" />
                <SkeletonPulse className="h-10 w-28 rounded-md" />
            </div>
        </div>
        <div className="p-5">
            <div className="space-y-3">
                {/* Header */}
                <div className="grid grid-cols-5 gap-4 px-4">
                    <SkeletonPulse className="h-5 col-span-2" />
                    <SkeletonPulse className="h-5" />
                    <SkeletonPulse className="h-5" />
                    <SkeletonPulse className="h-5" />
                </div>
                {/* Body */}
                {Array.from({ length: rows }).map((_, i) => (
                    <SkeletonPulse key={i} className="h-12 w-full rounded-lg" />
                ))}
            </div>
        </div>
    </div>
);

// A more specific skeleton for the EmployeeAnalysis component which has tabs
export const TabbedTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
    <div className="chart-card rounded-xl flex flex-col flex-grow">
        {/* Tab headers */}
        <div className="flex justify-between items-center gap-y-2 border-b-2 border-slate-200 dark:border-slate-700 px-4 pt-4">
            <div className="flex items-center gap-4">
                <SkeletonPulse className="h-5 w-24 pb-2" />
                <SkeletonPulse className="h-5 w-28 pb-2" />
                <SkeletonPulse className="h-5 w-20 pb-2" />
            </div>
            <div className="flex items-center gap-3 pb-2">
                <SkeletonPulse className="h-10 w-48 rounded-md" />
                <SkeletonPulse className="h-10 w-10 rounded-md" />
            </div>
        </div>
        {/* Table content */}
        <div className="p-4 flex-grow">
            <div className="space-y-3">
                 <div className="flex justify-between items-center mb-4">
                    <SkeletonPulse className="h-6 w-48" />
                    <SkeletonPulse className="h-8 w-24 rounded-md" />
                 </div>
                 {/* Table Body */}
                {Array.from({ length: rows }).map((_, i) => (
                    <SkeletonPulse key={i} className="h-16 w-full rounded-xl" />
                ))}
            </div>
        </div>
    </div>
);
