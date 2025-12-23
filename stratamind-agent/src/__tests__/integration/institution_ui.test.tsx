import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../../App';
import * as authService from '../../../services/authService';
import { db } from '../../../services/database';

// Mock dependencies
vi.mock('../../../services/authService');
vi.mock('../../../services/database');
vi.mock('../../../services/geminiService');

describe('Institution UI Integration', () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test User' };

    // Setup initial data state
    const initialData = [
        {
            id: 'inst-1',
            name: 'Existing Bank',
            accounts: [
                {
                    id: 'acc-1',
                    name: 'Checking',
                    type: 'Checking',
                    strategies: [],
                    totalValue: 1000,
                    cashBalance: 1000
                }
            ]
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup Auth
        vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
        vi.spyOn(authService, 'getCurrentUser').mockReturnValue(mockUser);

        // Setup DB
        vi.spyOn(db, 'load').mockResolvedValue(initialData);
        vi.spyOn(db, 'getPerformanceHistory').mockResolvedValue([]);
        vi.spyOn(db, 'getPerformanceStats').mockResolvedValue({
            current: 0, dayChange: 0, dayChangePercent: 0,
            weekChange: 0, weekChangePercent: 0,
            monthChange: 0, monthChangePercent: 0,
            allTimeHigh: 0, allTimeLow: 0
        });
        vi.spyOn(db, 'recordPerformanceSnapshot').mockResolvedValue();
    });

    it('should allow adding a new institution via sidebar', async () => {
        // Mock creation response
        const newData = [
            ...initialData,
            { id: 'inst-new', name: 'New Fidelity', accounts: [] }
        ];
        vi.spyOn(db, 'createInstitution').mockResolvedValue(newData);

        render(<App />);

        // 1. Verify "Add Institution" button exists in Sidebar
        const addBtn = await screen.findByTestId('add-institution-button');
        expect(addBtn).toBeDefined();

        // 2. Click it
        fireEvent.click(addBtn);

        // 3. Verify Modal Appears
        const input = await screen.findByPlaceholderText('e.g. Fidelity');
        fireEvent.change(input, { target: { value: 'New Fidelity' } });

        // 4. Click Save/Submit (Look for Create button)
        const saveBtn = await screen.findByText('Create');
        fireEvent.click(saveBtn);

        // 5. Verify DB was called
        await waitFor(() => {
            expect(db.createInstitution).toHaveBeenCalledWith('New Fidelity');
        });

        // 6. Verify UI updates
        expect(await screen.findByText('New Fidelity')).toBeDefined();
    });

    it('should allow adding an account to an institution', async () => {
        // Setup: Select 'inst-1' (default active)
        // Mock createAccount
        const accountAddedData = [{
            ...initialData[0],
            accounts: [
                ...initialData[0].accounts,
                {
                    id: 'acc-new',
                    name: 'New Savings',
                    type: 'Brokerage',
                    strategies: [],
                    totalValue: 0,
                    cashBalance: 0
                }
            ]
        }];
        vi.spyOn(db, 'createAccount').mockResolvedValue(accountAddedData);

        render(<App />);

        // Wait for load
        await screen.findByText('Existing Bank');

        // Find "Add Account" button under the institution
        const addAccBtn = await screen.findByTestId('add-account-button');
        fireEvent.click(addAccBtn);

        // Input appears
        const input = await screen.findByPlaceholderText('e.g. Roth IRA');
        fireEvent.change(input, { target: { value: 'New Savings' } });

        // Submit
        const saveBtn = await screen.findByText('Create');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(db.createAccount).toHaveBeenCalledWith('inst-1', 'New Savings', 'Brokerage');
        });

        expect(await screen.findByText('New Savings')).toBeDefined();
    });
});
