
import { describe, it, expect, vi } from 'vitest';

// Hoist the env stub to run before module imports
vi.hoisted(() => {
    process.env.API_KEY = 'test-mock-api-key';
});

import * as geminiService from '../../../services/geminiService';

// Mock GoogleGenAI
vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: class {
            constructor(config: { apiKey: string }) { }
            chats = {
                create: vi.fn(() => ({
                    sendMessage: vi.fn()
                }))
            }
        },
        Type: {
            OBJECT: 'OBJECT',
            STRING: 'STRING',
            NUMBER: 'NUMBER',
            ARRAY: 'ARRAY'
        },
        FunctionDeclaration: {}
    };
});

describe('Gemini Service', () => {
    it('should export startChatSession function', () => {
        expect(geminiService.startChatSession).toBeDefined();
        expect(typeof geminiService.startChatSession).toBe('function');
    });

    it('should export verifyStrategy function', () => {
        expect(geminiService.verifyStrategy).toBeDefined();
        expect(typeof geminiService.verifyStrategy).toBe('function');
    });
});
