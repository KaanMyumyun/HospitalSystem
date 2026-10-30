export function filterBySearch<T>(
  items: T[],
  search: string,
  fields: (item: T) => readonly (string | null | undefined)[],
): T[] {
  const needle = search.trim().toLowerCase()
  if (!needle) return items
  return items.filter((item) => fields(item).some((field) => field?.toLowerCase().includes(needle)))
}
