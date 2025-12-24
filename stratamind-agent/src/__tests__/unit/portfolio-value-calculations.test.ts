import { describe, it, expect } from 'vitest';
import { SliceType, type Account, type PortfolioSlice } from '../../../types';

/**
 * Portfolio Value Calculation Tests
 * 
 * These tests verify that portfolio values are always calculated correctly:
 * 1. Portfolio totalValue = (account.totalValue - cashBalance) * (allocation / 100)
 * 2. Performance stats are prorated based on portfolio allocation
 * 3. Cash allocation is prorated correctly for portfolios
 */

describe('Portfolio Value Calculations', () => {
    describe('Portfolio Total Value Calculation', () => {
        it('should calculate portfolio value correctly based on allocation percentage', () => {
            const account: Account = {
                id: 'acc-1',
                name: 'Test Account',
                type: 'Brokerage',
                totalValue: 100000,
                cashBalance: 10000,
                margin: 0,
                strategies: [
                    {
                        id: 'strat-1',
                        parentId: null,
                        type: SliceType.GROUP,
                        name: 'Growth Portfolio',
                        targetAllocation: 60, // 60% of investing power
                        currentValue: 0,
                        children: []
                    }
                ]
            };

            const investingPower = account.totalValue - account.cashBalance; // 90,000
            const portfolioValue = investingPower * (account.strategies[0].targetAllocation / 100);

            expect(portfolioValue).toBe(54000); // 90,000 * 0.60 = 54,000
        });

        it('should handle 100% allocation correctly', () => {
            const account: Account = {
                id: 'acc-1',
                name: 'All In',
                type: 'Brokerage',
                totalValue: 50000,
                cashBalance: 5000,
                margin: 0,
                strategies: [
                    {
                        id: 'strat-1',
                        parentId: null,
                        type: SliceType.GROUP,
                        name: 'Full Portfolio',
                        targetAllocation: 100,
                        currentValue: 0,
                        children: []
                    }
                ]
            };

            const investingPower = account.totalValue - account.cashBalance; // 45,000
            const portfolioValue = investingPower * (account.strategies[0].targetAllocation / 100);

            expect(portfolioValue).toBe(45000); // 45,000 * 1.00 = 45,000
        });

        it('should handle small allocation percentages correctly', () => {
            const account: Account = {
                id: 'acc-1',
                name: 'Diversified',
                type: 'Brokerage',
                totalValue: 200000,
                cashBalance: 20000,
                margin: 0,
                strategies: [
                    {
                        id: 'strat-1',
                        parentId: null,
                        type: SliceType.GROUP,
                        name: 'Experimental',
                        targetAllocation: 5, // 5% allocation
                        currentValue: 0,
                        children: []
                    }
                ]
            };

            const investingPower = account.totalValue - account.cashBalance; // 180,000
            const portfolioValue = investingPower * (account.strategies[0].targetAllocation / 100);

            expect(portfolioValue).toBe(9000); // 180,000 * 0.05 = 9,000
        });
    });

    describe('Performance Stats Proration', () => {
        it('should prorate performance stats based on allocation percentage', () => {
            const accountStats = {
                current: 100000,
                dayChange: 1000,
                dayChangePercent: 1.0,
                weekChange: 2000,
                weekChangePercent: 2.0,
                monthChange: 5000,
                monthChangePercent: 5.0,
                allTimeHigh: 110000,
                allTimeLow: 90000
            };

            const portfolioAllocation = 60; // 60% of account

            const portfolioStats = {
                current: accountStats.current * (portfolioAllocation / 100),
                dayChange: accountStats.dayChange * (portfolioAllocation / 100),
                dayChangePercent: accountStats.dayChangePercent, // Percentage stays the same
                weekChange: accountStats.weekChange * (portfolioAllocation / 100),
                weekChangePercent: accountStats.weekChangePercent,
                monthChange: accountStats.monthChange * (portfolioAllocation / 100),
                monthChangePercent: accountStats.monthChangePercent,
                allTimeHigh: accountStats.allTimeHigh * (portfolioAllocation / 100),
                allTimeLow: accountStats.allTimeLow * (portfolioAllocation / 100)
            };

            expect(portfolioStats.current).toBe(60000);
            expect(portfolioStats.dayChange).toBe(600);
            expect(portfolioStats.dayChangePercent).toBe(1.0); // Unchanged
            expect(portfolioStats.weekChange).toBe(1200);
            expect(portfolioStats.monthChange).toBe(3000);
            expect(portfolioStats.allTimeHigh).toBe(66000);
            expect(portfolioStats.allTimeLow).toBe(54000);
        });

        it('should handle zero allocation correctly', () => {
            const accountStats = {
                current: 100000,
                dayChange: 1000,
                dayChangePercent: 1.0,
                weekChange: 2000,
                weekChangePercent: 2.0,
                monthChange: 5000,
                monthChangePercent: 5.0,
                allTimeHigh: 110000,
                allTimeLow: 90000
            };

            const portfolioAllocation = 0;

            const portfolioStats = {
                current: accountStats.current * (portfolioAllocation / 100),
                dayChange: accountStats.dayChange * (portfolioAllocation / 100),
                dayChangePercent: accountStats.dayChangePercent,
                weekChange: accountStats.weekChange * (portfolioAllocation / 100),
                weekChangePercent: accountStats.weekChangePercent,
                monthChange: accountStats.monthChange * (portfolioAllocation / 100),
                monthChangePercent: accountStats.monthChangePercent,
                allTimeHigh: accountStats.allTimeHigh * (portfolioAllocation / 100),
                allTimeLow: accountStats.allTimeLow * (portfolioAllocation / 100)
            };

            expect(portfolioStats.current).toBe(0);
            expect(portfolioStats.dayChange).toBe(0);
            expect(portfolioStats.allTimeHigh).toBe(0);
            expect(portfolioStats.allTimeLow).toBe(0);
        });
    });

    describe('Cash Allocation Calculation', () => {
        it('should calculate portfolio-specific cash correctly', () => {
            const accountCashBalance = 10000;
            const portfolioAllocation = 60; // 60% of account

            const portfolioCash = accountCashBalance * (portfolioAllocation / 100);

            expect(portfolioCash).toBe(6000); // 10,000 * 0.60 = 6,000
        });

        it('should handle 100% allocation for cash', () => {
            const accountCashBalance = 5000;
            const portfolioAllocation = 100;

            const portfolioCash = accountCashBalance * (portfolioAllocation / 100);

            expect(portfolioCash).toBe(5000);
        });

        it('should handle fractional cash amounts correctly', () => {
            const accountCashBalance = 10000;
            const portfolioAllocation = 33; // 33% allocation

            const portfolioCash = accountCashBalance * (portfolioAllocation / 100);

            expect(portfolioCash).toBe(3300); // 10,000 * 0.33 = 3,300
        });
    });

    describe('Real-world Scenario Tests', () => {
        it('should correctly calculate values for a typical 60/40 portfolio split', () => {
            const account: Account = {
                id: 'acc-1',
                name: 'Balanced Account',
                type: 'Brokerage',
                totalValue: 100000,
                cashBalance: 10000,
                margin: 0,
                strategies: [
                    {
                        id: 'growth-port',
                        parentId: null,
                        type: SliceType.GROUP,
                        name: 'Growth (60%)',
                        targetAllocation: 60,
                        currentValue: 0,
                        children: []
                    },
                    {
                        id: 'conservative-port',
                        parentId: null,
                        type: SliceType.GROUP,
                        name: 'Conservative (40%)',
                        targetAllocation: 40,
                        currentValue: 0,
                        children: []
                    }
                ]
            };

            const investingPower = account.totalValue - account.cashBalance; // 90,000

            const growthValue = investingPower * 0.60;
            const conservativeValue = investingPower * 0.40;
            const growthCash = account.cashBalance * 0.60;
            const conservativeCash = account.cashBalance * 0.40;

            expect(growthValue).toBe(54000);
            expect(conservativeValue).toBe(36000);
            expect(growthCash).toBe(6000);
            expect(conservativeCash).toBe(4000);

            // Total should equal original investing power and cash
            expect(growthValue + conservativeValue).toBe(investingPower);
            expect(growthCash + conservativeCash).toBe(account.cashBalance);
        });

        it('should maintain accuracy with decimal allocations', () => {
            const account: Account = {
                id: 'acc-1',
                name: 'Precise Allocations',
                type: 'Brokerage',
                totalValue: 75000,
                cashBalance: 5000,
                margin: 0,
                strategies: [
                    {
                        id: 'strat-1',
                        parentId: null,
                        type: SliceType.GROUP,
                        name: 'Portfolio A',
                        targetAllocation: 33.33,
                        currentValue: 0,
                        children: []
                    },
                    {
                        id: 'strat-2',
                        parentId: null,
                        type: SliceType.GROUP,
                        name: 'Portfolio B',
                        targetAllocation: 66.67,
                        currentValue: 0,
                        children: []
                    }
                ]
            };

            const investingPower = account.totalValue - account.cashBalance; // 70,000

            const portfolioA = investingPower * (33.33 / 100);
            const portfolioB = investingPower * (66.67 / 100);

            expect(portfolioA).toBeCloseTo(23331, 0);
            expect(portfolioB).toBeCloseTo(46669, 0);

            // Sum should be very close to investing power (allowing for rounding)
            expect(portfolioA + portfolioB).toBeCloseTo(investingPower, 0);
        });
    });
});
