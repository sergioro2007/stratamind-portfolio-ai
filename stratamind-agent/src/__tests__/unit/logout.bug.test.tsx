import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../../App';
import * as authService from '../../../services/authService';
import * as database from '../../../services/database';

// Mock services
vi.mock('../../../services/authService');
vi.mock('../../../services/database');
vi.mock('../../../services/geminiService');

describe('Logout Bug Fix - New Users', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should allow new user with NO institutions to log out', async () => {
        // This test should FAIL initially, demonstrating the bug
        const user = userEvent.setup();

        // Mock: User is authenticated but has NO institutions (new user)
        const mockUser = { id: 'new-user-id', email: 'newuser@example.com' };
        vi.mocked(authService.isAuthenticated).mockReturnValue(true);
        vi.mocked(authService.getCurrentUser).mockReturnValue(mockUser);

        // Mock: Empty portfolio (new user scenario)
        vi.mocked(database.db.load).mockResolvedValue([]);

        // Mock logout function
        const mockLogout = vi.fn();
        vi.mocked(authService.logout).mockImplementation(mockLogout);

        // Render app with authenticated new user
        render(<App />);

        // Wait for app to load (should show empty portfolio state)
        await waitFor(() => {
            expect(screen.queryByText(/Sign in with your email/i)).not.toBeInTheDocument();
        });

        // CRITICAL: Find the logout button
        // The bug might be that logout button is missing or disabled for new users
        const logoutButtons = screen.getAllByRole('button');
        const logoutButton = logoutButtons.find(btn =>
            btn.title === 'Logout' ||
            btn.getAttribute('aria-label') === 'Logout' ||
            btn.querySelector('svg')?.classList.contains('lucide-log-out')
        );

        // Verify logout button exists
        expect(logoutButton).toBeTruthy();
        if (!logoutButton) {
            throw new Error('FAIL: Logout button not found for new user');
        }

        // Click logout
        await user.click(logoutButton);

        // Verify logout was called
        await waitFor(() => {
            expect(mockLogout).toHaveBeenCalled();
        });

        // Verify redirected to login page
        await waitFor(() => {
            expect(screen.getByText(/Sign in with your email/i)).toBeInTheDocument();
        });
    });

    it('should allow user WITH institutions to log out (regression test)', async () => {
        // Ensure existing logout functionality still works
        const user = userEvent.setup();

        const mockUser = { id: 'existing-user', email: 'existing@example.com' };
        vi.mocked(authService.isAuthenticated).mockReturnValue(true);
        vi.mocked(authService.getCurrentUser).mockReturnValue(mockUser);

        // Mock: User has institutions
        vi.mocked(database.db.load).mockResolvedValue([{
            id: 'inst-1',
            name: 'Fidelity',
            accounts: []
        }]);

        const mockLogout = vi.fn();
        vi.mocked(authService.logout).mockImplementation(mockLogout);

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Fidelity')).toBeInTheDocument();
        });

        const logoutButtons = screen.getAllByRole('button');
        const logoutButton = logoutButtons.find(btn =>
            btn.title === 'Logout' || btn.querySelector('svg')?.classList.contains('lucide-log-out')
        );

        expect(logoutButton).toBeTruthy();

        if (logoutButton) {
            await user.click(logoutButton);

            await waitFor(() => {
                expect(mockLogout).toHaveBeenCalled();
                expect(screen.getByText(/Sign in with your email/i)).toBeInTheDocument();
            });
        }
    });
});
