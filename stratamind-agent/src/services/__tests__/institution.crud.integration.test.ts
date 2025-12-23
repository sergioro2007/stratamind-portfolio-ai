import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../../../services/database';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('Institution CRUD Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createInstitution', () => {
        it('should create a new institution and reload data', async () => {
            // 1. Mock POST /institutions response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            // 2. Mock subsequent db.load() GET /portfolio response
            const mockNewData = [
                { id: 'inst-1', name: 'Existing Inst', accounts: [] },
                { id: 'inst-new', name: 'New Bank', accounts: [] }
            ];
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockNewData
            });

            const result = await db.createInstitution('New Bank');

            // Verify POST
            expect(mockFetch).toHaveBeenNthCalledWith(1,
                'http://localhost:3001/api/institutions',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ name: 'New Bank' })
                })
            );

            // Verify result is the reloaded data
            expect(result).toHaveLength(2);
            expect(result.find(i => i.name === 'New Bank')).toBeTruthy();
        });
    });

    describe('Strategy Management (via Account Update)', () => {
        // Strategies are updated by putting the whole account details or specific endpoint
        // database.ts has updateAccountDetails which uses PUT /accounts/:id

        it('should update account strategies (simulate adding strategy)', async () => {
            // 1. Mock DB Load (Prerequisite to find the account)
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    id: 'inst-1',
                    name: 'Bank',
                    accounts: [{
                        id: 'acc-1',
                        name: 'Brokerage',
                        type: 'Brokerage',
                        strategies: []
                    }]
                }]
            });

            // 2. Mock PUT /accounts/acc-1 response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            // 3. Mock final db.load() response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    id: 'inst-1',
                    name: 'Bank',
                    accounts: [{
                        id: 'acc-1',
                        name: 'Brokerage',
                        type: 'Brokerage',
                        strategies: [{ id: 'strat-new', name: 'New Strat' }]
                    }]
                }]
            });

            // Action: Simulated "Add Strategy" by updating account details
            const newStrategies = [{ id: 'strat-new', name: 'New Strat', targetAllocation: 0 }];
            const result = await db.updateAccountDetails('inst-1', 'acc-1', { strategies: newStrategies } as any);

            // Verify PUT
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:3001/api/accounts/acc-1',
                expect.objectContaining({
                    method: 'PUT',
                    body: expect.stringContaining('strat-new')
                })
            );

            // Verify result
            expect(result[0].accounts[0].strategies).toHaveLength(1);
        });
    });
});
