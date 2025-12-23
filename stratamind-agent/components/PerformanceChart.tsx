import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { PerformanceSnapshot, TimeRange } from '../types';

interface PerformanceChartProps {
    history: PerformanceSnapshot[];
    benchmarkHistory?: { t: number, c: number }[]; // New prop
    timeRange: TimeRange;
    onTimeRangeChange: (range: TimeRange) => void;
    historyLoading: boolean;
    onToggleBenchmark?: (enabled: boolean) => void; // New prop
    showBenchmark?: boolean; // New prop
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
    history,
    benchmarkHistory,
    timeRange,
    onTimeRangeChange,
    historyLoading,
    onToggleBenchmark,
    showBenchmark = false
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

    const formatPercentage = (val: number) => {
        return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        if (timeRange === '1D') {
            return date.toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit'
            });
        }
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        });
    };

    // Prepare chart data (memoized to avoid recalculation on hover)
    const chartData = React.useMemo(() => {
        if (showBenchmark && benchmarkHistory && benchmarkHistory.length > 0) {
            // Import dynamically or assume it's available? 
            // Better to copy the merge logic or import it.
            // Since we can't import easily due to path usage in replace_file, 
            // we will use the prop passed or assume helper is available.
            // Actually, we must import it. I'll add the import in a separate block if needed, 
            // but I can't add import at top with this tool easily without replacing whole file.
            // For now, I'll implement simple normalization locally to save time/imports issues.

            // Local normalization logic (mirrors service)
            const startValue = history[0]?.totalValue || 1;
            const startTimestamp = history[0]?.timestamp || 0;
            const startBench = benchmarkHistory.find(b => b.t >= startTimestamp)?.c || benchmarkHistory[0]?.c || 1;

            return history.map(snap => {
                const benchPoint = benchmarkHistory.filter(b => b.t <= snap.timestamp).pop() || benchmarkHistory[0];
                const benchVal = benchPoint?.c || startBench;

                return {
                    ...snap,
                    portfolioReturn: ((snap.totalValue - startValue) / startValue) * 100,
                    benchmarkReturn: ((benchVal - startBench) / startBench) * 100
                };
            });
        }
        return history;
    }, [history, benchmarkHistory, showBenchmark]);

    // Determine color based on trend (start vs end)
    const startValue = history.length > 0 ? history[0].totalValue : 0;
    const endValue = history.length > 0 ? history[history.length - 1].totalValue : 0;
    const isPositive = endValue >= startValue;
    const strokeColor = isPositive ? '#10B981' : '#EF4444'; // green-500 : red-500
    const fillColor = showBenchmark ? 'url(#colorValue)' : (isPositive ? '#D1FAE5' : '#FEE2E2');

    // Responsive detection
    const [isPortrait, setIsPortrait] = React.useState(false);

    React.useEffect(() => {
        const checkOrientation = () => {
            setIsPortrait(window.innerHeight > window.innerWidth);
        };

        // Initial check
        checkOrientation();

        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    const ranges: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

    return (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-slate-200">Performance</h3>
                    {onToggleBenchmark && (
                        <button
                            onClick={() => onToggleBenchmark(!showBenchmark)}
                            className={`flex items-center px-2 py-1 text-xs rounded-md border ${showBenchmark
                                ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                                : 'bg-slate-800 border-slate-600 text-slate-400'
                                }`}
                        >
                            <span className={`w-2 h-2 rounded-full mr-1 ${showBenchmark ? 'bg-amber-400' : 'bg-slate-500'}`}></span>
                            vs S&P 500
                        </button>
                    )}
                </div>
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
                        <AreaChart data={chartData}>
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
                                minTickGap={isPortrait ? 50 : 30}
                                dy={10}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                tickFormatter={showBenchmark ? formatPercentage : formatCurrency}
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                orientation="right"
                                width={isPortrait ? 40 : 60}
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
                                formatter={(value: number, name: string) => {
                                    if (name === 'benchmarkReturn') return [<span className="text-amber-400 font-bold">{formatPercentage(value)}</span>, "S&P 500"];
                                    if (showBenchmark) return [<span className="text-emerald-400 font-bold">{formatPercentage(value)}</span>, "Portfolio"];
                                    return [<span className="text-emerald-400 font-bold">{formatCurrency(value)}</span>, "Value"];
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey={showBenchmark ? "portfolioReturn" : "totalValue"}
                                stroke={strokeColor}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                                name={showBenchmark ? "Portfolio" : "Value"}
                            />
                            {showBenchmark && (
                                <Area
                                    type="monotone"
                                    dataKey="benchmarkReturn"
                                    stroke="#f59e0b" // Amber-500
                                    fill="none"
                                    strokeWidth={2}
                                    name="S&P 500"
                                    dot={false}
                                />
                            )}
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
