import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('ManageSlicesModal', () => {
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
            name: 'AAPL',
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
    const mockOnAddSlice = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(marketData.searchSymbols).mockResolvedValue([]);
    });

    describe('Rendering', () => {
        it('should render modal with portfolio name and slice table', () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                />
            );

            expect(screen.getByText('Manage Portfolio')).toBeInTheDocument();
            expect(screen.getByDisplayValue('My Portfolio')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Tech Stocks')).toBeInTheDocument();
            expect(screen.getByText('AAPL')).toBeInTheDocument();
        });

        it('should show total allocation badge', () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                />
            );

            expect(screen.getByText(/Total: 100%/)).toBeInTheDocument();
            expect(screen.getByText(/Valid/)).toBeInTheDocument();
        });

        it('should show empty state when no slices', () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={[]}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                />
            );

            expect(screen.getByText(/No slices yet/i)).toBeInTheDocument();
        });
    });

    describe('Portfolio Name Editing', () => {
        it('should allow editing portfolio name', () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                />
            );

            const nameInput = screen.getByDisplayValue('My Portfolio');
            fireEvent.change(nameInput, { target: { value: 'Updated Portfolio' } });

            expect(screen.getByDisplayValue('Updated Portfolio')).toBeInTheDocument();
        });

        it('should disable save when portfolio name is empty', () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                />
            );

            const nameInput = screen.getByDisplayValue('My Portfolio');
            fireEvent.change(nameInput, { target: { value: '' } });

            const saveButton = screen.getByText('Save Changes');
            expect(saveButton).toBeDisabled();
        });
    });

    describe('Slice Editing', () => {
        it('should allow editing slice name', () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                />
            );

            const nameInputs = screen.getAllByDisplayValue('Tech Stocks');
            fireEvent.change(nameInputs[0], { target: { value: 'Technology Sector' } });

            expect(screen.getByDisplayValue('Technology Sector')).toBeInTheDocument();
        });

        it('should allow editing slice allocation', () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                />
            );

            const allocationInputs = screen.getAllByDisplayValue('60');
            fireEvent.change(allocationInputs[0], { target: { value: '70' } });

            expect(screen.getByText(/Total: 110%/)).toBeInTheDocument();
            expect(screen.getByText(/Must equal 100%/)).toBeInTheDocument();
        });

        it('should disable save button when allocation is invalid', () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                />
            );

            const allocationInputs = screen.getAllByDisplayValue('60');
            fireEvent.change(allocationInputs[0], { target: { value: '70' } });

            const saveButton = screen.getByText('Save Changes');
            expect(saveButton).toBeDisabled();
        });
    });

    describe('Slice Deletion', () => {
        it('should handle slice deletion', () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                />
            );

            const deleteButtons = screen.getAllByTitle(/Delete Slice/i);
            fireEvent.click(deleteButtons[0]);

            expect(screen.queryByDisplayValue('Tech Stocks')).not.toBeInTheDocument();
            expect(screen.getByDisplayValue('AAPL')).toBeInTheDocument();
        });


    });

    describe('Add Slice Functionality', () => {
        it('should show add slice button for group slices', () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                    onAddSlice={mockOnAddSlice}
                />
            );

            expect(screen.getByText('Add Slice')).toBeInTheDocument();
        });

        it('should not show add slice button for holding slices', () => {
            const holdingSlice: PortfolioSlice = {
                ...mockCurrentSlice,
                type: SliceType.HOLDING,
                symbol: 'AAPL'
            };

            render(
                <ManageSlicesModal
                    currentSlice={holdingSlice}
                    slices={[]}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                    onAddSlice={mockOnAddSlice}
                />
            );

            expect(screen.queryByText('Add Slice')).not.toBeInTheDocument();
        });

        it('should show add form when add slice button clicked', () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                    onAddSlice={mockOnAddSlice}
                />
            );

            fireEvent.click(screen.getByText('Add Slice'));
            expect(screen.getByText('Add New Slice')).toBeInTheDocument();
        });

        it('should allow adding a group slice', async () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                    onAddSlice={mockOnAddSlice}
                />
            );

            // Click add slice button
            fireEvent.click(screen.getByText('Add Slice'));

            // Select Group type
            const groupButton = screen.getByRole('button', { name: 'Group' });
            fireEvent.click(groupButton);

            // Fill in name and allocation
            const nameInput = screen.getByPlaceholderText(/Group name/i);
            fireEvent.change(nameInput, { target: { value: 'Energy' } });

            const allocationInput = screen.getByPlaceholderText(/Allocation %/i);
            fireEvent.change(allocationInput, { target: { value: '25' } });

            // Click add button
            const addButtons = screen.getAllByRole('button', { name: 'Add Slice' });
            const submitButton = addButtons[addButtons.length - 1]; // Last one is in form
            fireEvent.click(submitButton);

            // Slice should be added to local state and visible in table
            await waitFor(() => {
                expect(screen.getByDisplayValue('Energy')).toBeInTheDocument();
            });

            // onAddSlice should NOT be called - it's only local state until Save
            expect(mockOnAddSlice).not.toHaveBeenCalled();
        });

        it('should allow adding a holding slice with ticker search', async () => {
            vi.mocked(marketData.searchSymbols).mockResolvedValue([
                { symbol: 'TSLA', name: 'Tesla Inc' }
            ]);

            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                    onAddSlice={mockOnAddSlice}
                />
            );

            // Click add slice button
            fireEvent.click(screen.getByText('Add Slice'));

            // Wait for form to appear
            await waitFor(() => {
                expect(screen.getByText('Add New Slice')).toBeInTheDocument();
            });

            // Switch to Holding type (default is Group)
            const holdingButton = screen.getByRole('button', { name: 'Holding' });
            fireEvent.click(holdingButton);

            // Now search for ticker (TickerSearch is shown for Holding type)
            const searchInput = await screen.findByPlaceholderText('Search by ticker or company name...');
            fireEvent.change(searchInput, { target: { value: 'TSLA' } });

            // Wait for search results
            await waitFor(() => {
                expect(screen.getByText('Tesla Inc')).toBeInTheDocument();
            });

            // Select result
            fireEvent.click(screen.getByText('Tesla Inc'));

            // Fill in allocation
            const allocationInput = await screen.findByPlaceholderText(/Allocation %/i);
            fireEvent.change(allocationInput, { target: { value: '15' } });

            // Submit
            const addButtons = screen.getAllByRole('button', { name: 'Add Slice' });
            const submitButton = addButtons[addButtons.length - 1];
            fireEvent.click(submitButton);

            // Slice should be added to local state and visible in table
            await waitFor(() => {
                expect(screen.getByDisplayValue('Tesla Inc')).toBeInTheDocument();
            });

            // onAddSlice should NOT be called - it's only local state until Save
            expect(mockOnAddSlice).not.toHaveBeenCalled();
        });

        it('should add slice to local state immediately without calling onAddSlice until save', async () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                    onAddSlice={mockOnAddSlice}
                />
            );

            // Initially showing 2 slices
            expect(screen.getByDisplayValue('Tech Stocks')).toBeInTheDocument();
            expect(screen.getByText('AAPL')).toBeInTheDocument();

            // Click add slice button
            fireEvent.click(screen.getByText('Add Slice'));

            // Wait for form to appear
            await waitFor(() => {
                expect(screen.getByText('Add New Slice')).toBeInTheDocument();
            });

            // Add a group slice
            const groupButton = screen.getByRole('button', { name: 'Group' });
            fireEvent.click(groupButton);

            const nameInput = await screen.findByPlaceholderText(/Group name/i);
            fireEvent.change(nameInput, { target: { value: 'Healthcare' } });

            const allocationInput = screen.getByPlaceholderText(/Allocation %/i);
            fireEvent.change(allocationInput, { target: { value: '20' } });

            // Submit the add form
            const addButtons = screen.getAllByRole('button', { name: 'Add Slice' });
            const submitButton = addButtons[addButtons.length - 1];
            fireEvent.click(submitButton);

            // The slice should appear in the modal's table (local state)
            await waitFor(() => {
                expect(screen.getByDisplayValue('Healthcare')).toBeInTheDocument();
            });

            // Now we have 3 slices showing (2 original + 1 new)
            expect(screen.getByDisplayValue('Tech Stocks')).toBeInTheDocument();
            expect(screen.getByText('AAPL')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Healthcare')).toBeInTheDocument();

            // But total is now 120% (60+40+20), so we need to adjust to make it valid
            // Change Tech Stocks from 60 to 50 to make total 100%
            const techAllocationInputs = screen.getAllByDisplayValue('60');
            fireEvent.change(techAllocationInputs[0], { target: { value: '50' } });

            // Wait for validation
            await waitFor(() => {
                expect(screen.getByText(/Total: 110%/)).toBeInTheDocument();
            });

            // Change AAPL from 40 to 30 to make total 100%
            const aaplAllocationInputs = screen.getAllByDisplayValue('40');
            fireEvent.change(aaplAllocationInputs[0], { target: { value: '30' } });

            // Now total should be 100% (50+30+20)
            await waitFor(() => {
                expect(screen.getByText(/Total: 100%/)).toBeInTheDocument();
                expect(screen.getByText(/Valid/)).toBeInTheDocument();
            });

            // onSave should still NOT have been called yet
            expect(mockOnSave).not.toHaveBeenCalled();

            // Now click Save Changes
            const saveButton = screen.getByText('Save Changes');
            fireEvent.click(saveButton);

            // NOW onSave should be called with all slices including the new one
            expect(mockOnSave).toHaveBeenCalled();
        });
    });

    describe('Save and Cancel', () => {
        it('should call onSave with updated slice name and slices', () => {
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
            fireEvent.change(portfolioNameInput, { target: { value: 'Updated Name' } });

            // Edit slice name
            const sliceNameInputs = screen.getAllByDisplayValue('Tech Stocks');
            fireEvent.change(sliceNameInputs[0], { target: { value: 'Technology' } });

            const saveButton = screen.getByText('Save Changes');
            fireEvent.click(saveButton);

            expect(mockOnSave).toHaveBeenCalledWith(
                'Updated Name',
                expect.arrayContaining([
                    expect.objectContaining({ id: 'slice-1', name: 'Technology' })
                ])
            );
        });

        it('should call onClose when cancel is clicked', () => {
            render(
                <ManageSlicesModal
                    currentSlice={mockCurrentSlice}
                    slices={mockSlices}
                    onSave={mockOnSave}
                    onClose={mockOnClose}
                    totalValue={10000}
                />
            );

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            expect(mockOnClose).toHaveBeenCalled();
        });
    });
});
