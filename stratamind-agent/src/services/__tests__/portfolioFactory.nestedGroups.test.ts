import { describe, it, expect } from 'vitest';
import { buildStrategyFromAI } from '../../../services/portfolioFactory';
import { SliceType } from '../../../types';

describe('Portfolio Factory - Nested Groups', () => {
    it('should build a nested group structure with subgroups containing holdings', () => {
        const groups = [
            {
                name: 'Tech',
                allocation: 100,
                subgroups: [
                    {
                        name: 'Software',
                        allocation: 60,
                        tickers: ['MSFT', 'GOOGL']
                    },
                    {
                        name: 'Hardware',
                        allocation: 40,
                        tickers: ['AAPL', 'NVDA']
                    }
                ]
            }
        ];

        const result = buildStrategyFromAI('root-id', 'Nested Portfolio', 10000, groups, 'Test Goal');

        expect(result.id).toBe('root-id');
        expect(result.name).toBe('Nested Portfolio');
        expect(result.children).toHaveLength(1);

        // Verify Tech group
        const techGroup = result.children![0];
        expect(techGroup.name).toBe('Tech');
        expect(techGroup.type).toBe(SliceType.GROUP);
        expect(techGroup.targetAllocation).toBe(100);
        expect(techGroup.children).toHaveLength(2);

        // Verify Software subgroup
        const softwareGroup = techGroup.children!.find(c => c.name === 'Software');
        expect(softwareGroup).toBeDefined();
        expect(softwareGroup!.type).toBe(SliceType.GROUP);
        expect(softwareGroup!.targetAllocation).toBe(60);
        expect(softwareGroup!.children).toHaveLength(2);
        expect(softwareGroup!.children!.some(h => h.symbol === 'MSFT')).toBe(true);
        expect(softwareGroup!.children!.some(h => h.symbol === 'GOOGL')).toBe(true);

        // Verify Hardware subgroup
        const hardwareGroup = techGroup.children!.find(c => c.name === 'Hardware');
        expect(hardwareGroup).toBeDefined();
        expect(hardwareGroup!.type).toBe(SliceType.GROUP);
        expect(hardwareGroup!.targetAllocation).toBe(40);
        expect(hardwareGroup!.children).toHaveLength(2);
        expect(hardwareGroup!.children!.some(h => h.symbol === 'AAPL')).toBe(true);
        expect(hardwareGroup!.children!.some(h => h.symbol === 'NVDA')).toBe(true);
    });

    it('should handle multiple levels of nesting', () => {
        const groups = [
            {
                name: 'Equities',
                allocation: 100,
                subgroups: [
                    {
                        name: 'Tech',
                        allocation: 70,
                        subgroups: [
                            {
                                name: 'Software',
                                allocation: 60,
                                tickers: ['MSFT']
                            },
                            {
                                name: 'Hardware',
                                allocation: 40,
                                tickers: ['AAPL']
                            }
                        ]
                    },
                    {
                        name: 'Healthcare',
                        allocation: 30,
                        tickers: ['JNJ']
                    }
                ]
            }
        ];

        const result = buildStrategyFromAI('root-id', 'Deep Nested', 10000, groups, 'Test Goal');

        expect(result.children).toHaveLength(1);

        // Verify Equities
        const equities = result.children![0];
        expect(equities.name).toBe('Equities');
        expect(equities.children).toHaveLength(2);

        //  Verify Tech has subgroups
        const tech = equities.children!.find(c => c.name === 'Tech');
        expect(tech).toBeDefined();
        expect(tech!.children).toHaveLength(2);

        const software = tech!.children!.find(c => c.name === 'Software');
        expect(software).toBeDefined();
        expect(software!.children!.some(h => h.symbol === 'MSFT')).toBe(true);

        const hardware = tech!.children!.find(c => c.name === 'Hardware');
        expect(hardware).toBeDefined();
        expect(hardware!.children!.some(h => h.symbol === 'AAPL')).toBe(true);

        // Verify Healthcare
        const healthcare = equities.children!.find(c => c.name === 'Healthcare');
        expect(healthcare).toBeDefined();
        expect(healthcare!.children!.some(h => h.symbol === 'JNJ')).toBe(true);
    });
});
