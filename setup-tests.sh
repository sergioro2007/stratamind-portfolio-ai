#!/bin/bash

# TDD Setup Script for StrataMind Agent
# This script sets up the testing infrastructure for the existing React app

set -e

echo "🧪 Setting up Test-Driven Development for StrataMind Agent..."
echo ""

# Navigate to the app directory
cd "$(dirname "$0")/stratamind-agent"

echo "📦 Installing testing dependencies..."
npm install --save-dev \
  vitest \
  @vitest/ui \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom \
  @types/jest \
  @vitest/coverage-v8

echo ""
echo "✅ Dependencies installed!"
echo ""

# Create test directories
echo "📁 Creating test directory structure..."
mkdir -p src/test
mkdir -p src/services/__tests__
mkdir -p src/components/__tests__
mkdir -p src/utils/__tests__
mkdir -p src/__tests__/integration

echo ""
echo "✅ Directories created!"
echo ""

# Create vitest config
echo "⚙️  Creating vitest.config.ts..."
cat > vitest.config.ts << 'EOF'
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
        '**/*.test.ts',
        '**/*.test.tsx',
      ],
    },
  },
});
EOF

echo ""
echo "✅ vitest.config.ts created!"
echo ""

# Create test setup file
echo "⚙️  Creating test setup file..."
cat > src/test/setup.ts << 'EOF'
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

global.localStorage = localStorageMock as any;
EOF

echo ""
echo "✅ Test setup created!"
echo ""

# Update package.json scripts
echo "⚙️  Updating package.json scripts..."
npm pkg set scripts.test="vitest"
npm pkg set scripts.test:ui="vitest --ui"
npm pkg set scripts.test:coverage="vitest --coverage"
npm pkg set scripts.test:run="vitest run"

echo ""
echo "✅ Scripts updated!"
echo ""

# Create a sample test file
echo "📝 Creating sample test file..."
cat > src/services/__tests__/database.test.ts << 'EOF'
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, generateId } from '../database';

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
});
EOF

echo ""
echo "✅ Sample test created!"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Run tests:"
echo "   npm test"
echo ""
echo "2. Run tests with UI:"
echo "   npm run test:ui"
echo ""
echo "3. Run tests with coverage:"
echo "   npm run test:coverage"
echo ""
echo "4. Review the implementation plan:"
echo "   open ../TDD_EXISTING_APP_PLAN.md"
echo ""
echo "Happy testing! 🧪"
