
import React from 'react';
import type { SummaryTableNode } from '../../types';
import { abbreviateName, formatCurrency, formatQuantity } from '../../utils/dataUtils';
import { Icon } from '../common/Icon';

interface RecursiveRowProps {
    nodeKey: string;
    currentNode?: SummaryTableNode; 
    prevNode?: SummaryTableNode;
    level: number;
    parentId: string;
    expandedIds: Set<string>;
    toggleExpand: (id: string) => void;
    rootIndex: number;
    isComparisonMode: boolean;
    sortConfig: { column: string, type: 'current' | 'delta', direction: 'asc' | 'desc' };
    drilldownOrder: string[]; // Receive the dynamic order
}

const getTraGopPercentClass = (percentage: number) => {
    if (isNaN(percentage)) return 'text-slate-600 dark:text-slate-300';
    if (percentage >= 45) return 'text-green-600 dark:text-green-500 font-bold';
    if (percentage >= 40) return 'text-amber-600 dark:text-amber-500';
    return 'text-red-600 dark:text-red-500 font-bold';
};

// Colors matching PILL_COLORS in SummaryTable.tsx but tuned for text visibility
const ROW_TEXT_COLORS: Record<string, string> = {
    'parent': 'text-rose-700 dark:text-rose-300',         // Rose
    'child': 'text-sky-700 dark:text-sky-300',           // Sky
    'manufacturer': 'text-emerald-700 dark:text-emerald-300', // Emerald
    'creator': 'text-amber-700 dark:text-amber-300',      // Amber
    'product': 'text-violet-700 dark:text-violet-300'     // Violet
};

const RecursiveRow: React.FC<RecursiveRowProps> = React.memo(({ 
    nodeKey, currentNode, prevNode, level, parentId, expandedIds, toggleExpand, rootIndex, isComparisonMode, sortConfig, drilldownOrder
}) => {
    const currentId = `${parentId}-${nodeKey.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const isExpanded = expandedIds.has(currentId);
    
    // Determine metrics
    const quantity = currentNode?.totalQuantity || 0;
    const revenue = currentNode?.totalRevenue || 0;
    const revenueQD = currentNode?.totalRevenueQD || 0;
    const traGopRevenue = currentNode?.totalTraGop || 0;
    
    // Sort Children logic
    const currentChildrenKeys = currentNode ? Object.keys(currentNode.children) : [];
    const prevChildrenKeys = prevNode ? Object.keys(prevNode.children) : [];
    let allChildrenKeys = Array.from(new Set([...currentChildrenKeys, ...prevChildrenKeys]));

    // Apply sorting to children
    allChildrenKeys.sort((a, b) => {
        const nodeA = currentNode?.children[a];
        const prevNodeA = prevNode?.children[a];
        
        const nodeB = currentNode?.children[b];
        const prevNodeB = prevNode?.children[b];
        
        // Helper to get value safely
        const getVal = (node: SummaryTableNode | undefined, key: string) => {
            if (!node) return 0;
            if (key === 'aov') return node.totalQuantity > 0 ? node.totalRevenue / node.totalQuantity : 0;
            if (key === 'traGopPercent') return node.totalRevenue > 0 ? (node.totalTraGop / node.totalRevenue) * 100 : 0;
            return (node as any)[key] || 0;
        };

        const currValA = getVal(nodeA, sortConfig.column);
        const currValB = getVal(nodeB, sortConfig.column);
        
        let finalValA = currValA;
        let finalValB = currValB;

        if (sortConfig.type === 'delta') {
            const prevValA = getVal(prevNodeA, sortConfig.column);
            const prevValB = getVal(prevNodeB, sortConfig.column);
            finalValA = currValA - prevValA;
            finalValB = currValB - prevValB;
        }

        if (finalValA === finalValB) return a.localeCompare(b); 
        return sortConfig.direction === 'asc' ? finalValA - finalValB : finalValB - finalValA;
    });
    
    const hasChildren = allChildrenKeys.length > 0;
    const isExpandable = hasChildren && level < 5; 

    const aov = quantity > 0 ? revenue / quantity : 0;
    const traGopPercent = revenue > 0 ? (traGopRevenue / revenue) * 100 : 0;
    
    // Calculate Deltas
    let deltaQuantity = 0, deltaRevenue = 0, deltaRevenueQD = 0, deltaAOV = 0, deltaTraGopPercent = 0;

    if (isComparisonMode) {
        const prevQuantity = prevNode?.totalQuantity || 0;
        const prevRevenue = prevNode?.totalRevenue || 0;
        const prevRevenueQD = prevNode?.totalRevenueQD || 0;
        const prevTraGopRevenue = prevNode?.totalTraGop || 0;
        
        const prevAov = prevQuantity > 0 ? prevRevenue / prevQuantity : 0;
        const prevTraGopPercent = prevRevenue > 0 ? (prevTraGopRevenue / prevRevenue) * 100 : 0;

        deltaQuantity = quantity - prevQuantity;
        deltaRevenue = revenue - prevRevenue;
        deltaRevenueQD = revenueQD - prevRevenueQD;
        deltaAOV = aov - prevAov;
        deltaTraGopPercent = traGopPercent - prevTraGopPercent;
    }

    const renderDelta = (val: number, type: 'currency' | 'number' | 'percent') => {
        if (val === 0 && (type !== 'percent' || Math.abs(val) < 0.1)) return <span className="text-slate-300 text-[10px]">-</span>;
        
        const isPositive = val > 0;
        const colorClass = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
        
        let formattedVal = '';
        if (type === 'currency') formattedVal = formatCurrency(Math.abs(val));
        else if (type === 'percent') formattedVal = `${Math.abs(val).toFixed(0)}%`; 
        else formattedVal = formatQuantity(Math.abs(val));

        const sign = isPositive ? '+' : '-';

        return (
            <span className={`text-[11px] font-bold ${colorClass} block whitespace-nowrap`}>
                {sign}{formattedVal}
            </span>
        );
    };

    const displayName = (level >= 3 && nodeKey.length > 30) ? abbreviateName(nodeKey) : nodeKey;
    const isRoot = level === 1;
    let rowClasses = '', contentColorClass = '';

    // Determine color based on current level in the drilldown order
    const currentType = drilldownOrder[level - 1];
    if (currentType && ROW_TEXT_COLORS[currentType]) {
        contentColorClass = `${ROW_TEXT_COLORS[currentType]} font-bold`;
        if (level === 1) contentColorClass += ' uppercase font-extrabold';
    } else {
        contentColorClass = 'text-slate-600 dark:text-slate-400 font-medium';
    }

    if (isRoot) {
        rowClasses = `bg-white dark:bg-[#1c1c1e] border-b border-slate-100 dark:border-white/5 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5 transition-all duration-200`;
    } else {
        rowClasses = `bg-slate-50/30 dark:bg-white/[0.02] hover:bg-slate-100/50 dark:hover:bg-white/[0.05] border-b border-slate-100/50 dark:border-white/5 transition-all duration-200`;
    }

    const indentMargin = `${(level - 1) * 16}px`;
    const traGopDisplay = traGopPercent === 0 ? '-' : `${traGopPercent.toFixed(0)}%`;

    const cellClass = "px-3 py-4 text-center text-[13px]"; 
    const deltaCellClass = "px-2 py-4 text-center bg-slate-50/30 dark:bg-white/[0.01]"; 
    const separatorClass = "border-r border-slate-100 dark:border-white/5";

    return (
        <>
            <tr
                className={`${rowClasses} ${isExpandable ? 'cursor-pointer' : ''}`}
                onClick={isExpandable ? () => toggleExpand(currentId) : undefined}
            >
                {/* NGÀNH HÀNG */}
                <td className={`px-6 py-4 text-[13px] whitespace-nowrap border-r border-slate-100 dark:border-white/5 sticky left-0 z-30 ${isRoot ? 'bg-white dark:bg-[#1c1c1e]' : 'bg-slate-50/95 dark:bg-[#242426]/95'}`}>
                    <div className={`flex items-center gap-3 ${contentColorClass}`} style={{ marginLeft: indentMargin }}>
                        {isExpandable ? (
                            <div className={`w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''} flex-shrink-0 text-slate-400`}>
                                <Icon name="chevron-right" size={3.5} />
                            </div>
                        ) : (
                            <div className="w-6 h-6 inline-block flex-shrink-0"></div>
                        )}
                        <span className="truncate tracking-tight" title={nodeKey}>{displayName}</span>
                    </div>
                </td>
                
                {/* Quantity */}
                <td className={`${cellClass} font-bold text-slate-600 dark:text-slate-400 ${!isComparisonMode ? separatorClass : ''}`}>
                    {formatQuantity(quantity)}
                </td>
                {isComparisonMode && (
                    <td className={`${deltaCellClass} ${separatorClass}`}>
                        {renderDelta(deltaQuantity, 'number')}
                    </td>
                )}

                {/* Revenue (Doanh thu thực) */}
                <td className={`${cellClass} font-black text-slate-900 dark:text-white tracking-tight ${!isComparisonMode ? separatorClass : ''}`}>
                    {formatCurrency(revenue)}
                </td>
                {isComparisonMode && (
                    <td className={`${deltaCellClass} ${separatorClass}`}>
                        {renderDelta(deltaRevenue, 'currency')}
                    </td>
                )}

                {/* RevenueQD (DT Quy Doi) */}
                <td className={`${cellClass} font-black text-emerald-600 dark:text-emerald-400 tracking-tight ${!isComparisonMode ? separatorClass : ''}`}>
                    {formatCurrency(revenueQD)}
                </td>
                {isComparisonMode && (
                    <td className={`${deltaCellClass} ${separatorClass}`}>
                        {renderDelta(deltaRevenueQD, 'currency')}
                    </td>
                )}

                {/* AOV */}
                <td className={`${cellClass} font-bold text-slate-600 dark:text-slate-400 ${!isComparisonMode ? separatorClass : ''}`}>
                    {formatCurrency(aov)}
                </td>
                {isComparisonMode && (
                    <td className={`${deltaCellClass} ${separatorClass}`}>
                        {renderDelta(deltaAOV, 'currency')}
                    </td>
                )}

                {/* Tra Gop % */}
                <td className={`${cellClass} ${getTraGopPercentClass(traGopPercent)}`}>
                    {traGopDisplay}
                </td>
                {isComparisonMode && (
                    <td className={`${deltaCellClass}`}>
                        {renderDelta(deltaTraGopPercent, 'percent')}
                    </td>
                )}
            </tr>
            
            {isExpanded && hasChildren && allChildrenKeys.map((key) => (
                <RecursiveRow
                    key={key}
                    nodeKey={key}
                    currentNode={currentNode?.children[key]}
                    prevNode={prevNode?.children[key]}
                    level={level + 1}
                    parentId={currentId}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    rootIndex={rootIndex}
                    isComparisonMode={isComparisonMode}
                    sortConfig={sortConfig}
                    drilldownOrder={drilldownOrder}
                />
            ))}
        </>
    );
});

export default RecursiveRow;
