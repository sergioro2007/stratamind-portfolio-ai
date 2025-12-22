import { describe, it, expect, vi } from 'vitest';
import { mergeBenchmarkData } from '../performanceService';
import { PerformanceSnapshot } from '../../../types';

describe('performanceService - Benchmark Overlay', () => {
    it('should merge benchmark data with portfolio history', () => {
        const portfolioHistory: PerformanceSnapshot[] = [
            { id: '1', timestamp: 1000, accountId: 'a1', totalValue: 100, cashBalance: 10, holdingsValue: 90, dayChange: 0, dayChangePercent: 0 },
            { id: '2', timestamp: 2000, accountId: 'a1', totalValue: 110, cashBalance: 10, holdingsValue: 100, dayChange: 10, dayChangePercent: 10 },
            { id: '3', timestamp: 3000, accountId: 'a1', totalValue: 105, cashBalance: 10, holdingsValue: 95, dayChange: -5, dayChangePercent: -4.5 },
        ];

        // Benchmark data is usually just { time, value } or similar structure from market data
        // We need to normalize it to % growth relative to the start for comparison?
        // OR we map it to the same timeline.
        // Let's assume input benchmark data is simple candle data { t: number, c: number }
        const benchmarkData = [
            { t: 1000, c: 400 }, // Start
            { t: 2000, c: 420 }, // +5%
            { t: 3000, c: 410 }, // +2.5% from start
        ];

        // The merged result should probably include a 'benchmarkValue' field or normalized 'benchmarkGrowth'
        // For a chart overlay, usually we index both to 100 or 0% at the start.
        // Let's implement a 'normalizeToPercentage' function or similar.

        const merged = mergeBenchmarkData(portfolioHistory, benchmarkData);

        expect(merged).toHaveLength(3);
        expect(merged[0].portfolioReturn).toBe(0); // Day 1 is 0%
        expect(merged[0].benchmarkReturn).toBe(0); // Day 1 is 0%

        expect(merged[1].portfolioReturn).toBeCloseTo(10); // 100 -> 110 = +10%
        expect(merged[1].benchmarkReturn).toBeCloseTo(5);  // 400 -> 420 = +5%

        expect(merged[2].portfolioReturn).toBeCloseTo(5);  // 100 -> 105 = +5%
        expect(merged[2].benchmarkReturn).toBeCloseTo(2.5); // 400 -> 410 = +2.5%
    });

    it('should handle mismatched timestamps by aligning to nearest or interpolating', () => {
        // Simple case: align to nearest known benchmark point <= portfolio timestamp
        const portfolioHistory = [
            { id: '1', timestamp: 1000, accountId: 'a1', totalValue: 100, cashBalance: 0, holdingsValue: 100, dayChange: 0, dayChangePercent: 0 },
            { id: '2', timestamp: 2500, accountId: 'a1', totalValue: 110, cashBalance: 0, holdingsValue: 110, dayChange: 10, dayChangePercent: 10 },
        ];
        const benchmarkData = [
            { t: 1000, c: 100 },
            { t: 2000, c: 110 },
            { t: 3000, c: 120 },
        ];

        const merged = mergeBenchmarkData(portfolioHistory, benchmarkData);

        expect(merged[0].timestamp).toBe(1000);
        expect(merged[1].timestamp).toBe(2500);

        // At t=2500, benchmark was last seen at t=2000 (c=110)
        // Growth: 100 -> 110 = 10%
        expect(merged[1].benchmarkReturn).toBeCloseTo(10);
    });
});
