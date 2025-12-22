/**
 * Rebalancing Helper Functions
 * 
 * Utilities for calculating portfolio rebalancing strategies.
 */

export interface HoldingInput {
    id: string;
    name: string;
}

export interface RebalanceOutput {
    id: string;
    targetAllocation: number;
}

/**
 * Calculate equal rebalancing for a set of holdings.
 * 
 * Distributes 100% equally among all holdings using integer allocations.
 * Handles remainder by distributing extra 1% to first N items.
 * 
 * @param holdings - Array of holdings to rebalance
 * @returns Array of rebalance updates with integer allocations summing to 100%
 * 
 * @example
 * // 5 holdings
 * calculateEqualRebalance([...5 items]) 
 * // Returns: [20%, 20%, 20%, 20%, 20%]
 * 
 * @example
 * // 7 holdings (uneven division)
 * calculateEqualRebalance([...7 items])
 * // Returns: [15%, 15%, 14%, 14%, 14%, 14%, 14%] = 100%
 */
export const calculateEqualRebalance = (
    holdings: HoldingInput[]
): RebalanceOutput[] => {
    const count = holdings.length;

    // Edge case: empty array
    if (count === 0) return [];

    // Calculate base allocation (floor division)
    const baseAllocation = Math.floor(100 / count);

    // Calculate remainder to distribute
    const remainder = 100 - (baseAllocation * count);

    // Distribute: first N items get base + 1, rest get base
    return holdings.map((holding, index) => ({
        id: holding.id,
        targetAllocation: baseAllocation + (index < remainder ? 1 : 0)
    }));
};

/**
 * Calculate rebalancing when setting one holding to a specific allocation
 * and distributing the remainder equally among others.
 * 
 * Fixes bug: "Make NVDA 15 and rebalance rest" was producing non-integer allocations.
 * 
 * @param holdings - Array of all holdings
 * @param targetId - ID of the holding to set to specific allocation
 * @param targetAllocation - Exact allocation for the target holding
 * @returns Array of rebalance updates with integer allocations summing to 100%
 * 
 * @example
 * // 7 holdings, set NVDA to 15%, distribute 85% among 6 others
 * calculateSetOneRebalance([...7 items], 'nvda-id', 15)
 * // Returns: [15%, 15%, 14%, 14%, 14%, 14%, 14%] = 100%
 */
export const calculateSetOneRebalance = (
    holdings: HoldingInput[],
    targetId: string,
    targetAllocation: number
): RebalanceOutput[] => {
    const count = holdings.length;

    // Edge case: single holding
    if (count === 1) {
        return [{ id: targetId, targetAllocation }];
    }

    // Calculate remaining allocation for others
    const remainingAllocation = 100 - targetAllocation;
    const othersCount = count - 1;

    // Distribute remaining equally among others
    const baseAllocation = Math.floor(remainingAllocation / othersCount);
    const remainder = remainingAllocation - (baseAllocation * othersCount);

    // Track remainder distribution for non-target holdings
    let remainderIndex = 0;

    return holdings.map(holding => {
        if (holding.id === targetId) {
            return { id: holding.id, targetAllocation };
        }

        // Distribute remainder to first N others
        const allocation = baseAllocation + (remainderIndex < remainder ? 1 : 0);
        remainderIndex++;
        return { id: holding.id, targetAllocation: allocation };
    });
};
