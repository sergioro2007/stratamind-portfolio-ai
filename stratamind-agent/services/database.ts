import { Institution, Account, SliceType, PortfolioSlice } from '../types';
import { normalizeChildren } from '../utils/portfolioTree';

const API_BASE = 'http://localhost:3001/api';

// Helper to handle API errors
const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'API Error');
    }
    return response.json();
};

export const generateId = (): string => {
    return 'id-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
};

export const db = {
    load: async (): Promise<Institution[]> => {
        try {
            const response = await fetch(`${API_BASE}/portfolio`);
            const data = await handleResponse(response);
            return data;
        } catch (e) {
            console.error("Failed to load DB from API", e);
            return [];
        }
    },

    // Note: In a real app we would have specific endpoints for each action.
    // For MVP Phase 1 migration, we are calling atomic actions if possible, 
    // or falling back to a "save world" if the backend supports it (it doesn't yet).
    // So we need to IMPLEMENT the atomic endpoints in the backend or fake it.
    // 
    // Current Backend Implementation: only has GET /api/portfolio
    // WE NEED TO ADD POST/PUT endpoints to server.js before this will work.
    //
    // However, to keep the frontend building, I will define the interface as Async
    // and implementing the fetch calls, assuming the backend exists.

    save: async (data: Institution[]) => {
        console.warn("Bulk Save not implemented in API Mode - use granular updates");
    },

    // --- Async CRUD Helpers ---

    createInstitution: async (name: string): Promise<Institution[]> => {
        const response = await fetch(`${API_BASE}/institutions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        await handleResponse(response);
        return db.load();
    },

    deleteInstitution: async (id: string): Promise<Institution[]> => {
        const response = await fetch(`${API_BASE}/institutions/${id}`, { method: 'DELETE' });
        await handleResponse(response);
        return db.load();
    },

    createAccount: async (instId: string, name: string, type: string): Promise<Institution[]> => {
        const response = await fetch(`${API_BASE}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ institutionId: instId, name, type })
        });
        await handleResponse(response);
        return db.load();
    },

    deleteAccount: async (instId: string, accId: string): Promise<Institution[]> => {
        const response = await fetch(`${API_BASE}/accounts/${accId}`, { method: 'DELETE' });
        await handleResponse(response);
        return db.load();
    },

    updateInstitution: async (id: string, name: string): Promise<Institution[]> => {
        const response = await fetch(`${API_BASE}/institutions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        await handleResponse(response);
        return db.load();
    },

    updateAccount: async (instId: string, accId: string, name: string): Promise<Institution[]> => {
        return db.updateAccountDetails(instId, accId, { name });
    },

    updateAccountDetails: async (instId: string, accId: string, details: Partial<Account>): Promise<Institution[]> => {
        // Load current state to merge, as backend expects full object for PUT (specifically for strategies)
        // Or simply trust the backend handles partials? 
        // My server.js PUT implementation expects { name, type, totalValue, cashBalance, strategies }
        // It DOES NOT do a merge. It overwrites.
        // So we MUST merge here or in the backend. 
        // Let's merge here for safety since we have the full state loaded usually.
        // BUT db.load() fetches fresh.

        // Better approach: Fetch specific account? No endpoint.
        // Fetch all, find, merge.
        const all = await db.load();
        const inst = all.find(i => i.id === instId);
        const acc = inst?.accounts.find(a => a.id === accId);

        if (acc) {
            const merged = { ...acc, ...details };
            const response = await fetch(`${API_BASE}/accounts/${accId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(merged)
            });
            await handleResponse(response);
        }
        return db.load();
    },

    deleteStrategy: async (instId: string, accId: string, strategyId: string): Promise<Institution[]> => {
        const all = await db.load();
        const inst = all.find(i => i.id === instId);
        const acc = inst?.accounts.find(a => a.id === accId);

        if (acc) {
            const updatedStrategies = acc.strategies.filter(s => s.id !== strategyId);
            const merged = { ...acc, strategies: updatedStrategies };
            await fetch(`${API_BASE}/accounts/${accId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(merged)
            });
        }
        return db.load();
    },

    // --- Performance Tracking Methods ---

    recordPerformanceSnapshot: async (snapshot: Omit<import('../types').PerformanceSnapshot, 'id'>): Promise<void> => {
        await fetch(`${API_BASE}/performance/snapshot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(snapshot)
        });
    },

    getPerformanceHistory: async (accountId: string, timeRange?: string): Promise<import('../types').PerformanceSnapshot[]> => {
        const url = new URL(`${API_BASE}/performance/${accountId}`);
        if (timeRange) {
            url.searchParams.append('range', timeRange);
        }
        const response = await fetch(url.toString());
        return handleResponse(response);
    },

    getPerformanceStats: async (accountId: string): Promise<import('../types').PerformanceStats> => {
        const response = await fetch(`${API_BASE}/performance/${accountId}/stats`);
        return handleResponse(response);
    }
};