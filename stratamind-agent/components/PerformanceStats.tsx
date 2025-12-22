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
        const colorClass = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

        return (
            <div className="flex flex-col">
                <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                <span className={`font-medium ${colorClass}`}>
                    {formatCurrency(value)} ({formatPercent(percent)})
                </span>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h2 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wide">Total Portfolio Value</h2>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                        {formatCurrency(stats.current)}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-400">All Time High: {formatCurrency(stats.allTimeHigh)}</div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                {renderMetric('1 Day', stats.dayChange, stats.dayChangePercent)}
                {renderMetric('1 Week', stats.weekChange, stats.weekChangePercent)}
                {renderMetric('1 Month', stats.monthChange, stats.monthChangePercent)}
            </div>
        </div>
    );
};
