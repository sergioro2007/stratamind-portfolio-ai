import React, { useState, useMemo } from 'react';
import { PortfolioSlice, SliceType } from '../types';
import { Trash2, AlertTriangle, CheckCircle, PieChart, TrendingUp, Folder, Plus, X, Edit3 } from 'lucide-react';
import TickerSearch from './TickerSearch';

interface ManageSlicesModalProps {
    currentSlice: PortfolioSlice; // The slice being managed (to show/edit its name)
    slices: PortfolioSlice[]; // Children slices to manage
    onSave: (updatedSliceName: string, updatedSlices: PortfolioSlice[]) => void;
    onClose: () => void;
    totalValue: number;
    onAddSlice?: (type: SliceType, name: string, symbol: string | undefined, allocation: number) => void;
}

export const ManageSlicesModal: React.FC<ManageSlicesModalProps> = ({
    currentSlice,
    slices,
    onSave,
    onClose,
    totalValue,
    onAddSlice
}) => {

    // Local State - deep clone to avoid mutating props
    const [sliceName, setSliceName] = useState(currentSlice.name);
    const [localSlices, setLocalSlices] = useState<PortfolioSlice[]>(JSON.parse(JSON.stringify(slices)));

    // Add Slice State
    const [showAddForm, setShowAddForm] = useState(false);
    const [newSliceType, setNewSliceType] = useState<SliceType>(SliceType.HOLDING); // Default to HOLDING
    const [newSliceName, setNewSliceName] = useState('');
    const [newSliceSymbol, setNewSliceSymbol] = useState('');
    const [newSliceAllocation, setNewSliceAllocation] = useState('0');

    // Validation Calculation
    const totalAllocation = useMemo(() => {
        return localSlices.reduce((sum, s) => sum + (s.targetAllocation || 0), 0);
    }, [localSlices]);

    const isValid = localSlices.length === 0 || totalAllocation === 100;

    const handleNameChange = (id: string, newName: string) => {
        setLocalSlices(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
    };

    const handleAllocationChange = (id: string, newVal: string) => {
        const num = parseInt(newVal) || 0;
        setLocalSlices(prev => prev.map(s => s.id === id ? { ...s, targetAllocation: num } : s));
    };

    const handleDeleteSlice = (id: string) => {
        setLocalSlices(prev => prev.filter(s => s.id !== id));
    };

    const handleAddSliceSubmit = () => {
        if (!newSliceName.trim()) return;
        if (newSliceType === SliceType.HOLDING && !newSliceSymbol.trim()) return;
        if (!newSliceAllocation || parseInt(newSliceAllocation) <= 0) return;

        // Create new slice and add to local state immediately
        const newSlice: PortfolioSlice = {
            id: `new-slice-${Date.now()}`,
            parentId: currentSlice.id,
            type: newSliceType,
            name: newSliceName,
            symbol: newSliceType === SliceType.HOLDING ? newSliceSymbol : undefined,
            targetAllocation: parseInt(newSliceAllocation) || 0,
            currentValue: 0,
            children: []
        };

        // Add to local state - will be saved when user clicks "Save Changes"
        setLocalSlices(prev => [...prev, newSlice]);

        // Reset form
        setNewSliceName('');
        setNewSliceSymbol('');
        setNewSliceAllocation('0');
        setShowAddForm(false);
    };

    const handleSave = () => {
        if (!isValid) return;
        onSave(sliceName, localSlices);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200" data-testid="manage-slices-modal">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Manage Portfolio</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Portfolio Name Section */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Edit3 className="w-4 h-4" /> Portfolio Name
                        </h3>
                        <input
                            type="text"
                            value={sliceName}
                            onChange={e => setSliceName(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Portfolio name"
                        />
                    </div>

                    {/* Slices Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <PieChart className="w-4 h-4" /> Slice Allocations
                            </h3>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 ${isValid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                }`}>
                                {isValid ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                Total: {totalAllocation}% {isValid ? '(Valid)' : '(Must equal 100%)'}
                            </div>
                        </div>

                        <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                            {localSlices.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    No slices yet. Click "Add Slice" below to get started.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-700/50">
                                    {localSlices.map(slice => (
                                        <div key={slice.id} className="p-4 flex items-center gap-4 hover:bg-slate-800 transition-colors">
                                            {/* Icon */}
                                            <div className="flex-shrink-0">
                                                {slice.type === SliceType.GROUP ? (
                                                    <Folder className="w-5 h-5 text-indigo-400" />
                                                ) : (
                                                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                                                )}
                                            </div>

                                            {/* Name Input */}
                                            <div className="flex-1 min-w-0">
                                                <input
                                                    type="text"
                                                    value={slice.name}
                                                    onChange={e => handleNameChange(slice.id, e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    placeholder="Slice name"
                                                />
                                                {slice.type === SliceType.HOLDING && slice.symbol && (
                                                    <p className="text-xs text-slate-500 mt-1 ml-1">{slice.symbol}</p>
                                                )}
                                            </div>

                                            {/* Allocation Input */}
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={slice.targetAllocation}
                                                    onChange={e => handleAllocationChange(slice.id, e.target.value)}
                                                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-right font-mono text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    min="0"
                                                    max="100"
                                                />
                                                <span className="text-slate-500 text-sm">%</span>
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => handleDeleteSlice(slice.id)}
                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Delete Slice"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add Slice Button/Form */}
                        {currentSlice.type === SliceType.GROUP && (
                            <div className="border-t border-slate-700 pt-4">
                                {!showAddForm ? (
                                    <button
                                        onClick={() => setShowAddForm(true)}
                                        className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-sm font-medium"
                                    >
                                        <Plus className="w-4 h-4" /> Add Slice
                                    </button>
                                ) : (
                                    <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-white">Add New Slice</h4>
                                            <button onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-white">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Type Selection */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setNewSliceType(SliceType.GROUP)}
                                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${newSliceType === SliceType.GROUP
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                    }`}
                                            >
                                                Group
                                            </button>
                                            <button
                                                onClick={() => setNewSliceType(SliceType.HOLDING)}
                                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${newSliceType === SliceType.HOLDING
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                    }`}
                                            >
                                                Holding
                                            </button>
                                        </div>

                                        {/* Group Name Input OR Ticker Search for Holdings */}
                                        {newSliceType === SliceType.GROUP ? (
                                            <input
                                                type="text"
                                                value={newSliceName}
                                                onChange={e => setNewSliceName(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Group name (e.g. Tech, Energy)"
                                            />
                                        ) : (
                                            <TickerSearch
                                                value={newSliceSymbol}
                                                onChange={(symbol) => setNewSliceSymbol(symbol)}
                                                onSelect={(symbol, name) => {
                                                    setNewSliceSymbol(symbol);
                                                    setNewSliceName(name);
                                                }}
                                                placeholder="Search by ticker or company name..."
                                            />
                                        )}

                                        {/* Allocation Input */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={newSliceAllocation}
                                                onChange={e => setNewSliceAllocation(e.target.value)}
                                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="Allocation %"
                                                min="0"
                                                max="100"
                                            />
                                            <span className="text-slate-400 text-sm">%</span>
                                        </div>

                                        {/* Add Button */}
                                        <button
                                            onClick={handleAddSliceSubmit}
                                            disabled={!newSliceName.trim() || (newSliceType === SliceType.HOLDING && !newSliceSymbol.trim())}
                                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Add Slice
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isValid || !sliceName.trim()}
                        className={`px-6 py-2 text-sm font-medium rounded-lg transition-all ${isValid && sliceName.trim()
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                    >
                        Save Changes
                    </button>
                </div>

            </div>
        </div>
    );
};
