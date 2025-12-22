import { describe, it, expect } from 'vitest';

/**
 * TDD Tests for Equal Rebalancing Helper
 * 
 * These tests define the DESIRED behavior for equal rebalancing:
 * - All holdings get equal allocation
 * - All allocations are integers
 * - Total always equals 100%
 * - Remainder distributed to first N items
 */

// Import will fail until we create the file (RED phase)
import { calculateEqualRebalance, calculateSetOneRebalance } from '../../../utils/rebalanceHelpers';

describe('calculateEqualRebalance (TDD)', () => {
    describe('Clean Division Cases', () => {
        it('should distribute 100% equally among 5 holdings (20% each)', () => {
            const holdings = [
                { id: '1', name: 'AAPL' },
                { id: '2', name: 'MSFT' },
                { id: '3', name: 'GOOGL' },
                { id: '4', name: 'NVDA' },
                { id: '5', name: 'TSLA' }
            ];

            const result = calculateEqualRebalance(holdings);

            expect(result).toHaveLength(5);
            expect(result.every(r => r.targetAllocation === 20)).toBe(true);

            const total = result.reduce((sum, r) => sum + r.targetAllocation, 0);
            expect(total).toBe(100);
        });

        it('should distribute 100% equally among 4 holdings (25% each)', () => {
            const holdings = [
                { id: '1', name: 'AAPL' },
                { id: '2', name: 'MSFT' },
                { id: '3', name: 'GOOGL' },
                { id: '4', name: 'NVDA' }
            ];

            const result = calculateEqualRebalance(holdings);

            expect(result).toHaveLength(4);
            expect(result.every(r => r.targetAllocation === 25)).toBe(true);

            const total = result.reduce((sum, r) => sum + r.targetAllocation, 0);
            expect(total).toBe(100);
        });
    });

    describe('Uneven Division Cases (Remainder Distribution)', () => {
        it('should distribute 100% among 7 holdings (5×14% + 2×15% = 100%)', () => {
            const holdings = [
                { id: '1', name: 'AAPL' },
                { id: '2', name: 'MSFT' },
                { id: '3', name: 'GOOGL' },
                { id: '4', name: 'NVDA' },
                { id: '5', name: 'TSLA' },
                { id: '6', name: 'META' },
                { id: '7', name: 'AMZN' }
            ];

            const result = calculateEqualRebalance(holdings);

            expect(result).toHaveLength(7);

            // First 2 should get 15% (base 14 + 1 remainder)
            expect(result[0].targetAllocation).toBe(15);
            expect(result[1].targetAllocation).toBe(15);

            // Remaining 5 should get 14%
            expect(result[2].targetAllocation).toBe(14);
            expect(result[3].targetAllocation).toBe(14);
            expect(result[4].targetAllocation).toBe(14);
            expect(result[5].targetAllocation).toBe(14);
            expect(result[6].targetAllocation).toBe(14);

            const total = result.reduce((sum, r) => sum + r.targetAllocation, 0);
            expect(total).toBe(100);
        });

        it('should distribute 100% among 3 holdings (2×33% + 1×34% = 100%)', () => {
            const holdings = [
                { id: '1', name: 'AAPL' },
                { id: '2', name: 'MSFT' },
                { id: '3', name: 'GOOGL' }
            ];

            const result = calculateEqualRebalance(holdings);

            expect(result).toHaveLength(3);

            // First 1 should get 34% (base 33 + 1 remainder)
            expect(result[0].targetAllocation).toBe(34);

            // Remaining 2 should get 33%
            expect(result[1].targetAllocation).toBe(33);
            expect(result[2].targetAllocation).toBe(33);

            const total = result.reduce((sum, r) => sum + r.targetAllocation, 0);
            expect(total).toBe(100);
        });

        it('should distribute 100% among 6 holdings (4×16% + 2×17% = 100%)', () => {
            const holdings = Array.from({ length: 6 }, (_, i) => ({
                id: String(i + 1),
                name: `Stock${i + 1}`
            }));

            const result = calculateEqualRebalance(holdings);

            expect(result).toHaveLength(6);

            // First 4 should get 17% (base 16 + 1 remainder)
            expect(result[0].targetAllocation).toBe(17);
            expect(result[1].targetAllocation).toBe(17);
            expect(result[2].targetAllocation).toBe(17);
            expect(result[3].targetAllocation).toBe(17);

            // Remaining 2 should get 16%
            expect(result[4].targetAllocation).toBe(16);
            expect(result[5].targetAllocation).toBe(16);

            const total = result.reduce((sum, r) => sum + r.targetAllocation, 0);
            expect(total).toBe(100);
        });
    });

    describe('Edge Cases', () => {
        it('should handle single holding (100%)', () => {
            const holdings = [{ id: '1', name: 'AAPL' }];

            const result = calculateEqualRebalance(holdings);

            expect(result).toHaveLength(1);
            expect(result[0].targetAllocation).toBe(100);
        });

        it('should handle 2 holdings (50% each)', () => {
            const holdings = [
                { id: '1', name: 'AAPL' },
                { id: '2', name: 'MSFT' }
            ];

            const result = calculateEqualRebalance(holdings);

            expect(result).toHaveLength(2);
            expect(result[0].targetAllocation).toBe(50);
            expect(result[1].targetAllocation).toBe(50);

            const total = result.reduce((sum, r) => sum + r.targetAllocation, 0);
            expect(total).toBe(100);
        });

        it('should handle empty array', () => {
            const holdings: Array<{ id: string, name: string }> = [];

            const result = calculateEqualRebalance(holdings);

            expect(result).toHaveLength(0);
        });

        it('should handle large number of holdings (100 stocks)', () => {
            const holdings = Array.from({ length: 100 }, (_, i) => ({
                id: String(i + 1),
                name: `Stock${i + 1}`
            }));

            const result = calculateEqualRebalance(holdings);

            expect(result).toHaveLength(100);

            // All should be 1% (100 / 100 = 1, remainder = 0)
            expect(result.every(r => r.targetAllocation === 1)).toBe(true);

            const total = result.reduce((sum, r) => sum + r.targetAllocation, 0);
            expect(total).toBe(100);
        });
    });

    describe('Integer Validation', () => {
        it('should always produce integer allocations', () => {
            // Test various counts that produce different remainders
            const testCases = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 17, 23, 37, 50, 99];

            testCases.forEach(count => {
                const holdings = Array.from({ length: count }, (_, i) => ({
                    id: String(i + 1),
                    name: `Stock${i + 1}`
                }));

                const result = calculateEqualRebalance(holdings);

                // All allocations must be integers
                result.forEach(r => {
                    expect(Number.isInteger(r.targetAllocation)).toBe(true);
                });

                // Total must be 100
                const total = result.reduce((sum, r) => sum + r.targetAllocation, 0);
                expect(total).toBe(100);
            });
        });
    });

    describe('ID Preservation', () => {
        it('should preserve original IDs in results', () => {
            const holdings = [
                { id: 'abc-123', name: 'AAPL' },
                { id: 'def-456', name: 'MSFT' },
                { id: 'ghi-789', name: 'GOOGL' }
            ];

            const result = calculateEqualRebalance(holdings);

            expect(result[0].id).toBe('abc-123');
            expect(result[1].id).toBe('def-456');
            expect(result[2].id).toBe('ghi-789');
        });
    });
});

/**
 * TDD Tests for Set-One-Rebalance Helper
 * 
 * Bug Fix: "Make NVDA 15 and rebalance rest" was producing non-integer allocations
 * 
 * This helper sets one holding to a specific allocation and distributes
 * the remainder equally among other holdings (all integers).
 */
describe('calculateSetOneRebalance (TDD - Bug Fix)', () => {

    describe('Basic Cases', () => {
        it('should set one holding to 15% and distribute 85% equally among 6 others', () => {
            const holdings = [
                { id: '1', name: 'AAPL' },
                { id: '2', name: 'MSFT' },
                { id: '3', name: 'GOOGL' },
                { id: '4', name: 'NVDA' },  // This one will be set to 15%
                { id: '5', name: 'TSLA' },
                { id: '6', name: 'META' },
                { id: '7', name: 'AMZN' }
            ];

            const result = calculateSetOneRebalance(holdings, '4', 15);

            expect(result).toHaveLength(7);

            // NVDA should be exactly 15%
            const nvda = result.find(r => r.id === '4');
            expect(nvda?.targetAllocation).toBe(15);

            // Others should share 85% equally (85 / 6 = 14.166... → integers)
            // 85 / 6 = 14 base, remainder 1
            // So: 1×15 + 6×14 = 15 + 84 = 99... need to fix!
            // Actually: 85 / 6 = 14 base, remainder = 85 - (14*6) = 85 - 84 = 1
            // So: 1 holding gets 15 (14+1), 5 holdings get 14
            const others = result.filter(r => r.id !== '4');
            const othersSum = others.reduce((sum, r) => sum + r.targetAllocation, 0);
            expect(othersSum).toBe(85);

            // All must be integers
            others.forEach(r => {
                expect(Number.isInteger(r.targetAllocation)).toBe(true);
            });

            // Total must be 100
            const total = result.reduce((sum, r) => sum + r.targetAllocation, 0);
            expect(total).toBe(100);
        });

        it('should set one holding to 20% and distribute 80% equally among 7 others', () => {
            const holdings = Array.from({ length: 8 }, (_, i) => ({
                id: String(i + 1),
                name: `Stock${i + 1}`
            }));

            const result = calculateSetOneRebalance(holdings, '1', 20);

            // First should be 20%
            expect(result[0].targetAllocation).toBe(20);

            // Others: 80 / 7 = 11 base, remainder = 80 - (11*7) = 80 - 77 = 3
            // So: 3 get 12, 4 get 11
            const others = result.slice(1);
            expect(others.filter(r => r.targetAllocation === 12).length).toBe(3);
            expect(others.filter(r => r.targetAllocation === 11).length).toBe(4);

            const total = result.reduce((sum, r) => sum + r.targetAllocation, 0);
            expect(total).toBe(100);
        });
    });

    describe('Edge Cases', () => {
        it('should handle setting to 99% with 1 other holding', () => {
            const holdings = [
                { id: '1', name: 'AAPL' },
                { id: '2', name: 'MSFT' }
            ];

            const result = calculateSetOneRebalance(holdings, '1', 99);

            expect(result[0].targetAllocation).toBe(99);
            expect(result[1].targetAllocation).toBe(1);

            const total = result.reduce((sum, r) => sum + r.targetAllocation, 0);
            expect(total).toBe(100);
        });

        it('should handle single holding (100%)', () => {
            const holdings = [{ id: '1', name: 'AAPL' }];

            const result = calculateSetOneRebalance(holdings, '1', 100);

            expect(result).toHaveLength(1);
            expect(result[0].targetAllocation).toBe(100);
        });

        it('should handle setting to 50% with 1 other', () => {
            const holdings = [
                { id: '1', name: 'AAPL' },
                { id: '2', name: 'MSFT' }
            ];

            const result = calculateSetOneRebalance(holdings, '1', 50);

            expect(result[0].targetAllocation).toBe(50);
            expect(result[1].targetAllocation).toBe(50);
        });
    });

    describe('Integer Validation', () => {
        it('should always produce integer allocations', () => {
            const testCases = [
                { count: 7, target: 15 },  // Original bug case
                { count: 5, target: 23 },
                { count: 10, target: 37 },
                { count: 3, target: 50 },
                { count: 11, target: 19 }
            ];

            testCases.forEach(({ count, target }) => {
                const holdings = Array.from({ length: count }, (_, i) => ({
                    id: String(i + 1),
                    name: `Stock${i + 1}`
                }));

                const result = calculateSetOneRebalance(holdings, '1', target);

                // All allocations must be integers
                result.forEach(r => {
                    expect(Number.isInteger(r.targetAllocation)).toBe(true);
                });

                // Total must be 100
                const total = result.reduce((sum, r) => sum + r.targetAllocation, 0);
                expect(total).toBe(100);

                // Target allocation must be exact
                expect(result[0].targetAllocation).toBe(target);
            });
        });
    });

    describe('ID Preservation', () => {
        it('should preserve all IDs and set correct target', () => {
            const holdings = [
                { id: 'abc', name: 'AAPL' },
                { id: 'def', name: 'MSFT' },
                { id: 'ghi', name: 'GOOGL' }
            ];

            const result = calculateSetOneRebalance(holdings, 'def', 40);

            expect(result.find(r => r.id === 'abc')).toBeDefined();
            expect(result.find(r => r.id === 'def')?.targetAllocation).toBe(40);
            expect(result.find(r => r.id === 'ghi')).toBeDefined();
        });
    });
});

