import { loadAuditLogs } from '../../api'
import { Pager } from '../../components/Pager'
import { EmptyState, SkeletonRows } from '../../components/ui'
import { usePagedList } from '../../hooks/usePagedList'
import { useWorkspace } from '../../hooks/useWorkspace'
import { formatLongDate, formatTime } from '../../lib/format'

// Who changed what, newest first. The API searches actions and details.
export function AuditLogTab({ enabled }: { enabled: boolean }) {
  const { searchQuery, onError } = useWorkspace()
  const { result: page, isLoading, setPage } = usePagedList(
    enabled,
    searchQuery,
    loadAuditLogs,
    onError,
    'Failed to load the audit log',
  )

  if (!enabled) return <EmptyState text="The audit log is hidden from demo accounts." />

  return (
    <>
      <table className="data-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>What</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {(page?.items ?? []).map((entry) => {
            const time = new Date(entry.createdAt)
            return (
              <tr key={entry.id}>
                <td>
                  {formatLongDate(time)}
                  <small className="table-note">{formatTime(time)}</small>
                </td>
                <td>{entry.actor}</td>
                <td>{entry.action}</td>
                <td className="details-cell">{entry.details}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {isLoading && <SkeletonRows count={8} />}
      {!isLoading && page?.items.length === 0 && <EmptyState text="Nothing in the audit log matches." />}
      <Pager page={page} loading={isLoading} noun="entries" onPageChange={setPage} />
    </>
  )
}
