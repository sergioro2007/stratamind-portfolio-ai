import React from 'react';
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../../App';
import PortfolioVisualizer from '../../../components/PortfolioVisualizer';
import { db } from '../../../services/database';
import { SliceType } from '../../../types';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// --- MOCKS ---

// Mock matchMedia
const mockMatchMedia = (matches: boolean, query: string = '') => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(q => ({
            matches: q === query ? matches : (q === '(min-width: 1280px)' ? matches : matches), // Simplified logic
            media: q,
            onchange: null,
            addListener: vi.fn(), // Deprecated
            removeListener: vi.fn(), // Deprecated
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
};

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock Database
vi.mock('../../../services/database');
vi.mock('../../../services/geminiService', () => ({
    startChatSession: vi.fn().mockResolvedValue({}),
    sendMessage: vi.fn(),
}));

// Mock Recharts
vi.mock('recharts', () => {
    return {
        ResponsiveContainer: ({ children }: any) => <div className="recharts-responsive-container">{children}</div>,
        PieChart: ({ children }: any) => <div className="recharts-pie-chart">{children}</div>,
        Pie: () => <div className="recharts-pie" />,
        Cell: () => <div className="recharts-cell" />,
        Tooltip: () => <div className="recharts-tooltip" />,
        Legend: () => <div className="recharts-legend" />,
        AreaChart: () => <div className="recharts-area-chart" />,
        Area: () => <div />,
        XAxis: () => <div />,
        YAxis: () => <div />,
        CartesianGrid: () => <div />,
    };
});

describe('App Layout & Responsiveness', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Seed DB
        (db.load as any).mockResolvedValue([
            {
                id: 'inst1',
                name: 'Test Inst',
                accounts: [
                    {
                        id: 'acc1',
                        name: 'Test Account',
                        totalValue: 100000,
                        cashBalance: 10000,
                        strategies: [
                            {
                                id: 'strat1',
                                name: 'Growth',
                                targetAllocation: 100,
                                type: SliceType.GROUP,
                                children: [],
                                currentValue: 90000
                            }
                        ]
                    }
                ]
            }
        ]);
        (db.getPerformanceStats as any).mockResolvedValue(null);
        (db.getPerformanceHistory as any).mockResolvedValue([]);
    });

    // --- BREAKPOINT TESTS ---

    test('Mobile (375px): Sidebar and Mobile Header visibility', async () => {
        // Mock Mobile (< 1024px)
        // Ensure XL query returns false
        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        await act(async () => {
            render(<App />);
        });

        // 1. Mobile Header should be visible
        const strataElements = screen.getAllByText('StrataMind');
        expect(strataElements.length).toBeGreaterThan(0);

        // Verify Sidebar hidden
        const sidebar = screen.getByTestId('sidebar');
        const permanentSidebarContainer = sidebar.parentElement;
        expect(permanentSidebarContainer).toHaveClass('hidden');
    });

    test('Mobile (375px): Pie Chart Visibility Fix (h-[300px])', async () => {
        // Verify the fix: Chart container must have h-[300px] on mobile

        const rootSlice: any = {
            id: 'root',
            type: SliceType.GROUP,
            name: 'Root',
            targetAllocation: 100,
            currentValue: 100,
            children: [{
                id: 'c1', name: 'C1', type: SliceType.HOLDING, targetAllocation: 100, currentValue: 100, symbol: 'A'
            }]
        };

        const mockUpdate = vi.fn();

        render(
            <PortfolioVisualizer
                rootSlice={rootSlice}
                totalValue={100}
                onAddSlice={mockUpdate}
                onRemoveSlice={mockUpdate}
                showPrices={false}
                loadingPrices={false}
                priceError={null}
            />
        );

        // Find the chart container. It contains the "recharts-responsive-container"
        const responsiveContainer = document.querySelector('.recharts-responsive-container');
        expect(responsiveContainer).toBeInTheDocument();

        const parentDiv = responsiveContainer?.parentElement;
        expect(parentDiv).toHaveClass('h-[300px]');
        expect(parentDiv).toHaveClass('md:h-auto');
        expect(parentDiv).toHaveClass('md:flex-1');
    });

    test('Desktop (1024px/LG): Sidebar visibility toggles with Chat', async () => {
        // Mock LG: generic matches true, BUT explicit XL query must be FALSE
        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: query !== '(min-width: 1280px)', // True for everything EXCEPT XL
            media: query,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        await act(async () => {
            render(<App />);
        });

        const sidebar = screen.getByTestId('sidebar');
        const sidebarContainer = sidebar.parentElement;

        // Chat CLOSED default (because XL query false)
        // Sidebar VISIBLE (lg:landscape:flex)
        expect(sidebarContainer).toHaveClass('lg:landscape:flex');

        // OPEN CHAT
        const chatToggle = screen.getByTitle('Toggle Chat');
        fireEvent.click(chatToggle);

        // Logic: hidden xl:flex
        // Since we are NOT XL, it stays hidden effectively
        expect(sidebarContainer).not.toHaveClass('lg:landscape:flex');
        expect(sidebarContainer).toHaveClass('hidden');
        expect(sidebarContainer).toHaveClass('xl:flex');
    });

    test('XL (1280px): Sidebar remains visible even when Chat Open', async () => {
        // Mock XL
        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: true, // Everything true implies XL
            media: query,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        await act(async () => {
            render(<App />);
        });

        const sidebar = screen.getByTestId('sidebar');
        const sidebarContainer = sidebar.parentElement;

        // Chat AUTO-OPENS on XL
        // Logic: hidden xl:flex
        // Since we ARE XL, 'xl:flex' activates display: flex!
        expect(sidebarContainer).toHaveClass('xl:flex');
    });

    test('XL (1280px): Grid Layout switches to 1-column (XL crunch fix)', async () => {
        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: true,
            media: query,
            addListener: vi.fn(), // Deprecated
            removeListener: vi.fn(), // Deprecated
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        await act(async () => {
            render(<App />);
        });

        // Check grid classes
        const grid = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-3');
        expect(grid).toBeInTheDocument();
        expect(grid).toHaveClass('xl:grid-cols-1');
        expect(grid).toHaveClass('2xl:grid-cols-3');
    });
});
