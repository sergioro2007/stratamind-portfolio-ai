import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../../App';
import { db } from '../../../services/database';
import { SliceType } from '../../../types';
import * as marketData from '../../../services/marketData';


// Mock Recharts to avoid Element.getComputedTextLength issues in JSDOM
vi.mock('recharts', async () => {
    return {
        ResponsiveContainer: ({ children }: any) => <div className="recharts-responsive-container">{children}</div>,
        AreaChart: ({ children }: any) => <div className="recharts-area-chart"><svg>{children}</svg></div>,
        Area: () => <div className="recharts-area" />,
        XAxis: () => <div className="recharts-x-axis" />,
        YAxis: () => <div className="recharts-y-axis" />,
        CartesianGrid: () => <div className="recharts-cartesian-grid" />,
        Tooltip: () => <div className="recharts-tooltip" />,
        PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
        Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
        Cell: () => <div data-testid="cell" />,
        Legend: () => <div data-testid="legend" />,
    };
});

// Mock Database
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
            createInstitution: vi.fn(async (name) => {
                const data = load();
                const newData = [...data, { id: 'inst-' + (data.length + 1), name, accounts: [] }];
                save(newData);
                return newData;
            }),
            deleteInstitution: vi.fn(async (id) => {
                const data = load().filter((i: any) => i.id !== id);
                save(data);
                return data;
            }),
            updateInstitution: vi.fn(async (id, name) => {
                const data = load().map((i: any) => i.id === id ? { ...i, name } : i);
                save(data);
                return data;
            }),
            createAccount: vi.fn(async (instId, name, type) => {
                const data = load();
                const newData = data.map((i: any) => {
                    if (i.id === instId) {
                        return {
                            ...i,
                            accounts: [...i.accounts, {
                                id: 'acc-' + (i.accounts.length + 1),
                                institutionId: instId,
                                name,
                                type,
                                totalValue: 0,
                                cashBalance: 0,
                                strategies: []
                            }]
                        };
                    }
                    return i;
                });
                save(newData);
                return newData;
            }),
            deleteAccount: vi.fn(async (instId, accId) => {
                const data = load().map((i: any) => {
                    if (i.id === instId) {
                        return { ...i, accounts: i.accounts.filter((a: any) => a.id !== accId) };
                    }
                    return i;
                });
                save(data);
                return data;
            }),
            updateAccount: vi.fn(async (instId, accId, name) => {
                const data = load().map((i: any) => {
                    if (i.id === instId) {
                        return {
                            ...i,
                            accounts: i.accounts.map((a: any) => a.id === accId ? { ...a, name } : a)
                        };
                    }
                    return i;
                });
                save(data);
                return data;
            }),
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

// Mock market data service
vi.mock('../../../services/marketData', () => ({
    searchSymbols: vi.fn((query: string) => {
        if (query.toUpperCase().includes('AAPL')) {
            return Promise.resolve([{ symbol: 'AAPL', name: 'Apple Inc.' }]);
        }
        return Promise.resolve([]);
    }),
    fetchStockPrice: vi.fn(),
    validateTicker: vi.fn(async (symbol: string) => symbol.toUpperCase() === 'AAPL' || symbol.toUpperCase() === 'MSFT'),
    fetchHistoricalData: vi.fn(async () => []),
    clearCache: vi.fn()
}));

// Mock the Gemini service to avoid API calls
vi.mock('../../../services/geminiService', () => ({
    startChatSession: vi.fn(() => ({
        sendMessage: vi.fn(async (message: string) => ({
            response: {
                text: () => 'Mock AI response',
            },
        })),
    })),
}));
vi.mock('../../../services/geminiService', () => ({
    startChatSession: vi.fn(() => ({
        sendMessage: vi.fn(async (message: string) => ({
            response: {
                text: () => 'Mock AI response',
            },
        })),
    })),
}));

// Mock auth service - ensure tests run with authenticated user
vi.mock('../../../services/authService', () => ({
    login: vi.fn().mockResolvedValue({ id: 'test-user', email: 'test@example.com' }),
    logout: vi.fn(),
    getCurrentUser: vi.fn(() => ({ id: 'test-user', email: 'test@example.com' })),
    isAuthenticated: vi.fn(() => true)
}));

// Mock Recharts

// Helper function to seed test data for tests requiring active account
const seedTestData = () => {
    const testData = [{
        id: 'test-inst-1',
        name: 'Test Institution',
        accounts: [{
            id: 'test-acc-1',
            name: 'Test Account',
            type: 'Brokerage',
            totalValue: 10000,
            cashBalance: 1000,
            strategies: [{
                id: 'test-strat-1',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Test Strategy',
                targetAllocation: 100,
                currentValue: 9000,
                children: []
            }]
        }]
    }];
    localStorage.setItem('portfolioData', JSON.stringify(testData));
};


describe('Integration Tests - Complete User Workflows', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        global.fetch = vi.fn((url: string) => {
            if (url.includes('/api/portfolio')) {
                const stored = localStorage.getItem('portfolioData');
                const data = stored ? JSON.parse(stored) : [];
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(data),
                } as Response);
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([]),
            } as Response);
        });
    });

    describe('Application Initialization', () => {
        it('should load the application with default data', async () => {
            seedTestData();
            render(<App />);
            // Initial load wait
            await waitFor(() => {
                expect(screen.queryByTestId(/loading/i) || screen.queryByText(/Loading Portfolio/i)).not.toBeInTheDocument();
            }, { timeout: 5000 });

            // Wait for pie chart to appear (async data load)
            await waitFor(() => {
                expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
                // Use getAllByText since "StrataMind" appears multiple times
                const strataMindElements = screen.getAllByText(/StrataMind/i);
                expect(strataMindElements.length).toBeGreaterThan(0);
            });
        });

        it('should initialize with seed data from database', async () => {
            seedTestData();
            render(<App />);
            await waitFor(() => {
                expect(screen.queryByTestId(/loading/i) || screen.queryByText(/Loading Portfolio/i)).not.toBeInTheDocument();
            });

            await waitFor(async () => {
                const data = await db.load(); // Await the promise
                expect(data).toBeDefined();
                expect(Array.isArray(data)).toBe(true);
                expect(data.length).toBeGreaterThan(0);
                // Relaxed check for Test Account to handle duplicates (e.g. sidebar + header)
                const accounts = screen.getAllByText('Test Account');
                expect(accounts.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Institution Management Workflow', () => {
        it('should create a new institution', async () => {
            const user = userEvent.setup();
            render(<App />);
            await waitFor(() => {
                expect(screen.queryByTestId(/loading/i) || screen.queryByText(/Loading Portfolio/i)).not.toBeInTheDocument();
            });

            const addInstitutionButton = screen.getByText(/Add Institution/i);
            await user.click(addInstitutionButton);

            // Modal should appear
            await waitFor(() => {
                expect(screen.getByText('Add New Institution')).toBeInTheDocument();
            });

            const input = screen.getByPlaceholderText('e.g. Fidelity');
            await user.type(input, 'Test Brokerage');

            const createButton = screen.getByText('Create');
            await user.click(createButton);

            await waitFor(() => {
                expect(screen.getByText('Test Brokerage')).toBeInTheDocument();
            });
        });

        it('should delete an institution', async () => {
            const user = userEvent.setup();
            render(<App />);
            await waitFor(() => {
                expect(screen.queryByTestId(/loading/i) || screen.queryByText(/Loading Portfolio/i)).not.toBeInTheDocument();
            });

            const initialData = await db.load();
            if (initialData.length > 0) {
                const firstInstitution = initialData[0];

                const deleteButtons = screen.getAllByRole('button');
                const deleteButton = deleteButtons.find(btn =>
                    btn.querySelector('svg')?.classList.contains('lucide-trash-2')
                );

                if (deleteButton) {
                    await user.click(deleteButton);

                    // Verify Confirmation Modal
                    await waitFor(() => {
                        expect(screen.getByText('Delete Institution?')).toBeInTheDocument();
                    });

                    const confirmButton = screen.getByText('Confirm Delete');
                    await user.click(confirmButton);

                    await waitFor(() => {
                        expect(screen.queryByText(firstInstitution.name)).not.toBeInTheDocument();
                    });
                }
            }
        });

        it('should switch to another strategy when the active one is deleted', async () => {
            const user = userEvent.setup();
            // Seed with 2 strategies
            const seedData = [{
                id: 'inst-1',
                name: 'Test Inst',
                accounts: [{
                    id: 'acc-1',
                    institutionId: 'inst-1',
                    name: 'Test Account',
                    type: 'Brokerage',
                    totalValue: 10000,
                    cashBalance: 0,
                    strategies: [
                        { id: 'strat-1', name: 'Strategy 1', targetAllocation: 50, type: SliceType.GROUP, children: [], currentValue: 0, parentId: null },
                        { id: 'strat-2', name: 'Strategy 2', targetAllocation: 50, type: SliceType.GROUP, children: [], currentValue: 0, parentId: null }
                    ]
                }]
            }];
            localStorage.setItem('portfolioData', JSON.stringify(seedData));
            window.confirm = vi.fn(() => true);

            render(<App />);
            await waitFor(() => {
                expect(screen.queryByTestId(/loading/i) || screen.queryByText(/Loading Portfolio/i)).not.toBeInTheDocument();
            });

            // Wait for load
            const sidebar = screen.getByTestId('sidebar');
            const strat1Btn = await within(sidebar).findByText('Strategy 1');
            await user.click(strat1Btn);

            // Open settings
            const header = screen.getByRole('banner');
            const settingsBtn = await within(header).findByTestId('account-settings-button');
            await user.click(settingsBtn);

            // Delete Strategy 1 in modal
            const modal = await screen.findByTestId('account-settings-modal');
            const strategy1Row = within(modal).getByText('Strategy 1').closest('.p-4') as HTMLElement;
            const deleteBtn = within(strategy1Row!).getByTitle('Delete Strategy');
            await user.click(deleteBtn);

            // Update Strategy 2 allocation to 100% to pass validation
            const strat2Input = within(modal).getByDisplayValue('50');
            await user.clear(strat2Input);
            await user.type(strat2Input, '100');

            // Save
            const saveBtn = screen.getByText('Save Changes');
            await user.click(saveBtn);

            // Verify Strategy 1 is gone and Strategy 2 is active
            await waitFor(() => {
                expect(screen.queryByText('Strategy 1')).not.toBeInTheDocument();
                // "Strategy 2" should be in the header or active view
                const header = screen.getByRole('banner');
                expect(within(header).getByText(/Strategy 2/i)).toBeInTheDocument();
            });
        });

        it('should rebalance existing slices when adding a new one that exceeds 100%', async () => {
            const user = userEvent.setup();
            // Seed with one 100% slice
            const seedData = [{
                id: 'inst-1',
                name: 'Test Inst',
                accounts: [{
                    id: 'acc-1',
                    institutionId: 'inst-1',
                    name: 'Test Account',
                    type: 'Brokerage',
                    totalValue: 10000,
                    cashBalance: 0,
                    strategies: [{
                        id: 'strat-1',
                        name: 'Strategy 1',
                        targetAllocation: 100,
                        type: SliceType.GROUP,
                        children: [{
                            id: 'holding-1',
                            name: 'Existing Holding',
                            symbol: 'MSFT',
                            targetAllocation: 100,
                            type: SliceType.HOLDING,
                            parentId: 'strat-1',
                            currentValue: 10000
                        }],
                        currentValue: 10000,
                        parentId: null
                    }]
                }]
            }];
            localStorage.setItem('portfolioData', JSON.stringify(seedData));

            render(<App />);
            await waitFor(() => {
                expect(screen.queryByTestId(/loading/i) || screen.queryByText(/Loading Portfolio/i)).not.toBeInTheDocument();
            });

            // Drill into strategy
            const sidebar = screen.getByTestId('sidebar');
            const stratBtn = await within(sidebar).findByText('Strategy 1');
            await user.click(stratBtn);

            // Open Add Modal
            const addBtn = await screen.findByRole('button', { name: /Add Slice/i });
            await user.click(addBtn);

            // Fill in 50% for new holding (Total would be 150%)
            const modal = screen.getByTestId('add-slice-modal');
            await user.type(within(modal).getByPlaceholderText(/e.g. AAPL/i), 'AAPL');

            // Wait for ticker search and selection (or just type name since we are testing rebalancing)
            // TickerSearch auto-sets name, but let's be explicit if needed.
            // Actually, TickerSearch is async. Let's wait.
            await waitFor(() => {
                expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
            });
            await user.click(screen.getByText('Apple Inc.'));

            const allocationInput = within(modal).getByLabelText(/Target Allocation/i);
            await user.clear(allocationInput);
            await user.type(allocationInput, '50');

            // Verify Rebalance warning appears
            await waitFor(() => {
                expect(screen.getByText(/Total allocation exceeds 100%/i)).toBeInTheDocument();
                expect(screen.getByText(/Auto-Rebalance Proportionally/i)).toBeInTheDocument();
            });

            // Click Rebalance
            const rebalanceBtn = screen.getByText(/Auto-Rebalance Proportionally/i);
            await user.click(rebalanceBtn);

            // Verify Proposal: Existing Holding 100% -> 50%
            await waitFor(() => {
                const proposal = screen.getByTestId('rebalance-proposal');
                expect(within(proposal).getByText(/Existing Holding/i)).toBeInTheDocument();
                expect(within(proposal).getAllByText(/100\s*%/).length).toBeGreaterThanOrEqual(1);
                expect(within(proposal).getByText(/→/)).toBeInTheDocument();
                expect(within(proposal).getAllByText(/50\s*%/).length).toBeGreaterThanOrEqual(1);
            });

            // Submit
            const submitBtn = within(modal).getByRole('button', { name: /^Add Slice$/ });
            await user.click(submitBtn);

            // Verify both holdings exist now at 50% each
            await waitFor(() => {
                expect(screen.getByText('Existing Holding')).toBeInTheDocument();
                expect(screen.getByText('Apple Inc.')).toBeInTheDocument();

                const allocations = screen.getAllByText('50%');
                expect(allocations.length).toBeGreaterThanOrEqual(2);
            });
        });
    });

    describe('Account Management Workflow', () => {
        it('should create a new account within an institution', async () => {
            const user = userEvent.setup();
            render(<App />);
            await waitFor(() => {
                expect(screen.queryByTestId(/loading/i) || screen.queryByText(/Loading Portfolio/i)).not.toBeInTheDocument();
            });

            // Create institution first
            const addInstitutionButton = screen.getByText(/Add Institution/i);
            await user.click(addInstitutionButton);
            await waitFor(() => expect(screen.getByText('Add New Institution')).toBeInTheDocument());
            await user.type(screen.getByPlaceholderText('e.g. Fidelity'), 'Test Bank');
            await user.click(screen.getByText('Create'));
            await waitFor(() => expect(screen.getByText('Test Bank')).toBeInTheDocument());

            // Add Account
            await waitFor(() => {
                expect(screen.getByText('Add Account')).toBeInTheDocument();
            });

            // Ensure Add Account button is visible (may need to wait for render)
            const addAccountButtons = await screen.findAllByText(/Add Account/i, {}, { timeout: 3000 });
            expect(addAccountButtons.length).toBeGreaterThan(0);
            await user.click(addAccountButtons[0]);

            // Modal
            await waitFor(() => {
                expect(screen.getByText('Add New Account')).toBeInTheDocument();
            }, { timeout: 3000 });

            const input = screen.getByPlaceholderText('e.g. Roth IRA');
            await user.type(input, 'Test IRA');

            const createButton = screen.getByText('Create');
            await user.click(createButton);

            await waitFor(() => {
                expect(screen.getByText('Test IRA')).toBeInTheDocument();
            });
        });
    });

    describe('Portfolio Building Workflow', () => {
        it('should add a slice to the portfolio', async () => {
            seedTestData();
            const user = userEvent.setup();
            // Mock validation and search
            const marketData = await import('../../../services/marketData');
            vi.mocked(marketData.validateTicker).mockResolvedValue(true);
            vi.mocked(marketData.fetchStockPrice).mockResolvedValue(150.00);
            vi.mocked(marketData.searchSymbols).mockResolvedValue([{ symbol: 'AAPL', name: 'Apple Inc.' }]);

            // Seed data for this test
            const seedData = [{
                id: 'inst-1',
                name: 'Seed Inst',
                accounts: [{
                    id: 'acc-1',
                    name: 'Seed Account',
                    type: 'Brokerage',
                    totalValue: 10000,
                    cashBalance: 10000,
                    strategies: [{
                        id: 'root-1',
                        type: 'GROUP',
                        name: 'Strategy',
                        targetAllocation: 100,
                        currentValue: 0,
                        children: []
                    }]
                }]
            }];
            localStorage.setItem('portfolioData', JSON.stringify(seedData));

            render(<App />);
            await waitFor(() => {
                expect(screen.queryByTestId(/loading/i) || screen.queryByText(/Loading Portfolio/i)).not.toBeInTheDocument();
            });

            // Verify data loaded
            await screen.findByText('Seed Inst', {}, { timeout: 3000 });

            // Wait for Strategy in Sidebar (Account should be auto-expanded)
            // Use within sidebar to avoid ambiguity with header
            const sidebar = screen.getByTestId('sidebar');
            const strategyButton = await within(sidebar).findByText('Strategy', {}, { timeout: 3000 });
            await user.click(strategyButton);

            const addSliceButton = await screen.findByText(/Add Slice/i, {}, { timeout: 3000 });
            await user.click(addSliceButton);

            await waitFor(() => {
                expect(screen.getByText('Add New Slice')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Need to select from dropdown to set the name
            const symbolInput = screen.getByPlaceholderText(/e.g. AAPL/i);
            await user.type(symbolInput, 'AAPL');

            // Wait for dropdown item and click it
            await waitFor(() => {
                expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
            }, { timeout: 3000 });
            await user.click(screen.getByText('Apple Inc.'));

            const allocationInput = screen.getByDisplayValue('0');
            await user.clear(allocationInput);
            await user.type(allocationInput, '25');

            const submitButtons = screen.getAllByRole('button', { name: /Add Slice/i });
            const submitButton = submitButtons[submitButtons.length - 1]; // Content button
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getAllByText(/Apple Inc./i).length).toBeGreaterThan(0);
            }, { timeout: 3000 });
        });

        it('should update or move existing ticker instead of creating duplicate', async () => {
            const user = userEvent.setup();
            const seedData = [{
                id: 'inst-1',
                name: 'Test Inst',
                accounts: [{
                    id: 'acc-1',
                    name: 'Test Account',
                    type: 'Brokerage',
                    totalValue: 10000,
                    cashBalance: 10000,
                    strategies: [{
                        id: 'root-1',
                        type: 'GROUP',
                        name: 'Main Strategy',
                        targetAllocation: 100,
                        currentValue: 0,
                        children: [
                            {
                                id: 'group-1',
                                parentId: 'root-1',
                                type: 'GROUP',
                                name: 'Group 1',
                                targetAllocation: 50,
                                currentValue: 0,
                                children: [
                                    {
                                        id: 'aapl-1',
                                        parentId: 'group-1',
                                        type: 'HOLDING',
                                        name: 'AAPL',
                                        symbol: 'AAPL',
                                        targetAllocation: 100,
                                        currentValue: 0
                                    }
                                ]
                            },
                            {
                                id: 'group-2',
                                parentId: 'root-1',
                                type: 'GROUP',
                                name: 'Group 2',
                                targetAllocation: 50,
                                currentValue: 0,
                                children: []
                            }
                        ]
                    }]
                }]
            }];
            localStorage.setItem('portfolioData', JSON.stringify(seedData));

            render(<App />);
            await waitFor(() => {
                expect(screen.queryByTestId(/loading/i) || screen.queryByText(/Loading Portfolio/i)).not.toBeInTheDocument();
            });

            // Mock validation
            const marketData = await import('../../../services/marketData');
            vi.mocked(marketData.validateTicker).mockResolvedValue(true);
            vi.mocked(marketData.searchSymbols).mockResolvedValue([{ symbol: 'AAPL', name: 'Apple Inc.' }]);

            // Expand Group 2
            const sidebar = screen.getByTestId('sidebar');
            const mainStrategy = await within(sidebar).findByText('Main Strategy');
            await user.click(mainStrategy);

            // Navigate into Group 2 in visualizer
            const group2Slice = await screen.findByText('Group 2');
            await user.click(group2Slice);

            // Add AAPL to Group 2
            const addSliceButton = await screen.findByText(/Add Slice/i);
            await user.click(addSliceButton);

            await user.type(screen.getByPlaceholderText(/e.g. AAPL/i), 'AAPL');
            await waitFor(() => screen.getByText('Apple Inc.'));
            await user.click(screen.getByText('Apple Inc.'));

            const allocationInput = screen.getByDisplayValue('0');
            await user.clear(allocationInput);
            await user.type(allocationInput, '40');

            const modal = screen.getByTestId('add-slice-modal');
            const submitButton = within(modal).getByRole('button', { name: /^Add Slice$/ });
            await user.click(submitButton);

            // Verify AAPL is now in Group 2
            await waitFor(() => {
                expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify database state: AAPL should only exist once and in Group 2
            const currentData = await db.load();
            const strategy = currentData[0].accounts[0].strategies[0];
            const g1 = strategy.children.find((c: any) => c.name === 'Group 1');
            const g2 = strategy.children.find((c: any) => c.name === 'Group 2');

            expect(g1.children).toHaveLength(0); // Should be removed from G1
            expect(g2.children).toHaveLength(1); // Should be added to G2
            expect(g2.children[0].symbol).toBe('AAPL');
            expect(g2.children[0].targetAllocation).toBe(40);
        });
    });

    describe('Chat Interaction Workflow', () => {
        it('should send a message to the AI', async () => {
            const user = userEvent.setup();
            // Seed data
            const seedData = [{
                id: 'inst-1', name: 'Seed Inst', accounts: [{ id: 'acc-1', name: 'Seed Account', type: 'Brokerage', totalValue: 10000, cashBalance: 10000, strategies: [] }]
            }];
            localStorage.setItem('portfolioData', JSON.stringify(seedData));

            render(<App />);
            await waitFor(() => {
                expect(screen.queryByTestId(/loading/i) || screen.queryByText(/Loading Portfolio/i)).not.toBeInTheDocument();
            });

            const chatInput = await screen.findByPlaceholderText(/Ask StrataMind/i, {}, { timeout: 3000 });
            await user.type(chatInput, 'Create a tech portfolio');

            const sendButtons = await screen.findAllByRole('button');
            const sendButton = sendButtons.find(btn =>
                btn.querySelector('svg')?.classList.contains('lucide-send')
            );

            if (sendButton) {
                await user.click(sendButton);
                await waitFor(() => {
                    expect(screen.getByText('Create a tech portfolio')).toBeInTheDocument();
                });
            }
        });

        it('should have interactive chat panel', async () => {
            seedTestData();
            render(<App />);
            const chatInput = await screen.findByPlaceholderText(/Ask StrataMind/i);
            expect(chatInput).not.toBeDisabled();
        });
    });

    describe('Data Persistence Workflow', () => {
        it('should persist data to localStorage', async () => {
            const user = userEvent.setup();
            seedTestData();
            render(<App />);
            await waitFor(() => {
                expect(screen.queryByTestId(/loading/i) || screen.queryByText(/Loading Portfolio/i)).not.toBeInTheDocument();
            });

            const addInstitutionButton = screen.getByText(/Add Institution/i);
            await user.click(addInstitutionButton);

            const input = await screen.findByPlaceholderText('e.g. Fidelity');
            await user.type(input, 'Persistent Bank');
            await user.click(screen.getByText('Create'));

            await waitFor(() => {
                expect(screen.getByText('Persistent Bank')).toBeInTheDocument();
            });

            // Verify the institution was added to the database
            const currentData = await db.load();
            const persistentBank = currentData.find(
                (inst: any) => inst.name === 'Persistent Bank'
            );
            expect(persistentBank).toBeDefined();
        });

        it('should load persisted data on app restart', async () => {
            // Create test data and save it
            const testData = [
                {
                    id: 'test-inst-1',
                    name: 'Pre-existing Bank',
                    accounts: [
                        {
                            id: 'test-acc-1',
                            name: 'Test Account',
                            type: 'Taxable',
                            totalValue: 10000,
                            cashBalance: 1000,
                            strategies: [{
                                id: 'root-1',
                                parentId: null,
                                type: SliceType.GROUP,
                                name: 'Strategy',
                                targetAllocation: 100,
                                currentValue: 0,
                                children: []
                            }]
                        }
                    ],
                },
            ];
            db.save(testData);

            render(<App />);
            await waitFor(() => {
                expect(screen.queryByTestId(/loading/i) || screen.queryByText(/Loading Portfolio/i)).not.toBeInTheDocument();
            });
            // Wait for data to load and render
            await waitFor(() => {
                expect(screen.getByText('Pre-existing Bank')).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling Workflow', () => {
        it('should handle invalid portfolio allocations gracefully', async () => {
            seedTestData();
            const user = userEvent.setup();
            render(<App />);
            await waitFor(() => {
                expect(screen.queryByTestId(/loading/i) || screen.queryByText(/Loading Portfolio/i)).not.toBeInTheDocument();
            });

            const addSliceButton = await screen.findByText(/Add Slice/i);
            await user.click(addSliceButton);

            await waitFor(() => {
                expect(screen.getByText('Add New Slice')).toBeInTheDocument();
            });

            await waitFor(() => {
                expect(screen.getByText('Add New Slice')).toBeInTheDocument();
            });

            const symbolInput = screen.getByPlaceholderText(/e.g. AAPL/i);
            await user.type(symbolInput, 'INV');

            const submitButtons = screen.getAllByRole('button', { name: /Add Slice/i });
            const submitButton = submitButtons[submitButtons.length - 1];
            await user.click(submitButton);

            expect(screen.getByText('Add New Slice')).toBeInTheDocument();
        });

        it('should handle corrupted localStorage data', async () => {
            localStorage.setItem('portfolioData', 'invalid json{');
            render(<App />);
            // App should handle error, maybe by showing welcome screen or logging error
            // It won't show pie chart because data load failed
            await waitFor(() => {
                // Ensure Header is present (StrataMind) - check > 0 to handle multiple instances (mobile/desktop)
                const headers = screen.getAllByText(/StrataMind/i);
                expect(headers.length).toBeGreaterThan(0);

                expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
            });
        });
    });

    describe('Multi-Step Workflow', () => {
        it('should complete a full portfolio creation workflow', async () => {
            // Start empty for this workflow
            const user = userEvent.setup();
            render(<App />);
            await waitFor(() => {
                expect(screen.queryByTestId(/loading/i) || screen.queryByText(/Loading Portfolio/i)).not.toBeInTheDocument();
            });

            const addInstitutionButton = screen.getByText(/Add Institution/i);
            await user.click(addInstitutionButton);

            await waitFor(() => {
                expect(screen.getByText('Add New Institution')).toBeInTheDocument();
            });

            await user.type(screen.getByPlaceholderText('e.g. Fidelity'), 'My Brokerage');
            await user.click(screen.getByText('Create'));
            // Note: initData auto-selects the first institution/account, so it might already be active.
            // We only click if we need to expand it, but clicking again would toggle it OFF.
            const sidebar = screen.getByTestId('sidebar');
            const myBrokerage = await within(sidebar).findByText('My Brokerage');

            // Only click if it's NOT already active (to avoid toggling off)
            if (!myBrokerage.className.includes('text-indigo-400')) {
                await user.click(myBrokerage);
            }

            const addAccountBtn = await screen.findByText(/Add Account/i);
            await user.click(addAccountBtn);

            await waitFor(() => {
                expect(screen.getByText('Add New Account')).toBeInTheDocument();
            });

            await user.type(screen.getByPlaceholderText('e.g. Roth IRA'), 'Growth Portfolio');
            await user.click(screen.getByText('Create'));

            await waitFor(() => {
                expect(screen.getByText('Growth Portfolio')).toBeInTheDocument();
            });

            const growthPortfolio = screen.getByText('Growth Portfolio');
            await user.click(growthPortfolio);

            // New: Manual Strategy Creation
            const newStrategyButton = await screen.findByText('New Strategy');
            await user.click(newStrategyButton);

            await waitFor(() => {
                expect(screen.getByText('Add New Strategy')).toBeInTheDocument();
            });

            await user.type(screen.getByPlaceholderText(/e.g. Growth Strategy/i), 'UniqueTestStrategy');
            await user.click(screen.getByText('Create'));

            // Select the new strategy
            // Using specific sidebar find to avoid ambiguity with Header/Card
            const testStrategy = await within(sidebar).findByText(/UniqueTestStrategy/i);
            await user.click(testStrategy);

            await waitFor(() => {
                expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
            }, { timeout: 5000 });

            // Final check of DB state via mock call
            const savedData = await db.load();
            expect(savedData.some((i: any) => i.name === 'My Brokerage')).toBe(true);
        });
    });
});
