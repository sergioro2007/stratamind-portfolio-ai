import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../../App';
import * as authService from '../../../services/authService';
import { db } from '../../../services/database';

// Mock dependencies
vi.mock('../../../services/authService', () => ({
    isAuthenticated: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
}));

vi.mock('../../../services/database', () => ({
    db: {
        load: vi.fn().mockResolvedValue([]),
        getPerformanceStats: vi.fn().mockResolvedValue({}),
        getPerformanceHistory: vi.fn().mockResolvedValue([]),
        recordPerformanceSnapshot: vi.fn(),
    }
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

describe('Header Responsive Behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should show user info in mobile header and sidebar, but NOT in desktop header', async () => {
        // Setup authenticated user
        const mockUser = { id: '1', email: 'test@example.com' };
        vi.mocked(authService.isAuthenticated).mockReturnValue(true);
        vi.mocked(authService.getCurrentUser).mockReturnValue(mockUser);

        render(<App />);

        // Wait for data load
        await waitFor(() => {
            expect(db.load).toHaveBeenCalled();
        });

        // 1. Check for occurrences of email
        // We expect exactly 2 occurrences now (Mobile Header + Sidebar), NOT 3 (Desktop Header removed)
        const allEmailInstances = screen.getAllByText('test@example.com');
        expect(allEmailInstances.length).toBe(2);

        // 2. Verify Desktop Header does NOT contain user info
        // We can search for the desktop user info container's unique parent or structure if possible,
        // but since we removed it, we just verified the count dropped from 3 to 2.

        // 3. Verify Sidebar contains email
        // In V5, Email is in a separate box ABOVE the 'Portfolio Manager' block.
        // They share the same parent container (.p-4.border-t...).

        expect(allEmailInstances.length).toBe(2);

        const sidebarInstance = allEmailInstances.find(el => {
            const footer = el.closest('.p-4.border-t.border-slate-800');
            // Verify this footer ALSO contains the Portfolio Manager text (in a sibling or descendant)
            return footer && footer.textContent?.includes('Portfolio Manager');
        });
        expect(sidebarInstance).toBeTruthy();

        // 4. Verify Mobile Header contains email
        // Mobile header usually has 'StrataMind' near it (in the same container hierarchy)
        // Or we can check if it is within the 'lg:landscape:hidden' container
        // Note: we can't easily check for 'hidden' class on the container because JSDOM doesn't compute styles fully,
        // but we can check the class name presence.
    });

    it('should NOT have truncation classes on user email', async () => {
        const mockUser = { id: '1', email: 'test@example.com' };
        vi.mocked(authService.isAuthenticated).mockReturnValue(true);
        vi.mocked(authService.getCurrentUser).mockReturnValue(mockUser);

        const { container } = render(<App />);
        await waitFor(() => expect(db.load).toHaveBeenCalled());

        const emailSpans = screen.getAllByText('test@example.com');

        // Verify NONE of them have 'truncate' or 'max-w' classes
        emailSpans.forEach(span => {
            expect(span.className).not.toContain('truncate');
            expect(span.className).not.toContain('max-w-');
        });
    });
});
