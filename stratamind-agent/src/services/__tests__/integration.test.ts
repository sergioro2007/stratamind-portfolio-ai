import { describe, it, expect, vi } from 'vitest';
import { buildStrategyFromAI } from '../../../services/portfolioFactory';
import { SliceType, PortfolioSlice } from '../../../types';

// Mock generateId to have predictable IDs for testing
vi.mock('../../../services/database', () => ({
    generateId: () => 'mock-id-' + Math.random().toString(36).substr(2, 5)
}));

describe('Strategy Integration Logic', () => {
    it('should build a valid portfolio slice tree from AI args', () => {
        // 1. Simulate the User Input
        const lastUserMessage = "Create a balanced portfolio with 60% stocks and 40% bonds.";

        // 2. Simulate AI Response Args (as `processAIResponse` would receive)
        const aiArgs = {
            strategyName: "Balanced Growth",
            groups: [
                {
                    name: "Stocks",
                    allocation: 60,
                    tickers: ["VTI", "VXUS"]
                },
                {
                    name: "Bonds",
                    allocation: 40,
                    tickers: ["BND"]
                }
            ],
            // 'rawPrompt' is injected by App logic, so we simulate that
            rawPrompt: lastUserMessage
        };

        const totalValue = 10000;
        const rootId = 'root-123';

        // 3. Run the Factory Logic (mirroring createNewStrategy in App.tsx)
        const strategy = buildStrategyFromAI(
            rootId,
            aiArgs.strategyName,
            totalValue,
            aiArgs.groups,
            aiArgs.rawPrompt
        );

        // 4. Assertions
        expect(strategy.id).toBe(rootId);
        expect(strategy.name).toBe("Balanced Growth");
        expect(strategy.strategyPrompt).toBe(lastUserMessage);
        expect(strategy.targetAllocation).toBe(100);
        expect(strategy.children).toHaveLength(2);

        // Check Stocks Group
        const stocks = strategy.children![0];
        expect(stocks.name).toBe("Stocks");
        expect(stocks.targetAllocation).toBe(60);
        expect(stocks.currentValue).toBe(6000); // 60% of 10000
        expect(stocks.children).toHaveLength(2);

        // Check Tickers in Stocks
        expect(stocks.children![0].name).toBe("VTI");
        expect(stocks.children![0].parentId).toBe(stocks.id); // Parent ID fix check
        expect(stocks.children![0].targetAllocation).toBe(50); // 100 / 2 tickers

        // Check Bonds Group
        const bonds = strategy.children![1];
        expect(bonds.name).toBe("Bonds");
        expect(bonds.targetAllocation).toBe(40);
        expect(bonds.children).toHaveLength(1);
        expect(bonds.children![0].name).toBe("BND");
    });
});
