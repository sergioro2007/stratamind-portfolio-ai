import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../../App';

// Mock the auth service
vi.mock('../../../services/authService', () => ({
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn()
}));

import { login, logout, getCurrentUser, isAuthenticated } from '../../../services/authService';

describe('Multiuser Data Isolation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it('should show login page when user is not authenticated', async () => {
        (isAuthenticated as any).mockReturnValue(false);
        (getCurrentUser as any).mockReturnValue(null);

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText(/login/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
        });
    });

    it('should show portfolio after successful login', async () => {
        const mockUser = { id: 'user-1', email: 'user1@example.com' };
        (isAuthenticated as any).mockReturnValue(true);
        (getCurrentUser as any).mockReturnValue(mockUser);
        (login as any).mockResolvedValue(mockUser);

        // Mock API response for empty portfolio
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => []
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.queryByText(/login/i)).not.toBeInTheDocument();
        });
    });

    it('should filter institutions by user_id - User A cannot see User B data', async () => {
        const userA = { id: 'user-a', email: 'usera@example.com' };
        (isAuthenticated as any).mockReturnValue(true);
        (getCurrentUser as any).mockReturnValue(userA);

        // Mock API to return only User A's institutions
        const userAInstitutions = [
            {
                id: 'inst-a',
                name: 'User A Institution',
                accounts: []
            }
        ];

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => userAInstitutions
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('User A Institution')).toBeInTheDocument();
            expect(screen.queryByText('User B Institution')).not.toBeInTheDocument();
        });
    });

    it('should send user_id header with API requests', async () => {
        const mockUser = { id: 'user-123', email: 'test@example.com' };
        (isAuthenticated as any).mockReturnValue(true);
        (getCurrentUser as any).mockReturnValue(mockUser);

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => []
        });

        render(<App />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/portfolio',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'x-user-id': 'user-123'
                    })
                })
            );
        });
    });

    it('should clear portfolio data after logout', async () => {
        const mockUser = { id: 'user-1', email: 'user1@example.com' };
        (isAuthenticated as any).mockReturnValue(true);
        (getCurrentUser as any).mockReturnValue(mockUser);

        // Initially authenticated with data
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => [{
                id: 'inst-1',
                name: 'Test Institution',
                accounts: []
            }]
        });

        const { rerender } = render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Test Institution')).toBeInTheDocument();
        });

        // Simulate logout
        (isAuthenticated as any).mockReturnValue(false);
        (getCurrentUser as any).mockReturnValue(null);

        rerender(<App />);

        await waitFor(() => {
            expect(screen.getByText(/login/i)).toBeInTheDocument();
            expect(screen.queryByText('Test Institution')).not.toBeInTheDocument();
        });
    });

    it('should load different data when switching users', async () => {
        // User 1 logged in
        let currentUser = { id: 'user-1', email: 'user1@example.com' };
        (isAuthenticated as any).mockReturnValue(true);
        (getCurrentUser as any).mockReturnValue(currentUser);

        let callCount = 0;
        (global.fetch as any).mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                // First render - User 1 data
                return Promise.resolve({
                    ok: true,
                    json: async () => [{
                        id: 'inst-1',
                        name: 'User 1 Fidelity',
                        accounts: []
                    }]
                });
            } else {
                // After user switch - User 2 data
                return Promise.resolve({
                    ok: true,
                    json: async () => [{
                        id: 'inst-2',
                        name: 'User 2 Vanguard',
                        accounts: []
                    }]
                });
            }
        });

        const { rerender } = render(<App />);

        await waitFor(() => {
            expect(screen.getByText('User 1 Fidelity')).toBeInTheDocument();
        });

        // Switch to User 2
        currentUser = { id: 'user-2', email: 'user2@example.com' };
        (getCurrentUser as any).mockReturnValue(currentUser);

        rerender(<App />);

        await waitFor(() => {
            expect(screen.getByText('User 2 Vanguard')).toBeInTheDocument();
            expect(screen.queryByText('User 1 Fidelity')).not.toBeInTheDocument();
        });
    });
});
