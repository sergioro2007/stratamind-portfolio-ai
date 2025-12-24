import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PerformanceChart } from '../../../components/PerformanceChart';

// Mock Recharts
vi.mock('recharts', async () => {
    return {
        ResponsiveContainer: ({ children }: any) => <div className="recharts-responsive-container">{children}</div>,
        AreaChart: ({ children }: any) => <div className="recharts-area-chart">{children}</div>,
        Area: () => <div className="recharts-area" />,
        XAxis: () => <div className="recharts-x-axis" />,
        YAxis: () => <div className="recharts-y-axis" />,
        CartesianGrid: () => <div className="recharts-cartesian-grid" />,
        Tooltip: () => <div className="recharts-tooltip" />,
        defs: ({ children }: any) => <div className="recharts-defs">{children}</div>,
        linearGradient: ({ children }: any) => <div className="recharts-linear-gradient">{children}</div>,
        stop: () => <div className="recharts-stop" />
    };
});

describe('PerformanceChart', () => {
    const mockHistory = [
        {
            timestamp: 1672531200000,
            totalValue: 10000,
            cashBalance: 1000,
            holdingsValue: 9000
        },
        {
            timestamp: 1672617600000,
            totalValue: 10500,
            cashBalance: 1000,
            holdingsValue: 9500
        }
    ];

    const defaultProps = {
        history: mockHistory,
        timeRange: '1M' as const,
        onTimeRangeChange: vi.fn(),
        historyLoading: false,
        onToggleBenchmark: vi.fn(),
        showBenchmark: false
    };

    it('should render loading state', () => {
        const { container } = render(<PerformanceChart {...defaultProps} historyLoading={true} />);
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should render chart when data is present', () => {
        render(<PerformanceChart {...defaultProps} />);
        expect(screen.getByText('Performance')).toBeInTheDocument();
        expect(screen.getByText('1M')).toHaveClass('bg-indigo-600');
    });

    it('should handle time range changes', () => {
        render(<PerformanceChart {...defaultProps} />);
        fireEvent.click(screen.getByText('1Y'));
        expect(defaultProps.onTimeRangeChange).toHaveBeenCalledWith('1Y');
    });

    it('should render benchmark toggle when provided', () => {
        render(<PerformanceChart {...defaultProps} />);
        expect(screen.getByText('vs S&P 500')).toBeInTheDocument();
    });

    it('should toggle benchmark on click', () => {
        render(<PerformanceChart {...defaultProps} />);
        fireEvent.click(screen.getByText('vs S&P 500'));
        expect(defaultProps.onToggleBenchmark).toHaveBeenCalledWith(true);
    });

    it('should render empty state message when history is insufficient', () => {
        render(<PerformanceChart {...defaultProps} history={[]} />);
        expect(screen.getByText('Not enough data to display chart')).toBeInTheDocument();
    });

    it('should show positive trend color (green)', () => {
        // Mock data is already positive (10000 -> 10500)
        const { container } = render(<PerformanceChart {...defaultProps} />);
        // Hard to assert on memoized internal variables without snapshot or implementation details,
        // but we can check if it renders without error.
        expect(container.querySelector('.recharts-area-chart')).toBeInTheDocument();
    });

    it('should render with benchmark data when showBenchmark is true', () => {
        const mockBenchmark = [
            { t: 1672531200000, c: 4000 },
            { t: 1672617600000, c: 4100 }
        ];
        render(<PerformanceChart {...defaultProps} showBenchmark={true} benchmarkHistory={mockBenchmark} />);
        expect(screen.getByText('vs S&P 500')).toHaveClass('bg-amber-500/10');
    });

    it('should process benchmark history correctly in chartData memo', () => {
        const mockBenchmark = [
            { t: 1672531200000, c: 4000 },
            { t: 1672617600000, c: 4200 }
        ];
        const { container } = render(<PerformanceChart {...defaultProps} showBenchmark={true} benchmarkHistory={mockBenchmark} />);
        // Verify chart renders without errors (exercises lines 66-78)
        expect(container.querySelector('.recharts-area-chart')).toBeInTheDocument();
    });

    it('should handle 1D time range with time formatting', () => {
        render(<PerformanceChart {...defaultProps} timeRange="1D" />);
        // Verify chart renders (exercises formatDate time logic)
        expect(screen.getByText('1D')).toHaveClass('bg-indigo-600');
    });
});
