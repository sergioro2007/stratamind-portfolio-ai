import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStockPrice, validateTicker, clearCache, searchSymbols } from '../../../services/marketData';

// Mock fetch globally
global.fetch = vi.fn();

describe('marketData service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearCache();
    });

    describe('fetchStockPrice', () => {
        it('should fetch stock price for valid ticker', async () => {
            const mockResponse = {
                'Global Quote': {
                    '01. symbol': 'AAPL',
                    '05. price': '175.43'
                }
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const price = await fetchStockPrice('AAPL');

            expect(price).toBe(175.43);
            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('AAPL')
            );
        });

        it('should cache stock prices to reduce API calls', async () => {
            const mockResponse = {
                'Global Quote': {
                    '01. symbol': 'MSFT',
                    '05. price': '350.00'
                }
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            // First call - should fetch from API
            const price1 = await fetchStockPrice('MSFT');

            // Second call - should use cache
            const price2 = await fetchStockPrice('MSFT');

            expect(price1).toBe(350.00);
            expect(price2).toBe(350.00);
            expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once due to cache
        });

        it('should handle network errors gracefully', async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

            await expect(fetchStockPrice('INVALID')).rejects.toThrow('Failed to fetch stock price');
        });

        it('should handle invalid API responses', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ 'Error Message': 'Invalid API key' })
            });

            await expect(fetchStockPrice('AAPL')).rejects.toThrow();
        });

        it('should handle missing price data in response', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ 'Global Quote': {} })
            });

            await expect(fetchStockPrice('AAPL')).rejects.toThrow('Invalid response from API');
        });

        it('should handle API rate limiting', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ 'Note': 'API rate limit exceeded' })
            });

            await expect(fetchStockPrice('AAPL')).rejects.toThrow('API rate limit exceeded');
        });

        it('should reject empty ticker symbols', async () => {
            await expect(fetchStockPrice('')).rejects.toThrow('Invalid ticker symbol');
        });

        it('should reject whitespace-only ticker symbols', async () => {
            await expect(fetchStockPrice('   ')).rejects.toThrow('Invalid ticker symbol');
        });

        it('should handle HTTP errors', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            await expect(fetchStockPrice('AAPL')).rejects.toThrow('HTTP error');
        });

        it('should parse price as number correctly', async () => {
            const mockResponse = {
                'Global Quote': {
                    '01. symbol': 'GOOGL',
                    '05. price': '140.50'
                }
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const price = await fetchStockPrice('GOOGL');

            expect(typeof price).toBe('number');
            expect(price).toBe(140.50);
        });
    });

    describe('validateTicker', () => {
        it('should return true for valid ticker', async () => {
            const mockResponse = {
                'Global Quote': {
                    '01. symbol': 'GOOGL',
                    '05. price': '140.50'
                }
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const isValid = await validateTicker('GOOGL');
            expect(isValid).toBe(true);
        });

        it('should return false for invalid ticker', async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error('Invalid ticker'));

            const isValid = await validateTicker('INVALID123');
            expect(isValid).toBe(false);
        });

        it('should return false for empty ticker', async () => {
            const isValid = await validateTicker('');
            expect(isValid).toBe(false);
        });

        it('should return false for whitespace ticker', async () => {
            const isValid = await validateTicker('   ');
            expect(isValid).toBe(false);
        });

        it('should handle API errors and return false', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ 'Error Message': 'Invalid symbol' })
            });

            const isValid = await validateTicker('XYZ');
            expect(isValid).toBe(false);
        });
    });

    describe('clearCache', () => {
        it('should clear the price cache', async () => {
            const mockResponse = {
                'Global Quote': {
                    '01. symbol': 'TSLA',
                    '05. price': '250.00'
                }
            };

            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            // Fetch once to populate cache
            await fetchStockPrice('TSLA');
            expect(global.fetch).toHaveBeenCalledTimes(1);

            // Fetch again - should use cache
            await fetchStockPrice('TSLA');
            expect(global.fetch).toHaveBeenCalledTimes(1);

            // Clear cache
            clearCache();

            // Fetch again - should call API again
            await fetchStockPrice('TSLA');
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });
    describe('searchSymbols', () => {
        it('should search and return results for valid query', async () => {
            const mockResponse = {
                'bestMatches': [
                    {
                        '1. symbol': 'AAPL',
                        '2. name': 'Apple Inc',
                        '3. type': 'Equity',
                        '4. region': 'United States',
                        '5. marketOpen': '09:30',
                        '6. marketClose': '16:00',
                        '7. timezone': 'UTC-04',
                        '8. currency': 'USD',
                        '9. matchScore': '1.0000'
                    },
                    {
                        '1. symbol': 'MSFT',
                        '2. name': 'Microsoft Corp',
                        '3. type': 'Equity',
                        '4. region': 'United States',
                        '5. marketOpen': '09:30',
                        '6. marketClose': '16:00',
                        '7. timezone': 'UTC-04',
                        '8. currency': 'USD',
                        '9. matchScore': '0.8000'
                    }
                ]
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const results = await searchSymbols('Apple');

            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({ symbol: 'AAPL', name: 'Apple Inc' });
            expect(results[1]).toEqual({ symbol: 'MSFT', name: 'Microsoft Corp' });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('function=SYMBOL_SEARCH')
            );
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('keywords=Apple')
            );
        });

        it('should search and return results for ticker symbol', async () => {
            const mockResponse = {
                'bestMatches': [
                    {
                        '1. symbol': 'MSFT',
                        '2. name': 'Microsoft Corp',
                        '3. type': 'Equity',
                        '4. region': 'United States',
                        '5. marketOpen': '09:30',
                        '6. marketClose': '16:00',
                        '7. timezone': 'UTC-04',
                        '8. currency': 'USD',
                        '9. matchScore': '1.0000'
                    }
                ]
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const results = await searchSymbols('MSFT');

            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({ symbol: 'MSFT', name: 'Microsoft Corp' });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('keywords=MSFT')
            );
        });

        it('should return empty array for empty query', async () => {
            const results = await searchSymbols('');
            expect(results).toEqual([]);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should handle API errors gracefully', async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
            const results = await searchSymbols('Test');
            expect(results).toEqual([]);
        });

        it('should handle API rate limit or error response', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ 'Note': 'API rate limit exceeded' })
            });

            const results = await searchSymbols('Test');
            expect(results).toEqual([]);
        });
    });
});
