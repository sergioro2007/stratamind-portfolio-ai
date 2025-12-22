
import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PortfolioSlice, SliceType } from '../types';
import {
    ChevronRight, Folder, TrendingUp, DollarSign, Plus,
    Trash2,
    RefreshCw,
    ExternalLink,
    Loader,
    X,
    Pencil
} from 'lucide-react';
import { fetchStockPrice, validateTicker, clearCache } from '../services/marketData';
import TickerSearch from './TickerSearch';

interface Props {
    rootSlice: PortfolioSlice;
    totalValue: number;
    onAddSlice?: (parentId: string, type: SliceType, name: string, symbol: string | undefined, allocation: number, rebalanceUpdates?: Array<{ id: string, targetAllocation: number }>) => void;
    onRemoveSlice?: (sliceId: string) => void;
    onRenameSlice?: (sliceId: string, newName: string) => void;
    // Market data props
    showPrices?: boolean;
    loadingPrices?: boolean;
    priceError?: string | null;
    lastPriceUpdate?: Date | null;
    onRefreshPrices?: () => void;
    prices?: Map<string, number>;
    // Strategy Persistence
    onUpdatePrompt?: (slice: PortfolioSlice, newPrompt: string) => void;
    onVerifyStrategy?: (slice: PortfolioSlice) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

// Helper function to format time ago
const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

const PortfolioVisualizer: React.FC<Props> = ({
    rootSlice,
    totalValue,
    onAddSlice,
    onRemoveSlice,
    onRenameSlice,
    showPrices = false,
    loadingPrices = false,
    priceError = null,
    lastPriceUpdate = null,
    onRefreshPrices,
    prices = new Map(),
    onUpdatePrompt,
    onVerifyStrategy
}) => {
    const [path, setPath] = useState<PortfolioSlice[]>([rootSlice]);
    const currentView = path[path.length - 1];

    // Add Slice Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newSliceType, setNewSliceType] = useState<SliceType>(SliceType.HOLDING);
    const [newName, setNewName] = useState('');
    const [newSymbol, setNewSymbol] = useState('');
    const [newAllocation, setNewAllocation] = useState(0);

    // Ticker validation state
    const [validatingTicker, setValidatingTicker] = useState(false);
    const [tickerError, setTickerError] = useState<string | null>(null);

    // Internal price state for auto-fetch
    const [internalPrices, setInternalPrices] = useState<Map<string, number>>(new Map());
    const [internalLoadingPrices, setInternalLoadingPrices] = useState(false);
    const [internalPriceError, setInternalPriceError] = useState<string | null>(null);
    const [internalLastUpdate, setInternalLastUpdate] = useState<Date | null>(null);

    // Goal Editing State
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [editPromptText, setEditPromptText] = useState('');

    // Reallocation State (NEW for flexible allocation feature)
    const [reallocationMode, setReallocationMode] = useState(false);
    const [proposedRebalance, setProposedRebalance] = useState<Array<{ id: string, targetAllocation: number }>>([]);

    // Use internal state if prices prop not provided
    const effectivePrices = prices.size > 0 ? prices : internalPrices;
    const effectiveLoadingPrices = loadingPrices || internalLoadingPrices;
    const effectivePriceError = priceError || internalPriceError;
    const effectiveLastUpdate = lastPriceUpdate || internalLastUpdate;

    // Auto-fetch prices when showPrices is enabled
    useEffect(() => {
        if (!showPrices || prices.size > 0) return; // Skip if prices provided externally

        const fetchPrices = async () => {
            setInternalLoadingPrices(true);
            setInternalPriceError(null);

            try {
                // Get all holdings from current view
                const getAllHoldings = (slice: PortfolioSlice): PortfolioSlice[] => {
                    if (slice.type === SliceType.HOLDING) return [slice];
                    if (!slice.children) return [];
                    return slice.children.flatMap(getAllHoldings);
                };

                const holdings = getAllHoldings(currentView);
                const newPrices = new Map<string, number>();

                // Fetch prices for all holdings
                const pricePromises = holdings
                    .filter(h => h.symbol)
                    .map(async (h) => {
                        try {
                            const price = await fetchStockPrice(h.symbol!);
                            return [h.symbol!, price] as const;
                        } catch (error) {
                            console.error(`Failed to fetch price for ${h.symbol}: `, error);
                            return null;
                        }
                    });

                const results = await Promise.all(pricePromises);
                results.forEach(result => {
                    if (result) {
                        newPrices.set(result[0], result[1]);
                    }
                });

                setInternalPrices(newPrices);
                setInternalLastUpdate(new Date());
            } catch (error) {
                setInternalPriceError('Failed to load prices');
            } finally {
                setInternalLoadingPrices(false);
            }
        };

        fetchPrices();
    }, [showPrices, currentView, prices.size]);

    // Reset path if root changes significantly (e.g. new portfolio created)
    useEffect(() => {
        // If the current path is invalid (e.g. deleted), reset to root
        // For now, just reset on root ID change
        if (rootSlice.id !== path[0].id) {
            setPath([rootSlice]);
        } else {
            // If we are deep in the tree, we need to make sure the path objects are up to date with the latest rootSlice data
            // This requires re-traversing or finding the node in the new tree.
            // Simplification: We will just try to update the current view reference if possible, otherwise reset.
            const refreshPath = (currentPath: PortfolioSlice[], currentRoot: PortfolioSlice): PortfolioSlice[] | null => {
                if (currentPath.length === 0) return [];
                if (currentPath[0].id !== currentRoot.id) return null; // Root mismatch

                const newPath = [currentRoot];
                let pointer = currentRoot;

                for (let i = 1; i < currentPath.length; i++) {
                    const nextId = currentPath[i].id;
                    const found = pointer.children?.find(c => c.id === nextId);
                    if (found) {
                        newPath.push(found);
                        pointer = found;
                    } else {
                        // Path broken
                        return [currentRoot];
                    }
                }
                return newPath;
            };

            const updatedPath = refreshPath(path, rootSlice);
            if (updatedPath) setPath(updatedPath);
        }
    }, [rootSlice]);

    const data = useMemo(() => {
        if (!currentView.children) return [];
        return currentView.children.map(child => ({
            name: child.name,
            value: child.targetAllocation,
            type: child.type,
            raw: child
        }));
    }, [currentView]);

    const handleSliceClick = (entry: any) => {
        if (entry.raw.type === SliceType.GROUP) {
            setPath([...path, entry.raw]);
        }
    };

    const handleBreadcrumbClick = (index: number) => {
        setPath(path.slice(0, index + 1));
    };

    // === REALLOCATION HELPERS (NEW) ===
    const calculateCurrentTotal = () => {
        if (!currentView.children) return 0;
        return currentView.children.reduce((sum, child) => sum + child.targetAllocation, 0);
    };

    const calculateProportionalRebalance = (desiredNewAllocation: number) => {
        if (!currentView.children) return [];
        const currentTotal = calculateCurrentTotal();
        const remainingAllocation = 100 - desiredNewAllocation;
        if (remainingAllocation <= 0 || currentTotal === 0) return [];
        const reductionFactor = remainingAllocation / currentTotal;
        return currentView.children.map(child => ({
            id: child.id,
            targetAllocation: Math.round(child.targetAllocation * reductionFactor * 100) / 100
        }));
    };

    const handleAllocationChange = (value: number) => {
        setNewAllocation(value);
        const currentTotal = calculateCurrentTotal();
        const newTotal = currentTotal + value;
        if (newTotal > 100) {
            setReallocationMode(true);
            setProposedRebalance([]);
        } else {
            setReallocationMode(false);
            setProposedRebalance([]);
        }
    };

    const handleRebalanceClick = () => {
        const rebalance = calculateProportionalRebalance(newAllocation);
        setProposedRebalance(rebalance);
    };


    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate ticker for HOLDING type
        if (newSliceType === SliceType.HOLDING && newSymbol) {
            setValidatingTicker(true);
            setTickerError(null);

            try {
                const isValid = await validateTicker(newSymbol);
                setValidatingTicker(false);

                if (!isValid) {
                    setTickerError('Invalid ticker symbol. Please check and try again.');
                    return;
                }
            } catch (error) {
                setValidatingTicker(false);
                setTickerError('Failed to validate ticker. Please try again.');
                return;
            }
        }

        // Proceed with adding slice
        if (onAddSlice && newName && newAllocation > 0) {
            // Pass rebalance updates if they exist
            const rebalanceData = proposedRebalance.length > 0 ? proposedRebalance : undefined;
            onAddSlice(currentView.id, newSliceType, newName, newSymbol || undefined, Number(newAllocation), rebalanceData);
            setShowAddModal(false);
            setNewName('');
            setNewSymbol('');
            setNewAllocation(0);
            setTickerError(null);
            setReallocationMode(false);
            setProposedRebalance([]);
        }
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (onRemoveSlice && confirm('Are you sure you want to remove this slice?')) {
            onRemoveSlice(id);
        }
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-800 border border-slate-700 p-2 rounded shadow-xl text-xs">
                    <p className="font-bold text-slate-200">{data.name}</p>
                    <p className="text-slate-400">Target: {data.value}%</p>
                    <p className="text-emerald-400">Est. Value: ${((totalValue * (data.value / 100))).toLocaleString()}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col h-full bg-slate-800 rounded-xl border border-slate-700 overflow-hidden relative">
            {/* Header / Breadcrumbs */}
            <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center space-x-2 overflow-x-auto">
                    {path.map((slice, index) => (
                        <div key={slice.id} className="flex items-center text-sm shrink-0">
                            {index > 0 && <ChevronRight className="w-4 h-4 text-slate-500 mx-1" />}
                            <div className={`flex items-center px-2 py-1 rounded hover:bg-slate-700 transition-colors ${index === path.length - 1 ? 'text-white font-semibold' : 'text-slate-400'}`}>
                                <button
                                    onClick={() => handleBreadcrumbClick(index)}
                                    className="flex items-center"
                                >
                                    {slice.type === SliceType.GROUP ? <Folder className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1" />}
                                    {slice.name}
                                </button>
                                {index === path.length - 1 && onRenameSlice && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newName = window.prompt("Rename Slice:", slice.name);
                                            if (newName && newName !== slice.name) {
                                                onRenameSlice(slice.id, newName);
                                            }
                                        }}
                                        className="ml-2 p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                                        title="Rename Slice"
                                    >
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    {/* Price controls */}
                    {showPrices && (
                        <>
                            {effectiveLoadingPrices && (
                                <div data-testid="price-loading" className="flex items-center gap-1 text-xs text-slate-400">
                                    <Loader className="w-3 h-3 animate-spin" />
                                    <span>Loading prices...</span>
                                </div>
                            )}
                            {effectiveLastUpdate && !effectiveLoadingPrices && (
                                <span className="text-xs text-slate-500">
                                    Updated {formatTimeAgo(effectiveLastUpdate)}
                                </span>
                            )}
                            {/* Always show refresh button when prices are enabled */}
                            <button
                                onClick={() => {
                                    if (onRefreshPrices) {
                                        onRefreshPrices();
                                    } else {
                                        // Internal refresh: clear cache and refetch
                                        setInternalPrices(new Map());
                                        setInternalLastUpdate(null);
                                    }
                                }}
                                disabled={effectiveLoadingPrices}
                                className="p-1.5 hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Refresh prices"
                                aria-label="Refresh prices"
                            >
                                <RefreshCw className={`w - 4 h - 4 ${effectiveLoadingPrices ? 'animate-spin' : ''} `} />
                            </button>
                        </>
                    )}
                    {currentView.type === SliceType.GROUP && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-lg transition-colors flex items-center gap-1 text-xs font-medium px-3"
                        >
                            <Plus className="w-3 h-3" /> Add Slice
                        </button>
                    )}
                </div>
            </div>

            {/* Strategy Prompt Display */}
            {currentView.strategyPrompt && (
                <div className="flex flex-col gap-2 bg-slate-800/50 px-3 py-2 rounded border border-slate-700 w-full max-w-3xl self-start mb-4 mx-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Strategy Goal:</span>
                        <div className="flex items-center gap-1">
                            {!isEditingPrompt && onUpdatePrompt && (
                                <button
                                    onClick={() => {
                                        setEditPromptText(currentView.strategyPrompt || '');
                                        setIsEditingPrompt(true);
                                    }}
                                    className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                                    title="Edit Prompt"
                                >
                                    <Pencil className="w-3 h-3" />
                                </button>
                            )}
                            {!isEditingPrompt && onVerifyStrategy && (
                                <button
                                    onClick={() => onVerifyStrategy(currentView)}
                                    className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-xs rounded border border-indigo-500/30 transition-colors flex items-center gap-1"
                                    title="Verify alignment with goal"
                                >
                                    <TrendingUp className="w-3 h-3" />
                                    Verify
                                </button>
                            )}
                        </div>
                    </div>

                    {isEditingPrompt ? (
                        <div className="flex flex-col gap-2">
                            <textarea
                                value={editPromptText}
                                onChange={(e) => setEditPromptText(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none min-h-[80px]"
                                placeholder="Enter strategy goal..."
                            />
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={() => setIsEditingPrompt(false)}
                                    className="px-3 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (onUpdatePrompt && editPromptText !== currentView.strategyPrompt) {
                                            onUpdatePrompt(currentView, editPromptText);
                                        }
                                        setIsEditingPrompt(false);
                                    }}
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pr-2">
                            <span className="text-sm text-slate-300 italic whitespace-pre-wrap">"{currentView.strategyPrompt}"</span>
                        </div>
                    )}
                </div>
            )}

            {/* Error Message */}
            {effectivePriceError && (
                <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                    {effectivePriceError}
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 flex flex-col md:flex-row p-4 gap-6 relative z-0">

                {/* Chart */}
                <div className="flex-1 min-h-[300px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                onClick={handleSliceClick}
                                cursor="pointer"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell - ${index} `}
                                        fill={COLORS[index % COLORS.length]}
                                        className="hover:opacity-80 transition-opacity outline-none"
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value, entry: any) => <span className="text-slate-300 ml-1">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <span className="text-xs text-slate-400 block">Total</span>
                            <span className="text-lg font-bold text-white">100%</span>
                        </div>
                    </div>
                </div>

                {/* List Details */}
                <div className="flex-1 overflow-y-auto pr-2 h-full min-h-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider flex justify-between">
                        <span>Allocation Breakdown</span>
                        <span className="text-xs normal-case opacity-50">Click items to drill down</span>
                    </h3>
                    <div className="space-y-2">
                        {data.map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleSliceClick({ raw: item.raw })}
                                className="group flex items-center justify-between p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg cursor-pointer border border-transparent hover:border-slate-600 transition-all relative"
                                data-testid={`holding-item-${item.name}`}
                            >
                                <div className="flex items-center">
                                    <div
                                        className="w-3 h-3 rounded-full mr-3"
                                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-white">{item.name}</p>
                                        <p className="text-xs text-slate-400">{item.raw.type === SliceType.GROUP ? 'Group' : item.raw.symbol || 'Holding'}</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-4">
                                    <div>
                                        <p className="text-sm font-bold text-white">{item.value}%</p>
                                        <p className="text-xs text-emerald-400 flex items-center justify-end">
                                            <DollarSign className="w-3 h-3" />
                                            {((totalValue * (item.value / 100))).toLocaleString()}
                                        </p>
                                        {/* Real-time price display */}
                                        {showPrices && item.raw.type === SliceType.HOLDING && item.raw.symbol && effectivePrices.has(item.raw.symbol) && (
                                            <p className="text-xs text-emerald-400 font-mono">
                                                ${effectivePrices.get(item.raw.symbol)?.toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, item.raw.id)}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {data.length === 0 && (
                            <div className="text-center p-8 text-slate-500 border border-dashed border-slate-700 rounded-lg">
                                Empty Group. Add a slice to get started.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Slice Modal Overlay */}
            {showAddModal && (
                <div className="absolute inset-0 bg-slate-900/90 z-20 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-xl shadow-2xl p-6" data-testid="add-slice-modal">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Add New Slice</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Type</label>
                                <div className="flex bg-slate-900 p-1 rounded-lg mb-4 border border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setNewSliceType(SliceType.HOLDING)}
                                        className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-all ${newSliceType === SliceType.HOLDING
                                            ? 'bg-indigo-600 text-white shadow-lg'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                            }`}
                                    >
                                        <TrendingUp className="w-4 h-4 mr-2" />
                                        Holding
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewSliceType(SliceType.GROUP)}
                                        className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-all ${newSliceType === SliceType.GROUP
                                            ? 'bg-indigo-600 text-white shadow-lg'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                            }`}
                                    >
                                        <Folder className="w-4 h-4 mr-2" />
                                        Group
                                    </button>
                                </div>
                            </div>

                            {newSliceType === SliceType.GROUP && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-400 mb-1">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-indigo-500 focus:outline-none"
                                        placeholder="e.g. Tech Sector"
                                    />
                                </div>
                            )}

                            {newSliceType === SliceType.HOLDING && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-400 mb-1">
                                        Ticker Name/Symbol
                                    </label>
                                    <TickerSearch
                                        value={newSymbol}
                                        onChange={setNewSymbol}
                                        onSelect={(symbol, name) => {
                                            setNewName(name);
                                            setNewSymbol(symbol);
                                        }}
                                        placeholder="e.g. AAPL or Apple"
                                    />
                                    {validatingTicker && (
                                        <p data-testid="validating-ticker" className="text-xs text-indigo-400 mt-1 flex items-center">
                                            <Loader className="w-3 h-3 mr-1 animate-spin" />
                                            Validating ticker...
                                        </p>
                                    )}
                                    {tickerError && (
                                        <p className="text-xs text-red-500 mt-1 pl-1 bg-red-500/10 p-1 rounded border border-red-500/20">{tickerError}</p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label htmlFor="target-allocation" className="block text-xs font-semibold text-slate-400 mb-1">Target Allocation (%)</label>
                                <input
                                    id="target-allocation"
                                    type="number"
                                    min="1" max="100"
                                    value={newAllocation}
                                    onChange={(e) => handleAllocationChange(Number(e.target.value))}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-indigo-500 focus:outline-none"
                                    required
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Remaining allocation will be adjusted automatically or flagged.</p>

                                {/* Reallocation Warning */}
                                {reallocationMode && (
                                    <div className="mt-3 p-3 border border-yellow-500/50 rounded-lg bg-yellow-500/5">
                                        <p className="text-sm text-yellow-400 mb-2 flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            Total allocation exceeds 100% by {Math.round((calculateCurrentTotal() + newAllocation - 100) * 100) / 100}%
                                        </p>

                                        {proposedRebalance.length === 0 ? (
                                            <button
                                                type="button"
                                                onClick={handleRebalanceClick}
                                                className="w-full bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium py-2 px-3 rounded transition-colors flex items-center justify-center gap-2"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                                Auto-Rebalance Proportionally
                                            </button>
                                        ) : (
                                            <div className="space-y-2" data-testid="rebalance-proposal">
                                                <p className="text-xs text-slate-300 font-medium">Proposed Reallocation:</p>
                                                {currentView.children?.map(child => {
                                                    const newAlloc = proposedRebalance.find(r => r.id === child.id);
                                                    return (
                                                        <div key={child.id} className="flex items-center justify-between text-xs">
                                                            <span className="text-slate-400">{child.name}</span>
                                                            <span className="text-slate-300">
                                                                {child.targetAllocation}% → <span className="text-green-400 font-bold">{newAlloc?.targetAllocation}%</span>
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                <p className="text-xs text-green-400 mt-2">✓ Total will be 100%</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>




                            <button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                disabled={validatingTicker}
                            >
                                {validatingTicker && <Loader className="w-4 h-4 animate-spin" />}
                                {validatingTicker ? 'Validating...' : 'Add Slice'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortfolioVisualizer;