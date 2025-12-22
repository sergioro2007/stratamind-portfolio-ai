import React, { useRef, useEffect } from 'react';
import { Message, Sender, AIProposal } from '../types';
import { Send, Bot, User, Loader2, Sparkles, CheckCircle, XCircle } from 'lucide-react';

interface Props {
    messages: Message[];
    onSendMessage: (text: string) => void;
    pendingProposal: AIProposal | null;
    onApproveProposal: (proposal: AIProposal) => void;
    onRejectProposal: (proposal: AIProposal) => void;
    isTyping: boolean;
}

const ChatPanel: React.FC<Props> = ({
    messages,
    onSendMessage,
    pendingProposal,
    onApproveProposal,
    onRejectProposal,
    isTyping
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, pendingProposal, isTyping]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputRef.current && inputRef.current.value.trim()) {
            onSendMessage(inputRef.current.value);
            inputRef.current.value = '';
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-white">StrataMind AI</h2>
                        <p className="text-xs text-indigo-400">Portfolio Architect</p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender === Sender.USER ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex max-w-[85%] ${msg.sender === Sender.USER ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === Sender.USER ? 'bg-slate-700' : 'bg-indigo-600'
                                }`}>
                                {msg.sender === Sender.USER ? <User className="w-4 h-4 text-slate-300" /> : <Bot className="w-4 h-4 text-white" />}
                            </div>

                            {/* Bubble */}
                            <div className={`p-3 rounded-2xl text-sm leading-relaxed ${msg.sender === Sender.USER
                                    ? 'bg-slate-700 text-slate-100 rounded-tr-none'
                                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                                }`}>
                                {msg.text}
                                {msg.toolName && (
                                    <div className="mt-2 text-xs font-mono bg-black/30 p-2 rounded text-indigo-300 border border-indigo-500/30">
                                        🛠 Calling: {msg.toolName}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="flex max-w-[80%] items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                            </div>
                            <span className="text-xs text-slate-500 animate-pulse">Thinking...</span>
                        </div>
                    </div>
                )}

                {/* AI Proposal Card */}
                {pendingProposal && (
                    <div className="ml-11 max-w-[85%] bg-slate-800 border border-indigo-500/50 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-indigo-500/10 p-3 border-b border-indigo-500/20 flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Action Required</span>
                            <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full">{pendingProposal.type}</span>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-slate-200 mb-3">{pendingProposal.description}</p>

                            {/* Detailed breakdown based on type */}
                            <div className="bg-black/20 rounded p-3 mb-4 text-xs font-mono text-slate-400">
                                <pre className="whitespace-pre-wrap overflow-x-auto">
                                    {JSON.stringify(pendingProposal.details, null, 2)}
                                </pre>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onApproveProposal(pendingProposal)}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    <CheckCircle className="w-4 h-4" /> Approve
                                </button>
                                <button
                                    onClick={() => onRejectProposal(pendingProposal)}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    <XCircle className="w-4 h-4" /> Reject
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-900">
                <form onSubmit={handleSubmit} className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        data-testid="chat-input"
                        placeholder="Ask StrataMind to build a portfolio..."
                        className="w-full bg-slate-800 text-white placeholder-slate-500 rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-700"
                        disabled={!!pendingProposal || isTyping}
                    />
                    <button
                        type="submit"
                        data-testid="send-button"
                        disabled={!!pendingProposal || isTyping}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
                <p className="text-center text-[10px] text-slate-600 mt-2">
                    AI can make mistakes. Please review proposals carefully.
                </p>
            </div>
        </div>
    );
};

export default ChatPanel;
