# TDD Implementation Plan for Existing StrataMind Application

**Created**: December 19, 2025  
**Application**: stratamind-agent (React/TypeScript + Google Gemini)

## Executive Summary

The existing `stratamind-agent` application is a functional React/TypeScript frontend that uses Google Gemini AI to manage hierarchical portfolios. This document outlines a Test-Driven Development approach to:

1. **Add comprehensive test coverage** to the existing code
2. **Identify and fix bugs** through testing
3. **Refactor and improve** code quality
4. **Add missing functionality** using TDD principles

---

## Current Application Analysis

### ✅ What Exists

**Frontend (React + TypeScript + Vite)**
- `App.tsx` (682 lines) - Main application with state management
- `types.ts` - TypeScript interfaces for data structures
- `services/database.ts` - LocalStorage-based data persistence
- `services/geminiService.ts` - Google Gemini AI integration
- `components/ChatPanel.tsx` - AI chat interface
- `components/PortfolioVisualizer.tsx` - Portfolio visualization

**Key Features Implemented:**
- ✅ Multi-institution account management
- ✅ Hierarchical portfolio structure (Groups + Holdings)
- ✅ AI-powered portfolio creation via Gemini
- ✅ Human-in-the-loop approval workflow
- ✅ LocalStorage persistence
- ✅ Interactive portfolio visualization
- ✅ Chat interface for AI interactions

### ❌ What's Missing

**Testing Infrastructure:**
- ❌ No test files
- ❌ No testing framework configured
- ❌ No test coverage

**Backend:**
- ❌ No real backend (using LocalStorage)
- ❌ No real market data integration
- ❌ No authentication/authorization
- ❌ No database (PostgreSQL)

**Critical Functionality:**
- ❌ No real-time market data
- ❌ No performance tracking
- ❌ No actual trade execution
- ❌ No validation of ticker symbols
- ❌ No error boundaries
- ❌ No loading states for async operations

---

## TDD Strategy

### Phase 1: Setup Testing Infrastructure (Week 1)

#### 1.1 Install Testing Dependencies

```bash
cd stratamind-agent
npm install --save-dev \
  vitest \
  @vitest/ui \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom \
  @types/jest
```

#### 1.2 Configure Vitest

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
});
```

#### 1.3 Create Test Setup

Create `src/test/setup.ts`:

```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

#### 1.4 Update package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

### Phase 2: Test Existing Utilities & Services (Week 1-2)

#### 2.1 Test `database.ts` Service

**File**: `src/services/__tests__/database.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, generateId } from '../database';
import { SliceType } from '../../types';

describe('database service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^id-/);
    });
  });

  describe('load', () => {
    it('should return seed data when localStorage is empty', () => {
      const data = db.load();
      
      expect(data).toBeInstanceOf(Array);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('accounts');
    });

    it('should load data from localStorage when available', () => {
      const mockData = [
        {
          id: 'test-inst',
          name: 'Test Institution',
          accounts: []
        }
      ];
      
      localStorage.setItem('stratamind_db_v1', JSON.stringify(mockData));
      const loaded = db.load();
      
      expect(loaded).toEqual(mockData);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('stratamind_db_v1', 'invalid json{');
      const data = db.load();
      
      // Should fall back to seed data
      expect(data).toBeInstanceOf(Array);
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe('save', () => {
    it('should persist data to localStorage', () => {
      const testData = [
        {
          id: 'inst-1',
          name: 'Test',
          accounts: []
        }
      ];
      
      db.save(testData);
      const stored = localStorage.getItem('stratamind_db_v1');
      
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(testData);
    });
  });

  describe('createInstitution', () => {
    it('should add a new institution', () => {
      const initial = db.load();
      const updated = db.createInstitution('New Bank', initial);
      
      expect(updated.length).toBe(initial.length + 1);
      expect(updated[updated.length - 1].name).toBe('New Bank');
      expect(updated[updated.length - 1].accounts).toEqual([]);
    });

    it('should persist the new institution', () => {
      const initial = db.load();
      db.createInstitution('Persisted Bank', initial);
      
      const reloaded = db.load();
      expect(reloaded.some(i => i.name === 'Persisted Bank')).toBe(true);
    });
  });

  describe('deleteInstitution', () => {
    it('should remove an institution by ID', () => {
      const initial = db.load();
      const toDelete = initial[0].id;
      const updated = db.deleteInstitution(toDelete, initial);
      
      expect(updated.length).toBe(initial.length - 1);
      expect(updated.find(i => i.id === toDelete)).toBeUndefined();
    });
  });

  describe('createAccount', () => {
    it('should add an account to the specified institution', () => {
      const initial = db.load();
      const instId = initial[0].id;
      const accountCount = initial[0].accounts.length;
      
      const updated = db.createAccount(instId, 'New Account', 'Taxable', initial);
      const institution = updated.find(i => i.id === instId);
      
      expect(institution!.accounts.length).toBe(accountCount + 1);
      expect(institution!.accounts[accountCount].name).toBe('New Account');
      expect(institution!.accounts[accountCount].type).toBe('Taxable');
    });

    it('should create account with empty portfolio structure', () => {
      const initial = db.load();
      const instId = initial[0].id;
      
      const updated = db.createAccount(instId, 'Empty Account', 'IRA', initial);
      const institution = updated.find(i => i.id === instId);
      const newAccount = institution!.accounts[institution!.accounts.length - 1];
      
      expect(newAccount.root).toBeDefined();
      expect(newAccount.root.type).toBe(SliceType.GROUP);
      expect(newAccount.root.children).toEqual([]);
      expect(newAccount.totalValue).toBe(0);
      expect(newAccount.cashBalance).toBe(0);
    });
  });

  describe('deleteAccount', () => {
    it('should remove an account from the specified institution', () => {
      const initial = db.load();
      const instId = initial[0].id;
      const accId = initial[0].accounts[0].id;
      const accountCount = initial[0].accounts.length;
      
      const updated = db.deleteAccount(instId, accId, initial);
      const institution = updated.find(i => i.id === instId);
      
      expect(institution!.accounts.length).toBe(accountCount - 1);
      expect(institution!.accounts.find(a => a.id === accId)).toBeUndefined();
    });
  });
});
```

**Test Coverage Goals:**
- ✅ ID generation
- ✅ Data loading from localStorage
- ✅ Data persistence
- ✅ CRUD operations for institutions
- ✅ CRUD operations for accounts
- ✅ Error handling

#### 2.2 Test Portfolio Tree Operations

**File**: `src/utils/__tests__/portfolioTree.test.ts`

First, extract tree operations from `App.tsx` into a utility file:

**Create**: `src/utils/portfolioTree.ts`

```typescript
import { PortfolioSlice } from '../types';

export const normalizeChildren = (children: PortfolioSlice[]): void => {
  if (children.length === 0) return;
  const total = children.reduce((sum, c) => sum + c.targetAllocation, 0);
  if (total === 0) return;
  
  if (Math.abs(total - 100) < 0.1) return;

  const factor = 100 / total;
  children.forEach(c => {
    c.targetAllocation = Math.round(c.targetAllocation * factor * 10) / 10;
  });
  
  const newTotal = children.reduce((sum, c) => sum + c.targetAllocation, 0);
  const diff = 100 - newTotal;
  if (Math.abs(diff) > 0) {
    const largest = children.reduce((prev, current) => 
      (prev.targetAllocation > current.targetAllocation) ? prev : current
    );
    largest.targetAllocation = Number((largest.targetAllocation + diff).toFixed(1));
  }
};

export const addNodeToTree = (
  node: PortfolioSlice, 
  parentId: string, 
  newNode: PortfolioSlice
): boolean => {
  if (node.id === parentId) {
    if (!node.children) node.children = [];
    
    const incomingAlloc = newNode.targetAllocation;
    if (node.children.length > 0 && incomingAlloc < 100) {
      const remainingSpace = 100 - incomingAlloc;
      const currentSum = node.children.reduce((s, c) => s + c.targetAllocation, 0);
      if (currentSum > 0) {
        const scaleFactor = remainingSpace / currentSum;
        node.children.forEach(c => {
          c.targetAllocation = Math.floor(c.targetAllocation * scaleFactor);
        });
      }
    } else if (node.children.length > 0 && incomingAlloc >= 100) {
      node.children.forEach(c => c.targetAllocation = 0);
    }

    node.children.push(newNode);
    normalizeChildren(node.children);
    return true;
  }
  
  if (node.children) {
    for (const child of node.children) {
      if (addNodeToTree(child, parentId, newNode)) return true;
    }
  }
  return false;
};

export const removeNodeFromTree = (
  node: PortfolioSlice, 
  nodeId: string
): boolean => {
  if (!node.children) return false;
  const idx = node.children.findIndex(c => c.id === nodeId);
  if (idx !== -1) {
    node.children.splice(idx, 1);
    normalizeChildren(node.children);
    return true;
  }
  for (const child of node.children) {
    if (removeNodeFromTree(child, nodeId)) return true;
  }
  return false;
};

export const findGroupByName = (
  root: PortfolioSlice, 
  name: string
): PortfolioSlice | null => {
  if (root.name.toLowerCase().includes(name.toLowerCase()) && root.type === 'GROUP') {
    return root;
  }
  if (root.children) {
    for (const child of root.children) {
      const found = findGroupByName(child, name);
      if (found) return found;
    }
  }
  return null;
};
```

**Test File**: `src/utils/__tests__/portfolioTree.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeChildren, addNodeToTree, removeNodeFromTree, findGroupByName } from '../portfolioTree';
import { PortfolioSlice, SliceType } from '../../types';

describe('portfolioTree utilities', () => {
  describe('normalizeChildren', () => {
    it('should normalize allocations to sum to 100%', () => {
      const children: PortfolioSlice[] = [
        { id: '1', parentId: 'root', type: SliceType.HOLDING, name: 'A', targetAllocation: 30, currentValue: 0 },
        { id: '2', parentId: 'root', type: SliceType.HOLDING, name: 'B', targetAllocation: 30, currentValue: 0 },
        { id: '3', parentId: 'root', type: SliceType.HOLDING, name: 'C', targetAllocation: 30, currentValue: 0 },
      ];
      
      normalizeChildren(children);
      
      const total = children.reduce((sum, c) => sum + c.targetAllocation, 0);
      expect(total).toBeCloseTo(100, 1);
    });

    it('should handle empty children array', () => {
      const children: PortfolioSlice[] = [];
      expect(() => normalizeChildren(children)).not.toThrow();
    });

    it('should handle children with zero total allocation', () => {
      const children: PortfolioSlice[] = [
        { id: '1', parentId: 'root', type: SliceType.HOLDING, name: 'A', targetAllocation: 0, currentValue: 0 },
      ];
      
      normalizeChildren(children);
      expect(children[0].targetAllocation).toBe(0);
    });

    it('should not modify if already close to 100%', () => {
      const children: PortfolioSlice[] = [
        { id: '1', parentId: 'root', type: SliceType.HOLDING, name: 'A', targetAllocation: 50.0, currentValue: 0 },
        { id: '2', parentId: 'root', type: SliceType.HOLDING, name: 'B', targetAllocation: 50.0, currentValue: 0 },
      ];
      
      normalizeChildren(children);
      
      expect(children[0].targetAllocation).toBe(50.0);
      expect(children[1].targetAllocation).toBe(50.0);
    });
  });

  describe('addNodeToTree', () => {
    it('should add node to parent', () => {
      const root: PortfolioSlice = {
        id: 'root',
        parentId: null,
        type: SliceType.GROUP,
        name: 'Root',
        targetAllocation: 100,
        currentValue: 0,
        children: []
      };

      const newNode: PortfolioSlice = {
        id: 'new',
        parentId: 'root',
        type: SliceType.HOLDING,
        name: 'New Holding',
        symbol: 'TEST',
        targetAllocation: 50,
        currentValue: 0
      };

      const result = addNodeToTree(root, 'root', newNode);
      
      expect(result).toBe(true);
      expect(root.children).toHaveLength(1);
      expect(root.children![0].id).toBe('new');
    });

    it('should rebalance existing children when adding new node', () => {
      const root: PortfolioSlice = {
        id: 'root',
        parentId: null,
        type: SliceType.GROUP,
        name: 'Root',
        targetAllocation: 100,
        currentValue: 0,
        children: [
          { id: 'existing', parentId: 'root', type: SliceType.HOLDING, name: 'Existing', targetAllocation: 100, currentValue: 0 }
        ]
      };

      const newNode: PortfolioSlice = {
        id: 'new',
        parentId: 'root',
        type: SliceType.HOLDING,
        name: 'New',
        targetAllocation: 30,
        currentValue: 0
      };

      addNodeToTree(root, 'root', newNode);
      
      const total = root.children!.reduce((sum, c) => sum + c.targetAllocation, 0);
      expect(total).toBeCloseTo(100, 1);
    });

    it('should return false if parent not found', () => {
      const root: PortfolioSlice = {
        id: 'root',
        parentId: null,
        type: SliceType.GROUP,
        name: 'Root',
        targetAllocation: 100,
        currentValue: 0,
        children: []
      };

      const newNode: PortfolioSlice = {
        id: 'new',
        parentId: 'nonexistent',
        type: SliceType.HOLDING,
        name: 'New',
        targetAllocation: 50,
        currentValue: 0
      };

      const result = addNodeToTree(root, 'nonexistent', newNode);
      expect(result).toBe(false);
    });
  });

  describe('removeNodeFromTree', () => {
    it('should remove node and rebalance siblings', () => {
      const root: PortfolioSlice = {
        id: 'root',
        parentId: null,
        type: SliceType.GROUP,
        name: 'Root',
        targetAllocation: 100,
        currentValue: 0,
        children: [
          { id: 'child1', parentId: 'root', type: SliceType.HOLDING, name: 'Child 1', targetAllocation: 50, currentValue: 0 },
          { id: 'child2', parentId: 'root', type: SliceType.HOLDING, name: 'Child 2', targetAllocation: 50, currentValue: 0 }
        ]
      };

      const result = removeNodeFromTree(root, 'child1');
      
      expect(result).toBe(true);
      expect(root.children).toHaveLength(1);
      expect(root.children![0].id).toBe('child2');
      expect(root.children![0].targetAllocation).toBe(100);
    });

    it('should return false if node not found', () => {
      const root: PortfolioSlice = {
        id: 'root',
        parentId: null,
        type: SliceType.GROUP,
        name: 'Root',
        targetAllocation: 100,
        currentValue: 0,
        children: []
      };

      const result = removeNodeFromTree(root, 'nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('findGroupByName', () => {
    it('should find group by exact name', () => {
      const root: PortfolioSlice = {
        id: 'root',
        parentId: null,
        type: SliceType.GROUP,
        name: 'Tech Sector',
        targetAllocation: 100,
        currentValue: 0,
        children: []
      };

      const found = findGroupByName(root, 'Tech Sector');
      expect(found).toBe(root);
    });

    it('should find group by partial name (case-insensitive)', () => {
      const root: PortfolioSlice = {
        id: 'root',
        parentId: null,
        type: SliceType.GROUP,
        name: 'Technology Sector',
        targetAllocation: 100,
        currentValue: 0,
        children: []
      };

      const found = findGroupByName(root, 'tech');
      expect(found).toBe(root);
    });

    it('should search nested groups', () => {
      const childGroup: PortfolioSlice = {
        id: 'child',
        parentId: 'root',
        type: SliceType.GROUP,
        name: 'Software',
        targetAllocation: 50,
        currentValue: 0,
        children: []
      };

      const root: PortfolioSlice = {
        id: 'root',
        parentId: null,
        type: SliceType.GROUP,
        name: 'Tech',
        targetAllocation: 100,
        currentValue: 0,
        children: [childGroup]
      };

      const found = findGroupByName(root, 'Software');
      expect(found).toBe(childGroup);
    });

    it('should return null if not found', () => {
      const root: PortfolioSlice = {
        id: 'root',
        parentId: null,
        type: SliceType.GROUP,
        name: 'Tech',
        targetAllocation: 100,
        currentValue: 0,
        children: []
      };

      const found = findGroupByName(root, 'Healthcare');
      expect(found).toBeNull();
    });

    it('should not match holdings (only groups)', () => {
      const root: PortfolioSlice = {
        id: 'root',
        parentId: null,
        type: SliceType.GROUP,
        name: 'Tech',
        targetAllocation: 100,
        currentValue: 0,
        children: [
          { id: 'holding', parentId: 'root', type: SliceType.HOLDING, name: 'AAPL', symbol: 'AAPL', targetAllocation: 100, currentValue: 0 }
        ]
      };

      const found = findGroupByName(root, 'AAPL');
      expect(found).toBeNull();
    });
  });
});
```

---

### Phase 3: Test React Components (Week 2-3)

#### 3.1 Test ChatPanel Component

**File**: `src/components/__tests__/ChatPanel.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatPanel from '../ChatPanel';
import { Message, Sender, AIProposal } from '../../types';

describe('ChatPanel', () => {
  const mockMessages: Message[] = [
    {
      id: '1',
      sender: Sender.AI,
      text: 'Hello! How can I help?',
      timestamp: new Date()
    },
    {
      id: '2',
      sender: Sender.USER,
      text: 'Create a tech portfolio',
      timestamp: new Date()
    }
  ];

  it('should render messages', () => {
    render(
      <ChatPanel
        messages={mockMessages}
        onSendMessage={vi.fn()}
        pendingProposal={null}
        onApproveProposal={vi.fn()}
        onRejectProposal={vi.fn()}
        isTyping={false}
      />
    );

    expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
    expect(screen.getByText('Create a tech portfolio')).toBeInTheDocument();
  });

  it('should call onSendMessage when user submits message', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    render(
      <ChatPanel
        messages={[]}
        onSendMessage={onSendMessage}
        pendingProposal={null}
        onApproveProposal={vi.fn()}
        onRejectProposal={vi.fn()}
        isTyping={false}
      />
    );

    const input = screen.getByPlaceholderText(/type a message/i);
    await user.type(input, 'Add AAPL to my portfolio');
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    expect(onSendMessage).toHaveBeenCalledWith('Add AAPL to my portfolio');
  });

  it('should show typing indicator when isTyping is true', () => {
    render(
      <ChatPanel
        messages={[]}
        onSendMessage={vi.fn()}
        pendingProposal={null}
        onApproveProposal={vi.fn()}
        onRejectProposal={vi.fn()}
        isTyping={true}
      />
    );

    expect(screen.getByText(/typing/i)).toBeInTheDocument();
  });

  it('should render pending proposal with approve/reject buttons', () => {
    const mockProposal: AIProposal = {
      id: 'prop-1',
      type: 'ADD_SLICE',
      toolName: 'add_ticker_to_group',
      description: 'Add AAPL to Tech Sector',
      details: { symbol: 'AAPL', groupName: 'Tech', allocation: 25 },
      status: 'PENDING'
    };

    const onApprove = vi.fn();
    const onReject = vi.fn();

    render(
      <ChatPanel
        messages={[]}
        onSendMessage={vi.fn()}
        pendingProposal={mockProposal}
        onApproveProposal={onApprove}
        onRejectProposal={onReject}
        isTyping={false}
      />
    );

    expect(screen.getByText(/Add AAPL to Tech Sector/i)).toBeInTheDocument();
    
    const approveButton = screen.getByRole('button', { name: /approve/i });
    const rejectButton = screen.getByRole('button', { name: /reject/i });

    fireEvent.click(approveButton);
    expect(onApprove).toHaveBeenCalledWith(mockProposal);

    fireEvent.click(rejectButton);
    expect(onReject).toHaveBeenCalledWith(mockProposal);
  });

  it('should disable input when typing', () => {
    render(
      <ChatPanel
        messages={[]}
        onSendMessage={vi.fn()}
        pendingProposal={null}
        onApproveProposal={vi.fn()}
        onRejectProposal={vi.fn()}
        isTyping={true}
      />
    );

    const input = screen.getByPlaceholderText(/type a message/i);
    expect(input).toBeDisabled();
  });
});
```

---

### Phase 4: Integration Tests (Week 3-4)

#### 4.1 Test Complete User Flows

**File**: `src/__tests__/integration/portfolioCreation.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock Gemini Service
vi.mock('../../services/geminiService', () => ({
  startChatSession: () => ({
    sendMessage: vi.fn().mockResolvedValue({
      functionCalls: [{
        id: 'call-1',
        name: 'create_portfolio_structure',
        args: {
          strategyName: 'Tech Growth',
          groups: [
            { name: 'Software', allocation: 50, tickers: ['MSFT', 'GOOGL'] },
            { name: 'Hardware', allocation: 50, tickers: ['AAPL', 'NVDA'] }
          ]
        }
      }],
      text: null
    })
  })
}));

describe('Portfolio Creation Flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should create a new portfolio via AI', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText(/StrataMind/i)).toBeInTheDocument();
    });

    // Select an account
    const account = screen.getByText(/Retirement 401k/i);
    await user.click(account);

    // Type message in chat
    const chatInput = screen.getByPlaceholderText(/type a message/i);
    await user.type(chatInput, 'Create a tech growth portfolio');
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    // Wait for AI response and proposal
    await waitFor(() => {
      expect(screen.getByText(/Tech Growth/i)).toBeInTheDocument();
    });

    // Approve the proposal
    const approveButton = screen.getByRole('button', { name: /approve/i });
    await user.click(approveButton);

    // Verify portfolio was created
    await waitFor(() => {
      expect(screen.getByText(/Portfolio Created/i)).toBeInTheDocument();
    });
  });
});
```

---

### Phase 5: Add Missing Functionality with TDD (Week 4-6)

#### 5.1 Market Data Integration

**Test First** (`src/services/__tests__/marketData.test.ts`):

```typescript
import { describe, it, expect, vi } from 'vitest';
import { fetchStockPrice, validateTicker } from '../marketData';

describe('marketData service', () => {
  it('should fetch real stock price', async () => {
    const price = await fetchStockPrice('AAPL');
    expect(price).toBeGreaterThan(0);
    expect(typeof price).toBe('number');
  });

  it('should validate valid ticker symbols', async () => {
    const isValid = await validateTicker('MSFT');
    expect(isValid).toBe(true);
  });

  it('should reject invalid ticker symbols', async () => {
    const isValid = await validateTicker('INVALID123');
    expect(isValid).toBe(false);
  });

  it('should cache stock prices', async () => {
    const price1 = await fetchStockPrice('GOOGL');
    const price2 = await fetchStockPrice('GOOGL');
    
    // Second call should be from cache (faster)
    expect(price1).toBe(price2);
  });
});
```

**Then Implement** (`src/services/marketData.ts`):

```typescript
const ALPHA_VANTAGE_KEY = process.env.VITE_ALPHA_VANTAGE_KEY || '';
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

export const fetchStockPrice = async (symbol: string): Promise<number> => {
  // Check cache first
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  // Fetch from API
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  
  const price = parseFloat(data['Global Quote']['05. price']);
  
  // Cache the result
  priceCache.set(symbol, { price, timestamp: Date.now() });
  
  return price;
};

export const validateTicker = async (symbol: string): Promise<boolean> => {
  try {
    await fetchStockPrice(symbol);
    return true;
  } catch {
    return false;
  }
};
```

#### 5.2 Performance Tracking

**Test First**:

```typescript
import { describe, it, expect } from 'vitest';
import { calculatePortfolioPerformance, calculateReturns } from '../performance';

describe('performance tracking', () => {
  it('should calculate total portfolio value', () => {
    const portfolio = {
      children: [
        { symbol: 'AAPL', quantity: 10, currentPrice: 175 },
        { symbol: 'MSFT', quantity: 5, currentPrice: 350 }
      ]
    };
    
    const value = calculatePortfolioPerformance(portfolio);
    expect(value).toBe(3500); // (10 * 175) + (5 * 350)
  });

  it('should calculate daily returns', () => {
    const previousValue = 10000;
    const currentValue = 10500;
    
    const returns = calculateReturns(previousValue, currentValue);
    expect(returns).toBe(5.0); // 5% gain
  });
});
```

---

## Test Coverage Goals

| Component | Target Coverage | Priority |
|-----------|----------------|----------|
| `database.ts` | 100% | HIGH |
| `portfolioTree.ts` | 100% | HIGH |
| `geminiService.ts` | 90% | HIGH |
| `ChatPanel.tsx` | 90% | MEDIUM |
| `PortfolioVisualizer.tsx` | 85% | MEDIUM |
| `App.tsx` | 80% | MEDIUM |
| Integration Tests | Key flows | HIGH |

---

## Implementation Timeline

### Week 1: Setup & Utilities
- ✅ Install testing dependencies
- ✅ Configure Vitest
- ✅ Test `database.ts` (100% coverage)
- ✅ Extract and test portfolio tree utilities

### Week 2: Components
- ✅ Test `ChatPanel.tsx`
- ✅ Test `PortfolioVisualizer.tsx`
- ✅ Add error boundaries
- ✅ Add loading states

### Week 3: Integration
- ✅ Test complete user flows
- ✅ Test AI interaction workflows
- ✅ Test data persistence

### Week 4-6: New Features (TDD)
- ✅ Market data integration
- ✅ Performance tracking
- ✅ Ticker validation
- ✅ Backend API (optional)

---

## Next Steps

1. **Review this plan** and adjust priorities
2. **Install testing dependencies**
3. **Start with Phase 2** - Test existing utilities
4. **Refactor as you test** - Extract reusable logic
5. **Add missing features** using TDD

---

**Remember**: The goal is not just to add tests, but to improve code quality, find bugs, and build confidence in the application!
