import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader, X } from 'lucide-react';
import { searchSymbols, SearchResult } from '../services/marketData';

interface TickerSearchProps {
    value: string;
    onChange: (symbol: string) => void;
    onSelect?: (symbol: string, name: string) => void;
    placeholder?: string;
}

const TickerSearch: React.FC<TickerSearchProps> = ({
    value,
    onChange,
    onSelect,
    placeholder = "Search ticker..."
}) => {
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (value && value.trim().length >= 2) {
                setIsLoading(true);
                try {
                    const searchResults = await searchSymbols(value);
                    setResults(searchResults);
                    setShowDropdown(true);
                } catch (error) {
                    console.error('Search failed:', error);
                    setResults([]);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
                setShowDropdown(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [value]);

    const handleSelect = (result: SearchResult) => {
        onChange(result.symbol);
        if (onSelect) {
            onSelect(result.symbol, result.name);
        }
        setShowDropdown(false);
    };

    const clearSearch = () => {
        onChange('');
        setResults([]);
        setShowDropdown(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value.toUpperCase())}
                    placeholder={placeholder}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 pl-9 pr-9 text-white focus:border-indigo-500 focus:outline-none font-mono uppercase"
                />
                <Search className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />

                {isLoading ? (
                    <Loader className="absolute right-3 top-2.5 text-indigo-500 w-4 h-4 animate-spin" />
                ) : value && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {showDropdown && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg max-h-60 overflow-y-auto">
                    {results.map((result) => (
                        <button
                            key={result.symbol}
                            onClick={() => handleSelect(result)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                        >
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-white font-mono">{result.symbol}</span>
                                <span className="text-xs text-slate-400 truncate ml-2">{result.name}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TickerSearch;
