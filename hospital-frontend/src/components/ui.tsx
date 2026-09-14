import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AdminSection } from '../types'

export function Metric({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function StatusBadge({ children, tone }: { children: ReactNode; tone: 'success' | 'muted' | 'blue' }) {
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

export function PageHint({ section }: { section: AdminSection }) {
  const copy: Record<AdminSection, string> = {
    departments: 'Create departments, activate service lines, and inspect coverage.',
    doctors: 'Assign doctors to departments and control active status.',
    schedules: 'Create and edit working hours and slot duration.',
    users: 'Create staff accounts, change roles, and reset passwords.',
  }

  return <p className="page-hint">{copy[section]}</p>
}

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
  return (
    <div className="modal-backdrop" role="presentation">
      <section className={`modal ${tone ?? ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  )
}
