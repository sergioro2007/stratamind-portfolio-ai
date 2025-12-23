import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageSlicesModal } from '../../../components/ManageSlicesModal';
import { PortfolioSlice, SliceType } from '../../../types';
import * as marketData from '../../../services/marketData';

// Mock marketData module
vi.mock('../../../services/marketData', () => ({
    searchSymbols: vi.fn(),
    validateTicker: vi.fn(),
    fetchStockPrice: vi.fn(),
    clearCache: vi.fn()
}));

describe('ManageSlicesModal - Save and Delete Operations', () => {
    const mockCurrentSlice: PortfolioSlice = {
        id: 'portfolio-1',
        name: 'My Portfolio',
        type: SliceType.GROUP,
        targetAllocation: 100,
        currentValue: 10000,
        parentId: null,
        children: []
    };

    const mockSlices: PortfolioSlice[] = [
        {
            id: 'slice-1',
            name: 'Tech Stocks',
            type: SliceType.GROUP,
            targetAllocation: 60,
            currentValue: 6000,
            parentId: 'portfolio-1',
            children: []
        },
        {
            id: 'slice-2',
            name: 'Apple Inc',
            type: SliceType.HOLDING,
            symbol: 'AAPL',
            targetAllocation: 40,
            currentValue: 4000,
            parentId: 'portfolio-1',
            children: []
        }
    ];

    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(marketData.searchSymbols).mockResolvedValue([]);
    });

    describe('Save Changes to Account', () => {
        it('should save all changes to account when Save Changes is clicked', () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                />
            );

            // Edit portfolio name
            const portfolioNameInput = screen.getByDisplayValue('My Portfolio');
            fireEvent.change(portfolioNameInput, { target: { value: 'Updated Portfolio Name' } });

            // Edit first slice name
            const techNameInput = screen.getByDisplayValue('Tech Stocks');
            fireEvent.change(techNameInput, { target: { value: 'Technology Sector' } });

            // Edit first slice allocation
            const techAllocationInputs = screen.getAllByDisplayValue('60');
            fireEvent.change(techAllocationInputs[0], { target: { value: '50' } });

            // Edit second slice allocation to maintain 100%
            const aaplAllocationInputs = screen.getAllByDisplayValue('40');
            fireEvent.change(aaplAllocationInputs[0], { target: { value: '50' } });

            // Click Save Changes
            const saveButton = screen.getByText('Save Changes');
            fireEvent.click(saveButton);

            // Verify onSave was called with updated data
            expect(mockOnSave).toHaveBeenCalledTimes(1);
            expect(mockOnSave).toHaveBeenCalledWith(
                'Updated Portfolio Name', // Updated portfolio name
                expect.arrayContaining([
                    expect.objectContaining({
                        id: 'slice-1',
                        name: 'Technology Sector',
                        targetAllocation: 50
                    }),
                    expect.objectContaining({
                        id: 'slice-2',
                        name: 'Apple Inc',
                        targetAllocation: 50
                    })
                ])
            );
        });

        it('should save newly added slices along with edited slices', async () => {
            vi.mocked(marketData.searchSymbols).mockResolvedValue([
                { symbol: 'MSFT', name: 'Microsoft Corp' }
            ]);

            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                />
            );

            // Adjust existing allocations first to make room
            // Find Tech Stocks row and change its allocation
            const techRow = screen.getByDisplayValue('Tech Stocks').closest('div[class*="p-4"]');
            const techAllocationInput = within(techRow as HTMLElement).getByDisplayValue('60');
            fireEvent.change(techAllocationInput, { target: { value: '30' } });

            // Find Apple Inc row and change its allocation  
            // After changing Tech to 30, total is 70% (30+40), so we need Microsoft to be 30% for 100%

            // Add a new holding
            fireEvent.click(screen.getByText('Add Slice'));

            await waitFor(() => {
                expect(screen.getByText('Add New Slice')).toBeInTheDocument();
            });

            // Holding is now default, so just search
            const searchInput = await screen.findByPlaceholderText('Search by ticker or company name...');
            fireEvent.change(searchInput, { target: { value: 'MSFT' } });

            await waitFor(() => {
                expect(screen.getByText('Microsoft Corp')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText('Microsoft Corp'));

            const allocationInput = await screen.findByPlaceholderText(/Allocation %/i);
            fireEvent.change(allocationInput, { target: { value: '30' } });

            const addButtons = screen.getAllByRole('button', { name: 'Add Slice' });
            fireEvent.click(addButtons[addButtons.length - 1]);

            // Wait for new slice to appear
            await waitFor(() => {
                expect(screen.getByDisplayValue('Microsoft Corp')).toBeInTheDocument();
            });

            // Now save everything
            const saveButton = screen.getByText('Save Changes');
            fireEvent.click(saveButton);

            // Verify onSave was called with all slices including new one
            expect(mockOnSave).toHaveBeenCalledWith(
                'My Portfolio',
                expect.arrayContaining([
                    expect.objectContaining({ name: 'Tech Stocks', targetAllocation: 30 }),
                    expect.objectContaining({ name: 'Apple Inc', targetAllocation: 40 }),
                    expect.objectContaining({ name: 'Microsoft Corp', symbol: 'MSFT', targetAllocation: 30 })
                ])
            );

            // Should have 3 slices total
            const call = mockOnSave.mock.calls[0];
            expect(call[1]).toHaveLength(3);
        });
    });

    describe('Delete Holdings', () => {
        it('should delete a holding and save changes when confirmed', () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                />
            );

            // Find and click delete button for AAPL (second slice)
            const deleteButtons = screen.getAllByTitle(/Delete Slice/i);
            expect(deleteButtons).toHaveLength(2);

            fireEvent.click(deleteButtons[1]); // Delete AAPL

            // AAPL should be removed from the table
            expect(screen.queryByText('Apple Inc')).not.toBeInTheDocument();
            expect(screen.queryByText('AAPL')).not.toBeInTheDocument();

            // Tech Stocks should still be there
            expect(screen.getByDisplayValue('Tech Stocks')).toBeInTheDocument();

            // Adjust remaining slice to 100%
            const techAllocationInputs = screen.getAllByDisplayValue('60');
            fireEvent.change(techAllocationInputs[0], { target: { value: '100' } });

            // Click Save Changes
            const saveButton = screen.getByText('Save Changes');
            fireEvent.click(saveButton);

            // Verify onSave was called with only the remaining slice
            expect(mockOnSave).toHaveBeenCalledWith(
                'My Portfolio',
                expect.arrayContaining([
                    expect.objectContaining({
                        id: 'slice-1',
                        name: 'Tech Stocks',
                        targetAllocation: 100
                    })
                ])
            );

            // Should only have 1 slice
            const call = mockOnSave.mock.calls[0];
            expect(call[1]).toHaveLength(1);
            expect(call[1].find((s: PortfolioSlice) => s.id === 'slice-2')).toBeUndefined();
        });



        it('should be able to delete multiple holdings in one session', () => {
            const manySlices: PortfolioSlice[] = [
                {
                    id: 'slice-1',
                    name: 'AAPL',
                    type: SliceType.HOLDING,
                    symbol: 'AAPL',
                    targetAllocation: 25,
                    currentValue: 2500,
                    parentId: 'portfolio-1',
                    children: []
                },
                {
                    id: 'slice-2',
                    name: 'MSFT',
                    type: SliceType.HOLDING,
                    symbol: 'MSFT',
                    targetAllocation: 25,
                    currentValue: 2500,
                    parentId: 'portfolio-1',
                    children: []
                },
                {
                    id: 'slice-3',
                    name: 'GOOGL',
                    type: SliceType.HOLDING,
                    symbol: 'GOOGL',
                    targetAllocation: 25,
                    currentValue: 2500,
                    parentId: 'portfolio-1',
                    children: []
                },
                {
                    id: 'slice-4',
                    name: 'AMZN',
                    type: SliceType.HOLDING,
                    symbol: 'AMZN',
                    targetAllocation: 25,
                    currentValue: 2500,
                    parentId: 'portfolio-1',
                    children: []
                }
            ];

            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={manySlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                />
            );

            // Initially 4 slices
            expect(screen.getByText('AAPL')).toBeInTheDocument();
            expect(screen.getByText('MSFT')).toBeInTheDocument();
            expect(screen.getByText('GOOGL')).toBeInTheDocument();
            expect(screen.getByText('AMZN')).toBeInTheDocument();

            // Delete MSFT
            let deleteButtons = screen.getAllByTitle(/Delete Slice/i);
            fireEvent.click(deleteButtons[1]);
            expect(screen.queryByText('MSFT')).not.toBeInTheDocument();

            // Delete GOOGL
            deleteButtons = screen.getAllByTitle(/Delete Slice/i);
            fireEvent.click(deleteButtons[1]); // Now second button is GOOGL
            expect(screen.queryByText('GOOGL')).not.toBeInTheDocument();

            // Only AAPL and AMZN should remain
            expect(screen.getByText('AAPL')).toBeInTheDocument();
            expect(screen.getByText('AMZN')).toBeInTheDocument();

            // Adjust allocations to 50% each
            const allocationInputs = screen.getAllByDisplayValue('25');
            fireEvent.change(allocationInputs[0], { target: { value: '50' } });
            fireEvent.change(allocationInputs[1], { target: { value: '50' } });

            // Save
            const saveButton = screen.getByText('Save Changes');
            fireEvent.click(saveButton);

            // Verify only 2 slices saved
            expect(mockOnSave).toHaveBeenCalled();
            const call = mockOnSave.mock.calls[0];
            expect(call[1]).toHaveLength(2);
            expect(call[1].find((s: PortfolioSlice) => s.symbol === 'AAPL')).toBeDefined();
            expect(call[1].find((s: PortfolioSlice) => s.symbol === 'AMZN')).toBeDefined();
            expect(call[1].find((s: PortfolioSlice) => s.symbol === 'MSFT')).toBeUndefined();
            expect(call[1].find((s: PortfolioSlice) => s.symbol === 'GOOGL')).toBeUndefined();
        });
    });

    describe('Default Slice Type', () => {
        it('should default to Holding type when Add Slice is clicked', async () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                />
            );

            // Click Add Slice
            fireEvent.click(screen.getByText('Add Slice'));

            await waitFor(() => {
                expect(screen.getByText('Add New Slice')).toBeInTheDocument();
            });

            // TickerSearch should be visible (indicates Holding is selected)
            expect(screen.getByPlaceholderText('Search by ticker or company name...')).toBeInTheDocument();

            // Group name input should NOT be visible
            expect(screen.queryByPlaceholderText(/Group name/i)).not.toBeInTheDocument();

            // Holding button should be selected
            const holdingButton = screen.getByRole('button', { name: 'Holding' });
            expect(holdingButton).toHaveClass('bg-indigo-600'); // Selected state
        });
    });
});
