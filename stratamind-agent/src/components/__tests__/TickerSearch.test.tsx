import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TickerSearch from '../../../components/TickerSearch';
import * as marketData from '../../../services/marketData';

// Mock market data service
vi.mock('../../../services/marketData', () => ({
    searchSymbols: vi.fn(),
    fetchStockPrice: vi.fn(),
    validateTicker: vi.fn()
}));

describe('TickerSearch Component', () => {
    const mockOnSelect = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render input field', () => {
        render(<TickerSearch onChange={mockOnSelect} value="" />);
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should trigger search on input change', async () => {
        const user = userEvent.setup();
        const mockResults = [
            { symbol: 'AAPL', name: 'Apple Inc' }
        ];

        (marketData.searchSymbols as any).mockResolvedValue(mockResults);

        render(<TickerSearch onChange={mockOnSelect} value="Apple" />);
        // Note: For controlled component testing, we typically need a wrapper to update state,
        // but here we just verify initial render and mock calls if useEffect depends on value.

        await waitFor(() => {
            expect(marketData.searchSymbols).toHaveBeenCalledWith('Apple');
        });
    });

    it('should call onChange on input', async () => {
        const user = userEvent.setup();
        render(<TickerSearch onChange={mockOnSelect} value="" />);

        const input = screen.getByPlaceholderText(/search/i);
        await user.type(input, 'A');

        expect(mockOnSelect).toHaveBeenCalledWith('A');
    });

    it('should call onChange when result is clicked', async () => {
        const user = userEvent.setup();
        const mockResults = [
            { symbol: 'AAPL', name: 'Apple Inc' }
        ];

        (marketData.searchSymbols as any).mockResolvedValue(mockResults);

        render(<TickerSearch onChange={mockOnSelect} value="Apple" />);

        await waitFor(() => {
            expect(screen.getByText('AAPL')).toBeInTheDocument();
        });

        await user.click(screen.getByText('AAPL'));

        expect(mockOnSelect).toHaveBeenCalledWith('AAPL');
    });

    it('should allow clearing the selection', async () => {
        const mockOnChange = vi.fn();
        // Since it's controlled, we pass value="AAPL". The input will show it.
        render(<TickerSearch value="AAPL" onChange={mockOnChange} onSelect={mockOnSelect} />);

        const input = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
        expect(input.value).toBe('AAPL');

        // Find clear button (X icon) - usually rendered when value is present
        // Looking at component: value && <button onClick={clearSearch} ... <X /> ...
        // We can find by role button or by icon class if needed, or by title if we add one.
        // Component doesn't have title/aria-label for X button (BAD UX, I should fix this too ideally, but for now find by class or query selector)
        // Let's assume we can find it by `button` role inside the search wrapper
        // Actually, let's look at component: `value &&` renders a button.

        const buttons = screen.getAllByRole('button');
        // The last button is likely the X (or search icon isn't a button).
        // Let's use a more specific selector or fireEvent on the known structure if valid.
        // Better: add aria-label to the button in component, or traverse.
        // For this test fix, I'll rely on finding the button that contains the X icon.
        // Or just clicking the button that is NOT a dropdown result (dropdown is not shown initially).

        // Actually, TickerSearch.tsx:87 <button onClick={...}> <X ...> </button>
        // It's the only button when results are hidden.
        fireEvent.click(buttons[0]);

        expect(mockOnChange).toHaveBeenCalledWith('');
    });
});
