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
