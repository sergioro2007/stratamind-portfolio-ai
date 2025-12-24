import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountSettingsModal } from '../../../components/AccountSettingsModal';
import { SliceType } from '../../../types';

describe('AccountSettingsModal Bug Reproduction', () => {
    const mockAccount = {
        id: 'acc-bug',
        institutionId: 'inst-1',
        name: 'My Account',
        type: 'Brokerage',
        totalValue: 50000,
        cashBalance: 500,
        margin: 0,
        strategies: [
            {
                id: 's1',
                parentId: null,
                type: SliceType.HOLDING,
                name: 'AAPL',
                targetAllocation: 100,
                currentValue: 50000,
                children: []
            }
        ]
    };

    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    it('should enable save button when changing total value on a valid account', () => {
        render(<AccountSettingsModal account={mockAccount} onSave={mockOnSave} onClose={mockOnClose} />);

        // 1. Verify initial state is valid
        // Strategy total is 100%, so it should be valid initially? 
        // Wait, the component initializes state from props.

        // Check if Save is enabled initially (it should be, or disabled if no changes? Code doesn't check dirty state)
        // The code currently DOES NOT check for changes (dirty), only validity.
        // So it should be enabled immediately if data is valid.

        const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
        expect(saveBtn).not.toBeDisabled();

        // 2. Change Total Value
        const valueInput = screen.getByLabelText(/Total Value/i);
        fireEvent.change(valueInput, { target: { value: '60000' } });

        // 3. Verify Save is still enabled
        expect(saveBtn).not.toBeDisabled();

        // 4. Click Save
        fireEvent.click(saveBtn);

        // 5. Verify onSave called with new value
        expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
            totalValue: 60000,
            strategies: mockAccount.strategies
        }));
    });

    it('should debug why verification might fail', () => {
        // Maybe floating point issues with allocation?
        const floatingAccount = {
            ...mockAccount,
            strategies: [
                { id: 's1', type: SliceType.HOLDING, name: 'A', targetAllocation: 33.3333333, children: [] } as any,
                { id: 's2', type: SliceType.HOLDING, name: 'B', targetAllocation: 33.3333333, children: [] } as any,
                { id: 's3', type: SliceType.HOLDING, name: 'C', targetAllocation: 33.3333333, children: [] } as any, // Sums to 99.9999999
            ]
        };

        render(<AccountSettingsModal account={floatingAccount} onSave={mockOnSave} onClose={mockOnClose} />);

        // In this case, it should be INVALID and disabled?
        // validation logic: strategies.reduce((sum, s) => sum + (s.targetAllocation || 0), 0);
        // isValid = totalAllocation === 100;

        // If it sums to 99.9999999, it is NOT 100.
        // This might be the issue if the user has split allocations.

        const saveBtn = screen.getByRole('button', { name: /Save Changes/i });

        // Fix Requirement: This SHOULD be valid now (epsilon check)
        expect(saveBtn).not.toBeDisabled();
        expect(screen.getByText(/Valid/i)).toBeInTheDocument();
    });

    it('should be valid with slightly over 100% (floating point artifact)', () => {
        const floatingAccount = {
            ...mockAccount,
            strategies: [
                { id: 's1', type: SliceType.HOLDING, name: 'A', targetAllocation: 100.0000001, children: [] } as any
            ]
        };

        render(<AccountSettingsModal account={floatingAccount} onSave={mockOnSave} onClose={mockOnClose} />);

        const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
        expect(saveBtn).not.toBeDisabled();
        expect(screen.getByText(/Valid/i)).toBeInTheDocument();
    });
});
