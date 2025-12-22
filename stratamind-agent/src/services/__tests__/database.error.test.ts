
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../../../services/database';

describe('Database Service - Error Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should handle API network failure in load()', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

        const result = await db.load();
        expect(result).toEqual([]); // Fallback to empty array
    });

    it('should handle HTTP error in load()', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({ message: 'Server Internal Error' })
        });

        const result = await db.load();
        expect(result).toEqual([]);
    });

    it('should throw error on createInstitution failure', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 400,
            json: async () => ({ message: 'Invalid Institution Name' })
        });

        await expect(db.createInstitution('Bad Inst')).rejects.toThrow('Invalid Institution Name');
    });

    it('should throw error on createAccount failure', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: async () => ({ message: 'Institution not found' })
        });

        await expect(db.createAccount('inst-1', 'Acc', 'Type')).rejects.toThrow('Institution not found');
    });

    it('should throw error on deleteInstitution failure', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 403,
            json: async () => ({ message: 'Forbidden' })
        });

        await expect(db.deleteInstitution('inst-1')).rejects.toThrow('Forbidden');
    });

    it('should handle handleResponse empty catch for invalid JSON', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => { throw new Error('Not JSON'); }
        });

        await expect(db.createInstitution('Test')).rejects.toThrow('API Error');
    });
});
