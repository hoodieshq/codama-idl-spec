import { describe, expect, it } from 'vitest';

import { buildNavRegistry } from '../../src/docs/navigation';
import { HostedDocsPathConfig, LocalDocsPathConfig } from '../../src/docs/pathConfig';
import { getSpec } from '../../src/v1';

describe('HostedDocsPathConfig', () => {
    it('names index pages "index" while keeping PascalCase entity filenames and category dirs', () => {
        const registry = buildNavRegistry(HostedDocsPathConfig, getSpec());
        const rootIndex = registry.lookup({ kind: 'rootIndex' });
        const categoryIndex = registry.lookup({ kind: 'categoryIndex', category: 'pdaSeed' });
        const node = registry.lookup({ kind: 'node', name: 'constantPdaSeedNode' });

        expect(rootIndex.pathSegments).toEqual(['index']);
        expect(categoryIndex.pathSegments).toEqual(['pdaSeedNodes', 'index']);
        expect(node.pathSegments).toEqual(['pdaSeedNodes', 'ConstantPdaSeedNode']);
    });

    it('matches LocalDocsPathConfig except for the index basename', () => {
        const spec = getSpec();
        const pdaSeed = spec.categories.find(category => category.name === 'pdaSeed')!;
        expect(HostedDocsPathConfig.categoryDir(pdaSeed)).toBe(LocalDocsPathConfig.categoryDir(pdaSeed));
        expect(HostedDocsPathConfig.indexFileName).toBe('index');
        expect(LocalDocsPathConfig.indexFileName).toBe('README');
    });
});
