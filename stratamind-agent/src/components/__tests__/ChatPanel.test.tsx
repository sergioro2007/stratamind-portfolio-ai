import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatPanel from '../../../components/ChatPanel';
import { Message, Sender, AIProposal } from '../../../types';

describe('ChatPanel', () => {
    const mockOnSendMessage = vi.fn();
    const mockOnApproveProposal = vi.fn();
    const mockOnRejectProposal = vi.fn();

    const defaultProps = {
        messages: [],
        onSendMessage: mockOnSendMessage,
        pendingProposal: null,
        onApproveProposal: mockOnApproveProposal,
        onRejectProposal: mockOnRejectProposal,
        isTyping: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render the chat panel with header', () => {
            render(<ChatPanel {...defaultProps} />);

            expect(screen.getByText('StrataMind AI')).toBeInTheDocument();
            expect(screen.getByText('Portfolio Architect')).toBeInTheDocument();
        });

        it('should render input field with placeholder', () => {
            render(<ChatPanel {...defaultProps} />);

            const input = screen.getByPlaceholderText(/Ask StrataMind to build a portfolio/i);
            expect(input).toBeInTheDocument();
            expect(input).not.toBeDisabled();
        });

        it('should render send button', () => {
            render(<ChatPanel {...defaultProps} />);

            const sendButton = screen.getByRole('button', { name: '' }); // Icon button
            expect(sendButton).toBeInTheDocument();
            expect(sendButton).not.toBeDisabled();
        });

        it('should render disclaimer text', () => {
            render(<ChatPanel {...defaultProps} />);

            expect(screen.getByText(/AI can make mistakes/i)).toBeInTheDocument();
        });
    });

    describe('Messages Display', () => {
        it('should render user messages', () => {
            const messages: Message[] = [
                {
                    id: '1',
                    sender: Sender.USER,
                    text: 'Create a tech portfolio',
                    timestamp: Date.now(),
                },
            ];

            render(<ChatPanel {...defaultProps} messages={messages} />);

            expect(screen.getByText('Create a tech portfolio')).toBeInTheDocument();
        });

        it('should render AI messages', () => {
            const messages: Message[] = [
                {
                    id: '1',
                    sender: Sender.AI,
                    text: 'I can help you with that!',
                    timestamp: Date.now(),
                },
            ];

            render(<ChatPanel {...defaultProps} messages={messages} />);

            expect(screen.getByText('I can help you with that!')).toBeInTheDocument();
        });

        it('should render system messages', () => {
            const messages: Message[] = [
                {
                    id: '1',
                    sender: Sender.SYSTEM,
                    text: 'Portfolio created successfully',
                    timestamp: Date.now(),
                },
            ];

            render(<ChatPanel {...defaultProps} messages={messages} />);

            expect(screen.getByText('Portfolio created successfully')).toBeInTheDocument();
        });

        it('should render multiple messages in order', () => {
            const messages: Message[] = [
                { id: '1', sender: Sender.AI, text: 'Hello!', timestamp: Date.now() },
                { id: '2', sender: Sender.USER, text: 'Hi there', timestamp: Date.now() },
                { id: '3', sender: Sender.AI, text: 'How can I help?', timestamp: Date.now() },
            ];

            render(<ChatPanel {...defaultProps} messages={messages} />);

            expect(screen.getByText('Hello!')).toBeInTheDocument();
            expect(screen.getByText('Hi there')).toBeInTheDocument();
            expect(screen.getByText('How can I help?')).toBeInTheDocument();
        });

        it('should display tool name when message has toolName', () => {
            const messages: Message[] = [
                {
                    id: '1',
                    sender: Sender.AI,
                    text: 'Creating portfolio...',
                    timestamp: Date.now(),
                    toolName: 'create_portfolio_structure',
                },
            ];

            render(<ChatPanel {...defaultProps} messages={messages} />);

            expect(screen.getByText(/Calling: create_portfolio_structure/i)).toBeInTheDocument();
        });
    });

    describe('Typing Indicator', () => {
        it('should show typing indicator when isTyping is true', () => {
            render(<ChatPanel {...defaultProps} isTyping={true} />);

            expect(screen.getByText('Thinking...')).toBeInTheDocument();
        });

        it('should not show typing indicator when isTyping is false', () => {
            render(<ChatPanel {...defaultProps} isTyping={false} />);

            expect(screen.queryByText('Thinking...')).not.toBeInTheDocument();
        });
    });

    describe('Message Sending', () => {
        it('should call onSendMessage when user submits a message', async () => {
            const user = userEvent.setup();
            render(<ChatPanel {...defaultProps} />);

            const input = screen.getByPlaceholderText(/Ask StrataMind to build a portfolio/i);
            await user.type(input, 'Create a tech portfolio');

            const form = input.closest('form');
            fireEvent.submit(form!);

            expect(mockOnSendMessage).toHaveBeenCalledWith('Create a tech portfolio');
        });

        it('should clear input after sending message', async () => {
            const user = userEvent.setup();
            render(<ChatPanel {...defaultProps} />);

            const input = screen.getByPlaceholderText(/Ask StrataMind to build a portfolio/i) as HTMLInputElement;
            await user.type(input, 'Test message');

            const form = input.closest('form');
            fireEvent.submit(form!);

            expect(input.value).toBe('');
        });

        it('should not send empty messages', async () => {
            render(<ChatPanel {...defaultProps} />);

            const input = screen.getByPlaceholderText(/Ask StrataMind to build a portfolio/i);
            const form = input.closest('form');
            fireEvent.submit(form!);

            expect(mockOnSendMessage).not.toHaveBeenCalled();
        });

        it('should not send whitespace-only messages', async () => {
            const user = userEvent.setup();
            render(<ChatPanel {...defaultProps} />);

            const input = screen.getByPlaceholderText(/Ask StrataMind to build a portfolio/i);
            await user.type(input, '   ');

            const form = input.closest('form');
            fireEvent.submit(form!);

            expect(mockOnSendMessage).not.toHaveBeenCalled();
        });

        it('should send messages with whitespace (trim only for validation)', async () => {
            const user = userEvent.setup();
            render(<ChatPanel {...defaultProps} />);

            const input = screen.getByPlaceholderText(/Ask StrataMind to build a portfolio/i);
            await user.type(input, '  Test message  ');

            const form = input.closest('form');
            fireEvent.submit(form!);

            // Component validates with trim() but sends original value
            expect(mockOnSendMessage).toHaveBeenCalledWith('  Test message  ');
        });
    });

    describe('Pending Proposal', () => {
        const mockProposal: AIProposal = {
            id: 'prop-1',
            type: 'ADD_SLICE',
            toolName: 'add_ticker_to_group',
            description: 'Add AAPL to Tech Sector',
            details: { symbol: 'AAPL', groupName: 'Tech', allocation: 25 },
            status: 'PENDING',
        };

        it('should render pending proposal card', () => {
            render(<ChatPanel {...defaultProps} pendingProposal={mockProposal} />);

            expect(screen.getByText('Action Required')).toBeInTheDocument();
            expect(screen.getByText('ADD_SLICE')).toBeInTheDocument();
            expect(screen.getByText('Add AAPL to Tech Sector')).toBeInTheDocument();
        });

        it('should display proposal details as JSON', () => {
            render(<ChatPanel {...defaultProps} pendingProposal={mockProposal} />);

            const detailsText = screen.getByText(/"symbol": "AAPL"/i);
            expect(detailsText).toBeInTheDocument();
        });

        it('should render approve and reject buttons', () => {
            render(<ChatPanel {...defaultProps} pendingProposal={mockProposal} />);

            expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
        });

        it('should call onApproveProposal when approve button is clicked', async () => {
            const user = userEvent.setup();
            render(<ChatPanel {...defaultProps} pendingProposal={mockProposal} />);

            const approveButton = screen.getByRole('button', { name: /approve/i });
            await user.click(approveButton);

            expect(mockOnApproveProposal).toHaveBeenCalledWith(mockProposal);
        });

        it('should call onRejectProposal when reject button is clicked', async () => {
            const user = userEvent.setup();
            render(<ChatPanel {...defaultProps} pendingProposal={mockProposal} />);

            const rejectButton = screen.getByRole('button', { name: /reject/i });
            await user.click(rejectButton);

            expect(mockOnRejectProposal).toHaveBeenCalledWith(mockProposal);
        });

        it('should disable input when proposal is pending', () => {
            render(<ChatPanel {...defaultProps} pendingProposal={mockProposal} />);

            const input = screen.getByPlaceholderText(/Ask StrataMind to build a portfolio/i);
            expect(input).toBeDisabled();
        });

        it('should disable send button when proposal is pending', () => {
            render(<ChatPanel {...defaultProps} pendingProposal={mockProposal} />);

            const sendButton = screen.getByRole('button', { name: '' });
            expect(sendButton).toBeDisabled();
        });
    });

    describe('Input Disabled States', () => {
        it('should disable input when isTyping is true', () => {
            render(<ChatPanel {...defaultProps} isTyping={true} />);

            const input = screen.getByPlaceholderText(/Ask StrataMind to build a portfolio/i);
            expect(input).toBeDisabled();
        });

        it('should disable send button when isTyping is true', () => {
            render(<ChatPanel {...defaultProps} isTyping={true} />);

            const sendButton = screen.getByRole('button', { name: '' });
            expect(sendButton).toBeDisabled();
        });

        it('should enable input when not typing and no pending proposal', () => {
            render(<ChatPanel {...defaultProps} isTyping={false} pendingProposal={null} />);

            const input = screen.getByPlaceholderText(/Ask StrataMind to build a portfolio/i);
            expect(input).not.toBeDisabled();
        });
    });

    describe('Proposal Types', () => {
        it('should render CREATE_PORTFOLIO proposal', () => {
            const proposal: AIProposal = {
                id: 'prop-1',
                type: 'CREATE_PORTFOLIO',
                toolName: 'create_portfolio_structure',
                description: 'Create a new portfolio',
                details: { strategyName: 'Tech Growth', groups: [] },
                status: 'PENDING',
            };

            render(<ChatPanel {...defaultProps} pendingProposal={proposal} />);

            expect(screen.getByText('CREATE_PORTFOLIO')).toBeInTheDocument();
            expect(screen.getByText('Create a new portfolio')).toBeInTheDocument();
        });

        it('should render REBALANCE proposal', () => {
            const proposal: AIProposal = {
                id: 'prop-1',
                type: 'REBALANCE',
                toolName: 'rebalance_portfolio',
                description: 'Rebalance your portfolio',
                details: { method: 'Threshold' },
                status: 'PENDING',
            };

            render(<ChatPanel {...defaultProps} pendingProposal={proposal} />);

            expect(screen.getByText('REBALANCE')).toBeInTheDocument();
            expect(screen.getByText('Rebalance your portfolio')).toBeInTheDocument();
        });

        it('should render REMOVE_SLICE proposal', () => {
            const proposal: AIProposal = {
                id: 'prop-1',
                type: 'REMOVE_SLICE',
                toolName: 'remove_ticker',
                description: 'Remove AAPL from portfolio',
                details: { symbol: 'AAPL' },
                status: 'PENDING',
            };

            render(<ChatPanel {...defaultProps} pendingProposal={proposal} />);

            expect(screen.getByText('REMOVE_SLICE')).toBeInTheDocument();
            expect(screen.getByText('Remove AAPL from portfolio')).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty messages array', () => {
            render(<ChatPanel {...defaultProps} messages={[]} />);

            // Should still render the chat panel
            expect(screen.getByText('StrataMind AI')).toBeInTheDocument();
        });

        it('should handle very long messages', () => {
            const longMessage = 'A'.repeat(1000);
            const messages: Message[] = [
                { id: '1', sender: Sender.USER, text: longMessage, timestamp: Date.now() },
            ];

            render(<ChatPanel {...defaultProps} messages={messages} />);

            expect(screen.getByText(longMessage)).toBeInTheDocument();
        });

        it('should handle special characters in messages', () => {
            const messages: Message[] = [
                { id: '1', sender: Sender.USER, text: '<script>alert("xss")</script>', timestamp: Date.now() },
            ];

            render(<ChatPanel {...defaultProps} messages={messages} />);

            // React escapes HTML by default, so this should be safe
            expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
        });

        it('should handle rapid message submissions', async () => {
            const user = userEvent.setup();
            render(<ChatPanel {...defaultProps} />);

            const input = screen.getByPlaceholderText(/Ask StrataMind to build a portfolio/i);
            const form = input.closest('form');

            await user.type(input, 'Message 1');
            fireEvent.submit(form!);

            await user.type(input, 'Message 2');
            fireEvent.submit(form!);

            await user.type(input, 'Message 3');
            fireEvent.submit(form!);

            expect(mockOnSendMessage).toHaveBeenCalledTimes(3);
            expect(mockOnSendMessage).toHaveBeenNthCalledWith(1, 'Message 1');
            expect(mockOnSendMessage).toHaveBeenNthCalledWith(2, 'Message 2');
            expect(mockOnSendMessage).toHaveBeenNthCalledWith(3, 'Message 3');
        });
    });

    describe('Accessibility', () => {
        it('should have accessible form', () => {
            render(<ChatPanel {...defaultProps} />);

            const form = screen.getByRole('textbox').closest('form');
            expect(form).toBeInTheDocument();
        });

        it('should have accessible buttons', () => {
            const proposal: AIProposal = {
                id: 'prop-1',
                type: 'ADD_SLICE',
                toolName: 'add_ticker',
                description: 'Add ticker',
                details: {},
                status: 'PENDING',
            };

            render(<ChatPanel {...defaultProps} pendingProposal={proposal} />);

            const approveButton = screen.getByRole('button', { name: /approve/i });
            const rejectButton = screen.getByRole('button', { name: /reject/i });

            expect(approveButton).toBeInTheDocument();
            expect(rejectButton).toBeInTheDocument();
        });

        it('should have proper disabled states for accessibility', () => {
            render(<ChatPanel {...defaultProps} isTyping={true} />);

            const input = screen.getByPlaceholderText(/Ask StrataMind to build a portfolio/i);
            const sendButton = screen.getByRole('button', { name: '' });

            expect(input).toHaveAttribute('disabled');
            expect(sendButton).toHaveAttribute('disabled');
        });
    });
});
