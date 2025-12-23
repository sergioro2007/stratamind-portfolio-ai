import { expect, afterEach, vi, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Global beforeEach to reset auth mocks
beforeEach(() => {
  // Reset localStorage
  global.localStorage.clear();
});

// Mock localStorage with actual storage
const storage: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    Object.keys(storage).forEach(key => delete storage[key]);
  },
};

global.localStorage = localStorageMock as any;

// Mock auth service globally for all tests
vi.mock('../services/authService', () => {
  return {
    login: vi.fn().mockResolvedValue({ id: 'test-user', email: 'test@example.com' }),
    logout: vi.fn(),
    getCurrentUser: vi.fn(() => ({ id: 'test-user', email: 'test@example.com' })),
    isAuthenticated: vi.fn(() => true)
  };
});

// Mock Gemini service to avoid API calls in tests
vi.mock('../services/geminiService', () => ({
  startChatSession: vi.fn().mockResolvedValue({}),
  analyzePortfolio: vi.fn().mockResolvedValue('Mock analysis'),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock secure context for clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

// Mock HTMLElement methods
HTMLElement.prototype.scrollIntoView = vi.fn();

// Global Recharts Stub to prevent layout crashes in JSDOM
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => children,
  };
});
