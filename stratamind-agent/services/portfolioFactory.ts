import { PortfolioSlice, SliceType } from '../types';

export const generateId = (): string => {
    return Math.random().toString(36).substr(2, 9);
};


// Helper to distribute a total (default 100) into n integers that sum exactly to total
const distributeIntegerAllocations = (count: number, total: number = 100): number[] => {
    if (count <= 0) return [];

    // Base floor allocation
    const base = Math.floor(total / count);
    const remainder = total - (base * count);

    return Array(count).fill(base).map((val, idx) => {
        // Distribute remainder one by one starting from the first item
        return idx < remainder ? val + 1 : val;
    });
};

export const buildStrategyFromAI = (
    rootId: string,
    strategyName: string,
    totalValue: number,
    groups: any[],
    prompt: string,
    holdings?: { symbol: string, allocation: number }[]
): PortfolioSlice => {

    const newChildren: PortfolioSlice[] = [];

    // Helper to recursively process groups and subgroups
    const processGroup = (groupData: any, parentId: string, parentValue: number): PortfolioSlice => {
        const groupId = generateId();
        const groupValue = parentValue * (groupData.allocation / 100);
        const groupChildren: PortfolioSlice[] = [];

        // Process nested subgroups first (recursive)
        if (groupData.subgroups && Array.isArray(groupData.subgroups) && groupData.subgroups.length > 0) {
            groupData.subgroups.forEach((subgroup: any) => {
                groupChildren.push(processGroup(subgroup, groupId, groupValue));
            });
        }

        // Process tickers in this group
        if (groupData.tickers && Array.isArray(groupData.tickers) && groupData.tickers.length > 0) {
            const allocations = distributeIntegerAllocations(groupData.tickers.length, 100);
            const holdings = groupData.tickers.map((t: string, idx: number) => ({
                id: generateId(),
                parentId: groupId,
                type: SliceType.HOLDING,
                name: t,
                symbol: t,
                targetAllocation: allocations[idx],
                currentValue: groupValue * (allocations[idx] / 100)
            }));
            groupChildren.push(...holdings);
        }

        return {
            id: groupId,
            parentId,
            type: SliceType.GROUP,
            name: groupData.name,
            targetAllocation: groupData.allocation,
            currentValue: groupValue,
            children: groupChildren
        };
    };

    // Process top-level groups using the recursive helper
    if (groups && groups.length > 0) {
        groups.forEach((g: any) => {
            newChildren.push(processGroup(g, rootId, totalValue));
        });
    }

    // Process Direct Holdings (Flat Structure)
    if (holdings && holdings.length > 0) {
        holdings.forEach(h => {
            const holdingValue = totalValue * (h.allocation / 100);
            newChildren.push({
                id: generateId(),
                parentId: rootId,
                type: SliceType.HOLDING,
                name: h.symbol, // Use symbol as name for top-level holdings
                symbol: h.symbol,
                targetAllocation: h.allocation,
                currentValue: holdingValue
            });
        });
    }

    // Fix parentIds for children (Groups and Holdings)
    newChildren.forEach((child: PortfolioSlice) => {
        child.parentId = rootId;
        if (child.type === SliceType.GROUP) {
            child.children?.forEach(c => c.parentId = child.id);
        }
    });

    const newRoot: PortfolioSlice = {
        id: rootId,
        parentId: null,
        type: SliceType.GROUP,
        name: strategyName,
        strategyPrompt: prompt,
        targetAllocation: 100,
        currentValue: totalValue,
        children: newChildren
    };

    return newRoot;
};
