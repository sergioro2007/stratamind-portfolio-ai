import { PortfolioSlice, SliceType } from '../types';

/**
 * Normalizes children allocations to sum to exactly 100%
 * Handles rounding errors by adjusting the largest slice
 */
export const normalizeChildren = (children: PortfolioSlice[]): void => {
    if (children.length === 0) return;

    // First, verify strict 100 integer adherence
    const currentSum = children.reduce((sum, c) => sum + c.targetAllocation, 0);
    const isSum100 = currentSum === 100;
    const areAllIntegers = children.every(c => Number.isInteger(c.targetAllocation));

    if (isSum100 && areAllIntegers) return;

    if (currentSum === 0) return;

    // Distribute proportionally
    const newAllocations = children.map(c => (c.targetAllocation / currentSum) * 100);

    // Floor all values
    let integerAllocations = newAllocations.map(a => Math.floor(a));
    let newSum = integerAllocations.reduce((a, b) => a + b, 0);
    let remainder = 100 - newSum;

    // Distribute remainder to slices with largest decimals/fractional parts to be fair
    const distributionMap = newAllocations.map((alloc, index) => ({
        index,
        decimal: alloc - Math.floor(alloc)
    })).sort((a, b) => b.decimal - a.decimal); // Sort by largest decimal part

    for (let i = 0; i < remainder; i++) {
        // Wrap around if remainder > children length (rare edge case)
        const targetIndex = distributionMap[i % children.length].index;
        integerAllocations[targetIndex] += 1;
    }

    // Apply back
    children.forEach((c, idx) => {
        c.targetAllocation = integerAllocations[idx];
    });
};

/**
 * Adds a new node to the tree at the specified parent
 * Automatically rebalances existing children to make room
 * @returns true if node was added, false if parent not found
 */
export const addNodeToTree = (
    node: PortfolioSlice,
    parentId: string,
    newNode: PortfolioSlice
): boolean => {
    if (node.id === parentId) {
        if (!node.children) node.children = [];

        // Logic: Reduce existing allocations to make room for new one
        // New allocation is fixed (newNode.targetAllocation). 
        // Existing ones scale to fit (100 - newNode.targetAllocation).
        const incomingAlloc = newNode.targetAllocation;
        if (node.children.length > 0 && incomingAlloc < 100) {
            const remainingSpace = 100 - incomingAlloc;
            // Currently existing sum
            const currentSum = node.children.reduce((s, c) => s + c.targetAllocation, 0);
            if (currentSum > 0) {
                const scaleFactor = remainingSpace / currentSum;
                node.children.forEach(c => {
                    c.targetAllocation = Math.floor(c.targetAllocation * scaleFactor);
                });
            }
        } else if (node.children.length > 0 && incomingAlloc >= 100) {
            // If new one takes 100%, everything else goes to 0 (simplified)
            node.children.forEach(c => c.targetAllocation = 0);
        }

        node.children.push(newNode);
        normalizeChildren(node.children); // Ensure clean 100%
        return true;
    }

    if (node.children) {
        for (const child of node.children) {
            if (addNodeToTree(child, parentId, newNode)) return true;
        }
    }
    return false;
};

/**
 * Removes a node from the tree by ID
 * Automatically rebalances remaining siblings to sum to 100%
 * @returns true if node was removed, false if not found
 */
export const removeNodeFromTree = (
    node: PortfolioSlice,
    nodeId: string
): boolean => {
    if (!node.children) return false;
    const idx = node.children.findIndex(c => c.id === nodeId);
    if (idx !== -1) {
        node.children.splice(idx, 1);
        normalizeChildren(node.children); // Scale remaining up to 100%
        return true;
    }
    for (const child of node.children) {
        if (removeNodeFromTree(child, nodeId)) return true;
    }
    return false;
};

/**
 * Finds a group node by name (case-insensitive partial match)
 * Only matches GROUP type nodes, not holdings
 * @returns the matching group node or null if not found
 */
export const findGroupByName = (
    root: PortfolioSlice,
    name: string
): PortfolioSlice | null => {
    if (root.name.toLowerCase().includes(name.toLowerCase()) && root.type === SliceType.GROUP) {
        return root;
    }
    if (root.children) {
        for (const child of root.children) {
            const found = findGroupByName(child, name);
            if (found) return found;
        }
    }
    return null;
};
