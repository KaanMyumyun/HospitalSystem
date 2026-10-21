type Page = { items: unknown[]; page: number; pageSize: number; totalCount: number }

// Previous and Next for a list the API pages; shown only when there is more
// than one page.
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
  if (!page || page.totalCount <= page.pageSize) return null

  const first = (page.page - 1) * page.pageSize + 1
  const last = (page.page - 1) * page.pageSize + page.items.length

  return (
    <div className="toolbar pager">
      <span className="subtle">
        {page.items.length > 0 ? `${first}-${last} of ${page.totalCount}` : `${page.totalCount} ${noun}`}
      </span>
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
          disabled={page.page * page.pageSize >= page.totalCount || loading}
          type="button"
          onClick={() => onPageChange(page.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
