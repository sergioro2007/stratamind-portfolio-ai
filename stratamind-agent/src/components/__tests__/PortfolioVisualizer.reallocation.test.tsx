import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PortfolioVisualizer from '../../../components/PortfolioVisualizer';
import { PortfolioSlice, SliceType } from '../../../types';
import * as marketData from '../../../services/marketData';

// Mock market data
vi.mock('../../../services/marketData', () => ({
    searchSymbols: vi.fn(() => Promise.resolve([])),
    validateTicker: vi.fn(() => Promise.resolve(true)),
    fetchStockPrice: vi.fn(() => Promise.resolve(100)),
    clearCache: vi.fn()
}));

// Mock Recharts
vi.mock('recharts', () => ({
    PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
    Cell: () => <div data-testid="cell" />,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
}));

/**
 * TDD Tests for Flexible Allocation Feature
 * 
 * These tests define the DESIRED behavior and should FAIL initially.
 * We'll implement the feature to make them pass.
 */
describe('PortfolioVisualizer - Flexible Allocation (TDD)', () => {
    const mockOnAddSlice = vi.fn();
    const mockOnUpdateSlices = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('RED Phase: Reallocation Warning UI', () => {
        it('should show warning when new allocation would exceed 100%', async () => {
            const user = userEvent.setup();

            // Portfolio at 90% allocation
            const rootSlice: PortfolioSlice = {
                id: 'root-1',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Portfolio',
                targetAllocation: 100,
                currentValue: 10000,
                children: [
                    {
                        id: 'child-1',
                        parentId: 'root-1',
                        type: SliceType.HOLDING,
                        name: 'AAPL',
                        symbol: 'AAPL',
                        targetAllocation: 90,
                        currentValue: 9000
                    }
                ]
            };

            render(
                <PortfolioVisualizer
                    rootSlice={rootSlice}
                    totalValue={10000}
                    onAddSlice={mockOnAddSlice}
                    onUpdateSlices={mockOnUpdateSlices}
                />
            );

            await user.click(screen.getByText('Manage'));
            const modal = await screen.findByTestId('manage-slices-modal');

            // Open Add Form in Manage Modal
            await user.click(within(modal).getByText('Add Slice'));

            await user.click(within(modal).getByRole('button', { name: 'Group' }));

            const nameInput = await screen.findByTestId('new-slice-name-input');
            const allocationInput = await screen.findByTestId('new-slice-allocation-input');

            await user.type(nameInput, 'New Group');
            await user.clear(allocationInput);
            await user.type(allocationInput, '20'); // Would make total 110%

            // EXPECTED: Warning message should appear
            expect(await screen.findByText(/exceeds 100%/i)).toBeInTheDocument();
            expect(await screen.findByText(/10%/)).toBeInTheDocument(); // Shows overage amount
        });

        it('should show proportional rebalance button when over 100%', async () => {
            const user = userEvent.setup();

            const rootSlice: PortfolioSlice = {
                id: 'root-1',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Portfolio',
                targetAllocation: 100,
                currentValue: 10000,
                children: [
                    {
                        id: 'child-1',
                        parentId: 'root-1',
                        type: SliceType.HOLDING,
                        name: 'AAPL',
                        symbol: 'AAPL',
                        targetAllocation: 60,
                        currentValue: 6000
                    },
                    {
                        id: 'child-2',
                        parentId: 'root-1',
                        type: SliceType.HOLDING,
                        name: 'MSFT',
                        symbol: 'MSFT',
                        targetAllocation: 40,
                        currentValue: 4000
                    }
                ]
            };

            render(
                <PortfolioVisualizer
                    rootSlice={rootSlice}
                    totalValue={10000}
                    onAddSlice={mockOnAddSlice}
                    onUpdateSlices={mockOnUpdateSlices}
                />
            );

            await user.click(screen.getByText('Manage'));
            const modal = await screen.findByTestId('manage-slices-modal');

            // Open Add Form in Manage Modal
            await user.click(within(modal).getByText('Add Slice'));

            await user.click(within(modal).getByRole('button', { name: 'Group' }));

            const nameInput = await screen.findByTestId('new-slice-name-input');
            const allocationInput = await screen.findByTestId('new-slice-allocation-input');

            await user.type(nameInput, 'New Group');
            await user.clear(allocationInput);
            await user.type(allocationInput, '25'); // Would make total 125%

            // EXPECTED: Rebalance button should appear
            expect(await screen.findByRole('button', { name: /rebalance/i })).toBeInTheDocument();
        });

        it('should calculate proportional rebalance correctly', async () => {
            const user = userEvent.setup();

            const rootSlice: PortfolioSlice = {
                id: 'root-1',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Portfolio',
                targetAllocation: 100,
                currentValue: 10000,
                children: [
                    {
                        id: 'child-1',
                        parentId: 'root-1',
                        type: SliceType.HOLDING,
                        name: 'AAPL',
                        symbol: 'AAPL',
                        targetAllocation: 60,
                        currentValue: 6000
                    },
                    {
                        id: 'child-2',
                        parentId: 'root-1',
                        type: SliceType.HOLDING,
                        name: 'MSFT',
                        symbol: 'MSFT',
                        targetAllocation: 40,
                        currentValue: 4000
                    }
                ]
            };

            render(
                <PortfolioVisualizer
                    rootSlice={rootSlice}
                    totalValue={10000}
                    onAddSlice={mockOnAddSlice}
                    onUpdateSlices={mockOnUpdateSlices}
                />
            );

            await user.click(screen.getByText('Manage'));
            const modal = await screen.findByTestId('manage-slices-modal');

            // Open Add Form in Manage Modal
            await user.click(within(modal).getByText('Add Slice'));

            await user.click(within(modal).getByRole('button', { name: 'Group' }));

            const nameInput = await screen.findByTestId('new-slice-name-input');
            const allocationInput = await screen.findByTestId('new-slice-allocation-input');

            await user.type(nameInput, 'New Group');
            await user.clear(allocationInput);
            await user.type(allocationInput, '20'); // Want 20% for new, leaving 80% for existing

            // Click rebalance button
            const rebalanceBtn = await screen.findByRole('button', { name: /rebalance/i });
            await user.click(rebalanceBtn);

            // EXPECTED: Should show preview of new allocations
            // AAPL: 60% → 48% (60% of 80%)
            // MSFT: 40% → 32% (40% of 80%)
            expect(await screen.findByText(/48%/)).toBeInTheDocument(); // AAPL new allocation
            expect(await screen.findByText(/32%/)).toBeInTheDocument(); // MSFT new allocation
        });

        it('should submit with rebalanced allocations when confirmed', async () => {
            const user = userEvent.setup();

            const rootSlice: PortfolioSlice = {
                id: 'root-1',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Portfolio',
                targetAllocation: 100,
                currentValue: 10000,
                children: [
                    {
                        id: 'child-1',
                        parentId: 'root-1',
                        type: SliceType.HOLDING,
                        name: 'AAPL',
                        symbol: 'AAPL',
                        targetAllocation: 60,
                        currentValue: 6000
                    },
                    {
                        id: 'child-2',
                        parentId: 'root-1',
                        type: SliceType.HOLDING,
                        name: 'MSFT',
                        symbol: 'MSFT',
                        targetAllocation: 40,
                        currentValue: 4000
                    }
                ]
            };

            render(
                <PortfolioVisualizer
                    rootSlice={rootSlice}
                    totalValue={10000}
                    onAddSlice={mockOnAddSlice}
                    onUpdateSlices={mockOnUpdateSlices}
                />
            );

            await user.click(screen.getByText('Manage'));
            const modal = await screen.findByTestId('manage-slices-modal');

            // Open Add Form in Manage Modal
            await user.click(within(modal).getByText('Add Slice'));

            await user.click(within(modal).getByRole('button', { name: 'Group' }));

            const nameInput = await screen.findByTestId('new-slice-name-input');
            const allocationInput = await screen.findByTestId('new-slice-allocation-input');

            await user.type(nameInput, 'New Group');
            await user.clear(allocationInput);
            await user.type(allocationInput, '20');

            // Click rebalance
            const rebalanceBtn = await screen.findByRole('button', { name: /rebalance/i });
            await user.click(rebalanceBtn);

            // Confirm Add Slice
            const addConfirmBtn = await screen.findByRole('button', { name: /Add Slice/i });
            await user.click(addConfirmBtn);

            // Submit (Save Changes in Manage Modal)
            const saveBtn = await screen.findByText('Save Changes');
            await user.click(saveBtn);

            // EXPECTED: onUpdateSlices called with updated array
            await waitFor(() => {
                expect(mockOnUpdateSlices).toHaveBeenCalledWith(
                    'root-1',
                    'Portfolio', // Name passed from currentSlice
                    expect.arrayContaining([
                        expect.objectContaining({ id: 'child-1', targetAllocation: 48 }),
                        expect.objectContaining({ id: 'child-2', targetAllocation: 32 }),
                        // New slice should be here too (we don't know its generated ID easily, but we can check properties)
                        expect.objectContaining({ name: 'New Group', targetAllocation: 20 })
                    ])
                );
            });
        });

        it('should not show warning when allocation is within 100%', async () => {
            const user = userEvent.setup();

            const rootSlice: PortfolioSlice = {
                id: 'root-1',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Portfolio',
                targetAllocation: 100,
                currentValue: 10000,
                children: [
                    {
                        id: 'child-1',
                        parentId: 'root-1',
                        type: SliceType.HOLDING,
                        name: 'AAPL',
                        symbol: 'AAPL',
                        targetAllocation: 50,
                        currentValue: 5000
                    }
                ]
            };

            render(
                <PortfolioVisualizer
                    rootSlice={rootSlice}
                    totalValue={10000}
                    onAddSlice={mockOnAddSlice}
                    onUpdateSlices={mockOnUpdateSlices}
                />
            );

            await user.click(screen.getByText('Manage'));
            const modal = await screen.findByTestId('manage-slices-modal');

            // Open Add Form in Manage Modal
            await user.click(within(modal).getByText('Add Slice'));

            await user.click(within(modal).getByRole('button', { name: 'Group' }));

            const nameInput = await screen.findByTestId('new-slice-name-input');
            const allocationInput = await screen.findByTestId('new-slice-allocation-input');

            await user.type(nameInput, 'New Group');
            await user.clear(allocationInput);
            await user.type(allocationInput, '30'); // Total would be 80%, OK

            // EXPECTED: No warning message
            expect(screen.queryByText(/exceeds 100%/i)).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /rebalance/i })).not.toBeInTheDocument();
        });
    });
});
