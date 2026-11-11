interface HasCategory {
  category_id: string | null;
}
interface CategoryLike {
  id: string;
  name: string;
}

export interface ItemGroup<T> {
  category: CategoryLike | null;
  items: T[];
}

/**
 * Groups items by category, preserving category order. Items without a
 * category come first (so a simple one-list event has no headings at all).
 * Empty categories are kept only when `keepEmpty` is set (organizer view).
 */
export function groupItems<T extends HasCategory>(
  items: T[],
  categories: CategoryLike[],
  keepEmpty = false,
): ItemGroup<T>[] {
  const known = new Set(categories.map((c) => c.id));
  const groups: ItemGroup<T>[] = [];

  const uncategorized = items.filter((i) => !i.category_id || !known.has(i.category_id));
  if (uncategorized.length > 0) groups.push({ category: null, items: uncategorized });

  for (const category of categories) {
    const inCategory = items.filter((i) => i.category_id === category.id);
    if (inCategory.length > 0 || keepEmpty) groups.push({ category, items: inCategory });
  }
  return groups;
}
