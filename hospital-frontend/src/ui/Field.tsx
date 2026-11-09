import { useId } from 'react'
import type { ReactNode, SelectHTMLAttributes } from 'react'
import { Icon } from './Icon'

export type ControlProps = {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
}

export function Field({
  label,
  hint,
  error,
  aside,
  className,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  aside?: ReactNode
  className?: string
  children: (control: ControlProps) => ReactNode
}) {
  const id = useId()
  const hintId = hint && !error ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={['field', error ? 'has-error' : '', className ?? ''].filter(Boolean).join(' ')}>
      <div className="field-top">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        {aside}
      </div>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hintId && (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      )}
      {errorId && (
        <p className="field-error" id={errorId}>
          <Icon name="alert" size={14} />
          {error}
        </p>
      )}
    </div>
  )
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={['select', className ?? ''].filter(Boolean).join(' ')}>
      <select {...props}>{children}</select>
      <Icon name="chevron-down" size={16} />
    </span>
  )
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <div className="form-error" role="alert">
      <Icon name="alert" size={16} />
      <span>{children}</span>
    </div>
  )
}
