/// <reference types="vite/client" />
/**
 * Market Data Service
 * Provides real-time stock price fetching and ticker validation
 * Uses Alpha Vantage API with caching to minimize API calls
 */

// Support both Vite (import.meta.env) and Node.js (process.env)
const ALPHA_VANTAGE_KEY =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ALPHA_VANTAGE_KEY) ||
    process.env.VITE_ALPHA_VANTAGE_KEY ||
    '';
const API_BASE_URL = 'https://www.alphavantage.co/query';

interface PriceCache {
    price: number;
    timestamp: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Clear the price cache
 * Useful for testing and forcing fresh data fetches
 */
export const clearCache = (): void => {
    priceCache.clear();
};

/**
 * Fetch current stock price for a given ticker symbol
 * Results are cached for 1 minute to reduce API calls
 * 
 * @param symbol - Stock ticker symbol (e.g., 'AAPL', 'MSFT')
 * @returns Current stock price
 * @throws Error if ticker is invalid or API request fails
 */
export const fetchStockPrice = async (symbol: string): Promise<number> => {
    // Validate input
    if (!symbol || symbol.trim().length === 0) {
        throw new Error('Invalid ticker symbol');
    }

    // Check cache first
    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.price;
    }

    // Fetch from API
    const url = `${API_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Check for API errors
        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }

        if (data['Note']) {
            throw new Error('API rate limit exceeded');
        }

        // Extract price
        const globalQuote = data['Global Quote'];
        if (!globalQuote || !globalQuote['05. price']) {
            throw new Error('Invalid response from API');
        }

        const price = parseFloat(globalQuote['05. price']);

        if (isNaN(price)) {
            throw new Error('Invalid price data');
        }

        // Cache the result
        priceCache.set(symbol, { price, timestamp: Date.now() });

        return price;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to fetch stock price: ${error.message}`);
        }
        throw new Error('Failed to fetch stock price: Unknown error');
    }
};

/**
 * Validate if a ticker symbol exists and is valid
 * 
 * @param symbol - Stock ticker symbol to validate
 * @returns true if ticker is valid, false otherwise
 */
export const validateTicker = async (symbol: string): Promise<boolean> => {
    if (!symbol || symbol.trim().length === 0) {
        return false;
    }

    try {
        await fetchStockPrice(symbol);
        return true;
    } catch {
        return false;
    }
};

/**
 * Extended stock quote information
 */
export interface StockQuote {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    lastUpdated: Date;
}

/**
 * Fetch detailed stock quote information
 * 
 * @param symbol - Stock ticker symbol
 * @returns Detailed quote information
 */
export const fetchStockQuote = async (symbol: string): Promise<StockQuote> => {
    const url = `${API_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data['Error Message'] || data['Note']) {
        throw new Error(data['Error Message'] || 'API error');
    }

    const quote = data['Global Quote'];

    if (!quote) {
        throw new Error('Invalid response from API');
    }

    return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        lastUpdated: new Date(quote['07. latest trading day'])
    };
};
/**
 * Search result interface
 */
export interface SearchResult {
    symbol: string;
    name: string;
}

/**
 * Search for ticker symbols using Alpha Vantage API
 * 
 * @param query - Search query (e.g., 'Apple' or 'AAPL')
 * @returns Array of search results
 */
export const searchSymbols = async (query: string): Promise<SearchResult[]> => {
    if (!query || query.trim().length === 0) {
        return [];
    }

    const url = `${API_BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${ALPHA_VANTAGE_KEY}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            return [];
        }

        const data = await response.json();

        // Check for API errors or empty results
        if (data['Error Message'] || data['Note'] || !data['bestMatches']) {
            return [];
        }

        return data['bestMatches'].map((match: any) => ({
            symbol: match['1. symbol'],
            name: match['2. name']
        }));
    } catch (error) {
        console.error('Failed to search symbols:', error);
        return [];
    }
};
