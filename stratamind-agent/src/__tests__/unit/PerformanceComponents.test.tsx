import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { PerformanceChart } from '../../../components/PerformanceChart';
import { PerformanceStatsDisplay } from '../../../components/PerformanceStats';

// Mock Recharts
vi.mock('recharts', () => {
    return {
        ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
        AreaChart: ({ children, data }: any) => (
            <div data-testid="area-chart">
                {JSON.stringify(data)}
                <svg>
                    {children}
                </svg>
            </div>
        ),
        Area: () => <div data-testid="area" />,
        XAxis: () => <div data-testid="xaxis" />,
        YAxis: () => <div data-testid="yaxis" />,
        CartesianGrid: () => <div data-testid="grid" />,
        Tooltip: () => <div data-testid="tooltip" />,
    };
});

describe('PerformanceStatsDisplay', () => {
    const mockStats = {
        current: 10000,
        dayChange: 500,
        dayChangePercent: 5.0,
        weekChange: 1000,
        weekChangePercent: 10.0,
        monthChange: 2000,
        monthChangePercent: 20.0,
        allTimeHigh: 12000,
        allTimeLow: 8000
    };

    it('renders current value and all metrics', () => {
        render(<PerformanceStatsDisplay stats={mockStats} statsLoading={false} />);

        expect(screen.getByText('Total Portfolio Value')).toBeInTheDocument();
        expect(screen.getByText(/All Time High/)).toBeInTheDocument();
        // Check for specific values (currency formatted)
        // Note: Formatting might depend on locale, checking for presence of rough structure
        const values = screen.getAllByText(/\$10,000/);
        expect(values.length).toBeGreaterThan(0);

        expect(screen.getByText(/\$12,000/)).toBeInTheDocument(); // ATH
    });

    it('shows loading state', () => {
        const { container } = render(<PerformanceStatsDisplay stats={mockStats} statsLoading={true} />);
        // Just check if skeleton exists (animate-pulse) or text is missing
        // The component renders a top-level div with or without grid.
        // If loading, it might render skeletal divs.

        const skeletons = container.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);

        // Ensure text is NOT present
        expect(screen.queryByText('Total Portfolio Value')).not.toBeInTheDocument();
    });
});

describe('PerformanceChart', () => {
    const mockHistory = [
        { accountId: '1', timestamp: 1000, totalValue: 100 },
        { accountId: '1', timestamp: 2000, totalValue: 110 },
        { accountId: '1', timestamp: 3000, totalValue: 105 }
    ];

    it('renders chart when data is present', () => {
        render(
            <PerformanceChart
                history={mockHistory}
                timeRange="1M"
                onTimeRangeChange={vi.fn()}
                historyLoading={false}
            />
        );

        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
        // Check chart data in mocked component
        expect(screen.getByTestId('area-chart')).toHaveTextContent('"totalValue":100');
    });

    it('renders empty state when history is insufficient', () => {
        render(
            <PerformanceChart
                history={[]}
                timeRange="1M"
                onTimeRangeChange={vi.fn()}
                historyLoading={false}
            />
        );

        expect(screen.getByText(/Not enough data/)).toBeInTheDocument();
    });

    it('calls onTimeRangeChange when range buttons clicked', () => {
        const onChange = vi.fn();
        render(
            <PerformanceChart
                history={mockHistory}
                timeRange="1M"
                onTimeRangeChange={onChange}
                historyLoading={false}
            />
        );

        fireEvent.click(screen.getByText('1W'));
        expect(onChange).toHaveBeenCalledWith('1W');
    });

    it('shows loading state', () => {
        const { container } = render(
            <PerformanceChart
                history={[]}
                timeRange="1M"
                onTimeRangeChange={vi.fn()}
                historyLoading={true}
            />
        );
        expect(container.firstChild).toHaveClass('animate-pulse');
    });
});
