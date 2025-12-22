import { describe, it, expect } from 'vitest';
import { normalizeChildren, addNodeToTree, removeNodeFromTree, findGroupByName } from '../../../utils/portfolioTree';
import { PortfolioSlice, SliceType } from '../../../types';

describe('portfolioTree utilities', () => {
    describe('normalizeChildren', () => {
        it('should normalize allocations to sum to 100%', () => {
            const children: PortfolioSlice[] = [
                { id: '1', parentId: 'root', type: SliceType.HOLDING, name: 'A', targetAllocation: 30, currentValue: 0 },
                { id: '2', parentId: 'root', type: SliceType.HOLDING, name: 'B', targetAllocation: 30, currentValue: 0 },
                { id: '3', parentId: 'root', type: SliceType.HOLDING, name: 'C', targetAllocation: 30, currentValue: 0 },
            ];

            normalizeChildren(children);

            const total = children.reduce((sum, c) => sum + c.targetAllocation, 0);
            expect(total).toBeCloseTo(100, 1);
        });

        it('should handle empty children array', () => {
            const children: PortfolioSlice[] = [];
            expect(() => normalizeChildren(children)).not.toThrow();
            expect(children.length).toBe(0);
        });

        it('should handle children with zero total allocation', () => {
            const children: PortfolioSlice[] = [
                { id: '1', parentId: 'root', type: SliceType.HOLDING, name: 'A', targetAllocation: 0, currentValue: 0 },
            ];

            normalizeChildren(children);
            expect(children[0].targetAllocation).toBe(0);
        });

        it('should not modify if already close to 100%', () => {
            const children: PortfolioSlice[] = [
                { id: '1', parentId: 'root', type: SliceType.HOLDING, name: 'A', targetAllocation: 50.0, currentValue: 0 },
                { id: '2', parentId: 'root', type: SliceType.HOLDING, name: 'B', targetAllocation: 50.0, currentValue: 0 },
            ];

            normalizeChildren(children);

            expect(children[0].targetAllocation).toBe(50.0);
            expect(children[1].targetAllocation).toBe(50.0);
        });


        it('should adjust rounding errors on the largest slice (integers)', () => {
            const children: PortfolioSlice[] = [
                { id: '1', parentId: 'root', type: SliceType.HOLDING, name: 'A', targetAllocation: 33.3, currentValue: 0 },
                { id: '2', parentId: 'root', type: SliceType.HOLDING, name: 'B', targetAllocation: 33.3, currentValue: 0 },
                { id: '3', parentId: 'root', type: SliceType.HOLDING, name: 'C', targetAllocation: 33.3, currentValue: 0 },
            ];

            normalizeChildren(children);

            const total = children.reduce((sum, c) => sum + c.targetAllocation, 0);
            expect(total).toBe(100);
            // Allocations should be integers: 33, 33, 34 (based on largest decimal logic or distribution)
            const integers = children.map(c => c.targetAllocation);
            expect(integers).toContain(33);
            expect(integers).toContain(34);
            expect(integers.every(i => Number.isInteger(i))).toBe(true);
        });

        it('should handle unequal allocations (integers)', () => {
            const children: PortfolioSlice[] = [
                { id: '1', parentId: 'root', type: SliceType.HOLDING, name: 'A', targetAllocation: 10, currentValue: 0 },
                { id: '2', parentId: 'root', type: SliceType.HOLDING, name: 'B', targetAllocation: 20, currentValue: 0 },
                { id: '3', parentId: 'root', type: SliceType.HOLDING, name: 'C', targetAllocation: 30, currentValue: 0 },
            ];

            // Sum is 60. 10/60=16.66, 20/60=33.33, 30/60=50.00. 
            // 100 total. 
            // 16.66 -> 16 or 17
            // 33.33 -> 33
            // 50.00 -> 50
            // Sum 16+33+50 = 99. Remainder 1. Goes to largest decimal (16.66 ends .66). So 17.
            // Expected: 17, 33, 50.

            normalizeChildren(children);

            const total = children.reduce((sum, c) => sum + c.targetAllocation, 0);
            expect(total).toBe(100);

            expect(children[0].targetAllocation).toBe(17);
            expect(children[1].targetAllocation).toBe(33);
            expect(children[2].targetAllocation).toBe(50);
        });
    });

    describe('addNodeToTree', () => {
        it('should add node to parent', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Root',
                targetAllocation: 100,
                currentValue: 0,
                children: []
            };

            const newNode: PortfolioSlice = {
                id: 'new',
                parentId: 'root',
                type: SliceType.HOLDING,
                name: 'New Holding',
                symbol: 'TEST',
                targetAllocation: 50,
                currentValue: 0
            };

            const result = addNodeToTree(root, 'root', newNode);

            expect(result).toBe(true);
            expect(root.children).toHaveLength(1);
            expect(root.children![0].id).toBe('new');
        });

        it('should rebalance existing children when adding new node', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Root',
                targetAllocation: 100,
                currentValue: 0,
                children: [
                    { id: 'existing', parentId: 'root', type: SliceType.HOLDING, name: 'Existing', targetAllocation: 100, currentValue: 0 }
                ]
            };

            const newNode: PortfolioSlice = {
                id: 'new',
                parentId: 'root',
                type: SliceType.HOLDING,
                name: 'New',
                targetAllocation: 30,
                currentValue: 0
            };

            addNodeToTree(root, 'root', newNode);

            const total = root.children!.reduce((sum, c) => sum + c.targetAllocation, 0);
            expect(total).toBe(100);
            expect(root.children).toHaveLength(2);
            // new is 30. existing becomes 70.
            const existing = root.children!.find(c => c.id === 'existing');
            const added = root.children!.find(c => c.id === 'new');
            expect(existing?.targetAllocation).toBe(70);
            expect(added?.targetAllocation).toBe(30);
        });

        it('should return false if parent not found', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Root',
                targetAllocation: 100,
                currentValue: 0,
                children: []
            };

            const newNode: PortfolioSlice = {
                id: 'new',
                parentId: 'nonexistent',
                type: SliceType.HOLDING,
                name: 'New',
                targetAllocation: 50,
                currentValue: 0
            };

            const result = addNodeToTree(root, 'nonexistent', newNode);
            expect(result).toBe(false);
            expect(root.children).toHaveLength(0);
        });

        it('should handle adding node with 100% allocation', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Root',
                targetAllocation: 100,
                currentValue: 0,
                children: [
                    { id: 'existing', parentId: 'root', type: SliceType.HOLDING, name: 'Existing', targetAllocation: 100, currentValue: 0 }
                ]
            };

            const newNode: PortfolioSlice = {
                id: 'new',
                parentId: 'root',
                type: SliceType.HOLDING,
                name: 'New',
                targetAllocation: 100,
                currentValue: 0
            };

            addNodeToTree(root, 'root', newNode);

            // Existing should be set to 0
            expect(root.children![0].targetAllocation).toBe(0);
            expect(root.children![1].targetAllocation).toBe(100);
        });

        it('should add node to nested parent', () => {
            const childGroup: PortfolioSlice = {
                id: 'child',
                parentId: 'root',
                type: SliceType.GROUP,
                name: 'Child Group',
                targetAllocation: 50,
                currentValue: 0,
                children: []
            };

            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Root',
                targetAllocation: 100,
                currentValue: 0,
                children: [childGroup]
            };

            const newNode: PortfolioSlice = {
                id: 'new',
                parentId: 'child',
                type: SliceType.HOLDING,
                name: 'New',
                symbol: 'TEST',
                targetAllocation: 50,
                currentValue: 0
            };

            const result = addNodeToTree(root, 'child', newNode);

            expect(result).toBe(true);
            expect(root.children![0].children).toHaveLength(1);
            expect(root.children![0].children![0].id).toBe('new');
        });

        it('should initialize children array if undefined', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Root',
                targetAllocation: 100,
                currentValue: 0
                // No children property
            };

            const newNode: PortfolioSlice = {
                id: 'new',
                parentId: 'root',
                type: SliceType.HOLDING,
                name: 'New',
                targetAllocation: 50,
                currentValue: 0
            };

            addNodeToTree(root, 'root', newNode);

            expect(root.children).toBeDefined();
            expect(root.children).toHaveLength(1);
        });
    });

    describe('removeNodeFromTree', () => {
        it('should remove node and rebalance siblings', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Root',
                targetAllocation: 100,
                currentValue: 0,
                children: [
                    { id: 'child1', parentId: 'root', type: SliceType.HOLDING, name: 'Child 1', targetAllocation: 50, currentValue: 0 },
                    { id: 'child2', parentId: 'root', type: SliceType.HOLDING, name: 'Child 2', targetAllocation: 50, currentValue: 0 }
                ]
            };

            const result = removeNodeFromTree(root, 'child1');

            expect(result).toBe(true);
            expect(root.children).toHaveLength(1);
            expect(root.children![0].id).toBe('child2');
            expect(root.children![0].targetAllocation).toBe(100);
        });

        it('should return false if node not found', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Root',
                targetAllocation: 100,
                currentValue: 0,
                children: []
            };

            const result = removeNodeFromTree(root, 'nonexistent');
            expect(result).toBe(false);
        });

        it('should handle removing from nested structure', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Root',
                targetAllocation: 100,
                currentValue: 0,
                children: [
                    {
                        id: 'group1',
                        parentId: 'root',
                        type: SliceType.GROUP,
                        name: 'Group 1',
                        targetAllocation: 100,
                        currentValue: 0,
                        children: [
                            { id: 'holding1', parentId: 'group1', type: SliceType.HOLDING, name: 'Holding 1', targetAllocation: 50, currentValue: 0 },
                            { id: 'holding2', parentId: 'group1', type: SliceType.HOLDING, name: 'Holding 2', targetAllocation: 50, currentValue: 0 }
                        ]
                    }
                ]
            };

            const result = removeNodeFromTree(root, 'holding1');

            expect(result).toBe(true);
            expect(root.children![0].children).toHaveLength(1);
            expect(root.children![0].children![0].id).toBe('holding2');
            expect(root.children![0].children![0].targetAllocation).toBe(100);
        });

        it('should return false if node has no children', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.HOLDING,
                name: 'Root',
                targetAllocation: 100,
                currentValue: 0
            };

            const result = removeNodeFromTree(root, 'any-id');
            expect(result).toBe(false);
        });

        it('should handle removing all but one child', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Root',
                targetAllocation: 100,
                currentValue: 0,
                children: [
                    { id: 'child1', parentId: 'root', type: SliceType.HOLDING, name: 'Child 1', targetAllocation: 33, currentValue: 0 },
                    { id: 'child2', parentId: 'root', type: SliceType.HOLDING, name: 'Child 2', targetAllocation: 33, currentValue: 0 },
                    { id: 'child3', parentId: 'root', type: SliceType.HOLDING, name: 'Child 3', targetAllocation: 34, currentValue: 0 }
                ]
            };

            removeNodeFromTree(root, 'child1');
            removeNodeFromTree(root, 'child2');

            expect(root.children).toHaveLength(1);
            expect(root.children![0].targetAllocation).toBe(100);
        });
    });

    describe('findGroupByName', () => {
        it('should find group by exact name', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Tech Sector',
                targetAllocation: 100,
                currentValue: 0,
                children: []
            };

            const found = findGroupByName(root, 'Tech Sector');
            expect(found).toBe(root);
        });

        it('should find group by partial name (case-insensitive)', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Technology Sector',
                targetAllocation: 100,
                currentValue: 0,
                children: []
            };

            const found = findGroupByName(root, 'tech');
            expect(found).toBe(root);
        });

        it('should search nested groups', () => {
            const childGroup: PortfolioSlice = {
                id: 'child',
                parentId: 'root',
                type: SliceType.GROUP,
                name: 'Software',
                targetAllocation: 50,
                currentValue: 0,
                children: []
            };

            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Tech',
                targetAllocation: 100,
                currentValue: 0,
                children: [childGroup]
            };

            const found = findGroupByName(root, 'Software');
            expect(found).toBe(childGroup);
        });

        it('should return null if not found', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Tech',
                targetAllocation: 100,
                currentValue: 0,
                children: []
            };

            const found = findGroupByName(root, 'Healthcare');
            expect(found).toBeNull();
        });

        it('should not match holdings (only groups)', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Tech',
                targetAllocation: 100,
                currentValue: 0,
                children: [
                    { id: 'holding', parentId: 'root', type: SliceType.HOLDING, name: 'AAPL', symbol: 'AAPL', targetAllocation: 100, currentValue: 0 }
                ]
            };

            const found = findGroupByName(root, 'AAPL');
            expect(found).toBeNull();
        });

        it('should handle case-insensitive search', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'TECHNOLOGY',
                targetAllocation: 100,
                currentValue: 0,
                children: []
            };

            const found1 = findGroupByName(root, 'technology');
            const found2 = findGroupByName(root, 'TECHNOLOGY');
            const found3 = findGroupByName(root, 'TeChnOLoGy');

            expect(found1).toBe(root);
            expect(found2).toBe(root);
            expect(found3).toBe(root);
        });

        it('should find first matching group in nested structure', () => {
            const root: PortfolioSlice = {
                id: 'root',
                parentId: null,
                type: SliceType.GROUP,
                name: 'Portfolio',
                targetAllocation: 100,
                currentValue: 0,
                children: [
                    {
                        id: 'tech',
                        parentId: 'root',
                        type: SliceType.GROUP,
                        name: 'Tech Sector',
                        targetAllocation: 50,
                        currentValue: 0,
                        children: []
                    },
                    {
                        id: 'healthcare',
                        parentId: 'root',
                        type: SliceType.GROUP,
                        name: 'Healthcare Sector',
                        targetAllocation: 50,
                        currentValue: 0,
                        children: []
                    }
                ]
            };

            const found = findGroupByName(root, 'Tech');
            expect(found?.id).toBe('tech');
        });
    });
});
