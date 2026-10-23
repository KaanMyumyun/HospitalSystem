import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { guarded } from '../lib/readOnly'
import type { AdminSection } from '../types'

export function Metric({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function StatusBadge({ children, tone }: { children: ReactNode; tone: 'success' | 'muted' | 'blue' | 'danger' }) {
  return <span className={`status-badge ${tone}`}>{children}</span>
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>
}

export function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  )
}

// What a table shows below its rows: placeholder rows while it loads, and a
// note when it has none.
export function TableStatus({
  loading,
  empty,
  emptyText,
  rows = 5,
}: {
  loading: boolean
  empty: boolean
  emptyText: string
  rows?: number
}) {
  if (loading) return <SkeletonRows count={rows} />
  return empty ? <EmptyState text={emptyText} /> : null
}

// A button that demo accounts see but cannot use (see lib/readOnly).
export function GuardedButton({
  readOnly,
  disabled,
  title,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { readOnly: boolean }) {
  const guard = guarded(readOnly, disabled)
  return <button {...props} type={type} disabled={guard.disabled} title={guard.title ?? title} />
}

export function PageHint({ section }: { section: AdminSection }) {
  const copy: Record<AdminSection, string> = {
    departments: 'Create departments, activate service lines, and inspect coverage.',
    doctors: 'Assign doctors to departments and control active status.',
    schedules: 'Create and edit working hours and slot duration.',
    users: 'Create staff accounts, change roles, and reset passwords.',
    audit: 'Who changed what, newest first. Search finds actions and details.',
  }

  return <p className="page-hint">{copy[section]}</p>
}

// A native <dialog> opened as a modal: the browser keeps focus inside it,
// leaves the page behind it inert and reports Escape. Focus starts on the
// first field or button and goes back to where it was when the dialog closes.
export function Modal({
  children,
  title,
  tone,
  onClose,
}: {
  children: ReactNode
  title: string
  tone?: 'danger'
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.showModal()
    dialog.querySelector<HTMLElement>('.modal-body :is(input, select, textarea, button):not(:disabled)')?.focus()
    return () => {
      dialog.close()
      opener?.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={`modal ${tone ?? ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Escape: the app closes the dialog, so its state stays in step.
        event.preventDefault()
        onClose()
      }}
    >
      <div className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  )
}

export type ConfirmOptions = {
  title: string
  message: string
  confirmLabel: string
  tone?: 'danger'
}

// In place of window.confirm, which cannot be styled, blocks the page and can
// be switched off by the browser.
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  tone,
  onConfirm,
  onCancel,
}: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal title={title} tone={tone} onClose={onCancel}>
      <p className="dialog-text">{message}</p>
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className={tone === 'danger' ? 'secondary-button danger' : 'primary-button'} type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
