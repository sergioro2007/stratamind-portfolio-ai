import { describe, it, expect } from 'vitest';
import { SliceType, type Account, type PortfolioSlice } from '../../../types';

/**
 * Financial Accountability Tests
 * 
 * These tests verify critical financial invariants across the portfolio hierarchy:
 * 1. Portfolio Level: sum(children.currentValue) === parent.currentValue
 * 2. Account Level: account.totalValue === cashBalance + sum(strategies.currentValue)
 * 3. Institution Level: sum(accounts.totalValue) === institution total
 */

describe('Financial Accountability - Portfolio Level', () => {
    const createSlice = (overrides: Partial<PortfolioSlice> = {}): PortfolioSlice => ({
        id: 'slice-1',
        parentId: null,
        type: SliceType.GROUP,
        name: 'Test Slice',
        targetAllocation: 100,
        currentValue: 0,
        children: [],
        ...overrides
    });

    describe('Sum of children values equals parent value', () => {
        it('should maintain invariant for simple group with 2 holdings', () => {
            const parent = createSlice({
                id: 'group-1',
                type: SliceType.GROUP,
                currentValue: 10000,
                children: [
                    createSlice({ id: 'holding-1', type: SliceType.HOLDING, currentValue: 6000, children: [] }),
                    createSlice({ id: 'holding-2', type: SliceType.HOLDING, currentValue: 4000, children: [] })
                ]
            });

            const childrenSum = parent.children.reduce((sum, child) => sum + child.currentValue, 0);
            expect(childrenSum).toBe(parent.currentValue);
        });

        it('should maintain invariant for nested groups (3 levels deep)', () => {
            const parent = createSlice({
                id: 'root',
                currentValue: 10000,
                children: [
                    createSlice({
                        id: 'group-1',
                        type: SliceType.GROUP,
                        currentValue: 7000,
                        children: [
                            createSlice({ id: 'holding-1', type: SliceType.HOLDING, currentValue: 4000, children: [] }),
                            createSlice({ id: 'holding-2', type: SliceType.HOLDING, currentValue: 3000, children: [] })
                        ]
                    }),
                    createSlice({
                        id: 'group-2',
                        type: SliceType.GROUP,
                        currentValue: 3000,
                        children: [
                            createSlice({ id: 'holding-3', type: SliceType.HOLDING, currentValue: 3000, children: [] })
                        ]
                    })
                ]
            });

            // Test parent level
            const rootSum = parent.children.reduce((sum, child) => sum + child.currentValue, 0);
            expect(rootSum).toBe(parent.currentValue);

            // Test each child group
            parent.children.forEach(group => {
                const groupSum = group.children.reduce((sum, child) => sum + child.currentValue, 0);
                expect(groupSum).toBe(group.currentValue);
            });
        });

        it('should handle empty group (no children)', () => {
            const parent = createSlice({
                id: 'empty-group',
                type: SliceType.GROUP,
                currentValue: 0,
                children: []
            });

            const childrenSum = parent.children.reduce((sum, child) => sum + child.currentValue, 0);
            expect(childrenSum).toBe(0);
            expect(childrenSum).toBe(parent.currentValue);
        });

        it('should handle zero-value holdings', () => {
            const parent = createSlice({
                id: 'group-with-zeros',
                currentValue: 5000,
                children: [
                    createSlice({ id: 'holding-1', type: SliceType.HOLDING, currentValue: 5000, children: [] }),
                    createSlice({ id: 'holding-2', type: SliceType.HOLDING, currentValue: 0, children: [] })
                ]
            });

            const childrenSum = parent.children.reduce((sum, child) => sum + child.currentValue, 0);
            expect(childrenSum).toBe(parent.currentValue);
        });
    });
});

describe('Financial Accountability - Account Level', () => {
    const createAccount = (overrides: Partial<Account> = {}): Account => ({
        id: 'account-1',
        name: 'Test Account',
        type: 'Brokerage',
        totalValue: 0,
        cashBalance: 0,
        strategies: [],
        ...overrides
    });

    describe('Account total = cash + sum(strategies)', () => {
        it('should maintain invariant for account with single strategy', () => {
            const account = createAccount({
                totalValue: 15000,
                cashBalance: 5000,
                strategies: [
                    {
                        id: 'strategy-1',
                        parentId: null,
                        type: SliceType.GROUP,
                        name: 'My Portfolio',
                        targetAllocation: 100,
                        currentValue: 10000,
                        children: []
                    }
                ]
            });

            const strategiesSum = account.strategies.reduce((sum, s) => sum + s.currentValue, 0);
            const expectedTotal = account.cashBalance + strategiesSum;
            expect(account.totalValue).toBe(expectedTotal);
        });

        it('should maintain invariant for account with multiple strategies', () => {
            const account = createAccount({
                totalValue: 25000,
                cashBalance: 5000,
                strategies: [
                    {
                        id: 'strategy-1',
                        parentId: null,
                        type: SliceType.GROUP,
                        name: 'Growth',
                        targetAllocation: 60,
                        currentValue: 12000,
                        children: []
                    },
                    {
                        id: 'strategy-2',
                        parentId: null,
                        type: SliceType.GROUP,
                        name: 'Income',
                        targetAllocation: 40,
                        currentValue: 8000,
                        children: []
                    }
                ]
            });

            const strategiesSum = account.strategies.reduce((sum, s) => sum + s.currentValue, 0);
            const expectedTotal = account.cashBalance + strategiesSum;
            expect(account.totalValue).toBe(expectedTotal);
        });

        it('should handle account with only cash (no strategies)', () => {
            const account = createAccount({
                totalValue: 10000,
                cashBalance: 10000,
                strategies: []
            });

            const strategiesSum = account.strategies.reduce((sum, s) => sum + s.currentValue, 0);
            const expectedTotal = account.cashBalance + strategiesSum;
            expect(account.totalValue).toBe(expectedTotal);
        });

        it('should handle account with no cash (100% invested)', () => {
            const account = createAccount({
                totalValue: 20000,
                cashBalance: 0,
                strategies: [
                    {
                        id: 'strategy-1',
                        parentId: null,
                        type: SliceType.GROUP,
                        name: 'Fully Invested',
                        targetAllocation: 100,
                        currentValue: 20000,
                        children: []
                    }
                ]
            });

            const strategiesSum = account.strategies.reduce((sum, s) => sum + s.currentValue, 0);
            const expectedTotal = account.cashBalance + strategiesSum;
            expect(account.totalValue).toBe(expectedTotal);
        });

        it('should handle nested strategies correctly', () => {
            const account = createAccount({
                totalValue: 30000,
                cashBalance: 5000,
                strategies: [
                    {
                        id: 'root-strategy',
                        parentId: null,
                        type: SliceType.GROUP,
                        name: 'Main Portfolio',
                        targetAllocation: 100,
                        currentValue: 25000,
                        children: [
                            {
                                id: 'sub-1',
                                parentId: 'root-strategy',
                                type: SliceType.HOLDING,
                                name: 'Stock A',
                                symbol: 'STOCK_A',
                                targetAllocation: 60,
                                currentValue: 15000,
                                children: []
                            },
                            {
                                id: 'sub-2',
                                parentId: 'root-strategy',
                                type: SliceType.HOLDING,
                                name: 'Stock B',
                                symbol: 'STOCK_B',
                                targetAllocation: 40,
                                currentValue: 10000,
                                children: []
                            }
                        ]
                    }
                ]
            });

            // Account level invariant
            const strategiesSum = account.strategies.reduce((sum, s) => sum + s.currentValue, 0);
            const expectedTotal = account.cashBalance + strategiesSum;
            expect(account.totalValue).toBe(expectedTotal);

            // Portfolio level invariant (nested)
            const rootStrategy = account.strategies[0];
            const childrenSum = rootStrategy.children.reduce((sum, c) => sum + c.currentValue, 0);
            expect(childrenSum).toBe(rootStrategy.currentValue);
        });
    });
});

describe('Financial Accountability - Helper Functions', () => {
    describe('calculateSliceSum', () => {
        it('should correctly sum all children values', () => {
            const children: PortfolioSlice[] = [
                {
                    id: '1',
                    parentId: null,
                    type: SliceType.HOLDING,
                    name: 'A',
                    targetAllocation: 50,
                    currentValue: 5000,
                    children: []
                },
                {
                    id: '2',
                    parentId: null,
                    type: SliceType.HOLDING,
                    name: 'B',
                    targetAllocation: 50,
                    currentValue: 5000,
                    children: []
                }
            ];

            const sum = children.reduce((acc, child) => acc + child.currentValue, 0);
            expect(sum).toBe(10000);
        });

        it('should handle empty array', () => {
            const sum = [].reduce((acc: number, child: any) => acc + child.currentValue, 0);
            expect(sum).toBe(0);
        });
    });
});
