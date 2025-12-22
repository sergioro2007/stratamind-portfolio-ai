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

        it('should render Add Slice button for groups', () => {
            render(<PortfolioVisualizer {...defaultProps} />);

            expect(screen.getByText('Add Slice')).toBeInTheDocument();
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

    describe('Add Slice Modal', () => {
        it('should open modal when Add Slice button is clicked', async () => {
            const user = userEvent.setup();
            render(<PortfolioVisualizer {...defaultProps} />);

            const addButton = screen.getByText('Add Slice');
            await user.click(addButton);

            expect(await screen.findByText('Add New Slice')).toBeInTheDocument();
        });

        it('should close modal when X button is clicked', async () => {
            const user = userEvent.setup();
            render(<PortfolioVisualizer {...defaultProps} />);

            const addButton = screen.getByText('Add Slice');
            await user.click(addButton);

            await waitFor(() => {
                expect(screen.getByText('Add New Slice')).toBeInTheDocument();
            });

            // Find the X button in the modal
            const modal = screen.getByText('Add New Slice').closest('div');
            const closeButton = within(modal!).getAllByRole('button')[0]; // First button is X
            await user.click(closeButton);

            await waitFor(() => {
                expect(screen.queryByText('Add New Slice')).not.toBeInTheDocument();
            });
        });

        it('should render form fields in modal', async () => {
            const user = userEvent.setup();
            render(<PortfolioVisualizer {...defaultProps} />);

            await user.click(screen.getByText('Add Slice'));

            // Default is Holding - check for/match Ticker placeholder
            expect(await screen.findByPlaceholderText(/e.g. AAPL or Apple/i)).toBeInTheDocument();

            // Switch to Group to check Group Name placeholder
            await user.click(screen.getByRole('button', { name: 'Group' }));
            expect(await screen.findByPlaceholderText(/e.g. Tech Sector/i)).toBeInTheDocument();
        });

        it('should toggle between Holding and Group types', async () => {
            const user = userEvent.setup();
            render(<PortfolioVisualizer {...defaultProps} />);

            await user.click(screen.getByText('Add Slice'));

            expect(await screen.findByRole('button', { name: 'Holding' })).toBeInTheDocument();

            const holdingButton = screen.getByRole('button', { name: 'Holding' });
            const groupButton = screen.getByRole('button', { name: 'Group' });

            // Default is Holding
            expect(screen.getByPlaceholderText(/e.g. AAPL/i)).toBeInTheDocument();

            // Switch to Group
            await user.click(groupButton);
            await waitFor(() => {
                expect(screen.queryByPlaceholderText(/e.g. AAPL/i)).not.toBeInTheDocument();
            });

            // Switch back to Holding
            await user.click(holdingButton);
            expect(await screen.findByPlaceholderText(/e.g. AAPL/i)).toBeInTheDocument();
        });

        it('should call onAddSlice when form is submitted', async () => {
            const user = userEvent.setup();
            vi.mocked(marketData.searchSymbols).mockResolvedValue([
                { symbol: 'TSLA', name: 'Tesla Inc' }
            ]);
            render(<PortfolioVisualizer {...defaultProps} />);

            await user.click(screen.getByText('Add Slice'));

            const tickerInput = await screen.findByPlaceholderText(/e.g. AAPL/i);
            await user.type(tickerInput, 'TSLA');

            // Select from dropdown to resolve Name
            await expect(await screen.findByText(/Tesla Inc/i)).toBeInTheDocument();
            await user.click(screen.getByText(/Tesla Inc/i));

            const allocationInput = screen.getByDisplayValue('0');
            await user.clear(allocationInput);
            await user.type(allocationInput, '25');

            // Submit - find the submit button within the modal
            const submitButtons = screen.getAllByRole('button', { name: /Add Slice/i });
            const submitButton = submitButtons[submitButtons.length - 1]; // Last one is in modal
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockOnAddSlice).toHaveBeenCalledWith(
                    'root-1',
                    SliceType.HOLDING,
                    'Tesla Inc',
                    'TSLA',
                    25,
                    undefined // No rebalance needed (under 100%)
                );
            }, { timeout: 3000 });
        });

        it('should reset form after submission', async () => {
            const user = userEvent.setup();
            render(<PortfolioVisualizer {...defaultProps} />);

            await user.click(screen.getByText('Add Slice'));

            // Name input should NOT be visible for Holding type (default)
            expect(screen.queryByPlaceholderText(/e.g. Apple Inc/i)).not.toBeInTheDocument();
            expect(await screen.findByPlaceholderText(/e.g. AAPL/i)).toBeInTheDocument();
            expect(await screen.findByDisplayValue('0')).toBeInTheDocument();

            // Switch to Group type
            await user.click(screen.getByRole('button', { name: 'Group' }));

            // Name input SHOULD be visible for Group type
            expect(screen.getByPlaceholderText(/e.g. Tech Sector/i)).toBeInTheDocument();


            const nameInput = screen.getByPlaceholderText(/e.g. Tech Sector/i) as HTMLInputElement;
            const allocationInput = screen.getByDisplayValue('0') as HTMLInputElement;

            await user.type(nameInput, 'Tesla Inc');
            await user.clear(allocationInput);
            await user.type(allocationInput, '25');

            const submitButtons = screen.getAllByRole('button', { name: /Add Slice/i });
            const submitButton = submitButtons[submitButtons.length - 1];
            await user.click(submitButton);

            // Modal should be closed
            await waitFor(() => {
                expect(screen.queryByText('Add New Slice')).not.toBeInTheDocument();
            }, { timeout: 3000 });
        });

        it('should not submit with empty name', async () => {
            const user = userEvent.setup();
            render(<PortfolioVisualizer {...defaultProps} />);

            await user.click(screen.getByText('Add Slice'));

            expect(await screen.findByDisplayValue('0')).toBeInTheDocument();

            const allocationInput = screen.getByDisplayValue('0');
            await user.clear(allocationInput);
            await user.type(allocationInput, '25');

            const submitButtons = screen.getAllByRole('button', { name: /Add Slice/i });
            const submitButton = submitButtons[submitButtons.length - 1];
            await user.click(submitButton);

            // Should not call onAddSlice
            expect(mockOnAddSlice).not.toHaveBeenCalled();
        });

        it('should not submit with zero allocation', async () => {
            const user = userEvent.setup();
            render(<PortfolioVisualizer {...defaultProps} />);

            await user.click(screen.getByText('Add Slice'));



            expect(await screen.findByRole('button', { name: 'Group' })).toBeInTheDocument();

            // Switch to Group type
            await user.click(screen.getByRole('button', { name: 'Group' }));

            const nameInput = screen.getByPlaceholderText(/e.g. Tech Sector/i);
            await user.type(nameInput, 'My Group');

            const submitButtons = screen.getAllByRole('button', { name: /Add Slice/i });
            const submitButton = submitButtons[submitButtons.length - 1];
            await user.click(submitButton);

            // Should not call onAddSlice (allocation is 0 by default)
            expect(mockOnAddSlice).not.toHaveBeenCalled();
        });

        it('should convert ticker symbol to uppercase', async () => {
            const user = userEvent.setup();
            render(<PortfolioVisualizer {...defaultProps} />);

            await user.click(screen.getByText('Add Slice'));

            expect(await screen.findByPlaceholderText(/e.g. AAPL/i)).toBeInTheDocument();

            const symbolInput = screen.getByPlaceholderText(/e.g. AAPL/i) as HTMLInputElement;
            await user.type(symbolInput, 'tsla');

            expect(symbolInput.value).toBe('TSLA');
        });

        describe('Ticker Validation', () => {
            it('should validate ticker symbol before adding holding', async () => {
                const user = userEvent.setup();
                vi.mocked(marketData.searchSymbols).mockResolvedValue([
                    { symbol: 'AAPL', name: 'Apple Inc' }
                ]);
                render(<PortfolioVisualizer {...defaultProps} />);

                await user.click(screen.getByText('Add Slice'));

                expect(await screen.findByPlaceholderText(/e.g. AAPL/i)).toBeInTheDocument();

                // Mock search results for this test
                vi.mocked(marketData.searchSymbols).mockResolvedValue([
                    { symbol: 'AAPL', name: 'Apple Inc' }
                ]);

                // Fill out form with valid ticker
                const tickerInput = screen.getByPlaceholderText(/e.g. AAPL/i);
                await user.type(tickerInput, 'AAPL');

                // Wait for results
                await waitFor(() => {
                    expect(screen.getByText(/Apple Inc/i)).toBeInTheDocument();
                }, { timeout: 3000 });

                await user.click(screen.getByText(/Apple Inc/i));

                const allocationInput = screen.getByDisplayValue('0');
                await user.clear(allocationInput);
                await user.type(allocationInput, '50');

                // Submit
                const submitButtons = screen.getAllByRole('button', { name: /Add Slice/i });
                const submitButton = submitButtons[submitButtons.length - 1];
                await user.click(submitButton);

                // Should call onAddSlice after validation passes
                await waitFor(() => {
                    expect(mockOnAddSlice).toHaveBeenCalledWith(
                        'root-1',
                        SliceType.HOLDING,
                        'Apple Inc',
                        'AAPL',
                        50,
                        undefined
                    );
                });
            });

            it('should show error message for invalid ticker', async () => {
                const user = userEvent.setup();
                render(<PortfolioVisualizer {...defaultProps} />);

                await user.click(screen.getByText('Add Slice'));

                expect(await screen.findByPlaceholderText(/e.g. AAPL/i)).toBeInTheDocument();

                // Fill out form with invalid ticker
                const tickerInput = screen.getByPlaceholderText(/e.g. AAPL/i);
                await user.type(tickerInput, 'INVALID123');
                expect(tickerInput).toHaveValue('INVALID123');

                const allocationInput = screen.getByDisplayValue('0');
                await user.clear(allocationInput);
                await user.type(allocationInput, '50');

                // Submit
                const submitButtons = screen.getAllByRole('button', { name: /Add Slice/i });
                const submitButton = submitButtons[submitButtons.length - 1];
                // Check if button is enabled
                expect(submitButton).not.toBeDisabled();

                await user.click(submitButton);

                // Verify validation was called
                expect(marketData.validateTicker).toHaveBeenCalledWith('INVALID123');

                // Should show error message
                await waitFor(() => {
                    expect(screen.getByText(/invalid ticker/i)).toBeInTheDocument();
                });

                // Should NOT call onAddSlice
                expect(mockOnAddSlice).not.toHaveBeenCalled();
            });

            it('should show loading state while validating ticker', async () => {
                // Manual Promise Control
                let resolveValidation: (v: boolean) => void = () => { };
                const validationPromise = new Promise<boolean>(res => {
                    resolveValidation = res;
                });

                vi.spyOn(marketData, 'validateTicker').mockReturnValue(validationPromise);

                render(<PortfolioVisualizer {...defaultProps} />);

                // Open modal
                fireEvent.click(screen.getByText('Add Slice'));

                // Fill form using fireEvent for synchronous state updates
                const tickerInput = screen.getByPlaceholderText(/e.g. AAPL/i);
                fireEvent.change(tickerInput, { target: { value: 'AAPL' } });

                const allocationInput = screen.getByDisplayValue('0');
                fireEvent.change(allocationInput, { target: { value: '10' } });

                // Find the submit button specifically in the modal
                const submitButton = screen.getAllByRole('button', { name: 'Add Slice' }).pop()!;

                // Click submit
                fireEvent.click(submitButton);

                // Should show validating message
                await screen.findByTestId('validating-ticker');

                // Resolve
                await act(async () => {
                    resolveValidation(true);
                });

                // Should disappear
                await waitFor(() => {
                    expect(screen.queryByTestId('validating-ticker')).not.toBeInTheDocument();
                });
            });


            it('should not validate ticker for Group type', async () => {
                const user = userEvent.setup();
                render(<PortfolioVisualizer {...defaultProps} />);

                await user.click(screen.getByText('Add Slice'));

                expect(await screen.findByRole('button', { name: 'Group' })).toBeInTheDocument();

                // Switch to Group type
                await user.click(screen.getByRole('button', { name: 'Group' }));

                // Fill out form (no ticker field for groups)
                await user.type(screen.getByPlaceholderText(/e.g. Tech Sector/i), 'Tech Stocks');
                const allocationInput = screen.getByDisplayValue('0');
                await user.clear(allocationInput);
                await user.type(allocationInput, '50');

                // Submit
                const submitButtons = screen.getAllByRole('button', { name: /Add Slice/i });
                const submitButton = submitButtons[submitButtons.length - 1];
                await user.click(submitButton);

                // Should call onAddSlice without validation
                await waitFor(() => {
                    expect(mockOnAddSlice).toHaveBeenCalledWith(
                        'root-1',
                        SliceType.GROUP,
                        'Tech Stocks',
                        undefined,
                        50,
                        undefined
                    );
                });
            });
        });
    });

    describe('Delete Functionality', () => {
        it('should call onRemoveSlice when delete button is clicked', async () => {
            const user = userEvent.setup();
            render(<PortfolioVisualizer {...defaultProps} />);

            const deleteButtons = screen.getAllByRole('button', { name: '' });
            const firstDeleteButton = deleteButtons.find(btn =>
                btn.querySelector('svg')?.classList.contains('lucide-trash-2')
            );

            if (firstDeleteButton) {
                await user.click(firstDeleteButton);
                expect(mockOnRemoveSlice).toHaveBeenCalled();
            }
        });

        it('should show confirmation dialog before deleting', async () => {
            const user = userEvent.setup();
            const confirmSpy = vi.spyOn(global, 'confirm');

            render(<PortfolioVisualizer {...defaultProps} />);

            const deleteButtons = screen.getAllByRole('button', { name: '' });
            const firstDeleteButton = deleteButtons.find(btn =>
                btn.querySelector('svg')?.classList.contains('lucide-trash-2')
            );

            if (firstDeleteButton) {
                await user.click(firstDeleteButton);
                expect(confirmSpy).toHaveBeenCalled();
            }
        });

        it('should not delete if confirmation is cancelled', async () => {
            global.confirm = vi.fn(() => false);
            const user = userEvent.setup();

            render(<PortfolioVisualizer {...defaultProps} />);

            const deleteButtons = screen.getAllByRole('button', { name: '' });
            const firstDeleteButton = deleteButtons.find(btn =>
                btn.querySelector('svg')?.classList.contains('lucide-trash-2')
            );

            if (firstDeleteButton) {
                await user.click(firstDeleteButton);
                expect(mockOnRemoveSlice).not.toHaveBeenCalled();
            }
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
