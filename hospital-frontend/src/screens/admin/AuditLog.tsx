import { loadAuditLogs, pageSize } from '../../api/client'
import type { AuditLogEntryDto } from '../../api/client'
import { useNow } from '../../app/hooks'
import { usePagedSearch } from '../../app/useResource'
import { useWorkspace } from '../../app/workspaceContext'
import { clinicDate } from '../../lib/clinicTime'
import { longDate, relativeDay, timeOf } from '../../lib/dates'
import { auditTone, humanizeAction } from '../../lib/names'
import type { ScreenProps } from '../../shell/Shell'
import { Empty, LoadError, Pager, Skeleton } from '../../ui/bits'
import { DemoLocked, PageHead, SearchField } from '../../ui/Page'
import './admin.css'

export function AuditLog(_props: ScreenProps) {
  const { session } = useWorkspace()
  const allowed = session.role === 'Admin'
  const list = usePagedSearch('audit', (search, page, signal) => loadAuditLogs(search, page, signal), allowed)
  const now = useNow(60_000)

  if (!allowed) {
    return (
      <div className="page">
        <PageHead lede="Every change and failed sign-in, newest first." title="Audit log" />
        <div className="page-body">
          <DemoLocked title="Hidden in the demo">
            The real admin sees who booked, moved or cancelled what, every schedule and role change, and every failed
            sign-in. It names real staff, so demo accounts can't open it.
          </DemoLocked>
        </div>
      </div>
    )
  }

  const items = list.data?.items ?? []
  const groups: { day: string; at: Date; entries: AuditLogEntryDto[] }[] = []
  for (const entry of items) {
    const at = new Date(entry.createdAt)
    const day = clinicDate(at)
    const last = groups[groups.length - 1]
    if (last?.day === day) last.entries.push(entry)
    else groups.push({ day, at, entries: [entry] })
  }

  return (
    <div className="page">
      <PageHead lede="Every change and failed sign-in, newest first. Search finds words in the action or its details." title="Audit log" />
      <div className="page-toolbar">
        <SearchField
          className="toolbar-search"
          label="Search the audit log"
          placeholder="Try “cancel”, “role” or a name"
          value={list.query}
          onChange={list.setQuery}
        />
      </div>
      <div className="page-body">
        {list.error && !list.data ? (
          <LoadError message={list.error} onRetry={() => void list.reload()} />
        ) : !list.data ? (
          <Skeleton lines={10} />
        ) : items.length === 0 ? (
          <Empty title={list.term ? 'Nothing matches that' : 'Nothing recorded yet'}>
            {list.term ? 'Search looks at the action and its details.' : 'Changes appear here as people work.'}
          </Empty>
        ) : (
          <div className={`audit${list.stale || list.searching ? ' is-stale' : ''}`}>
            {groups.map((group) => (
              <section className="audit-day" key={group.day}>
                <h2 className="audit-date">
                  {relativeDay(group.at, now) ?? longDate(group.at)}
                  {relativeDay(group.at, now) && <span className="audit-date-sub">{longDate(group.at)}</span>}
                </h2>
                <ol className="audit-list">
                  {group.entries.map((entry) => (
                    <li className={`audit-entry is-${auditTone(entry.action)}`} key={entry.id}>
                      <span className="audit-time mono">{timeOf(new Date(entry.createdAt))}</span>
                      <span aria-hidden="true" className="audit-mark" />
                      <div className="audit-body">
                        <p className="audit-what">
                          <span className="audit-action">{humanizeAction(entry.action)}</span>
                          <span className="audit-entity">
                            {entry.entityType} #{entry.entityId}
                          </span>
                        </p>
                        {entry.details && <p className="audit-details">{entry.details}</p>}
                      </div>
                      <span className="audit-actor mono">{entry.actor}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
        {list.data && (
          <Pager
            hasNextPage={list.data.hasNextPage}
            loading={list.loading || list.stale || list.searching}
            noun="entries"
            page={list.page}
            pageSize={pageSize}
            shown={items.length}
            onPage={list.setPage}
          />
        )}
      </div>
    </div>
  )
}
