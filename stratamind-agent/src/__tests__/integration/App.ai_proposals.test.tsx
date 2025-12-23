import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../../../services/database'; // Import mocked db
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../../App';

// Hoist the mock function so it is available in the mock factory
const { mockSendMessage } = vi.hoisted(() => {
    return { mockSendMessage: vi.fn() };
});

// Mock Dependencies
vi.mock('../../../services/database', () => {
    const load = () => {
        const stored = localStorage.getItem('portfolioData');
        return stored ? JSON.parse(stored) : [];
    };
    const save = (data: any[]) => {
        localStorage.setItem('portfolioData', JSON.stringify(data));
    };
    return {
        generateId: () => Math.random().toString(36).substr(2, 9),
        db: {
            load: vi.fn(async () => load()),
            save: vi.fn(async (data) => save(data)),
            updateAccountDetails: vi.fn(async (instId, accId, details) => {
                const data = load().map((i: any) => {
                    if (i.id === instId) {
                        return {
                            ...i,
                            accounts: i.accounts.map((a: any) => a.id === accId ? { ...a, ...details } : a)
                        };
                    }
                    return i;
                });
                save(data);
                return data;
            }),
            getPerformanceHistory: vi.fn(async () => []),
            getPerformanceStats: vi.fn(async () => null),
            recordPerformanceSnapshot: vi.fn(async () => { }),
        }
    };
});

vi.mock('../../../services/marketData', () => ({
    validateTicker: vi.fn(() => Promise.resolve(true)),
    fetchStockPrice: vi.fn(() => Promise.resolve(150.00)),
    searchSymbols: vi.fn(() => Promise.resolve([])),
    fetchHistoricalData: vi.fn(async () => []),
    clearCache: vi.fn()
}));

vi.mock('../../../services/geminiService', () => ({
    startChatSession: vi.fn(() => Promise.resolve({
        sendMessage: (msg: string) => mockSendMessage(msg)
    })),
    verifyStrategy: vi.fn()
}));

vi.mock('../../../services/authService', () => ({
    login: vi.fn().mockResolvedValue({ id: 'test-user', email: 'test@example.com' }),
    logout: vi.fn(),
    getCurrentUser: vi.fn(() => ({ id: 'test-user', email: 'test@example.com' })),
    isAuthenticated: vi.fn(() => true)
}));

// Components Mocks
vi.mock('recharts', () => ({
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
    Cell: () => <div data-testid="cell" />,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    AreaChart: ({ children }: any) => <div className="recharts-area-chart"><svg>{children}</svg></div>,
    Area: () => <div className="recharts-area" />,
    XAxis: () => <div className="recharts-x-axis" />,
    YAxis: () => <div className="recharts-y-axis" />,
    CartesianGrid: () => <div className="recharts-cartesian-grid" />,
}));

describe('App Integration - AI Proposals', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();

        // Setup initial data
        localStorage.setItem('portfolioData', JSON.stringify([
            {
                id: 'inst-1',
                name: 'Test Bank',
                accounts: [{
                    id: 'acc-1',
                    institutionId: 'inst-1',
                    name: 'My Account',
                    type: 'Brokerage',
                    totalValue: 10000,
                    cashBalance: 10000,
                    strategies: []
                }]
            }
        ]));
    });

    it('should handle CREATE_PORTFOLIO proposal approval', async () => {
        const user = userEvent.setup();

        // Mock AI response to return a CREATE_PORTFOLIO function call
        mockSendMessage.mockResolvedValue({
            text: "I can help with that. Here is a proposed strategy.",
            functionCalls: [{
                name: 'create_portfolio_structure',
                args: {
                    strategyName: "Tech Growth",
                    groups: [
                        { name: "Semiconductors", allocation: 60, tickers: ["NVDA", "AMD"] },
                        { name: "Software", allocation: 40, tickers: ["MSFT", "ADBE"] }
                    ]
                }
            }]
        });

        render(<App />);

        // Select Account to enable chat
        await waitFor(() => expect(screen.getByTestId('sidebar-account-My Account')).toBeInTheDocument());
        await user.click(screen.getByTestId('sidebar-account-My Account'));

        // Send message
        const chatInput = screen.getByPlaceholderText(/Ask StrataMind/i);
        await user.type(chatInput, 'Create a tech strategy');

        const sendBtn = await waitFor(() => {
            const btns = screen.getAllByRole('button');
            return btns.find(b => b.innerHTML.includes('lucide-send'));
        });
        if (sendBtn) await user.click(sendBtn);
        else await user.type(chatInput, '{enter}'); // Fallback

        // Expect Proposal UI to appear
        await waitFor(() => {
            expect(screen.getByText(/Action Required/i)).toBeInTheDocument();
            expect(screen.getByText(/CREATE_PORTFOLIO/i)).toBeInTheDocument();
        }, { timeout: 3000 });

        // Approve
        const approveBtn = screen.getByText('Approve');
        await user.click(approveBtn);

        // Verify strategy created
        await waitFor(() => {
            expect(screen.getByTestId('strategy-name-Tech Growth')).toBeInTheDocument();
            // Check if content loaded
            expect(screen.getByText(/Semiconductors/i)).toBeInTheDocument();
        });
    });

    it('should handle ADD_TICKER proposal approval', async () => {
        const user = userEvent.setup();

        // Setup with existing strategy
        localStorage.setItem('portfolioData', JSON.stringify([
            {
                id: 'inst-1',
                name: 'Test Bank',
                accounts: [{
                    id: 'acc-1',
                    institutionId: 'inst-1',
                    name: 'My Account',
                    type: 'Brokerage',
                    totalValue: 10000,
                    cashBalance: 0,
                    strategies: [{
                        id: 'strat-1',
                        parentId: null,
                        type: 'GROUP',
                        name: 'My Strategy',
                        targetAllocation: 100,
                        currentValue: 10000,
                        children: [
                            { id: 'g1', parentId: 'strat-1', type: 'GROUP', name: 'Tech', targetAllocation: 100, children: [] }
                        ]
                    }]
                }]
            }
        ]));

        mockSendMessage.mockResolvedValue({
            text: "Adding AAPL for you.",
            functionCalls: [{
                name: 'add_ticker_to_group',
                args: {
                    symbol: "AAPL",
                    allocation: 10,
                    groupName: "Tech",
                    autoRebalance: true
                }
            }]
        });

        render(<App />);

        // Auto-selects strategy
        await waitFor(() => expect(screen.getByTestId('strategy-name-My Strategy')).toBeInTheDocument());

        // Send message
        const chatInput = screen.getByPlaceholderText(/Ask StrataMind/i);
        await user.type(chatInput, 'Add Apple');

        const sendBtn = await waitFor(() => {
            const btns = screen.getAllByRole('button');
            return btns.find(b => b.innerHTML.includes('lucide-send'));
        });
        if (sendBtn) await user.click(sendBtn);
        else await user.type(chatInput, '{enter}');

        await waitFor(() => {
            expect(screen.getByText(/Action Required/i)).toBeInTheDocument();
            expect(screen.getByText(/ADD_TICKER/i)).toBeInTheDocument();
        }, { timeout: 3000 });

        // Approve
        await user.click(screen.getByText('Approve'));

        // Verify DB update happened (since UI hides nested tickers in sidebar)
        await waitFor(() => {
            // Expect Mock has been called
            expect(db.updateAccountDetails).toHaveBeenCalled();

            // Check if the last call contained AAPL in the args
            const calls = (db.updateAccountDetails as any).mock.calls;
            const lastCall = calls[calls.length - 1];
            const details = lastCall[2]; // instId, accId, details
            const json = JSON.stringify(details);
            expect(json).toContain('AAPL');
        });
    });
});
