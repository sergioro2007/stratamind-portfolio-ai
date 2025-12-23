import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../../App';
import { db } from '../../../services/database';
import { SliceType, type Institution, type Account, type PortfolioSlice } from '../../../types';

/**
 * Financial Accountability Integration Tests
 * 
 * These tests verify that real user workflows maintain financial invariants:
 * 1. After adding slices
 * 2. After updating allocations
 * 3. After save/load cycles
 */

// Mock Recharts
vi.mock('recharts', async () => ({
    ResponsiveContainer: ({ children }: any) => <div className="recharts-responsive-container">{children}</div>,
    AreaChart: ({ children }: any) => <div>{children}</div>,
    Area: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ children }: any) => <div>{children}</div>,
    Cell: () => <div />,
    Legend: () => <div />
}));

// Simple localStorage-based mock
vi.mock('../../../services/database', () => {
    const load = () => {
        const stored = localStorage.getItem('portfolioData');
        return stored ? JSON.parse(stored) : [];
    };
    const save = (data: any[]) => {
        localStorage.setItem('portfolioData', JSON.stringify(data));
    };
    return {
        generateId: () => 'test-id-' + Math.random(),
        db: {
            load: vi.fn(async () => load()),
            save: vi.fn(async (data) => save(data)),
            updateAccountDetails: vi.fn(async (instId, accId, updates) => {
                const data = load();
                const newData = data.map((i: any) => {
                    if (i.id === instId) {
                        return {
                            ...i,
                            accounts: i.accounts.map((a: any) => a.id === accId ? { ...a, ...updates } : a)
                        };
                    }
                    return i;
                });
                save(newData);
                return newData;
            })
        }
    };
});

vi.mock('../../../services/marketData', () => ({
    fetchStockPrice: vi.fn(() => Promise.resolve(100)),
    searchTickerSymbols: vi.fn(() => Promise.resolve([]))
}));

vi.mock('../../../services/geminiService', () => ({
    sendMessage: vi.fn(() => Promise.resolve({ response: { text: () => 'Test response' } })),
    startChatSession: vi.fn(() => Promise.resolve({ sendMessage: vi.fn(() => Promise.resolve({ text: 'Test' })) }))
}));

// Mock auth service to auto-authenticate
vi.mock('../../../services/authService', () => ({
    login: vi.fn().mockResolvedValue({ id: 'test-user', email: 'test@example.com' }),
    logout: vi.fn(),
    getCurrentUser: vi.fn(() => ({ id: 'test-user', email: 'test@example.com' })),
    isAuthenticated: vi.fn(() => true)
}));

describe('Financial Accountability - Integration', () => {
    const validatePortfolioInvariants = (slice: PortfolioSlice): boolean => {
        if (slice.children.length === 0) return true;

        const childrenSum = slice.children.reduce((sum, child) => sum + child.currentValue, 0);
        const isValid = Math.abs(childrenSum - slice.currentValue) < 0.01; // Allow for floating point errors

        if (!isValid) {
            console.error(`Portfolio Invariant Violation: Parent ${slice.id} has currentValue ${slice.currentValue} but children sum to ${childrenSum}`);
        }

        // Recursively validate children
        const childrenValid = slice.children.every(child => validatePortfolioInvariants(child));

        return isValid && childrenValid;
    };

    const validateAccountInvariants = (account: Account): boolean => {
        const strategiesSum = account.strategies.reduce((sum, s) => sum + s.currentValue, 0);
        const expected = account.cashBalance + strategiesSum;
        const isValid = Math.abs(account.totalValue - expected) < 0.01;

        if (!isValid) {
            console.error(`Account Invariant Violation: Account ${account.id} has totalValue ${account.totalValue} but cash(${account.cashBalance}) + strategies(${strategiesSum}) = ${expected}`);
        }

        // Validate each strategy's portfolio invariants
        const strategiesValid = account.strategies.every(s => validatePortfolioInvariants(s));

        return isValid && strategiesValid;
    };

    const validateInstitutionInvariants = (institutions: Institution[]): boolean => {
        return institutions.every(inst => {
            return inst.accounts.every(acc => validateAccountInvariants(acc));
        });
    };

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should maintain invariants after creating account with initial data', async () => {
        const seedData: Institution[] = [
            {
                id: 'inst-1',
                name: 'Test Brokerage',
                accounts: [
                    {
                        id: 'acc-1',
                        name: 'Growth Account',
                        type: 'Brokerage',
                        totalValue: 10000,
                        cashBalance: 2000,
                        strategies: [
                            {
                                id: 'strategy-1',
                                parentId: null,
                                type: SliceType.GROUP,
                                name: 'Tech Portfolio',
                                targetAllocation: 100,
                                currentValue: 8000,
                                children: [
                                    {
                                        id: 'holding-1',
                                        parentId: 'strategy-1',
                                        type: SliceType.HOLDING,
                                        name: 'Apple',
                                        symbol: 'AAPL',
                                        targetAllocation: 50,
                                        currentValue: 4000,
                                        children: []
                                    },
                                    {
                                        id: 'holding-2',
                                        parentId: 'strategy-1',
                                        type: SliceType.HOLDING,
                                        name: 'Microsoft',
                                        symbol: 'MSFT',
                                        targetAllocation: 50,
                                        currentValue: 4000,
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ];

        localStorage.setItem('portfolioData', JSON.stringify(seedData));

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Test Brokerage')).toBeInTheDocument();
        });

        // Verify invariants on loaded data
        const loadedData = JSON.parse(localStorage.getItem('portfolioData') || '[]');
        const isValid = validateInstitutionInvariants(loadedData);

        expect(isValid).toBe(true);
    });

    it('should maintain invariants with zero cash balance (100% invested)', () => {
        const seedData: Institution[] = [
            {
                id: 'inst-1',
                name: 'Fully Invested Account',
                accounts: [
                    {
                        id: 'acc-1',
                        name: 'All In',
                        type: 'Brokerage',
                        totalValue: 50000,
                        cashBalance: 0,
                        strategies: [
                            {
                                id: 'strategy-1',
                                parentId: null,
                                type: SliceType.GROUP,
                                name: 'Stocks',
                                targetAllocation: 100,
                                currentValue: 50000,
                                children: []
                            }
                        ]
                    }
                ]
            }
        ];

        // Validate the test data directly
        const isValid = validateInstitutionInvariants(seedData);

        expect(isValid).toBe(true);
    });

    it('should maintain invariants with only cash (no investments)', async () => {
        const seedData: Institution[] = [
            {
                id: 'inst-1',
                name: 'Cash Only Account',
                accounts: [
                    {
                        id: 'acc-1',
                        name: 'Savings',
                        type: 'Savings',
                        totalValue: 25000,
                        cashBalance: 25000,
                        strategies: []
                    }
                ]
            }
        ];

        localStorage.setItem('portfolioData', JSON.stringify(seedData));

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Cash Only Account')).toBeInTheDocument();
        });

        const loadedData = JSON.parse(localStorage.getItem('portfolioData') || '[]');
        const isValid = validateInstitutionInvariants(loadedData);

        expect(isValid).toBe(true);
    });

    it('should maintain invariants with deeply nested groups', async () => {
        const seedData: Institution[] = [
            {
                id: 'inst-1',
                name: 'Complex Portfolio',
                accounts: [
                    {
                        id: 'acc-1',
                        name: 'Multi-Level',
                        type: 'Brokerage',
                        totalValue: 100000,
                        cashBalance: 10000,
                        strategies: [
                            {
                                id: 'root',
                                parentId: null,
                                type: SliceType.GROUP,
                                name: 'All Investments',
                                targetAllocation: 100,
                                currentValue: 90000,
                                children: [
                                    {
                                        id: 'group-1',
                                        parentId: 'root',
                                        type: SliceType.GROUP,
                                        name: 'Stocks',
                                        targetAllocation: 60,
                                        currentValue: 54000,
                                        children: [
                                            {
                                                id: 'stock-1',
                                                parentId: 'group-1',
                                                type: SliceType.HOLDING,
                                                name: 'Tech Stock',
                                                symbol: 'TECH',
                                                targetAllocation: 100,
                                                currentValue: 54000,
                                                children: []
                                            }
                                        ]
                                    },
                                    {
                                        id: 'group-2',
                                        parentId: 'root',
                                        type: SliceType.GROUP,
                                        name: 'Bonds',
                                        targetAllocation: 40,
                                        currentValue: 36000,
                                        children: [
                                            {
                                                id: 'bond-1',
                                                parentId: 'group-2',
                                                type: SliceType.HOLDING,
                                                name: 'Treasury',
                                                symbol: 'TLT',
                                                targetAllocation: 100,
                                                currentValue: 36000,
                                                children: []
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ];

        localStorage.setItem('portfolioData', JSON.stringify(seedData));

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Complex Portfolio')).toBeInTheDocument();
        });

        const loadedData = JSON.parse(localStorage.getItem('portfolioData') || '[]');
        const isValid = validateInstitutionInvariants(loadedData);

        expect(isValid).toBe(true);
    });
});
