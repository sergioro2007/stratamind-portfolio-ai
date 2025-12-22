import type { PerformanceSnapshot, TimeRange } from '../../types';

/**
 * Calculate total portfolio value from cash and holdings
 */
export function calculatePortfolioValue(cashBalance: number, holdingsValue: number): number {
    return cashBalance + holdingsValue;
}

/**
 * Calculate change between current and previous value
 */
export function calculateChange(currentValue: number, previousValue: number): number {
    return currentValue - previousValue;
}

/**
 * Calculate percentage change between current and previous value
 */
export function calculateChangePercent(currentValue: number, previousValue: number): number {
    if (previousValue === 0) return 0;
    return ((currentValue - previousValue) / previousValue) * 100;
}

/**
 * Filter snapshots by time range
 * @param referenceTime Optional reference time for filtering (defaults to Date.now(), useful for testing)
 */
export function filterByTimeRange(
    snapshots: PerformanceSnapshot[],
    range: TimeRange,
    referenceTime?: number
): PerformanceSnapshot[] {
    if (range === 'ALL') return snapshots;

    const now = referenceTime ?? Date.now();
    const ranges: Record<TimeRange, number> = {
        '1D': 24 * 60 * 60 * 1000,
        '1W': 7 * 24 * 60 * 60 * 1000,
        '1M': 30 * 24 * 60 * 60 * 1000,
        '3M': 90 * 24 * 60 * 60 * 1000,
        '1Y': 365 * 24 * 60 * 60 * 1000,
        'ALL': 0
    };

    const cutoff = now - ranges[range];
    return snapshots.filter(s => s.timestamp >= cutoff);
}

/**
 * Merge benchmark data with portfolio history for comparison
 */
export const mergeBenchmarkData = (
    portfolioHistory: PerformanceSnapshot[],
    benchmarkData: { t: number, c: number }[]
): (PerformanceSnapshot & { portfolioReturn: number; benchmarkReturn: number })[] => {
    if (portfolioHistory.length === 0) return [];

    const startValue = portfolioHistory[0].totalValue;
    const startTimestamp = portfolioHistory[0].timestamp;

    // Find closest benchmark start to normalize
    const startBenchmark = benchmarkData.find(b => b.t >= startTimestamp) || benchmarkData[0];
    const startBenchmarkValue = startBenchmark ? startBenchmark.c : 1;

    return portfolioHistory.map(snap => {
        // Find corresponding benchmark point (last known close <= snap.timestamp)
        let benchPoint = benchmarkData.filter(b => b.t <= snap.timestamp).pop();
        if (!benchPoint && benchmarkData.length > 0) benchPoint = benchmarkData[0];

        const benchmarkVal = benchPoint ? benchPoint.c : startBenchmarkValue;

        const portfolioReturn = calculateChangePercent(snap.totalValue, startValue);
        const benchmarkReturn = calculateChangePercent(benchmarkVal, startBenchmarkValue);

        return {
            ...snap,
            portfolioReturn,
            benchmarkReturn
        };
    });
};
