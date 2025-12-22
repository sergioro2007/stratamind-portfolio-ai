import { describe, it, expect, vi } from 'vitest';
import { buildStrategyFromAI } from '../../../services/portfolioFactory';
import { SliceType } from '../../../types';

vi.mock('../../../services/marketData', () => ({
    validateTicker: vi.fn().mockResolvedValue(true),
    fetchStockPrice: vi.fn().mockResolvedValue(100.00), // Fixed price for easier assertions
}));

describe('Portfolio Factory - Strategy Creation', () => {
    it('should create portfolio structure with tickers and full raw prompt', () => {
        const fullPrompt = "I want a strategy focused on High Dividend Yields, specifically targeting REITs and Utilities. Rule: Must yield > 4%.";

        const aiGroupsResponse = [
            {
                name: "REITs",
                allocation: 60,
                tickers: ["O", "AMT", "CCI"]
            },
            {
                name: "Utilities",
                allocation: 40,
                tickers: ["NEE", "DUK"]
            }
        ];

        const strategyName = "Dividend Income";
        const rootId = "root-123";
        const totalValue = 10000;

        // Act
        const result = buildStrategyFromAI(rootId, strategyName, totalValue, aiGroupsResponse, fullPrompt);

        // Assert - Prompt Persistence
        expect(result.strategyPrompt).toBe(fullPrompt);
        expect(result.name).toBe(strategyName);
        expect(result.type).toBe(SliceType.GROUP);
        expect(result.children).toHaveLength(2);

        // Assert - Tickers/Structure
        const reits = result.children!.find(c => c.name === "REITs");
        expect(reits).toBeDefined();
        expect(reits!.targetAllocation).toBe(60);
        expect(reits!.children).toHaveLength(3); // 3 tickers
        expect(reits!.children![0].type).toBe(SliceType.HOLDING);
        expect(reits!.children![0].symbol).toBe("O");

        // Assert - Calc
        // O is 1 of 3 (33%) -> but integer distribution makes it 34% (100/3 = 33r1).
        // 10000 * 0.6 = 6000. 34% of 6000 = 2040.
        // Approx check
        const expectedTickerVal = 2040;
        expect(reits!.children![0].currentValue).toBeCloseTo(expectedTickerVal, 1);
    });
});
