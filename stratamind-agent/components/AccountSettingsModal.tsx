import React, { useState, useMemo } from 'react';
import { Account, PortfolioSlice } from '../types';
import { Trash2, AlertTriangle, CheckCircle, PieChart, Coins } from 'lucide-react';

interface AccountSettingsModalProps {
    account: Account;
    onSave: (updatedAccount: Account) => void;
    onClose: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ account, onSave, onClose }) => {

    // Local State
    const [name, setName] = useState(account.name);
    const [totalValue, setTotalValue] = useState(account.totalValue.toString());
    const [cashBalance, setCashBalance] = useState(account.cashBalance.toString());
    const [strategies, setStrategies] = useState<PortfolioSlice[]>(JSON.parse(JSON.stringify(account.strategies)));

    // Validation Calculation
    const totalAllocation = useMemo(() => {
        return strategies.reduce((sum, s) => sum + (s.targetAllocation || 0), 0);
    }, [strategies]);

    const isValid = strategies.length === 0 || totalAllocation === 100;
    const isValueValid = !isNaN(parseFloat(totalValue)) && parseFloat(totalValue) >= 0;
    const isCashValid = !isNaN(parseFloat(cashBalance)) && parseFloat(cashBalance) >= 0;

    const handleAllocationChange = (id: string, newVal: string) => {
        const num = parseInt(newVal) || 0;
        setStrategies(prev => prev.map(s => s.id === id ? { ...s, targetAllocation: num } : s));
    };

    const handleDeleteStrategy = (id: string) => {
        if (window.confirm("Delete this strategy? This cannot be undone.")) {
            // Deleting might drop it below 100. User must manually fix others.
            setStrategies(prev => prev.filter(s => s.id !== id));
        }
    };

    const handleSave = () => {
        if (!isValid || !isValueValid || !isCashValid) return;

        const updatedAccount: Account = {
            ...account,
            name: name,
            totalValue: parseFloat(totalValue),
            cashBalance: parseFloat(cashBalance),
            strategies: strategies
        };
        onSave(updatedAccount);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200" data-testid="account-settings-modal">

                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Account Settings</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* General Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Coins className="w-4 h-4" /> General Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="account-name" className="block text-xs text-slate-500 mb-1">Account Name</label>
                                <input
                                    id="account-name"
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label htmlFor="total-value" className="block text-xs text-slate-500 mb-1">Total Value ($)</label>
                                <input
                                    id="total-value"
                                    type="number"
                                    value={totalValue}
                                    onChange={e => setTotalValue(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label htmlFor="cash-balance" className="block text-xs text-slate-500 mb-1">Cash Balance ($)</label>
                                <input
                                    id="cash-balance"
                                    type="number"
                                    value={cashBalance}
                                    onChange={e => setCashBalance(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Strategies Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <PieChart className="w-4 h-4" /> Strategy Allocations
                            </h3>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 ${isValid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                }`}>
                                {isValid ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                Total: {totalAllocation}% {isValid ? '(Valid)' : '(Must equal 100%)'}
                            </div>
                        </div>

                        <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                            {strategies.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    No strategies found. Ask AI to create one.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-700/50">
                                    {strategies.map(strat => (
                                        <div key={strat.id} className="p-4 flex items-center gap-4 hover:bg-slate-800 transition-colors">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-200 truncate">{strat.name}</p>
                                                <p className="text-xs text-slate-500 truncate" title={strat.strategyPrompt}>{strat.strategyPrompt}</p>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={strat.targetAllocation}
                                                        onChange={e => handleAllocationChange(strat.id, e.target.value)}
                                                        className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right font-mono text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    />
                                                    <span className="text-slate-500 text-sm">%</span>
                                                </div>

                                                <button
                                                    onClick={() => handleDeleteStrategy(strat.id)}
                                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete Strategy"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
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
                        disabled={!isValid || !isValueValid || !isCashValid}
                        className={`px-6 py-2 text-sm font-medium rounded-lg transition-all ${isValid && isValueValid && isCashValid
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
