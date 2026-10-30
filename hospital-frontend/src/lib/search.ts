// The top bar's search, as every list on screen applies it: an item stays if
// any of its fields contains the search, ignoring case and the spaces around
// it. An empty search keeps every item, and the same array comes back.
export function filterBySearch<T>(
  items: T[],
  search: string,
  fields: (item: T) => readonly (string | null | undefined)[],
): T[] {
  const needle = search.trim().toLowerCase()
  if (!needle) return items
  return items.filter((item) => fields(item).some((field) => field?.toLowerCase().includes(needle)))
}
