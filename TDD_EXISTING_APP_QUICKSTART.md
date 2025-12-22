# StrataMind Agent - TDD Quick Start

## 🎯 Applying TDD to Your Existing Application

You have a working React/TypeScript application in `stratamind-agent/`. Let's add comprehensive tests and improve it using Test-Driven Development!

## 📊 Current Application Overview

**What You Have:**
- ✅ React + TypeScript + Vite frontend
- ✅ Google Gemini AI integration
- ✅ Hierarchical portfolio management (M1 Finance-style)
- ✅ LocalStorage persistence
- ✅ Chat interface for AI interactions
- ✅ Portfolio visualization

**What's Missing:**
- ❌ No tests
- ❌ No real market data
- ❌ No backend/database
- ❌ No ticker validation
- ❌ No performance tracking

## 🚀 Quick Setup (5 Minutes)

### Option 1: Automated Setup (Recommended)

```bash
cd /Users/soliv112/PersonalProjects/StrataMind/portfolio-ai

# Run the setup script
./setup-tests.sh
```

This will:
1. Install all testing dependencies
2. Create test directory structure
3. Configure Vitest
4. Create sample test files
5. Update package.json scripts

### Option 2: Manual Setup

```bash
cd stratamind-agent

# Install dependencies
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/jest @vitest/coverage-v8

# Create directories
mkdir -p src/test src/services/__tests__ src/components/__tests__ src/utils/__tests__

# Copy config files from TDD_EXISTING_APP_PLAN.md
```

## 🧪 Running Tests

```bash
cd stratamind-agent

# Run tests in watch mode
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run tests once (CI mode)
npm run test:run
```

## 📝 Your First Test

After setup, you'll have a sample test at `src/services/__tests__/database.test.ts`.

Run it:
```bash
npm test
```

Expected output:
```
✓ database service (3)
  ✓ generateId > should generate unique IDs
  ✓ load > should return seed data when localStorage is empty
  ✓ save > should persist data to localStorage

Test Files  1 passed (1)
     Tests  3 passed (3)
```

## 📚 Documentation

### Complete Implementation Plan
→ **[TDD_EXISTING_APP_PLAN.md](TDD_EXISTING_APP_PLAN.md)**

This comprehensive document includes:
- Detailed testing strategy for all components
- 100+ example test cases
- Step-by-step implementation guide
- Timeline and priorities
- Missing functionality to add with TDD

### Key Sections:

1. **Phase 1: Setup** (Week 1)
   - Install dependencies ✅
   - Configure Vitest ✅
   - Create test structure ✅

2. **Phase 2: Test Utilities** (Week 1-2)
   - Test `database.ts` service
   - Test portfolio tree operations
   - Extract reusable utilities

3. **Phase 3: Test Components** (Week 2-3)
   - Test `ChatPanel.tsx`
   - Test `PortfolioVisualizer.tsx`
   - Add error boundaries

4. **Phase 4: Integration Tests** (Week 3-4)
   - Test complete user flows
   - Test AI workflows
   - Test data persistence

5. **Phase 5: Add Features with TDD** (Week 4-6)
   - Market data integration
   - Performance tracking
   - Ticker validation
   - Backend API (optional)

## 🎯 Recommended Workflow

### 1. Start with Existing Code

Test what you have first:

```bash
# Test database service
npm test src/services/__tests__/database.test.ts

# Test all services
npm test src/services
```

### 2. Refactor While Testing

As you write tests, you'll find opportunities to improve:

**Example**: Extract portfolio tree logic from `App.tsx`:

```typescript
// Before: Logic in App.tsx (hard to test)
const normalizeChildren = (children) => { /* ... */ }

// After: Extract to utils/portfolioTree.ts (easy to test)
import { normalizeChildren } from './utils/portfolioTree';
```

### 3. Add New Features with TDD

**Red → Green → Refactor**

Example: Adding market data validation

```typescript
// 1. RED: Write failing test
it('should validate ticker symbols', async () => {
  const isValid = await validateTicker('AAPL');
  expect(isValid).toBe(true);
});

// 2. GREEN: Implement minimal code
export const validateTicker = async (symbol: string) => {
  // Call Alpha Vantage API
  // Return true if valid
};

// 3. REFACTOR: Improve implementation
// Add caching, error handling, etc.
```

## 🐛 Finding Bugs Through Testing

As you write tests, you'll likely discover bugs. For example:

### Bug 1: Allocation Normalization
```typescript
it('should handle rounding errors in allocation', () => {
  const children = [
    { allocation: 33.3 },
    { allocation: 33.3 },
    { allocation: 33.3 }
  ];
  
  normalizeChildren(children);
  
  const total = children.reduce((sum, c) => sum + c.allocation, 0);
  expect(total).toBe(100); // Might fail due to rounding!
});
```

### Bug 2: Empty Portfolio Handling
```typescript
it('should handle empty portfolio gracefully', () => {
  const root = { children: [] };
  expect(() => removeNodeFromTree(root, 'any-id')).not.toThrow();
});
```

## 📊 Test Coverage Goals

| Component | Target | Priority |
|-----------|--------|----------|
| `database.ts` | 100% | 🔴 HIGH |
| Portfolio tree utils | 100% | 🔴 HIGH |
| `geminiService.ts` | 90% | 🔴 HIGH |
| `ChatPanel.tsx` | 90% | 🟡 MEDIUM |
| `PortfolioVisualizer.tsx` | 85% | 🟡 MEDIUM |
| `App.tsx` | 80% | 🟡 MEDIUM |

## 🔧 Useful Commands

```bash
# Watch mode (auto-run on changes)
npm test

# Run specific test file
npm test database.test.ts

# Run tests matching pattern
npm test -- --grep="portfolio"

# Update snapshots
npm test -- -u

# Run with coverage
npm run test:coverage

# Open coverage report
open coverage/index.html
```

## 📖 Example Test Patterns

### Testing React Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should handle user interaction', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  
  render(<MyComponent onSubmit={onSubmit} />);
  
  const button = screen.getByRole('button', { name: /submit/i });
  await user.click(button);
  
  expect(onSubmit).toHaveBeenCalled();
});
```

### Testing Async Operations

```typescript
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```

### Mocking Services

```typescript
vi.mock('../services/geminiService', () => ({
  startChatSession: () => ({
    sendMessage: vi.fn().mockResolvedValue({ text: 'Mocked response' })
  })
}));
```

## 🎓 Learning Resources

- **[TDD_EXISTING_APP_PLAN.md](TDD_EXISTING_APP_PLAN.md)** - Complete implementation guide
- **[TDD_FRAMEWORK.md](TDD_FRAMEWORK.md)** - General TDD principles
- **[TDD_QUICKSTART.md](TDD_QUICKSTART.md)** - TDD basics
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## 🚦 Next Steps

1. ✅ **Run setup script**: `./setup-tests.sh`
2. ✅ **Run sample test**: `cd stratamind-agent && npm test`
3. 📖 **Read implementation plan**: `TDD_EXISTING_APP_PLAN.md`
4. 🧪 **Write your first test**: Test the `database.ts` service
5. 🔄 **Refactor**: Extract utilities from `App.tsx`
6. ➕ **Add features**: Use TDD to add market data, validation, etc.

## 💡 Pro Tips

1. **Start Small**: Test utilities first, then components
2. **Refactor as You Go**: Extract logic to make it testable
3. **Mock External Services**: Don't call real APIs in tests
4. **Test Behavior, Not Implementation**: Focus on what, not how
5. **Keep Tests Fast**: Unit tests should run in milliseconds

---

**Ready to start?** Run `./setup-tests.sh` and begin testing! 🚀
