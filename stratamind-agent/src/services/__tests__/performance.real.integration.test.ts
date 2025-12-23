
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchHistoricalData } from '../../../services/marketData';
import { db } from '../../../services/database';

describe('Performance Real Data Verification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('marketData.ts should NOT return random mock data on failure (Real Data Enforcement)', async () => {
        // Mock fetch to simulate failure
        global.fetch = vi.fn().mockRejectedValue(new Error('API Failed'));

        const data = await fetchHistoricalData('SPY');

        // It should return empty array, NOT random values
        expect(data).toEqual([]);
        expect(data.length).toBe(0);
    });

    it('marketData.ts should return empty array if API returns error message', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ 'Error Message': 'Invalid API Call' })
        });

        const data = await fetchHistoricalData('SPY');
        expect(data).toEqual([]);
    });

    // We can't easily test "DB Real Data" in integration without a real DB tailored for this,
    // but we can verify the Service doesn't have hardcoded mocks.
    // The checking of App.tsx removal is done via code analysis (which we did manually).
});
