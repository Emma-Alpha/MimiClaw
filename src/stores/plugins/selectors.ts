import type { MarketplaceCatalog, MarketplacePlugin } from '@/types/claude-plugin';

export function getAllMarketplacePlugins(
  catalogs: Record<string, MarketplaceCatalog>,
): MarketplacePlugin[] {
  const result: MarketplacePlugin[] = [];
  for (const [marketplace, catalog] of Object.entries(catalogs)) {
    for (const plugin of catalog.plugins) {
      result.push({ ...plugin, marketplace });
    }
  }
  return result;
}

export function getCategories(plugins: MarketplacePlugin[]): string[] {
  const set = new Set<string>();
  for (const p of plugins) {
    for (const cat of p.categories ?? []) set.add(cat);
  }
  return [...set].sort();
}
