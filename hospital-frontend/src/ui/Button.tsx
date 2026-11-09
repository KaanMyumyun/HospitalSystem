import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

export const readOnlyReason = 'Demo accounts are read-only'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'quiet' | 'ghost' | 'danger' | 'danger-solid'
  size?: 'sm' | 'md' | 'lg'
  icon?: IconName
  iconAfter?: IconName
  busy?: boolean
  block?: boolean
  locked?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function Button({
  variant = 'quiet',
  size = 'md',
  icon,
  iconAfter,
  busy = false,
  block = false,
  locked = false,
  className,
  children,
  disabled,
  title,
  type = 'button',
  ref,
  ...rest
}: ButtonProps) {
  const classes = ['btn', `btn-${variant}`, `btn-${size}`, block ? 'btn-block' : '', busy ? 'is-busy' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
  const iconSize = size === 'sm' ? 15 : 17
  return (
    <button
      {...rest}
      ref={ref}
      aria-busy={busy || undefined}
      className={classes}
      disabled={disabled || locked || busy}
      title={locked ? readOnlyReason : title}
      type={type}
    >
      {busy ? <span className="spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {iconAfter && <Icon name={iconAfter} size={iconSize} />}
    </button>
  )
}

export function IconButton({
  label,
  icon,
  size = 'md',
  variant = 'ghost',
  className,
  type = 'button',
  locked = false,
  disabled,
  ref,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  icon: IconName
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'quiet'
  locked?: boolean
  ref?: Ref<HTMLButtonElement>
}) {
  return (
    <button
      {...rest}
      ref={ref}
      aria-label={label}
      className={['icon-btn', `icon-btn-${size}`, `icon-btn-${variant}`, className ?? ''].filter(Boolean).join(' ')}
      disabled={disabled || locked}
      title={locked ? readOnlyReason : label}
      type={type}
    >
      <Icon name={icon} size={size === 'sm' ? 16 : 18} />
    </button>
  )
}

export function ButtonRow({ children, align = 'end' }: { children: ReactNode; align?: 'start' | 'end' | 'between' }) {
  return <div className={`btn-row btn-row-${align}`}>{children}</div>
}
