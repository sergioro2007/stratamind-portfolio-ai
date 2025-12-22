import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculatePortfolioValue, calculateChange, calculateChangePercent, filterByTimeRange } from '../performanceService';
import type { PerformanceSnapshot, TimeRange } from '../../../types';

describe('performanceService', () => {
    describe('calculatePortfolioValue', () => {
        it('should calculate total value from cash and holdings', () => {
            const result = calculatePortfolioValue(1000, 4000);
            expect(result).toBe(5000);
        });

        it('should handle zero cash balance', () => {
            const result = calculatePortfolioValue(0, 5000);
            expect(result).toBe(5000);
        });

        it('should handle zero holdings value', () => {
            const result = calculatePortfolioValue(5000, 0);
            expect(result).toBe(5000);
        });
    });

    describe('calculateChange', () => {
        it('should calculate positive change', () => {
            const result = calculateChange(15000, 10000);
            expect(result).toBe(5000);
        });

        it('should calculate negative change', () => {
            const result = calculateChange(8000, 10000);
            expect(result).toBe(-2000);
        });

        it('should handle zero change', () => {
            const result = calculateChange(10000, 10000);
            expect(result).toBe(0);
        });
    });

    describe('calculateChangePercent', () => {
        it('should calculate positive percent change', () => {
            const result = calculateChangePercent(15000, 10000);
            expect(result).toBeCloseTo(50, 2);
        });

        it('should calculate negative percent change', () => {
            const result = calculateChangePercent(8000, 10000);
            expect(result).toBeCloseTo(-20, 2);
        });

        it('should handle zero previous value', () => {
            const result = calculateChangePercent(10000, 0);
            expect(result).toBe(0);
        });

        it('should handle zero change', () => {
            const result = calculateChangePercent(10000, 10000);
            expect(result).toBe(0);
        });
    });

    describe('filterByTimeRange', () => {
        const now = Date.now();
        const DAY_MS = 24 * 60 * 60 * 1000;

        const snapshots: PerformanceSnapshot[] = [
            { id: '1', accountId: 'acc1', timestamp: now - 30 * DAY_MS, totalValue: 10000, cashBalance: 1000, holdingsValue: 9000 },
            { id: '2', accountId: 'acc1', timestamp: now - 14 * DAY_MS, totalValue: 11000, cashBalance: 1000, holdingsValue: 10000 },
            { id: '3', accountId: 'acc1', timestamp: now - 7 * DAY_MS, totalValue: 12000, cashBalance: 1000, holdingsValue: 11000 },
            { id: '4', accountId: 'acc1', timestamp: now - 1 * DAY_MS, totalValue: 13000, cashBalance: 1000, holdingsValue: 12000 },
            { id: '5', accountId: 'acc1', timestamp: now, totalValue: 14000, cashBalance: 2000, holdingsValue: 12000 },
        ];

        it('should filter by 1D (last day)', () => {
            const result = filterByTimeRange(snapshots, '1D', now);
            expect(result.length).toBe(2); // Last 2 snapshots within 1 day
        });

        it('should filter by 1W (last week)', () => {
            const result = filterByTimeRange(snapshots, '1W', now);
            expect(result.length).toBe(3); // Last 3 snapshots within 1 week
        });

        it('should filter by 1M (last month)', () => {
            const result = filterByTimeRange(snapshots, '1M', now);
            expect(result.length).toBe(5); // All snapshots within 1 month
        });

        it('should return all for ALL range', () => {
            const result = filterByTimeRange(snapshots, 'ALL', now);
            expect(result.length).toBe(5);
        });

        it('should handle empty snapshots array', () => {
            const result = filterByTimeRange([], '1W', now);
            expect(result.length).toBe(0);
        });
    });
});
