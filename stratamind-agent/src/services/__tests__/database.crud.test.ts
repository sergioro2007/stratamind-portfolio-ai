import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../../../services/database';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('Database CRUD Operations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('deleteInstitution', () => {
        it('should delete institution and return updated data', async () => {
            // Mock DELETE response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            // Mock subsequent load() call
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{ id: 'inst-2', name: 'Remaining Inst', accounts: [] }]
            });

            const result = await db.deleteInstitution('inst-1');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/institutions/inst-1',
                {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('inst-2');
        });

        it('should handle delete errors gracefully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ message: 'Institution not found' })
            });

            await expect(db.deleteInstitution('invalid-id')).rejects.toThrow('Institution not found');
        });
    });

    describe('updateInstitution', () => {
        it('should update institution name and return updated data', async () => {
            // Mock PUT response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            // Mock subsequent load() call
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{ id: 'inst-1', name: 'Updated Name', accounts: [] }]
            });

            const result = await db.updateInstitution('inst-1', 'Updated Name');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/institutions/inst-1',
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: 'Updated Name' })
                }
            );
            expect(result[0].name).toBe('Updated Name');
        });

        it('should handle update errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ message: 'Update failed' })
            });

            await expect(db.updateInstitution('inst-1', 'New Name')).rejects.toThrow('Update failed');
        });
    });

    describe('createAccount', () => {
        it('should create account and return updated institutions', async () => {
            // Mock POST response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            // Mock subsequent load() call
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    id: 'inst-1',
                    name: 'Test Inst',
                    accounts: [{ id: 'acc-1', name: 'New Account', type: 'Brokerage' }]
                }]
            });

            const result = await db.createAccount('inst-1', 'New Account', 'Brokerage');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/accounts',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        institutionId: 'inst-1',
                        name: 'New Account',
                        type: 'Brokerage'
                    })
                }
            );
            expect(result[0].accounts).toHaveLength(1);
            expect(result[0].accounts[0].name).toBe('New Account');
        });

        it('should handle account creation errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ message: 'Invalid institution ID' })
            });

            await expect(db.createAccount('invalid-id', 'Test', 'IRA')).rejects.toThrow('Invalid institution ID');
        });
    });

    describe('deleteAccount', () => {
        it('should delete account and return updated data', async () => {
            // Mock DELETE response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            // Mock subsequent load() call
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{ id: 'inst-1', name: 'Test Inst', accounts: [] }]
            });

            const result = await db.deleteAccount('inst-1', 'acc-1');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/accounts/acc-1',
                {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            expect(result[0].accounts).toHaveLength(0);
        });

        it('should handle account deletion errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ message: 'Account not found' })
            });

            await expect(db.deleteAccount('inst-1', 'invalid-acc')).rejects.toThrow('Account not found');
        });
    });

    describe('updateAccount', () => {
        it('should delegate to updateAccountDetails', async () => {
            // Mock load for updateAccountDetails
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    id: 'inst-1',
                    name: 'Test Inst',
                    accounts: [{
                        id: 'acc-1',
                        name: 'Old Name',
                        type: 'Brokerage',
                        totalValue: 10000,
                        cashBalance: 1000,
                        strategies: []
                    }]
                }]
            });

            // Mock PUT response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            // Mock final load() call
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    id: 'inst-1',
                    name: 'Test Inst',
                    accounts: [{
                        id: 'acc-1',
                        name: 'New Name',
                        type: 'Brokerage',
                        totalValue: 10000,
                        cashBalance: 1000,
                        strategies: []
                    }]
                }]
            });

            const result = await db.updateAccount('inst-1', 'acc-1', 'New Name');

            expect(result[0].accounts[0].name).toBe('New Name');
        });
    });

    describe('deleteStrategy', () => {
        it('should delete strategy from account', async () => {
            // Mock initial load
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    id: 'inst-1',
                    name: 'Test Inst',
                    accounts: [{
                        id: 'acc-1',
                        name: 'Test Account',
                        type: 'Brokerage',
                        totalValue: 10000,
                        cashBalance: 1000,
                        strategies: [
                            { id: 'strat-1', name: 'Strategy 1' },
                            { id: 'strat-2', name: 'Strategy 2' }
                        ]
                    }]
                }]
            });

            // Mock PUT response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            // Mock final load
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    id: 'inst-1',
                    name: 'Test Inst',
                    accounts: [{
                        id: 'acc-1',
                        name: 'Test Account',
                        type: 'Brokerage',
                        totalValue: 10000,
                        cashBalance: 1000,
                        strategies: [{ id: 'strat-2', name: 'Strategy 2' }]
                    }]
                }]
            });

            const result = await db.deleteStrategy('inst-1', 'acc-1', 'strat-1');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/accounts/acc-1',
                expect.objectContaining({
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
            expect(result[0].accounts[0].strategies).toHaveLength(1);
            expect(result[0].accounts[0].strategies[0].id).toBe('strat-2');
        });

        it('should handle missing institution gracefully', async () => {
            // Mock load returning empty data
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

            // Mock final load (no PUT should be called)
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

            const result = await db.deleteStrategy('invalid-inst', 'acc-1', 'strat-1');

            // Should only have called fetch twice (initial load + final load, no PUT)
            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(result).toEqual([]);
        });

        it('should handle missing account gracefully', async () => {
            // Mock load with institution but no matching account
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    id: 'inst-1',
                    name: 'Test Inst',
                    accounts: []
                }]
            });

            // Mock final load
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    id: 'inst-1',
                    name: 'Test Inst',
                    accounts: []
                }]
            });

            const result = await db.deleteStrategy('inst-1', 'invalid-acc', 'strat-1');

            // Should not have called PUT
            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(result[0].accounts).toHaveLength(0);
        });
    });
});
