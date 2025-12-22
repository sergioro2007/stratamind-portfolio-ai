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
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-200">Performance</h3>
                <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-lg">
                    {ranges.map(r => (
                        <button
                            key={r}
                            onClick={() => onTimeRangeChange(r)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeRange === r
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-slate-400 hover:text-indigo-400'
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
                                    <stop offset="5%" stopColor={strokeColor} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatDate}
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={30}
                                dy={10}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                tickFormatter={formatCurrency}
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                orientation="right"
                                width={60}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    borderRadius: '0.75rem',
                                    border: '1px solid #334155',
                                    padding: '12px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}
                                itemStyle={{ color: '#e2e8f0' }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '12px' }}
                                labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                formatter={(value: number) => [
                                    <span className="text-emerald-400 font-bold">{formatCurrency(value)}</span>,
                                    <span className="text-slate-400">Value</span>
                                ]}
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
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                        Not enough data to display chart
                    </div>
                )}
            </div>
        </div>
    );
};
