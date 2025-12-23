import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startChatSession } from '../../../services/geminiService';
import { GoogleGenAI } from '@google/genai';

// Mock the Google Gen AI SDK
vi.mock('@google/genai');

describe('Gemini Service - Mocked', () => {
    let mockSendMessage: any;
    let mockCreate: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSendMessage = vi.fn();
        mockCreate = vi.fn().mockReturnValue({
            sendMessage: mockSendMessage
        });
        (GoogleGenAI as any).mockImplementation(() => ({
            chats: {
                create: mockCreate
            }
        }));

        // Set API key
        process.env.API_KEY = 'test-key';
    });

    it('should create a chat session with correct configuration', () => {
        const session = startChatSession();
        expect(session).toBeDefined();
        expect(session.sendMessage).toBeDefined();
    });

    it('should handle missing API key gracefully', () => {
        delete process.env.API_KEY;
        const session = startChatSession();
        expect(session).toBeDefined();
        expect(session.sendMessage).toBeDefined();
    });

    it('should return mock response when API key is missing', async () => {
        delete process.env.API_KEY;
        const session = startChatSession();
        const result = await session.sendMessage({ message: 'test' });
        expect(result.response.text()).toContain('unavailable');
    });
});
