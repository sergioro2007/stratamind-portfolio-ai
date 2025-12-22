import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PerformanceChart } from '../../../components/PerformanceChart';

// Mock Recharts
// We need to inspect props passed to ResponsiveContainer/Chart/Axis to verify changes
vi.mock('recharts', () => {
    const ActualRecharts = vi.importActual('recharts');
    return {
        ...ActualRecharts,
        ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
        AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
        Area: () => <div data-testid="area" />,
        XAxis: (props: any) => <div data-testid="x-axis" data-tick-gap={props.minTickGap} />,
        YAxis: (props: any) => <div data-testid="y-axis" data-width={props.width} />,
        CartesianGrid: () => <div data-testid="cartesian-grid" />,
        Tooltip: () => <div data-testid="tooltip" />,
    };
});

// Helper to resize window
const resizeWindow = (width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
    window.dispatchEvent(new Event('resize'));
};

describe('PerformanceChart Mobile View', () => {
    const mockHistory = [
        { timestamp: 1625097600000, totalValue: 10000 },
        { timestamp: 1625184000000, totalValue: 10500 },
        { timestamp: 1625270400000, totalValue: 10200 },
    ];
    const mockOnTimeRangeChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Default to Landscape
        resizeWindow(1024, 768);
    });

    it('should adjust XAxis minTickGap in portrait mode', () => {
        // Portrait mode: Height > Width
        resizeWindow(400, 800);

        render(
            <PerformanceChart
                history={mockHistory}
                timeRange="1M"
                onTimeRangeChange={mockOnTimeRangeChange}
                historyLoading={false}
            />
        );

        const xAxis = screen.getByTestId('x-axis');
        // Expect gap to be larger in mobile/portrait to avoid clutter
        // Looking at current code, it's 30. Let's expect 50 or different behavior.
        // For TDD, let's assume we want to increase gap to 50 in portrait.
        // Note: The test will initially fail if logic isn't there, which is what we want for TDD.
        expect(xAxis).toHaveAttribute('data-tick-gap', '50');
    });

    it('should adjust YAxis width in portrait mode', () => {
        // Portrait mode
        resizeWindow(400, 800);

        render(
            <PerformanceChart
                history={mockHistory}
                timeRange="1M"
                onTimeRangeChange={mockOnTimeRangeChange}
                historyLoading={false}
            />
        );

        const yAxis = screen.getByTestId('y-axis');
        // Current width is 60. In restricted mobile width, let's reduce it to 40.
        expect(yAxis).toHaveAttribute('data-width', '40');
    });

    it('should use default values in landscape mode', () => {
        // Landscape
        resizeWindow(1024, 768);

        render(
            <PerformanceChart
                history={mockHistory}
                timeRange="1M"
                onTimeRangeChange={mockOnTimeRangeChange}
                historyLoading={false}
            />
        );

        const xAxis = screen.getByTestId('x-axis');
        const yAxis = screen.getByTestId('y-axis');

        // Existing values
        expect(xAxis).toHaveAttribute('data-tick-gap', '30');
        expect(yAxis).toHaveAttribute('data-width', '60');
    });
});
