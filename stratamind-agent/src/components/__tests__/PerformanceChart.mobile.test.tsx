import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PerformanceChart } from '../../../components/PerformanceChart';
import type { PerformanceSnapshot, TimeRange } from '../../../types';

// Mock Recharts to avoid complex SVG rendering issues in basic logic tests
vi.mock('recharts', async () => {
    const originalModule = await vi.importActual('recharts');
    return {
        ...originalModule,
        ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
        AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
        Area: () => <div />,
        XAxis: ({ tickFormatter }: any) => <div data-testid="x-axis">{tickFormatter && tickFormatter(Date.now())}</div>,
        YAxis: () => <div />,
        CartesianGrid: () => <div />,
        Tooltip: () => <div />,
    };
});

describe('PerformanceChart - Mobile Behavior', () => {
    const mockHistory: PerformanceSnapshot[] = [
        { id: '1', accountId: 'test-account', timestamp: Date.now() - 86400000, totalValue: 10000, cashBalance: 0, holdingsValue: 10000 },
        { id: '2', accountId: 'test-account', timestamp: Date.now(), totalValue: 10500, cashBalance: 0, holdingsValue: 10500 },
    ];

    const mockProps = {
        history: mockHistory,
        timeRange: '1D' as TimeRange,
        onTimeRangeChange: vi.fn(),
        historyLoading: false,
    };

    it('should handle window resize events', () => {
        render(<PerformanceChart {...mockProps} />);

        // Trigger resize event
        act(() => {
            global.innerWidth = 500;
            global.dispatchEvent(new Event('resize'));
        });

        const chart = screen.getByTestId('area-chart');
        expect(chart).toBeInTheDocument();
    });

    it('should render when not loading', () => {
        render(<PerformanceChart {...mockProps} />);
        const chart = screen.getByTestId('area-chart');
        expect(chart).toBeInTheDocument();
    });

    it('should show loading state', () => {
        render(<PerformanceChart {...mockProps} historyLoading={true} />);
        const loadingDiv = document.querySelector('.animate-pulse');
        expect(loadingDiv).toBeInTheDocument();
    });
});
