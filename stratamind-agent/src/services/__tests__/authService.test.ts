import { describe, it, expect, beforeEach, vi } from 'vitest';
import { login, logout, getCurrentUser, isAuthenticated } from '../../../services/authService';

// Mock fetch
global.fetch = vi.fn();

describe('Auth Service - Frontend', () => {
    beforeEach(() => {
        // Clear localStorage
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('login', () => {
        it('should send POST request to /api/auth/login with email', async () => {
            const mockUser = { id: 'user-123', email: 'test@example.com' };
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser
            });

            const user = await login('test@example.com');

            expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'test@example.com' })
            });
            expect(user).toEqual(mockUser);
        });

        it('should store user in localStorage after successful login', async () => {
            const mockUser = { id: 'user-456', email: 'user@example.com' };
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser
            });

            await login('user@example.com');

            const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            expect(storedUser).toEqual(mockUser);
        });

        it('should throw error if API request fails', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            await expect(login('test@example.com')).rejects.toThrow('Login failed');
        });

        it('should validate email format', async () => {
            await expect(login('')).rejects.toThrow('Invalid email');
            await expect(login('not-an-email')).rejects.toThrow('Invalid email');
        });
    });

    describe('logout', () => {
        it('should clear user from localStorage', () => {
            localStorage.setItem('currentUser', JSON.stringify({ id: '123', email: 'test@example.com' }));

            logout();

            expect(localStorage.getItem('currentUser')).toBeNull();
        });
    });

    describe('getCurrentUser', () => {
        it('should return user from localStorage', () => {
            const mockUser = { id: '789', email: 'stored@example.com' };
            localStorage.setItem('currentUser', JSON.stringify(mockUser));

            const user = getCurrentUser();

            expect(user).toEqual(mockUser);
        });

        it('should return null if no user in localStorage', () => {
            const user = getCurrentUser();
            expect(user).toBeNull();
        });

        it('should return null if localStorage data is invalid JSON', () => {
            localStorage.setItem('currentUser', 'invalid-json{');
            const user = getCurrentUser();
            expect(user).toBeNull();
        });
    });

    describe('isAuthenticated', () => {
        it('should return true if user exists in localStorage', () => {
            localStorage.setItem('currentUser', JSON.stringify({ id: '123', email: 'test@example.com' }));
            expect(isAuthenticated()).toBe(true);
        });

        it('should return false if no user in localStorage', () => {
            expect(isAuthenticated()).toBe(false);
        });
    });
});
