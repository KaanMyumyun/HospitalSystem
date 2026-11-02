type Page = { items: unknown[]; page: number; pageSize: number; hasNextPage: boolean }

export function Pager({
  page,
  loading,
  noun,
  onPageChange,
}: {
  page: Page | null
  loading: boolean
  noun: string
  onPageChange: (page: number) => void
}) {
  if (!page || (page.page <= 1 && !page.hasNextPage)) return null

  const first = (page.page - 1) * page.pageSize + 1
  const last = (page.page - 1) * page.pageSize + page.items.length
  const shown = page.hasNextPage ? `${first}-${last}` : `${first}-${last} of ${last}`

  return (
    <div className="toolbar pager">
      <span className="subtle">{page.items.length > 0 ? shown : `No more ${noun}`}</span>
      <div className="pager-buttons">
        <button
          className="secondary-button"
          disabled={page.page <= 1 || loading}
          type="button"
          onClick={() => onPageChange(page.page - 1)}
        >
          Previous
        </button>
        <button
          className="secondary-button"
          disabled={!page.hasNextPage || loading}
          type="button"
          onClick={() => onPageChange(page.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
