import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { PerformanceSnapshot, TimeRange } from '../types';

interface PerformanceChartProps {
    history: PerformanceSnapshot[];
    timeRange: TimeRange;
    onTimeRangeChange: (range: TimeRange) => void;
    historyLoading: boolean;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
    history,
    timeRange,
    onTimeRangeChange,
    historyLoading
}) => {
    if (historyLoading) {
        return <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>;
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(val);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        });
    };

    // Determine color based on trend (start vs end)
    const startValue = history.length > 0 ? history[0].totalValue : 0;
    const endValue = history.length > 0 ? history[history.length - 1].totalValue : 0;
    const isPositive = endValue >= startValue;
    const strokeColor = isPositive ? '#10B981' : '#EF4444'; // green-500 : red-500
    const fillColor = isPositive ? '#D1FAE5' : '#FEE2E2'; // green-100 : red-100

    const ranges: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance</h3>
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-md">
                    {ranges.map(r => (
                        <button
                            key={r}
                            onClick={() => onTimeRangeChange(r)}
                            className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${timeRange === r
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                                }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-64 w-full">
                {history.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={history}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={strokeColor} stopOpacity={0.1} />
                                    <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatDate}
                                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                tickFormatter={formatCurrency}
                                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                                axisLine={false}
                                tickLine={false}
                                orientation="right"
                                width={60}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                formatter={(value: number) => [formatCurrency(value), 'Value']}
                            />
                            <Area
                                type="monotone"
                                dataKey="totalValue"
                                stroke={strokeColor}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        Not enough data to display chart
                    </div>
                )}
            </div>
        </div>
    );
};
