import React, { useState, useEffect, useMemo } from 'react';
import { Layout, DollarSign, Plus, Settings, ChevronRight, Send, Loader2, Pencil, Trash2, PieChart, TrendingUp, Shield, Menu, X, Activity } from 'lucide-react';
import PortfolioVisualizer from './components/PortfolioVisualizer';
import { PortfolioSlice, Account, Institution, SliceType } from './types';
import { db } from './services/database';
import { startChatSession } from './services/geminiService';
import ChatPanel from './components/ChatPanel';
import { Message, Sender, AIProposal } from './types';
import { generateId, buildStrategyFromAI } from './services/portfolioFactory';
import { calculateEqualRebalance, calculateSetOneRebalance } from './utils/rebalanceHelpers';
// Import the new modal component
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { PerformanceChart } from './components/PerformanceChart';
import { PerformanceStatsDisplay } from './components/PerformanceStats';
import { PerformanceSnapshot, PerformanceStats, TimeRange } from './types';

// --- MOCK DATA FOR VISUALIZATION ---
const MOCK_HISTORY: PerformanceSnapshot[] = Array.from({ length: 30 }).map((_, i) => {
    const baseValue = 100000;
    const volatility = 0.02;
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));

    // Random walk
    const value = baseValue * (1 + (Math.sin(i * 0.5) * 0.05) + (Math.random() * volatility - volatility / 2));

    return {
        id: `mock-${i}`,
        timestamp: date.getTime(),
        accountId: 'mock-acc',
        totalValue: value,
        cashBalance: value * 0.1,
        holdingsValue: value * 0.9,
        dayChange: 0,
        dayChangePercent: 0
    };
});

const MOCK_STATS: PerformanceStats = {
    current: 112500,
    dayChange: 1250,
    dayChangePercent: 1.12,
    weekChange: 3500,
    weekChangePercent: 3.2,
    monthChange: 12500,
    monthChangePercent: 12.5,
    allTimeHigh: 115000,
    allTimeLow: 95000
};

function App() {
    // -------------------------------------------------------------------------
    // STATE: Data Model
    // -------------------------------------------------------------------------
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeInstitutionId, setActiveInstitutionId] = useState<string | null>(null);
    const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
    const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);

    // -------------------------------------------------------------------------
    // STATE: UI / Modals
    // -------------------------------------------------------------------------
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showAddSliceModal, setShowAddSliceModal] = useState(false);
    const [editingValue, setEditingValue] = useState<{
        type: 'NAME' | 'VALUE' | 'CASH' | 'INSTITUTION' | 'STRATEGY_ALLOCATION' | 'ADD_INSTITUTION' | 'ADD_ACCOUNT' | 'DELETE_INSTITUTION' | 'DELETE_ACCOUNT' | 'ADD_STRATEGY',
        id?: string,
        secondaryId?: string,
        strategyId?: string,
        value: string
    } | null>(null);

    // New State for consolidated settings
    const [editingAccountSettings, setEditingAccountSettings] = useState<{ instId: string, accId: string } | null>(null);

    // -------------------------------------------------------------------------
    // STATE: Performance Data
    // -------------------------------------------------------------------------
    const [performanceHistory, setPerformanceHistory] = useState<PerformanceSnapshot[]>([]);
    const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
    const [timeRange, setTimeRange] = useState<TimeRange>('1M');
    const [isPerformanceLoading, setIsPerformanceLoading] = useState(false);

    // -------------------------------------------------------------------------
    // STATE: AI Chat
    // -------------------------------------------------------------------------
    const [chatMessages, setChatMessages] = useState<Message[]>([
        { id: '1', text: "Hello! I'm StrataMind AI. How can I help you build your portfolio today?", sender: Sender.AI, timestamp: Date.now() }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [chatSession, setChatSession] = useState<any>(null);
    const [pendingProposal, setPendingProposal] = useState<AIProposal | null>(null);
    const [lastUserMessage, setLastUserMessage] = useState<string>("");

    // -------------------------------------------------------------------------
    // INIT & EFFECT
    // -------------------------------------------------------------------------
    useEffect(() => {
        const initData = async () => {
            try {
                setIsLoading(true);
                const loaded = await db.load();
                setInstitutions(loaded);
                if (loaded.length > 0) {
                    setActiveInstitutionId(loaded[0].id);
                    if (loaded[0].accounts.length > 0) {
                        setActiveAccountId(loaded[0].accounts[0].id);
                        if (loaded[0].accounts[0].strategies.length > 0) {
                            setSelectedStrategyId(loaded[0].accounts[0].strategies[0].id);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to init data", e);
            } finally {
                setIsLoading(false);
            }
        };

        const initChat = async () => {
            const session = await startChatSession();
            setChatSession(session);
        };

        initData();
        initChat();
    }, []);

    // -------------------------------------------------------------------------
    // DERIVED STATE (Active Context)
    // -------------------------------------------------------------------------
    const activeInstitution = institutions.find(i => i.id === activeInstitutionId);
    const activeAccount = activeInstitution?.accounts.find(a => a.id === activeAccountId);

    // Determine which strategy to show
    const activeStrategy = useMemo(() => {
        if (!activeAccount) return null;
        if (!selectedStrategyId) return null; // Show nothing or Dashboard if null

        // Recursive search for the selected Strategy/Slice
        const findSlice = (slices: PortfolioSlice[]): PortfolioSlice | null => {
            for (const slice of slices) {
                if (slice.id === selectedStrategyId) return slice;
                if (slice.children) {
                    const found = findSlice(slice.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return findSlice(activeAccount.strategies);
    }, [activeAccount, selectedStrategyId]);

    // Auto-select first strategy when account changes
    useEffect(() => {
        if (activeAccount && activeAccount.strategies.length > 0) {
            // Check if current selection is valid for this account
            const isSelectionValid = (slices: PortfolioSlice[], id: string): boolean => {
                for (const slice of slices) {
                    if (slice.id === id) return true;
                    if (slice.children && isSelectionValid(slice.children, id)) return true;
                }
                return false;
            };

            if (!selectedStrategyId || !isSelectionValid(activeAccount.strategies, selectedStrategyId)) {
                setSelectedStrategyId(activeAccount.strategies[0].id);
            }
        }
    }, [activeAccount, selectedStrategyId]);


    // -------------------------------------------------------------------------
    // ACTIONS: Portfolio Management
    // -------------------------------------------------------------------------
    const handleAddInstitution = async () => {
        setEditingValue({ type: 'ADD_INSTITUTION', value: '' });
    };

    const handleAddAccount = async (instId: string) => {
        setEditingValue({ type: 'ADD_ACCOUNT', id: instId, value: '' });
    };

    const handleAddSlice = (parentId: string | null) => {
        // Just open modal, logic handled in PortfolioVisualizer
        setShowAddSliceModal(true);
    };

    const handleAddSliceWithRebalance = async (
        parentId: string,
        type: SliceType,
        name: string,
        symbol: string | undefined,
        allocation: number,
        rebalanceUpdates?: Array<{ id: string, targetAllocation: number }>
    ) => {
        if (!activeAccount) return;

        // Check for existing ticker in any strategy (Requirement 39)
        let existingSlice: PortfolioSlice | undefined;
        const findExisting = (slices: PortfolioSlice[]) => {
            for (const s of slices) {
                if (type === SliceType.HOLDING && symbol && s.symbol === symbol) {
                    existingSlice = s;
                    return;
                }
                if (s.children) findExisting(s.children);
                if (existingSlice) return;
            }
        };
        findExisting(activeAccount.strategies);

        // Update tree: remove existing if found, then add/update at new parent
        const updateTree = (slices: PortfolioSlice[]): PortfolioSlice[] => {
            // First, remove existing slice from its current position
            let cleanedSlices = slices;
            if (existingSlice) {
                const removeFromTree = (items: PortfolioSlice[]): PortfolioSlice[] => {
                    return items
                        .filter(item => item.id !== existingSlice!.id)
                        .map(item => ({
                            ...item,
                            children: item.children ? removeFromTree(item.children) : (item.children)
                        }));
                };
                cleanedSlices = removeFromTree(slices);
            }

            // Then add/update at the target parent
            const addToParent = (items: PortfolioSlice[]): PortfolioSlice[] => {
                return items.map(item => {
                    if (item.id === parentId) {
                        const sliceToInsert: PortfolioSlice = existingSlice
                            ? { ...existingSlice, parentId, name, targetAllocation: allocation }
                            : {
                                id: generateId(),
                                parentId,
                                type,
                                name,
                                symbol,
                                targetAllocation: allocation,
                                currentValue: 0
                            };

                        let updatedChildren = [...(item.children || []), sliceToInsert];

                        if (rebalanceUpdates) {
                            updatedChildren = updatedChildren.map(child => {
                                const update = rebalanceUpdates.find(u => u.id === child.id);
                                return update ? { ...child, targetAllocation: update.targetAllocation } : child;
                            });
                        }
                        return { ...item, children: updatedChildren };
                    }
                    if (item.children) return { ...item, children: addToParent(item.children) };
                    return item;
                });
            };

            return addToParent(cleanedSlices);
        };

        const updatedStrategies = updateTree(activeAccount.strategies);
        await updateActiveAccount({ strategies: updatedStrategies });
    };

    const handleSelectStrategy = (strategyId: string) => {
        setSelectedStrategyId(strategyId);
    };


    // -------------------------------------------------------------------------
    // ACTIONS: Consolidated Account Settings
    // -------------------------------------------------------------------------
    const handleSaveAccountSettings = async (updatedAccount: Account) => {
        if (!editingAccountSettings) return;

        // In a real API, we'd send the full updated account object or diffs
        // Here we call specific methods or just a generic update
        // Since we are moving to atomic backend calls, this "save whole account" pattern is tricky.
        // For now, let's assume updateAccountDetails handles the heavy lifting
        // merging the new strategies/cash/value

        // We might need to split this into: Rename Account, Update Value, Update Strategies (Batch?)
        // simplified:
        const updated = await db.updateAccountDetails(
            editingAccountSettings.instId,
            editingAccountSettings.accId,
            updatedAccount
        );
        setInstitutions(updated);

        setEditingAccountSettings(null);
    };



    const handleDeleteInstitution = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setEditingValue({ type: 'DELETE_INSTITUTION', id, value: '' });
    };

    const handleDeleteAccount = async (instId: string, accId: string) => {
        setEditingValue({ type: 'DELETE_ACCOUNT', id: instId, secondaryId: accId, value: '' });
    };

    // Updated Handlers to use Modals
    const handleRenameInstitution = (e: React.MouseEvent, id: string, currentName: string) => {
        e.stopPropagation();
        setEditingValue({ type: 'INSTITUTION', id, value: currentName });
    };

    const handleOpenSettings = (e: React.MouseEvent, instId: string, accId: string) => {
        e.stopPropagation();
        setEditingAccountSettings({ instId, accId });
    };

    const saveEditValue = async () => {
        if (!editingValue) return;

        try {
            let updated: Institution[] | null = null;

            if (editingValue.type === 'INSTITUTION' && editingValue.id) {
                updated = await db.updateInstitution(editingValue.id, editingValue.value);
            } else if (editingValue.type === 'ADD_INSTITUTION') {
                updated = await db.createInstitution(editingValue.value);
            } else if (editingValue.type === 'ADD_ACCOUNT' && editingValue.id) {
                updated = await db.createAccount(editingValue.id, editingValue.value, 'Brokerage');
            } else if (editingValue.type === 'DELETE_INSTITUTION' && editingValue.id) {
                updated = await db.deleteInstitution(editingValue.id);
                if (activeInstitutionId === editingValue.id) {
                    setActiveInstitutionId(null);
                    setActiveAccountId(null);
                }
            } else if (editingValue.type === 'DELETE_ACCOUNT' && editingValue.id && editingValue.secondaryId) {
                updated = await db.deleteAccount(editingValue.id, editingValue.secondaryId);
                if (activeAccountId === editingValue.secondaryId) {
                    setActiveAccountId(null);
                    setSelectedStrategyId(null);
                }
            } else if (editingValue.type === 'ADD_STRATEGY' && activeInstitutionId && activeAccountId) {
                const newId = generateId();
                const newStrategy: PortfolioSlice = {
                    id: newId,
                    parentId: null,
                    type: SliceType.GROUP,
                    name: editingValue.value,
                    targetAllocation: 100,
                    currentValue: 0,
                    children: []
                };

                setInstitutions(prev => {
                    const next = prev.map(i => {
                        if (i.id === activeInstitutionId) {
                            return {
                                ...i,
                                accounts: i.accounts.map(a => {
                                    if (a.id === activeAccountId) {
                                        return { ...a, strategies: [...a.strategies, newStrategy] };
                                    }
                                    return a;
                                })
                            };
                        }
                        return i;
                    });

                    // Sync in background
                    const updatedAcc = next.find(i => i.id === activeInstitutionId)?.accounts.find(a => a.id === activeAccountId);
                    if (updatedAcc) {
                        db.updateAccountDetails(activeInstitutionId, activeAccountId, { strategies: updatedAcc.strategies });
                    }
                    return next;
                });

                setSelectedStrategyId(newId);
                updated = null;
            }

            if (updated) {
                setInstitutions(updated);
            }
            setEditingValue(null);
        } catch (error) {
            console.error("Failed to save edit:", error);
            alert("An error occurred while saving. Please try again.");
            // Optionally keep the modal open? Or close it?
            // For now, let's keep it open so they can retry or cancel
        }
    };

    const handleRenameSlice = async (sliceId: string, newName: string) => {
        if (!activeAccount) return;
        // Note: Atomic update for slice renaming not yet in top-level DB API, 
        // so we rely on updateActiveAccount which pushes the whole object.
        // Ideally: await db.renameSlice(...)

        // Helper to update tree deeply
        const updateTree = (slices: PortfolioSlice[]): PortfolioSlice[] => {
            return slices.map(s => {
                if (s.id === sliceId) return { ...s, name: newName };
                if (s.children) return { ...s, children: updateTree(s.children) };
                return s;
            });
        };

        const updatedStrategies = updateTree(activeAccount.strategies);
        await updateActiveAccount({ strategies: updatedStrategies });
    };

    const handleRemoveSlice = async (sliceId: string) => {
        if (!activeAccount) return;

        const removeFromTree = (slices: PortfolioSlice[]): PortfolioSlice[] => {
            return slices
                .filter(s => s.id !== sliceId) // Filter out the specific slice
                .map(s => {
                    if (s.children) return { ...s, children: removeFromTree(s.children) };
                    return s;
                });
        };

        const updatedStrategies = removeFromTree(activeAccount.strategies);
        await updateActiveAccount({ strategies: updatedStrategies });
    };

    const handleUpdatePrompt = async (sliceId: string, newPrompt: string) => {
        if (!activeAccount) return;
        const updateTree = (slices: PortfolioSlice[]): PortfolioSlice[] => {
            return slices.map(s => {
                if (s.id === sliceId) return { ...s, strategyPrompt: newPrompt };
                if (s.children) return { ...s, children: updateTree(s.children) };
                return s;
            });
        };
        const updatedStrategies = updateTree(activeAccount.strategies);
        await updateActiveAccount({ strategies: updatedStrategies });
    };


    const handleAddTickerToStructure = async (symbol: string, allocation: number, groupName?: string, autoRebalance: boolean = true) => {
        if (!activeAccount || !activeStrategy) return;

        // Find target parent (group or root strategy)
        let targetParentId = activeStrategy.id;

        if (groupName) {
            // Find the group by name (fuzzy match)
            const findGroup = (slices: PortfolioSlice[]): PortfolioSlice | null => {
                for (const s of slices) {
                    if (s.name.toLowerCase().includes(groupName.toLowerCase()) && s.type === SliceType.GROUP) {
                        return s;
                    }
                    if (s.children) {
                        const found = findGroup(s.children);
                        if (found) return found;
                    }
                }
                return null;
            };

            const targetGroup = findGroup(activeAccount.strategies);
            if (targetGroup) {
                targetParentId = targetGroup.id;
            }
        }

        // Calculate if rebalancing is needed
        const findParent = (slices: PortfolioSlice[]): PortfolioSlice | null => {
            for (const s of slices) {
                if (s.id === targetParentId) return s;
                if (s.children) {
                    const found = findParent(s.children);
                    if (found) return found;
                }
            }
            return null;
        };

        const parent = findParent(activeAccount.strategies);
        if (!parent) return;

        const currentTotal = (parent.children || []).reduce((sum, child) => sum + child.targetAllocation, 0);
        const newTotal = currentTotal + allocation;

        let rebalanceUpdates: Array<{ id: string, targetAllocation: number }> | undefined;

        if (newTotal > 100 && autoRebalance && parent.children && parent.children.length > 0) {
            // Calculate proportional rebalance
            const remainingAllocation = 100 - allocation;
            const reductionFactor = remainingAllocation / currentTotal;

            rebalanceUpdates = parent.children.map(child => ({
                id: child.id,
                targetAllocation: Math.round(child.targetAllocation * reductionFactor * 100) / 100
            }));
        }

        // Use the existing rebalance handler
        await handleAddSliceWithRebalance(
            targetParentId,
            SliceType.HOLDING,
            symbol,
            symbol,
            allocation,
            rebalanceUpdates
        );

        setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: rebalanceUpdates
                ? `Added ${symbol} (${allocation}%) and rebalanced existing holdings to maintain 100% allocation.`
                : `Added ${symbol} (${allocation}%) to portfolio.`,
            sender: Sender.AI,
            timestamp: Date.now()
        }]);
    };

    const handleRemoveTickerFromStructure = async (symbol: string) => {
        if (!activeAccount) return;

        const removeFromTree = (slices: PortfolioSlice[]): PortfolioSlice[] => {
            return slices
                .filter(s => s.symbol !== symbol && s.name !== symbol) // Filter out matching
                .map(s => {
                    if (s.children) return { ...s, children: removeFromTree(s.children) };
                    return s;
                });
        };

        const updatedStrategies = removeFromTree(activeAccount.strategies);
        await updateActiveAccount({ strategies: updatedStrategies });

        setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: `Removed ${symbol} from portfolio.`,
            sender: Sender.AI,
            timestamp: Date.now()
        }]);
    };

    const handleRebalancePortfolio = async (groupName?: string) => {
        if (!activeAccount || !activeStrategy) return;

        // Find target (group or root strategy)
        let target: PortfolioSlice = activeStrategy;

        if (groupName) {
            // Find the group by name (fuzzy match)
            const findGroup = (slices: PortfolioSlice[]): PortfolioSlice | null => {
                for (const s of slices) {
                    if (s.name.toLowerCase().includes(groupName.toLowerCase()) && s.type === SliceType.GROUP) {
                        return s;
                    }
                    if (s.children) {
                        const found = findGroup(s.children);
                        if (found) return found;
                    }
                }
                return null;
            };

            const targetGroup = findGroup(activeAccount.strategies);
            if (targetGroup) {
                target = targetGroup;
            } else {
                setChatMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    text: `Group "${groupName}" not found.`,
                    sender: Sender.AI,
                    timestamp: Date.now()
                }]);
                return;
            }
        }

        if (!target.children || target.children.length === 0) {
            setChatMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: 'No holdings to rebalance.',
                sender: Sender.AI,
                timestamp: Date.now()
            }]);
            return;
        }

        // Calculate equal rebalance
        const rebalanceUpdates = calculateEqualRebalance(target.children);

        // Apply updates to tree
        const applyRebalance = (slices: PortfolioSlice[]): PortfolioSlice[] => {
            return slices.map(s => {
                if (s.id === target.id) {
                    // Update this node's children
                    const updatedChildren = s.children!.map(child => {
                        const update = rebalanceUpdates.find(u => u.id === child.id);
                        if (update) {
                            return { ...child, targetAllocation: update.targetAllocation };
                        }
                        return child;
                    });
                    return { ...s, children: updatedChildren };
                }
                if (s.children) return { ...s, children: applyRebalance(s.children) };
                return s;
            });
        };

        const updatedStrategies = applyRebalance(activeAccount.strategies);
        await updateActiveAccount({ strategies: updatedStrategies });

        const holdingsCount = target.children.filter(c => c.type === SliceType.HOLDING).length;
        setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: `Rebalanced ${holdingsCount} holdings to equal allocations.`,
            sender: Sender.AI,
            timestamp: Date.now()
        }]);
    };

    const handleUpdateAllocation = async (symbol: string, allocation: number, groupName?: string) => {
        if (!activeAccount || !activeStrategy) return;

        // Find target parent (group or root strategy)
        let target: PortfolioSlice = activeStrategy;

        if (groupName) {
            const findGroup = (slices: PortfolioSlice[]): PortfolioSlice | null => {
                for (const s of slices) {
                    if (s.name.toLowerCase().includes(groupName.toLowerCase()) && s.type === SliceType.GROUP) {
                        return s;
                    }
                    if (s.children) {
                        const found = findGroup(s.children);
                        if (found) return found;
                    }
                }
                return null;
            };

            const targetGroup = findGroup(activeAccount.strategies);
            if (targetGroup) {
                target = targetGroup;
            }
        }

        if (!target.children || target.children.length === 0) {
            setChatMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: 'No holdings found to update.',
                sender: Sender.AI,
                timestamp: Date.now()
            }]);
            return;
        }

        // Find the target holding
        const targetHolding = target.children.find(
            child => child.symbol?.toLowerCase() === symbol.toLowerCase() ||
                child.name.toLowerCase() === symbol.toLowerCase()
        );

        if (!targetHolding) {
            setChatMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: `Holding "${symbol}" not found.`,
                sender: Sender.AI,
                timestamp: Date.now()
            }]);
            return;
        }

        // Calculate set-one rebalance
        const rebalanceUpdates = calculateSetOneRebalance(target.children, targetHolding.id, allocation);

        // Apply updates to tree
        const applyRebalance = (slices: PortfolioSlice[]): PortfolioSlice[] => {
            return slices.map(s => {
                if (s.id === target.id) {
                    const updatedChildren = s.children!.map(child => {
                        const update = rebalanceUpdates.find(u => u.id === child.id);
                        if (update) {
                            return { ...child, targetAllocation: update.targetAllocation };
                        }
                        return child;
                    });
                    return { ...s, children: updatedChildren };
                }
                if (s.children) return { ...s, children: applyRebalance(s.children) };
                return s;
            });
        };

        const updatedStrategies = applyRebalance(activeAccount.strategies);
        await updateActiveAccount({ strategies: updatedStrategies });

        const holdingsCount = target.children.filter(c => c.type === SliceType.HOLDING).length;
        setChatMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: `Set ${symbol} to ${allocation}% and rebalanced ${holdingsCount - 1} other holdings.`,
            sender: Sender.AI,
            timestamp: Date.now()
        }]);
    };

    const updateActiveAccount = async (updates: Partial<Account>) => {
        if (!activeInstitution || !activeAccount) return;
        const updated = await db.updateAccountDetails(activeInstitution.id, activeAccount.id, updates);
        setInstitutions(updated);
    };

    // -------------------------------------------------------------------------
    // ACTIONS: AI & Chat
    // -------------------------------------------------------------------------
    const handleSendMessage = async (text: string) => {
        // Add User Message
        const userMsg: Message = { id: Date.now().toString(), text, sender: Sender.USER, timestamp: Date.now() };
        setChatMessages(prev => [...prev, userMsg]);
        setIsTyping(true);
        setLastUserMessage(text); // Track for context

        try {
            // Send to Gemini
            // Construct Context String
            let contextPrompt = `User Query: "${text}"\n`;
            if (activeAccount) {
                const simplePortfolio = {
                    name: activeAccount.name,
                    id: activeAccount.id,
                    currentValue: activeAccount.totalValue,
                    cash: activeAccount.cashBalance,
                    strategies: activeAccount.strategies.map(s => ({
                        id: s.id,
                        name: s.name,
                        type: s.type,
                        allocation: s.targetAllocation,
                        childrenCount: s.children?.length || 0
                    }))
                };
                contextPrompt += `\n[Current Account Context]:\n${JSON.stringify(simplePortfolio, null, 2)}`;
            }

            // Send to Gemini 2.0 (New SDK)
            // sendMessage expects { message: string | Content }
            const result = await chatSession.sendMessage({
                message: contextPrompt
            });

            console.log("DEBUG: Received AI Result Keys:", Object.keys(result));

            // In @google/genai, result HAS getters for text and functionCalls directly
            const replyText = result.text;
            const functionCalls = result.functionCalls;

            // Check for Function Calls (Proposals)
            if (functionCalls && functionCalls.length > 0) {
                for (const call of functionCalls) {
                    // For demo, we only handle create_portfolio_structure
                    if (call.name === 'create_portfolio_structure') {
                        const { strategyName, groups, holdings } = call.args;
                        const proposal: AIProposal = {
                            id: generateId(),
                            type: 'CREATE_PORTFOLIO',
                            toolName: 'create_portfolio_structure',
                            description: `Create new strategy "${strategyName}"`,
                            details: { strategyName, groups, holdings },
                            rawPrompt: text, // Use the text we just sent as the prompt context
                            status: 'PENDING'
                        };
                        setPendingProposal(proposal);
                    } else if (call.name === 'add_ticker_to_group') {
                        const { symbol, allocation, groupName, autoRebalance } = call.args;
                        const proposal: AIProposal = {
                            id: generateId(),
                            type: 'ADD_TICKER', // We might need to add this type to types.ts
                            toolName: 'add_ticker_to_group',
                            description: `Add ${symbol} (${allocation}%)`,
                            details: { symbol, allocation, groupName, autoRebalance },
                            rawPrompt: text,
                            status: 'PENDING'
                        };
                        setPendingProposal(proposal);
                    } else if (call.name === 'remove_ticker') {
                        const { symbol, strategyId } = call.args;
                        const proposal: AIProposal = {
                            id: generateId(),
                            type: 'REMOVE_TICKER', // We needs types.ts update
                            toolName: 'remove_ticker',
                            description: `Remove ${symbol}`,
                            details: { symbol, strategyId },
                            rawPrompt: text,
                            status: 'PENDING'
                        };
                        setPendingProposal(proposal);
                    } else if (call.name === 'rebalance_portfolio') {
                        const { groupName } = call.args;
                        const proposal: AIProposal = {
                            id: generateId(),
                            type: 'REBALANCE',
                            toolName: 'rebalance_portfolio',
                            description: groupName ? `Rebalance ${groupName} to equal allocations` : 'Rebalance portfolio to equal allocations',
                            details: { groupName },
                            rawPrompt: text,
                            status: 'PENDING'
                        };
                        setPendingProposal(proposal);
                    } else if (call.name === 'update_allocation') {
                        const { symbol, allocation, groupName } = call.args;
                        const proposal: AIProposal = {
                            id: generateId(),
                            type: 'REBALANCE',
                            toolName: 'update_allocation',
                            description: `Set ${symbol} to ${allocation}% and rebalance others`,
                            details: { symbol, allocation, groupName },
                            rawPrompt: text,
                            status: 'PENDING'
                        };
                        setPendingProposal(proposal);
                    }
                }
            }

            const botMsg: Message = { id: (Date.now() + 1).toString(), text: replyText, sender: Sender.AI, timestamp: Date.now() };
            setChatMessages(prev => [...prev, botMsg]);

        } catch (error) {
            console.error("Chat Error", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            const errorMsg: Message = { id: (Date.now() + 1).toString(), text: `Sorry, I encountered an error: ${errorMessage}`, sender: Sender.AI, timestamp: Date.now() };
            setChatMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleApproveProposal = (proposal: AIProposal) => {
        if (proposal.type === 'CREATE_PORTFOLIO') {
            const { strategyName, groups, holdings } = proposal.details;
            createNewStrategy(strategyName, groups, proposal.rawPrompt, holdings);
            setChatMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: "Success. New strategy created with your goal preserved.",
                sender: Sender.AI,
                timestamp: Date.now()
            }]);
        } else if (proposal.type === 'ADD_TICKER') {
            // Logic to Add Ticker
            const { symbol, allocation, groupName, autoRebalance } = proposal.details;
            handleAddTickerToStructure(symbol, allocation, groupName, autoRebalance !== false); // Default to true
        } else if (proposal.type === 'REMOVE_TICKER') {
            const { symbol } = proposal.details;
            handleRemoveTickerFromStructure(symbol);
        } else if (proposal.type === 'REBALANCE') {
            if (proposal.toolName === 'update_allocation') {
                const { symbol, allocation, groupName } = proposal.details;
                handleUpdateAllocation(symbol, allocation, groupName);
            } else {
                const { groupName } = proposal.details;
                handleRebalancePortfolio(groupName);
            }
        }
        setPendingProposal(null);
    };

    const handleRejectProposal = (proposal: AIProposal) => {
        setPendingProposal(null);
        setChatMessages(prev => [...prev, { id: Date.now().toString(), text: "Proposal rejected.", sender: Sender.AI, timestamp: Date.now() }]);
    };

    const createNewStrategy = async (strategyName: string, groups: any[], prompt?: string, holdings?: any[]) => {
        if (!activeAccount) return;

        const totalVal = activeAccount.totalValue === 0 ? 10000 : activeAccount.totalValue;

        // Use the Factory to build the robust tree
        // This handles: Recursive group creation, default allocation distribution (within tree),
        // and setting the Strategy Prompt on the root.
        const newStrategyRoot = buildStrategyFromAI(
            generateId(),
            strategyName,
            totalVal, // This is just for initial value calc, dynamic updates happen later
            groups,
            prompt || strategyName, // Mission Statement
            holdings
        );

        // DEFAULT ALLOCATION RULE:
        // New strategies should default to 0% to avoid violating the 100% cap on the Account.
        // User must explicitly allocate funds to it in Settings.
        newStrategyRoot.targetAllocation = 0;

        // Push new strategy to the list
        const updatedStrategies = [...activeAccount.strategies, newStrategyRoot];

        // Optimize: Switch to the newly created strategy
        setSelectedStrategyId(newStrategyRoot.id);

        await updateActiveAccount({ strategies: updatedStrategies });
    };

    // -------------------------------------------------------------------------
    // RENDER helpers
    // -------------------------------------------------------------------------

    // Render Sidebar Strategy Item (Recursive or Flat?)
    // Dashboard usually shows Tree. Sidebar shows Tree.
    const renderSidebarStrategies = (strategies: PortfolioSlice[]) => {
        return strategies.map(strat => (
            <div key={strat.id} className="ml-2" data-testid={`sidebar-strategy-${strat.name}`}>
                <button
                    onClick={() => handleSelectStrategy(strat.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm mb-1 flex items-center justify-between group ${selectedStrategyId === strat.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                >
                    <span className="truncate" data-testid={`strategy-name-${strat.name}`}>{strat.name}</span>
                    <span className={`text-[10px] font-mono ${selectedStrategyId === strat.id ? 'text-indigo-200' : 'text-slate-600'}`}>
                        {strat.targetAllocation}% (${((activeAccount?.totalValue || 0) * (strat.targetAllocation / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })})
                    </span>
                </button>
            </div>
        ));
    };

    // -------------------------------------------------------------------------
    // RENDER HELPERS
    // -------------------------------------------------------------------------
    const SidebarContent = (
        <div className="flex flex-col h-full bg-slate-900 text-slate-200" data-testid="sidebar">
            {/* Logo Area */}
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Layout className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-white tracking-tight">StrataMind</h1>
                    <p className="text-[10px] text-indigo-400 font-medium tracking-wider">PORTFOLIO AI</p>
                </div>
            </div>

            {/* Institutions List */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-hide">
                {institutions.map(inst => {
                    const isActive = inst.id === activeInstitutionId;
                    return (
                        <div key={inst.id} className="space-y-1">
                            <div className="group flex items-center justify-between px-2 py-1 ">
                                <h3
                                    className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}
                                    title={inst.name}
                                >
                                    {inst.name.substring(0, 20)}
                                </h3>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleRenameInstitution(e, inst.id, inst.name)}
                                        className="p-1 text-slate-600 hover:text-indigo-400 transition-all"
                                        title="Rename Institution"
                                    >
                                        <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteInstitution(e, inst.id)}
                                        className="p-1 text-slate-600 hover:text-red-400 transition-all"
                                        title="Delete Institution"
                                        data-testid="delete-institution-button"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                {inst.accounts.map(acc => {
                                    const isAccActive = acc.id === activeAccountId;
                                    return (
                                        <div key={acc.id}>
                                            <div
                                                onClick={() => {
                                                    setActiveInstitutionId(inst.id);
                                                    setActiveAccountId(acc.id);
                                                    setSelectedStrategyId(null);
                                                    setIsMobileMenuOpen(false); // Close mobile menu on navigate
                                                }}
                                                className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all border ${isAccActive
                                                    ? 'bg-slate-800 border-indigo-500/30 shadow-sm'
                                                    : 'border-transparent hover:bg-slate-800/50 hover:border-slate-700'
                                                    }`}
                                            >
                                                {isAccActive && (
                                                    <div className="absolute left-0 w-1 h-8 bg-indigo-500 rounded-r-full" />
                                                )}
                                                <div className={`p-1.5 rounded-md ${isAccActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                                                    <DollarSign className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium truncate ${isAccActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} data-testid={`sidebar-account-${acc.name}`}>
                                                        {acc.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 truncate">
                                                        ${acc.totalValue.toLocaleString()}
                                                    </p>
                                                </div>

                                                {/* Config Button (Always render, show on hover) */}
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => handleOpenSettings(e, inst.id, acc.id)}
                                                        className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded transition-all"
                                                        title="Account Settings"
                                                        data-testid="account-settings-button"
                                                    >
                                                        <Settings className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteAccount(inst.id, acc.id);
                                                        }}
                                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-all"
                                                        title="Delete Account"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Strategies List (Nested) */}
                                            {isAccActive && (
                                                <div className="mt-1 ml-3 border-l-2 border-slate-800 pl-2 space-y-1 relative">
                                                    {renderSidebarStrategies(acc.strategies)}

                                                    {/* New Strategy Button */}
                                                    <button
                                                        onClick={() => setEditingValue({ type: 'ADD_STRATEGY', id: inst.id, secondaryId: acc.id, value: '' })}
                                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/5 rounded transition-colors group"
                                                        title="Add Strategy"
                                                    >
                                                        <Plus className="w-3 h-3 group-hover:scale-110" />
                                                        <span>New Strategy</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                <button
                                    onClick={() => handleAddAccount(inst.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-white transition-colors"
                                >
                                    <Plus className="w-3 h-3" /> Add Account
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Add Institution Button */}
                <div className="pt-2">
                    <button
                        onClick={handleAddInstitution}
                        className="w-full flex items-center justify-center gap-2 p-2 border border-dashed border-slate-700/50 rounded-lg text-slate-500 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-sm font-medium group"
                    >
                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Add Institution
                    </button>
                </div>
            </div>

            {/* User Profile / Context Section at Bottom */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 shadow-inner">
                        <span className="text-xs font-bold text-slate-300">USR</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-slate-200 truncate">Portfolio Manager</p>
                        <p className="text-xs text-slate-500 truncate">v1.3.0 • AI Agent Active</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col md:flex-row h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Layout className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="font-bold text-white tracking-tight">StrataMind</h1>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-slate-400 hover:text-white"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Desktop Sidebar (Permanent) */}
            <div className="hidden md:flex w-64 border-r border-slate-800 bg-slate-900 flex-col shrink-0">
                {SidebarContent}
            </div>

            {/* Mobile Sidebar (Drawer) */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    {/* Drawer */}
                    <div className="relative w-[85%] max-w-xs h-full bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-full z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        {SidebarContent}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-950">
                {activeAccount ? (
                    <>
                        {/* Streamlined Header without Strategy Tabs */}
                        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
                            <div className="flex flex-col">
                                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                                    {activeStrategy ? (
                                        <>
                                            <span className="text-slate-400 font-normal">{activeAccount.name} /</span>
                                            {activeStrategy.name}
                                        </>
                                    ) : (
                                        activeAccount.name
                                    )}
                                </h1>
                                <div className="flex items-center gap-4 text-xs font-mono mt-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-3xl font-bold text-white tracking-tight">
                                            ${activeAccount.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-slate-700" />
                                    <div className="flex items-center gap-1.5 group">
                                        <span className="text-slate-500">CASH:</span>
                                        <span className="text-emerald-400 font-bold">${activeAccount.cashBalance.toLocaleString()}</span>

                                    </div>
                                </div>
                            </div>

                            {/* Header Actions */}
                            <div className="flex items-center gap-3">
                                <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium flex items-center gap-2 select-none cursor-help" title="AI Assistant is ready to help">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                    </span>
                                    AI Agent Ready
                                </div>
                                <button
                                    onClick={(e) => activeAccount && activeInstitution && handleOpenSettings(e, activeInstitution.id, activeAccount.id)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                    title="Account Settings"
                                    data-testid="account-settings-button"
                                >
                                    <Settings className="w-5 h-5" />
                                </button>
                            </div>
                        </header>

                        <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">
                                {/* Performance Section */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    <div className="md:col-span-2">
                                        <PerformanceChart
                                            history={performanceHistory.length > 0 ? performanceHistory : MOCK_HISTORY}
                                            timeRange={timeRange}
                                            onTimeRangeChange={setTimeRange}
                                            historyLoading={isPerformanceLoading}
                                        />
                                    </div>
                                    <div className="h-full">
                                        {(performanceStats || MOCK_STATS) && (
                                            <PerformanceStatsDisplay
                                                stats={performanceStats || MOCK_STATS}
                                                statsLoading={isPerformanceLoading}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                                        <p className="text-xs text-slate-400 uppercase">Cash Available</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {activeStrategy ? (
                                                <div className="flex flex-col">
                                                    <p className="text-lg font-bold text-emerald-400">
                                                        ${((activeAccount.cashBalance * (activeStrategy.targetAllocation / 100)) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500">
                                                        ({activeStrategy.targetAllocation}% of Global Cash)
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-lg font-bold text-white">${activeAccount.cashBalance.toLocaleString()}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                                        <p className="text-xs text-slate-400 uppercase">Active Strategy</p>
                                        <p className="text-lg font-bold text-indigo-400 mt-1">{activeStrategy?.name || 'None'}</p>
                                    </div>
                                    <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                                        <p className="text-xs text-slate-400 uppercase">Holdings Count</p>
                                        <p className="text-lg font-bold text-slate-200 mt-1">
                                            {/* Simple recursive count would go here, simplified for demo */}
                                            {activeStrategy?.children?.length || 0} Sectors
                                        </p>
                                    </div>
                                </div>

                                {/* Pie Visualizer */}
                                <div className="min-h-[600px]">
                                    {activeStrategy ? (
                                        <PortfolioVisualizer
                                            rootSlice={activeStrategy}
                                            totalValue={(activeAccount.totalValue - activeAccount.cashBalance) * (activeStrategy.targetAllocation / 100)} // Prorated Investing Power
                                            onAddSlice={handleAddSliceWithRebalance}
                                            onUpdate={(updated) => {/* Handle deep updates via PortfolioVisualizer internal state or bubble up */ }}
                                            onRenameSlice={handleRenameSlice}
                                            onRemoveSlice={handleRemoveSlice}
                                            onUpdatePrompt={handleUpdatePrompt}
                                        />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                                            <PieChart className="w-12 h-12 opacity-50" />
                                            <p>Select a strategy from the sidebar to view details</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Chat Panel */}
                            <div className="w-full h-[500px] md:h-auto md:w-96 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900 shadow-2xl z-10 shrink-0">
                                <ChatPanel
                                    messages={chatMessages}
                                    onSendMessage={handleSendMessage}
                                    pendingProposal={pendingProposal}
                                    onApproveProposal={handleApproveProposal}
                                    onRejectProposal={handleRejectProposal}
                                    isTyping={isTyping}
                                />
                            </div>
                        </main>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
                        <Activity className="w-16 h-16 opacity-30" />
                        <p className="text-lg">Select an account to get started</p>
                    </div>
                )}
            </div>

            {/* EDIT / CREATE / CONFIRM MODAL */}
            {editingValue && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-96 shadow-2xl">
                        <h3 className="text-lg font-bold mb-4 text-white">
                            {editingValue.type === 'INSTITUTION' && 'Rename Institution'}
                            {editingValue.type === 'ADD_INSTITUTION' && 'Add New Institution'}
                            {editingValue.type === 'ADD_ACCOUNT' && 'Add New Account'}
                            {editingValue.type === 'ADD_STRATEGY' && 'Add New Strategy'}
                            {editingValue.type === 'DELETE_INSTITUTION' && <span className="text-red-400 flex items-center gap-2"><Trash2 className="w-5 h-5" /> Delete Institution?</span>}
                            {editingValue.type === 'DELETE_ACCOUNT' && <span className="text-red-400 flex items-center gap-2"><Trash2 className="w-5 h-5" /> Delete Account?</span>}
                        </h3>

                        {(editingValue.type === 'DELETE_INSTITUTION' || editingValue.type === 'DELETE_ACCOUNT') ? (
                            <div className="mb-6 text-slate-300 text-sm">
                                {editingValue.type === 'DELETE_INSTITUTION'
                                    ? "Are you sure you want to delete this Institution? All accounts and strategies inside it will be permanently lost."
                                    : "Are you sure you want to delete this Account? This action cannot be undone."
                                }
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={editingValue.value}
                                onChange={(e) => setEditingValue({ ...editingValue, value: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder={
                                    editingValue.type === 'ADD_INSTITUTION' ? "e.g. Fidelity" :
                                        editingValue.type === 'ADD_ACCOUNT' ? "e.g. Roth IRA" :
                                            editingValue.type === 'ADD_STRATEGY' ? "e.g. Growth Strategy" : ""
                                }
                                autoFocus
                            />
                        )}

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setEditingValue(null)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveEditValue}
                                className={`px-4 py-2 rounded-lg transition-colors shadow-lg ${(editingValue.type.startsWith('DELETE'))
                                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                                    }`}
                            >
                                {editingValue.type.startsWith('ADD') ? 'Create' :
                                    editingValue.type.startsWith('DELETE') ? 'Confirm Delete' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Consolidated Account Settings Modal */}
            {editingAccountSettings && activeInstitution && activeAccount && (
                <AccountSettingsModal
                    account={activeAccount}
                    onSave={handleSaveAccountSettings}
                    onClose={() => setEditingAccountSettings(null)}
                />
            )}

        </div>
    );
}

export default App;