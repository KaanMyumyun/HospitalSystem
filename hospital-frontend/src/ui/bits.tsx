import { useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { AppointmentStatus } from '../api/client'
import { statusLabel } from '../lib/format'
import { Button } from './Button'

export function Status({
  status,
  compact = false,
  unmarked = false,
}: {
  status: AppointmentStatus
  compact?: boolean
  unmarked?: boolean
}) {
  const kind = unmarked && status === 'Scheduled' ? 'unmarked' : status.toLowerCase()
  return (
    <span className={`status status-${kind}${compact ? ' status-compact' : ''}`}>
      <span className="status-mark" aria-hidden="true" />
      {kind === 'unmarked' ? 'Not marked' : statusLabel(status)}
    </span>
  )
}

export function DeptDot({ hue, size = 8 }: { hue: number; size?: 8 | 10 }) {
  return <span aria-hidden="true" className={`dept-dot dept-dot-${size}`} data-hue={hue} />
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spinner-wrap" role={label ? 'status' : undefined}>
      <span className="spinner" aria-hidden="true" />
      {label && <span className="visually-hidden">{label}</span>}
    </span>
  )
}

export function Skeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={['skeleton-stack', className ?? ''].filter(Boolean).join(' ')} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span className="skeleton" data-variant={index % 3} key={index} />
      ))}
    </div>
  )
}

export function Empty({
  title,
  children,
  action,
  size = 'md',
}: {
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <div className={`empty empty-${size}`}>
      <p className="empty-title">{title}</p>
      {children && <p className="empty-text">{children}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  )
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Empty
      title="That didn't load"
      action={
        <Button icon="refresh" size="sm" onClick={onRetry}>
          Try again
        </Button>
      }
    >
      {message}
    </Empty>
  )
}

export type Option<T> = { value: T; label: ReactNode; disabled?: boolean; title?: string }

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  size = 'md',
  disabled = false,
}: {
  label: string
  value: T | null
  options: Option<T>[]
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  disabled?: boolean
}) {
  const group = useRef<HTMLDivElement>(null)
  const anyChecked = options.some((option) => option.value === value)
  const firstEnabled = options.findIndex((option) => !option.disabled)

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    const step = keys[event.key]
    if (!step) return
    event.preventDefault()
    const enabled = options.filter((option) => !option.disabled)
    const index = enabled.findIndex((option) => option.value === value)
    const next = index < 0 ? enabled[step > 0 ? 0 : enabled.length - 1] : enabled[(index + step + enabled.length) % enabled.length]
    if (!next) return
    onChange(next.value)
    requestAnimationFrame(() => {
      group.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
    })
  }

  return (
    <div
      aria-label={label}
      className={`segmented segmented-${size}`}
      ref={group}
      role="radiogroup"
      tabIndex={-1}
      onKeyDown={move}
    >
      {options.map((option, index) => {
        const checked = option.value === value
        return (
          <button
            aria-checked={checked}
            className="segment"
            disabled={disabled || option.disabled}
            key={String(option.value)}
            role="radio"
            tabIndex={checked || (!anyChecked && index === firstEnabled) ? 0 : -1}
            title={option.title}
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Switch({
  checked,
  label,
  onChange,
  disabled = false,
  title,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className="switch"
      disabled={disabled}
      role="switch"
      title={title}
      type="button"
      onClick={() => onChange(!checked)}
    >
      <span className="switch-thumb" aria-hidden="true" />
    </button>
  )
}

export function Pager({
  page,
  shown,
  pageSize,
  hasNextPage,
  loading,
  noun,
  onPage,
}: {
  page: number
  shown: number
  pageSize: number
  hasNextPage: boolean
  loading: boolean
  noun: string
  onPage: (page: number) => void
}) {
  if (page <= 1 && !hasNextPage) return null
  const first = (page - 1) * pageSize + 1
  const last = (page - 1) * pageSize + shown
  return (
    <nav aria-label={`${noun} pages`} className="pager">
      <span className="pager-range num">
        {shown > 0 ? (hasNextPage ? `${first}–${last}` : `${first}–${last} of ${last}`) : `No more ${noun}`}
      </span>
      <span className="pager-buttons">
        <Button disabled={page <= 1 || loading} icon="chevron-left" size="sm" variant="ghost" onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button disabled={!hasNextPage || loading} iconAfter="chevron-right" size="sm" variant="ghost" onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </span>
    </nav>
  )
}
