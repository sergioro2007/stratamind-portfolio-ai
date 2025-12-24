// Portfolio Data Structures

export enum SliceType {
    GROUP = 'GROUP',
    HOLDING = 'HOLDING'
}

export interface PortfolioSlice {
    id: string;
    parentId: string | null;
    type: SliceType;
    name: string; // "Tech Sector" or "AAPL"
    symbol?: string; // Only for HOLDING
    targetAllocation: number; // Percentage 0-100 (relative to parent) - MUST be an integer
    currentValue: number; // Mocked current value
    children?: PortfolioSlice[]; // Only for GROUP
    strategyPrompt?: string; // The user's original goal/prompt for this specific strategy/slice
}

export interface Account {
    id: string;
    name: string; // e.g. "Roth IRA"
    type: string; // e.g. "Retirement", "Brokerage"
    totalValue: number;
    cashBalance: number;
    margin?: number; // Margin debt (optional for backward compatibility)
    strategies: PortfolioSlice[]; // List of strategies (Pies) available in this account
}

export interface Institution {
    id: string;
    name: string; // e.g. "Fidelity", "M1 Finance"
    accounts: Account[];
}

// AI & Chat Types

export enum Sender {
    USER = 'USER',
    AI = 'AI',
    SYSTEM = 'SYSTEM'
}

export interface Message {
    id: string;
    sender: Sender;
    text: string;
    timestamp: number;
    isTyping?: boolean;
    toolCallId?: string;
    toolName?: string;
    toolArgs?: any;
}

export interface AIProposal {
    id: string;
    type: 'ADD_SLICE' | 'REMOVE_SLICE' | 'REBALANCE' | 'CREATE_PORTFOLIO' | 'ADD_TICKER' | 'REMOVE_TICKER';
    toolName: string;
    description: string;
    details: any; // Context specific payload
    rawPrompt?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface MarketData {
    symbol: string;
    price: number;
    changePercent: number;
}
// Performance Tracking Types

export interface PerformanceSnapshot {
    id: string;
    accountId: string;
    timestamp: number;
    totalValue: number;
    cashBalance: number;
    holdingsValue: number;
    dayChange?: number;
    dayChangePercent?: number;
}

export interface PerformanceStats {
    current: number;
    dayChange: number;
    dayChangePercent: number;
    weekChange: number;
    weekChangePercent: number;
    monthChange: number;
    monthChangePercent: number;
    allTimeHigh: number;
    allTimeLow: number;
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
