import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

// Ensure API Key is available
const API_KEY = process.env.API_KEY || '';

if (!API_KEY) {
    console.warn("⚠️ Gemin API Key is missing! Check your .env file for GEMINI_API_KEY or VITE_GEMINI_API_KEY.");
}

const createAiInstance = () => {
    if (!API_KEY) return null;
    return new GoogleGenAI({ apiKey: API_KEY });
};

// --- Tool Definitions ---

const createPortfolioTool: FunctionDeclaration = {
    name: 'create_portfolio_structure',
    description: 'Initialize a new portfolio strategy structure for the currently selected account.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            strategyName: { type: Type.STRING, description: 'Name of the root strategy' },
            strategyGoal: { type: Type.STRING, description: 'The original user prompt or goal description for this strategy' },
            groups: {
                type: Type.ARRAY,
                description: 'List of initial sectors/groups',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        allocation: { type: Type.NUMBER, description: 'Target allocation percentage (0-100). MUST be an integer (whole number).' },
                        tickers: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: 'Optional list of stock tickers (e.g. ["AAPL", "MSFT"]) to initialize in this group. Allocations will be distributed evenly as INTEGERS (e.g. 33%, 33%, 34%).'
                        },
                        subgroups: {
                            type: Type.ARRAY,
                            description: 'Optional nested subgroups within this group for hierarchical structures.',
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    allocation: { type: Type.NUMBER, description: 'Allocation % within parent group (0-100)' },
                                    tickers: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING },
                                        description: 'Optional tickers for this subgroup'
                                    }
                                },
                                required: ['name', 'allocation']
                            }
                        }
                    },
                    required: ['name', 'allocation']
                }
            },
            holdings: {
                type: Type.ARRAY,
                description: 'Optional list of direct stock holdings for a FLAT portfolio structure (if groups are not requested).',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        symbol: { type: Type.STRING, description: 'Stock symbol (e.g. AAPL)' },
                        allocation: { type: Type.NUMBER, description: 'Target allocation (0-100)' }
                    },
                    required: ['symbol', 'allocation']
                }
            }
        },
        required: ['strategyName']
    }
};

const addTickerTool: FunctionDeclaration = {
    // ... existing addTickerTool code ...
    name: 'add_ticker_to_group',
    description: 'Add a specific stock ticker to a specific group or the root of the CURRENTLY selected account. If the allocation would exceed 100%, the system will automatically rebalance existing holdings proportionally.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            symbol: { type: Type.STRING, description: 'Stock symbol (e.g., AAPL)' },
            groupName: { type: Type.STRING, description: 'Name of the group to add to (fuzzy match)' },
            allocation: { type: Type.NUMBER, description: 'Target allocation percentage within the group. MUST be an integer (whole number).' },
            autoRebalance: { type: Type.BOOLEAN, description: 'If true, automatically rebalance existing holdings when allocation exceeds 100%. Default: true' }
        },
        required: ['symbol', 'allocation']
    }
};

const removeTickerTool: FunctionDeclaration = {
    name: 'remove_ticker',
    description: 'Remove a specific stock ticker or group from the portfolio.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            symbol: { type: Type.STRING, description: 'Stock symbol or Group name to remove (e.g., TSLA)' }
        },
        required: ['symbol']
    }
};


const rebalanceTool: FunctionDeclaration = {
    name: 'rebalance_portfolio',
    description: 'Rebalance holdings to equal allocations (all stocks get same percentage). Works on current group or entire strategy. All allocations will be integers summing to 100%.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            groupName: {
                type: Type.STRING,
                description: 'Optional: specific group to rebalance (fuzzy match). If omitted, rebalances entire active strategy.'
            }
        }
    }
};

const marketAnalysisTool: FunctionDeclaration = {
    // ... existing marketAnalysisTool code ...
    name: 'analyze_market_sentiment',
    description: 'Get current market sentiment for specific sectors to inform decisions.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            sectors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of sectors to analyze (e.g., "Tech", "Energy")'
            }
        },
        required: ['sectors']
    }
};

const updateAllocationTool: FunctionDeclaration = {
    name: 'update_allocation',
    description: 'Update a specific holding to a new allocation and rebalance remaining holdings equally with integers. Use when user says "make NVDA 15 and rebalance rest" or similar.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            symbol: { type: Type.STRING, description: 'Stock symbol to update (e.g., NVDA)' },
            allocation: { type: Type.NUMBER, description: 'New allocation percentage for this stock. MUST be an integer.' },
            groupName: { type: Type.STRING, description: 'Optional: specific group containing the stock (fuzzy match)' }
        },
        required: ['symbol', 'allocation']
    }
};

const batchAddTickerTool: FunctionDeclaration = {
    name: 'add_multiple_tickers_to_group',
    description: 'Add MULTIPLE stock tickers to a specific group or the root of the selected account in one batch. Use this when the user lists multiple stocks to add (e.g., "Add AAPL, MSFT, and GOOGL").',
    parameters: {
        type: Type.OBJECT,
        properties: {
            groupName: { type: Type.STRING, description: 'Name of the group to add these tickers to (fuzzy match). Optional.' },
            tickers: {
                type: Type.ARRAY,
                description: 'List of tickers and their allocations',
                items: {
                    type: Type.OBJECT,
                    properties: {
                        symbol: { type: Type.STRING, description: 'Stock symbol (e.g., AAPL)' },
                        allocation: { type: Type.NUMBER, description: 'Target allocation percentage. MUST be an integer.' }
                    },
                    required: ['symbol', 'allocation']
                }
            },
            autoRebalance: { type: Type.BOOLEAN, description: 'If true, automatically rebalance existing holdings. Default: true' }
        },
        required: ['tickers']
    }
};

const tools = [createPortfolioTool, addTickerTool, batchAddTickerTool, removeTickerTool, rebalanceTool, updateAllocationTool, marketAnalysisTool];

const SYSTEM_INSTRUCTION = `
You are StrataMind, an expert AI portfolio manager. 
Your goal is to help users build "Pie-based" hierarchical portfolios (similar to M1 Finance).
You can create groups (Pies) and add holdings (Slices) to them.

Context:
The user has multiple accounts across different institutions (e.g., Fidelity, M1).
Each account can hold MULTIPLE distinct strategies (Pies).
Changes you propose apply ONLY to the account the user is currently viewing.

Rules:
1. Always ensure allocations within a group sum to 100% ideally, but warn if they don't.
2. ALL allocation percentages MUST be integers (whole numbers). Never use decimals.
3. Users can create NEW strategies in an account. If they say "create a new strategy/portfolio", use create_portfolio_structure.
   - **Smart Naming & Goal Generation**: 
     - **strategyName**: Extract a short, Punchy Title Case name (e.g. "High Risk Biotech").
     - **strategyGoal**: This field MUST be a **Detailed Investment Mandate** or "Constitution". 
       - **SYNTHESIZE** a comprehensive set of rules/criteria even if the user prompt is simple.
       - EXPAND the goal to include implied criteria like "Minimizing volatility", "Targeting high liquidity", or "Focusing on sector leaders" if appropriate.
       - DO NOT include verbs like "Create" or "Make".
       - Example: User: "Balanced Tech" -> Goal: "Focus on established large-cap technology companies with stable cash flows, while balancing growth potential with lower volatility. Prioritize sector leaders."
   - **Structure**:
     - If the user explicitly asks for "Groups", "Sectors", or a hierarchical structure (e.g. "Create a Tech portfolio with Hardware and Software sectors"), use the **groups** parameter.
     - If the user asks for a simple list of stocks or does NOT mention groups (e.g. "Create a portfolio with AAPL, MSFT, and GOOGL"), use the **holdings** parameter directly. DO NOT force them into a generic group like "Holdings".
4. Do NOT propose adding a ticker if it already exists in the strategy (prevent duplicates). If allocation adjustment is needed, modify the existing one.
5. Use the provided tools to propose changes. YOU DO NOT EXECUTE CHANGES DIRECTLY. You generate proposals.
6. Be concise, professional, and data-driven.
7. If the user asks for market data, pretend to access real-time data and give a realistic summary (since we are in a demo environment).
`;

export const startChatSession = () => {
    const ai = createAiInstance();
    if (!ai) {
        console.warn("Gemini API Key missing - Chat disabled.");
        // Return a mock object so the app doesn't crash if it tries to use it
        return {
            sendMessage: async () => ({
                response: {
                    text: () => "AI Chat is currently unavailable. Please configure your API key.",
                    functionCalls: []
                }
            })
        };
    }
    return ai.chats.create({
        model: 'gemini-2.0-flash-exp', // Updated model name if needed
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [{ functionDeclarations: tools }],
        }
    });
};

export const verifyStrategy = async (chatSession: any, portfolio: any, originalPrompt: string) => {
    const portfolioContext = JSON.stringify(portfolio, (key, value) => {
        if (key === 'id' || key === 'parentId' || key === 'currentValue') return undefined; // simplify for AI
        return value;
    }, 2);

    const message = `
    ACTION: VERIFY_STRATEGY
    
    Current Portfolio Structure:
    ${portfolioContext}

    Original User Goal:
    "${originalPrompt}"

    Instructions:
    Analyze if the current structure aligns with the user's goal.
    If it aligns, say "Strategy is aligned."
    If not, explain why and call the appropriate tool (e.g. create_portfolio_structure or add_ticker_to_group) to propose fixes.
    `;

    return chatSession.sendMessage({ message });
};

// export { ai }; // lazy instance not exported