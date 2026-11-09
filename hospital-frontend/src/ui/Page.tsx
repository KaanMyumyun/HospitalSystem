import type { ReactNode } from 'react'
import { IconButton } from './Button'
import { Icon } from './Icon'

export function PageHead({
  kicker,
  title,
  lede,
  actions,
}: {
  kicker?: ReactNode
  title: ReactNode
  lede?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        {kicker && <p className="page-kicker">{kicker}</p>}
        <h1 className="page-title">{title}</h1>
        {lede && <p className="page-lede">{lede}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder: string
  className?: string
}) {
  return (
    <label className={['search-input', className ?? ''].filter(Boolean).join(' ')}>
      <Icon name="search" size={16} />
      <span className="visually-hidden">{label}</span>
      <input
        autoComplete="off"
        className="input"
        maxLength={50}
        placeholder={placeholder}
        spellCheck={false}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && <IconButton className="search-clear" icon="close" label="Clear search" size="sm" onClick={() => onChange('')} />}
    </label>
  )
}

export function DemoLocked({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="demo-locked">
      <span className="demo-locked-mark" aria-hidden="true">
        <Icon name="lock" size={20} />
      </span>
      <p className="empty-title">{title}</p>
      <p className="empty-text">{children}</p>
    </div>
  )
}
