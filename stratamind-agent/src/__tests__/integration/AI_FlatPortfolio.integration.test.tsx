
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../../App';
import { SliceType } from '../../../types';
import * as geminiService from '../../../services/geminiService';

// Mock Global Fetch for database interaction
vi.stubGlobal('fetch', vi.fn(async (url: string, options?: any) => {
    const load = () => {
        const stored = localStorage.getItem('portfolioData');
        return stored ? JSON.parse(stored) : [];
    };
    const save = (data: any[]) => {
        localStorage.setItem('portfolioData', JSON.stringify(data));
    };

    if (url.includes('/api/portfolio')) {
        return {
            ok: true,
            json: async () => load()
        };
    }
    if (url.includes('/api/accounts') && options?.method === 'PUT') {
        const parts = url.split('/');
        const accId = parts[parts.length - 1];
        const body = JSON.parse(options.body);

        const data = load().map((i: any) => ({
            ...i,
            accounts: i.accounts.map((a: any) => a.id === accId ? { ...a, ...body } : a)
        }));
        save(data);
        return { ok: true, json: async () => data };
    }
    return { ok: true, json: async () => ({}) };
}));

// Mock Gemini Service
vi.mock('../../../services/geminiService', () => ({
    startChatSession: vi.fn()
}));

// Mock Market Data
vi.mock('../../../services/marketData', () => ({
    fetchStockPrice: vi.fn().mockResolvedValue(150),
    validateTicker: vi.fn().mockResolvedValue(true),
    clearCache: vi.fn()
}));

// Mock Recharts to avoid layout issues
vi.mock('recharts', async () => {
    const actual = await vi.importActual('recharts') as any;
    return {
        ...actual,
        ResponsiveContainer: ({ children }: any) => <div style={{ width: '500px', height: '500px' }}>{children}</div>
    };
});

describe('AI Flat Portfolio Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();

        // Seed initial data
        const seedData = [{
            id: 'inst-1',
            name: 'Test Inst',
            accounts: [{
                id: 'acc-1',
                institutionId: 'inst-1',
                name: 'Test Acc',
                type: 'Brokerage',
                totalValue: 10000,
                cashBalance: 1000,
                strategies: []
            }]
        }];
        localStorage.setItem('portfolioData', JSON.stringify(seedData));
    });

    it('should create a flat portfolio structure when AI uses holdings parameter', async () => {
        const user = userEvent.setup();

        // 1. Mock AI Session to return a function call with holdings
        const mockSendMessage = vi.fn().mockResolvedValue({
            text: "I've proposed a flat portfolio for you.",
            functionCalls: [{
                name: 'create_portfolio_structure',
                args: {
                    strategyName: 'Flat Tech',
                    holdings: [
                        { symbol: 'AAPL', allocation: 40 },
                        { symbol: 'MSFT', allocation: 30 },
                        { symbol: 'GOOGL', allocation: 30 }
                    ]
                }
            }]
        });

        (geminiService.startChatSession as any).mockResolvedValue({
            sendMessage: mockSendMessage
        });

        render(<App />);

        // Wait for Sidebar to load
        const sidebar = await screen.findByTestId('sidebar');

        // Robust way to find and click the account
        // First, Ensure institution is expanded
        const institutionHeader = await within(sidebar).findByText('Test Inst');
        const institutionRow = institutionHeader.closest('div');

        // In our current Sidebar implementation, let's just click the header to toggle
        await user.click(institutionHeader);

        // Wait for Account to appear
        const accountItem = await screen.findByTestId('sidebar-account-Test Acc');
        await user.click(accountItem);

        // 2. Open Chat and send message
        const chatInput = await screen.findByPlaceholderText(/Ask StrataMind to build a portfolio/i);
        await user.type(chatInput, 'Build a simple tech portfolio with AAPL, MSFT, GOOGL{Enter}');

        // 3. Wait for Proposal
        await waitFor(() => {
            expect(screen.getByText(/Create new strategy "Flat Tech"/i)).toBeInTheDocument();
        });

        // 4. Approve Proposal
        const approveBtn = screen.getByRole('button', { name: /Approve/i });
        await user.click(approveBtn);

        // 5. Verify the strategy is created and active in Sidebar
        // screen.debug(undefined, 20000);
        await screen.findByTestId('strategy-name-Flat Tech', {}, { timeout: 10000 });

        // 6. Verify children are direct holdings (Flat)
        // In the main view, check for the tickers
        await screen.findByTestId('holding-item-AAPL', {}, { timeout: 10000 });
        expect(screen.getByTestId('holding-item-MSFT')).toBeInTheDocument();
        expect(screen.getByTestId('holding-item-GOOGL')).toBeInTheDocument();
    }, 30000);
});
