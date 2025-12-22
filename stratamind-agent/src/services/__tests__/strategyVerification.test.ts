
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist the env stub to run before module imports
vi.hoisted(() => {
    process.env.API_KEY = 'test-mock-api-key';
});

import * as geminiService from '../../../services/geminiService';

// Mock GoogleGenAI (similar to geminiService.test.ts)
vi.mock('@google/genai', () => {
    return {
        GoogleGenAI: class {
            constructor(config: { apiKey: string }) { }
            chats = {
                create: vi.fn(() => ({
                    sendMessage: vi.fn(async (msg) => ({
                        response: {
                            text: () => "Analysis Result: Portfolio looks good.",
                            functionCalls: []
                        }
                    }))
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

// We need to spy on the chat session created inside the service
// or mock the startChatSession to return our spy.
// Since verifyStrategy likely uses an existing or new chat, we assume it uses startChatSession.

describe('Strategy Verification', () => {
    it('should send portfolio context and goal to AI', async () => {
        // Setup
        const mockPortfolio = {
            id: 'root',
            parentId: null,
            type: 'GROUP',
            name: 'My Strategy',
            targetAllocation: 100,
            currentValue: 1000,
            children: [
                { id: '1', name: 'Tech', targetAllocation: 50, currentValue: 500, type: 'GROUP', parentId: 'root' },
                { id: '2', name: 'Bonds', targetAllocation: 50, currentValue: 500, type: 'GROUP', parentId: 'root' }
            ]
        };
        const mockPrompt = "I want high growth with moderate risk.";

        // Spy on sendMessage
        const sendMessageSpy = vi.fn().mockResolvedValue({
            response: { text: () => "Analysis complete" }
        });

        // access the private 'ai' instance or spy on startChatSession
        // Easier: Verify verifyStrategy calls sendMessage with right string.

        // Let's modify geminiService to export the chat interface or allow injection?
        // Or simply rely on the fact that startChatSession is called internally?
        // Actually, verifyStrategy probably takes a chatSession as arg? 
        // Or it uses the singleton `ai` to create a fresh one?
        // Ideally reuse strict context. 

        // For this test, let's assume verifyStrategy takes the session OR creates one.
        // Let's implement it as: verifyStrategy(chatSession, portfolio, prompt).
        // This makes it pure and testable.

        const result = await geminiService.verifyStrategy(
            { sendMessage: sendMessageSpy } as any,
            mockPortfolio as any,
            mockPrompt
        );

        expect(sendMessageSpy).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining("I want high growth with moderate risk")
        }));

        expect(sendMessageSpy).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining("Tech")
        }));
    });
});
