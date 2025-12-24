import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountSettingsModal } from '../../../components/AccountSettingsModal';
import { SliceType } from '../../../types';

describe('AccountSettingsModal', () => {
    const mockAccount = {
        id: 'acc-1',
        institutionId: 'inst-1',
        name: 'Test Account',
        type: 'Brokerage',
        totalValue: 10000,
        cashBalance: 1000,
                margin: 0,
        strategies: [
            {
                id: 'strat-1',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Growth Strategy',
                targetAllocation: 60,
                currentValue: 0,
                children: []
            },
            {
                id: 'strat-2',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Income Strategy',
                targetAllocation: 40,
                currentValue: 0,
                children: []
            }
        ]
    };

    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.confirm
        window.confirm = vi.fn(() => true);
    });

    it('should render with initial account values', () => {
        render(<AccountSettingsModal account={mockAccount} onSave={mockOnSave} onClose={mockOnClose} />);

        expect(screen.getByLabelText(/Account Name/i)).toHaveValue('Test Account');
        expect(screen.getByLabelText(/Total Value/i)).toHaveValue(10000);
        expect(screen.getByLabelText(/Cash Balance/i)).toHaveValue(1000);
        expect(screen.getByText('Growth Strategy')).toBeInTheDocument();
        expect(screen.getByText('Income Strategy')).toBeInTheDocument();
        expect(screen.getByText(/Total: 100%/i)).toBeInTheDocument();
    });

    it('should update local state when inputs change', () => {
        render(<AccountSettingsModal account={mockAccount} onSave={mockOnSave} onClose={mockOnClose} />);

        const nameInput = screen.getByLabelText(/Account Name/i);
        fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
        expect(nameInput).toHaveValue('Updated Name');

        const valueInput = screen.getByLabelText(/Total Value/i);
        fireEvent.change(valueInput, { target: { value: '20000' } });
        expect(valueInput).toHaveValue(20000);

        const cashInput = screen.getByLabelText(/Cash Balance/i);
        fireEvent.change(cashInput, { target: { value: '2000' } });
        expect(cashInput).toHaveValue(2000);
    });

    it('should update allocation and show validation status', () => {
        render(<AccountSettingsModal account={mockAccount} onSave={mockOnSave} onClose={mockOnClose} />);

        const allocationInputs = screen.getAllByRole('spinbutton');
        // Find the one for strat-1 (60%)
        const growthInput = allocationInputs.find(i => (i as HTMLInputElement).value === '60');

        if (!growthInput) throw new Error('Input not found');

        fireEvent.change(growthInput, { target: { value: '50' } });

        expect(screen.getByText(/Total: 90%/i)).toBeInTheDocument();
        expect(screen.getByText(/Must equal 100%/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();

        fireEvent.change(growthInput, { target: { value: '60' } });
        expect(screen.getByText(/Total: 100%/i)).toBeInTheDocument();
        expect(screen.getByText(/Valid/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Save Changes/i })).not.toBeDisabled();
    });

    it('should handle strategy deletion', () => {
        render(<AccountSettingsModal account={mockAccount} onSave={mockOnSave} onClose={mockOnClose} />);

        const deleteButtons = screen.getAllByTitle(/Delete Strategy/i);
        fireEvent.click(deleteButtons[0]);

        expect(window.confirm).toHaveBeenCalled();
        expect(screen.queryByText('Growth Strategy')).not.toBeInTheDocument();
        expect(screen.getByText(/Total: 40%/i)).toBeInTheDocument();
    });

    it('should not delete if user cancels confirmation', () => {
        window.confirm = vi.fn(() => false);
        render(<AccountSettingsModal account={mockAccount} onSave={mockOnSave} onClose={mockOnClose} />);

        const deleteButtons = screen.getAllByTitle(/Delete Strategy/i);
        fireEvent.click(deleteButtons[0]);

        expect(screen.getByText('Growth Strategy')).toBeInTheDocument();
    });

    it('should call onSave with updated data when valid', () => {
        render(<AccountSettingsModal account={mockAccount} onSave={mockOnSave} onClose={mockOnClose} />);

        fireEvent.change(screen.getByLabelText(/Account Name/i), { target: { value: 'New Account Name' } });
        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

        expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
            name: 'New Account Name',
            totalValue: 10000,
            cashBalance: 1000,
                margin: 0,
            strategies: mockAccount.strategies
        }));
    });

    it('should call onClose when cancel or close button is clicked', () => {
        render(<AccountSettingsModal account={mockAccount} onSave={mockOnSave} onClose={mockOnClose} />);

        fireEvent.click(screen.getByText('Cancel'));
        expect(mockOnClose).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByText('✕'));
        expect(mockOnClose).toHaveBeenCalledTimes(2);
    });

    it('should disable save if inputs are invalid (negative numbers)', () => {
        render(<AccountSettingsModal account={mockAccount} onSave={mockOnSave} onClose={mockOnClose} />);

        fireEvent.change(screen.getByLabelText(/Total Value/i), { target: { value: '-10' } });
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();

        fireEvent.change(screen.getByLabelText(/Total Value/i), { target: { value: '1000' } });
        fireEvent.change(screen.getByLabelText(/Cash Balance/i), { target: { value: '-5' } });
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
    });

    // NEW TESTS: Account without strategies (TDD for bug fix)
    describe('Account without strategies', () => {
        const emptyAccount = {
            id: 'acc-empty',
            institutionId: 'inst-1',
            name: 'Brokerage',
            type: 'Brokerage',
            totalValue: 0,
            cashBalance: 0,
                margin: 0,
            strategies: []
        };

        it('should enable save button when account has no strategies', () => {
            render(<AccountSettingsModal account={emptyAccount} onSave={mockOnSave} onClose={mockOnClose} />);

            const saveButton = screen.getByRole('button', { name: /Save Changes/i });
            expect(saveButton).not.toBeDisabled();
        });

        it('should allow renaming account without strategies', () => {
            render(<AccountSettingsModal account={emptyAccount} onSave={mockOnSave} onClose={mockOnClose} />);

            const nameInput = screen.getByLabelText(/Account Name/i);
            fireEvent.change(nameInput, { target: { value: 'Individual TOD' } });

            const saveButton = screen.getByRole('button', { name: /Save Changes/i });
            expect(saveButton).not.toBeDisabled();

            fireEvent.click(saveButton);

            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Individual TOD',
                strategies: []
            }));
        });

        it('should allow updating total value without strategies', () => {
            render(<AccountSettingsModal account={emptyAccount} onSave={mockOnSave} onClose={mockOnClose} />);

            fireEvent.change(screen.getByLabelText(/Total Value/i), { target: { value: '5000' } });
            fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                totalValue: 5000,
                strategies: []
            }));
        });

        it('should allow updating cash balance without strategies', () => {
            render(<AccountSettingsModal account={emptyAccount} onSave={mockOnSave} onClose={mockOnClose} />);

            fireEvent.change(screen.getByLabelText(/Cash Balance/i), { target: { value: '2500' } });
            fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

            expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
                cashBalance: 2500,
                margin: 0,
                strategies: []
            }));
        });

        it('should show "No strategies" message when empty', () => {
            render(<AccountSettingsModal account={emptyAccount} onSave={mockOnSave} onClose={mockOnClose} />);

            expect(screen.getByText(/No strategies found/i)).toBeInTheDocument();
            expect(screen.getByText(/Ask AI to create one/i)).toBeInTheDocument();
        });
    });
});
