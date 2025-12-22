import React from 'react';
import type { PerformanceStats } from '../types';

interface PerformanceStatsProps {
    stats: PerformanceStats;
    statsLoading: boolean;
}

export const PerformanceStatsDisplay: React.FC<PerformanceStatsProps> = ({ stats, statsLoading }) => {
    if (statsLoading) {
        return <div className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>;
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const formatPercent = (val: number) => {
        const sign = val >= 0 ? '+' : '';
        return `${sign}${val.toFixed(2)}%`;
    };

    const renderMetric = (label: string, value: number, percent: number) => {
        const isPositive = value >= 0;
        const colorClass = isPositive ? 'text-emerald-400' : 'text-rose-400';

        return (
            <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{label}</span>
                <span className={`font-semibold text-sm ${colorClass}`}>
                    {formatCurrency(value)}
                </span>
                <span className={`text-xs ${colorClass}`}>
                    {formatPercent(percent)}
                </span>
            </div>
        );
    };

    return (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 shadow-sm mb-6 h-full flex flex-col justify-between">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Portfolio Value</h2>
                    <div className="text-3xl font-bold text-white mt-1 tracking-tight">
                        {formatCurrency(stats.current)}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">All Time High</div>
                    <div className="text-sm font-semibold text-emerald-400">{formatCurrency(stats.allTimeHigh)}</div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-slate-700/50 pt-4 mt-auto">
                {renderMetric('1 Day', stats.dayChange, stats.dayChangePercent)}
                {renderMetric('1 Week', stats.weekChange, stats.weekChangePercent)}
                {renderMetric('1 Month', stats.monthChange, stats.monthChangePercent)}
            </div>
        </div>
    );
};
