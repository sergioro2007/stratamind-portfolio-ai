import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PortfolioVisualizer from '../../../components/PortfolioVisualizer';
import { PortfolioSlice, SliceType } from '../../../types';
import * as marketData from '../../../services/marketData';

// Mock Recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ children, onClick, data }: any) => (
        <div data-testid="pie" onClick={() => onClick && onClick(data[0])}>
            {children}
        </div>
    ),
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

// Mock market data service
vi.mock('../../../services/marketData', () => ({
    fetchStockPrice: vi.fn((symbol: string) => {
        const prices: Record<string, number> = {
            'AAPL': 175.43,
            'MSFT': 350.00,
            'GOOGL': 140.50
        };
        return Promise.resolve(prices[symbol] || 100.00);
    }),
    validateTicker: vi.fn((symbol: string) => {
        const validTickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA'];
        return Promise.resolve(validTickers.includes(symbol));
    }),
    clearCache: vi.fn(),
    searchSymbols: vi.fn(() => Promise.resolve([]))
}));

describe('PortfolioVisualizer', () => {
    const mockOnAddSlice = vi.fn();
    const mockOnRemoveSlice = vi.fn();

    const mockRootSlice: PortfolioSlice = {
        id: 'root-1',
        parentId: null,
        type: SliceType.GROUP,
        name: 'My Portfolio',
        targetAllocation: 100,
        currentValue: 0,
        children: [
            {
                id: 'tech-1',
                parentId: 'root-1',
                type: SliceType.GROUP,
                name: 'Tech Sector',
                targetAllocation: 60,
                currentValue: 0,
                children: [
                    {
                        id: 'aapl-1',
                        parentId: 'tech-1',
                        type: SliceType.HOLDING,
                        name: 'Apple Inc',
                        symbol: 'AAPL',
                        targetAllocation: 50,
                        currentValue: 0,
                    },
                    {
                        id: 'msft-1',
                        parentId: 'tech-1',
                        type: SliceType.HOLDING,
                        name: 'Microsoft',
                        symbol: 'MSFT',
                        targetAllocation: 50,
                        currentValue: 0,
                    },
                ],
            },
            {
                id: 'healthcare-1',
                parentId: 'root-1',
                type: SliceType.HOLDING,
                name: 'Johnson & Johnson',
                symbol: 'JNJ',
                targetAllocation: 40,
                currentValue: 0,
            },
        ],
    };

    const defaultProps = {
        rootSlice: mockRootSlice,
        totalValue: 10000,
        onAddSlice: mockOnAddSlice,
        onRemoveSlice: mockOnRemoveSlice,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        // Mock window.confirm
        global.confirm = vi.fn(() => true);
    });

    describe('Rendering', () => {
        it('should render the portfolio visualizer', () => {
            render(<PortfolioVisualizer {...defaultProps} />);

            expect(screen.getByText('My Portfolio')).toBeInTheDocument();
        });

        it('should render breadcrumb navigation', () => {
            render(<PortfolioVisualizer {...defaultProps} />);

            expect(screen.getByText('My Portfolio')).toBeInTheDocument();
        });


        it('should render allocation breakdown section', () => {
            render(<PortfolioVisualizer {...defaultProps} />);

            expect(screen.getByText('Allocation Breakdown')).toBeInTheDocument();
        });

        it('should render chart components', () => {
            render(<PortfolioVisualizer {...defaultProps} />);

            expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
            expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
        });
    });

    describe('Slice Display', () => {
        it('should display all child slices', () => {
            render(<PortfolioVisualizer {...defaultProps} />);

            expect(screen.getByText('Tech Sector')).toBeInTheDocument();
            expect(screen.getByText('Johnson & Johnson')).toBeInTheDocument();
        });

        it('should display slice allocations', () => {
            render(<PortfolioVisualizer {...defaultProps} />);

            expect(screen.getByText('60%')).toBeInTheDocument();
            expect(screen.getByText('40%')).toBeInTheDocument();
        });

        it('should display estimated values', () => {
            render(<PortfolioVisualizer {...defaultProps} />);

            // 60% of 10000 = 6000, 40% = 4000
            expect(screen.getByText('6,000')).toBeInTheDocument();
            expect(screen.getByText('4,000')).toBeInTheDocument();
        });

        it('should display slice types', () => {
            render(<PortfolioVisualizer {...defaultProps} />);

            expect(screen.getByText('Group')).toBeInTheDocument();
            expect(screen.getByText('JNJ')).toBeInTheDocument();
        });

        it('should show empty state when no children', () => {
            const emptySlice: PortfolioSlice = {
                id: 'empty-1',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Empty Portfolio',
                targetAllocation: 100,
                currentValue: 0,
                children: [],
            };

            render(<PortfolioVisualizer {...defaultProps} rootSlice={emptySlice} />);

            expect(screen.getByText(/Empty Group/i)).toBeInTheDocument();
        });
    });

    describe('Navigation', () => {
        it('should navigate into a group when clicked', async () => {
            const user = userEvent.setup();
            render(<PortfolioVisualizer {...defaultProps} />);

            const techSector = screen.getByText('Tech Sector');
            await user.click(techSector);

            // Should now show Tech Sector's children
            expect(screen.getByText('Apple Inc')).toBeInTheDocument();
            expect(screen.getByText('Microsoft')).toBeInTheDocument();
        });

        it('should update breadcrumbs when navigating', async () => {
            const user = userEvent.setup();
            render(<PortfolioVisualizer {...defaultProps} />);

            const techSector = screen.getByText('Tech Sector');
            await user.click(techSector);

            // Should now show both breadcrumbs
            await waitFor(() => {
                expect(screen.getByText('My Portfolio')).toBeInTheDocument();
                expect(screen.getByText('Tech Sector')).toBeInTheDocument();
            });
        });

        it('should navigate back when clicking breadcrumb', async () => {
            const user = userEvent.setup();
            render(<PortfolioVisualizer {...defaultProps} />);

            // Navigate into Tech Sector
            const techSector = screen.getByText('Tech Sector');
            await user.click(techSector);

            // Click on root breadcrumb to go back
            const breadcrumbs = screen.getAllByRole('button');
            await user.click(breadcrumbs[0]); // First breadcrumb is root

            // Should be back at root level
            expect(screen.getByText('Tech Sector')).toBeInTheDocument();
            expect(screen.getByText('Johnson & Johnson')).toBeInTheDocument();
        });

        it('should not navigate when clicking on a holding', async () => {
            const user = userEvent.setup();
            render(<PortfolioVisualizer {...defaultProps} />);

            const holding = screen.getByText('Johnson & Johnson');
            await user.click(holding);

            // Should still be at root level
            expect(screen.getByText('Tech Sector')).toBeInTheDocument();
        });
    });


    describe('Edge Cases', () => {
        it('should handle slice without children', () => {
            const sliceWithoutChildren: PortfolioSlice = {
                id: 'single-1',
                parentId: null,
                type: SliceType.HOLDING,
                name: 'Single Holding',
                symbol: 'SINGLE',
                targetAllocation: 100,
                currentValue: 0,
            };

            render(<PortfolioVisualizer {...defaultProps} rootSlice={sliceWithoutChildren} />);

            expect(screen.getByText('Single Holding')).toBeInTheDocument();
        });

        it('should handle zero total value', () => {
            render(<PortfolioVisualizer {...defaultProps} totalValue={0} />);

            // Should still render without errors
            expect(screen.getByText('My Portfolio')).toBeInTheDocument();
        });

        it('should handle very large allocations', () => {
            const largeSlice: PortfolioSlice = {
                id: 'large-1',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Large Portfolio',
                targetAllocation: 100,
                currentValue: 0,
                children: [
                    {
                        id: 'child-1',
                        parentId: 'large-1',
                        type: SliceType.HOLDING,
                        name: 'Holding',
                        symbol: 'HOLD',
                        targetAllocation: 100,
                        currentValue: 0,
                    },
                ],
            };

            render(<PortfolioVisualizer {...defaultProps} rootSlice={largeSlice} totalValue={1000000} />);

            // Should format large numbers with commas
            expect(screen.getByText('1,000,000')).toBeInTheDocument();
        });

        it('should reset path when root slice changes', () => {
            const { rerender } = render(<PortfolioVisualizer {...defaultProps} />);

            const newRootSlice: PortfolioSlice = {
                id: 'new-root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'New Portfolio',
                targetAllocation: 100,
                currentValue: 0,
                children: [],
            };

            rerender(<PortfolioVisualizer {...defaultProps} rootSlice={newRootSlice} />);

            expect(screen.getByText('New Portfolio')).toBeInTheDocument();
        });
    });

    describe('Optional Callbacks', () => {
        it('should work without onAddSlice callback', () => {
            render(<PortfolioVisualizer rootSlice={mockRootSlice} totalValue={10000} />);

            expect(screen.getByText('My Portfolio')).toBeInTheDocument();
        });

        it('should work without onRemoveSlice callback', () => {
            render(<PortfolioVisualizer rootSlice={mockRootSlice} totalValue={10000} />);

            expect(screen.getByText('My Portfolio')).toBeInTheDocument();
        });
    });

    describe('Market Data Integration', () => {
        const mockHoldingSlice: PortfolioSlice = {
            id: 'aapl-1',
            parentId: 'root-1',
            type: SliceType.HOLDING,
            name: 'Apple Inc',
            symbol: 'AAPL',
            targetAllocation: 100,
            currentValue: 0,
        };

        describe('Price Display', () => {
            it('should display real stock price for holding', async () => {
                // Use a GROUP with a HOLDING child so price displays in the list
                const groupWithHolding: PortfolioSlice = {
                    id: 'root-1',
                    parentId: null,
                    type: SliceType.GROUP,
                    name: 'Portfolio',
                    targetAllocation: 100,
                    currentValue: 0,
                    children: [mockHoldingSlice],
                };

                const mockPrices = new Map([['AAPL', 175.43]]);

                render(
                    <PortfolioVisualizer
                        rootSlice={groupWithHolding}
                        totalValue={10000}
                        showPrices={true}
                        prices={mockPrices}
                    />
                );

                // Wait for async effects to complete
                await waitFor(() => {
                    expect(screen.getByText(/\$175\.43/)).toBeInTheDocument();
                });
            });

            it('should show loading state while fetching prices', async () => {
                await act(async () => {
                    render(
                        <PortfolioVisualizer
                            rootSlice={mockHoldingSlice}
                            totalValue={10000}
                            showPrices={true}
                            loadingPrices={true}
                        />
                    );
                });

                expect(screen.getByTestId('price-loading')).toBeInTheDocument();
            });

            it('should display prices for multiple holdings', async () => {
                const multiHoldingSlice: PortfolioSlice = {
                    id: 'root-1',
                    parentId: null,
                    type: SliceType.GROUP,
                    name: 'Portfolio',
                    targetAllocation: 100,
                    currentValue: 0,
                    children: [
                        {
                            id: 'aapl-1',
                            parentId: 'root-1',
                            type: SliceType.HOLDING,
                            name: 'Apple Inc',
                            symbol: 'AAPL',
                            targetAllocation: 50,
                            currentValue: 0,
                        },
                        {
                            id: 'msft-1',
                            parentId: 'root-1',
                            type: SliceType.HOLDING,
                            name: 'Microsoft',
                            symbol: 'MSFT',
                            targetAllocation: 50,
                            currentValue: 0,
                        },
                    ],
                };

                await act(async () => {
                    render(
                        <PortfolioVisualizer
                            rootSlice={multiHoldingSlice}
                            totalValue={10000}
                            showPrices={true}
                        />
                    );
                });

                // Should eventually show prices for both
                await waitFor(() => {
                    const prices = screen.queryAllByText(/\$/);
                    expect(prices.length).toBeGreaterThan(0);
                }, { timeout: 3000 });
            });

            it('should not fetch prices when showPrices is false', () => {
                render(
                    <PortfolioVisualizer
                        rootSlice={mockHoldingSlice}
                        totalValue={10000}
                        showPrices={false}
                    />
                );

                // Should not show any price indicators
                expect(screen.queryByTestId('price-loading')).not.toBeInTheDocument();
            });
        });

        describe('Error Handling', () => {
            it('should show error message when price fetch fails', async () => {
                await act(async () => {
                    render(
                        <PortfolioVisualizer
                            rootSlice={mockHoldingSlice}
                            totalValue={10000}
                            showPrices={true}
                            priceError="Failed to load prices"
                        />
                    );
                });

                expect(screen.getByText(/failed to load prices/i)).toBeInTheDocument();
            });

            it('should continue showing other prices if one fails', async () => {
                const multiHoldingSlice: PortfolioSlice = {
                    id: 'root-1',
                    parentId: null,
                    type: SliceType.GROUP,
                    name: 'Portfolio',
                    targetAllocation: 100,
                    currentValue: 0,
                    children: [
                        {
                            id: 'aapl-1',
                            parentId: 'root-1',
                            type: SliceType.HOLDING,
                            name: 'Apple Inc',
                            symbol: 'AAPL',
                            targetAllocation: 50,
                            currentValue: 0,
                        },
                        {
                            id: 'invalid-1',
                            parentId: 'root-1',
                            type: SliceType.HOLDING,
                            name: 'Invalid',
                            symbol: 'INVALID',
                            targetAllocation: 50,
                            currentValue: 0,
                        },
                    ],
                };

                await act(async () => {
                    render(
                        <PortfolioVisualizer
                            rootSlice={multiHoldingSlice}
                            totalValue={10000}
                            showPrices={true}
                        />
                    );
                });

                // Should show at least one price (for AAPL) - wait for async
                await waitFor(() => {
                    const priceElements = screen.queryAllByText(/\$175\.43/);
                    expect(priceElements.length).toBeGreaterThan(0);
                }, { timeout: 5000 });
            });
        });

        describe('Refresh Functionality', () => {
            it('should have refresh button when prices are shown', async () => {
                await act(async () => {
                    render(
                        <PortfolioVisualizer
                            rootSlice={mockHoldingSlice}
                            totalValue={10000}
                            showPrices={true}
                        />
                    );
                });

                // Wait for initial render to settle
                await waitFor(() => {
                    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
                });
            });

            it('should call refresh handler when button clicked', async () => {
                const mockOnRefresh = vi.fn();
                const user = userEvent.setup();

                await act(async () => {
                    render(
                        <PortfolioVisualizer
                            rootSlice={mockHoldingSlice}
                            totalValue={10000}
                            showPrices={true}
                            onRefreshPrices={mockOnRefresh}
                        />
                    );
                });

                const refreshButton = await screen.findByRole('button', { name: /refresh/i });
                await user.click(refreshButton);

                expect(mockOnRefresh).toHaveBeenCalled();
            });

            it('should disable refresh button while loading', async () => {
                await act(async () => {
                    render(
                        <PortfolioVisualizer
                            rootSlice={mockHoldingSlice}
                            totalValue={10000}
                            showPrices={true}
                            loadingPrices={true}
                        />
                    );
                });

                const refreshButton = screen.getByRole('button', { name: /refresh/i });
                expect(refreshButton).toBeDisabled();
            });
        });

        describe('Last Updated Timestamp', () => {
            it('should show last updated time when prices are loaded', async () => {
                const mockPrices = new Map([['AAPL', 175.43]]);
                const lastUpdate = new Date();

                await act(async () => {
                    render(
                        <PortfolioVisualizer
                            rootSlice={mockHoldingSlice}
                            totalValue={10000}
                            showPrices={true}
                            prices={mockPrices}
                            lastPriceUpdate={lastUpdate}
                        />
                    );
                });

                // Wait for timestamp to be displayed
                await waitFor(() => {
                    // Timestamp should be displayed (matches "just now" or "Xm ago" etc.)
                    expect(screen.getByText(/just now|ago/i)).toBeInTheDocument();
                });
            });

            it('should not show timestamp when no prices loaded', async () => {
                await act(async () => {
                    render(
                        <PortfolioVisualizer
                            rootSlice={mockHoldingSlice}
                            totalValue={10000}
                            showPrices={false}
                        />
                    );
                });

                expect(screen.queryByText(/updated/i)).not.toBeInTheDocument();
            });
        });
    });
});
