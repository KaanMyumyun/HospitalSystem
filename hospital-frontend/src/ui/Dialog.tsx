import { useEffect, useId, useRef } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { IconButton } from './Button'

export function Dialog({
  title,
  eyebrow,
  description,
  children,
  footer,
  size = 'md',
  tone,
  variant = 'modal',
  dismissOnBackdrop = true,
  onClose,
  onSubmit,
}: {
  title: ReactNode
  eyebrow?: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  tone?: 'danger'
  variant?: 'modal' | 'sheet'
  dismissOnBackdrop?: boolean
  onClose: () => void
  onSubmit?: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const close = useRef(onClose)
  const backdrop = useRef(dismissOnBackdrop)

  useEffect(() => {
    close.current = onClose
    backdrop.current = dismissOnBackdrop
  })

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!dialog.open) dialog.showModal()
    const preferred =
      dialog.querySelector<HTMLElement>('[data-autofocus]') ??
      dialog.querySelector<HTMLElement>('.dialog-body :is(input, select, textarea):not(:disabled)')
    preferred?.focus()

    let pressedOnBackdrop = false
    const press = (event: PointerEvent) => {
      pressedOnBackdrop = event.target === dialog
    }
    const release = (event: MouseEvent) => {
      if (backdrop.current && pressedOnBackdrop && event.target === dialog) close.current()
      pressedOnBackdrop = false
    }
    dialog.addEventListener('pointerdown', press)
    dialog.addEventListener('click', release)
    return () => {
      dialog.removeEventListener('pointerdown', press)
      dialog.removeEventListener('click', release)
      if (dialog.open) dialog.close()
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit?.()
  }

  const content = (
    <>
      <div className="dialog-body">{children}</div>
      {footer && <div className="dialog-foot">{footer}</div>}
    </>
  )

  return (
    <dialog
      ref={ref}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={['dialog', `dialog-${variant}`, `dialog-${size}`, tone ? `dialog-${tone}` : ''].filter(Boolean).join(' ')}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className="dialog-head">
        <div className="dialog-titles">
          {eyebrow && <p className="dialog-eyebrow">{eyebrow}</p>}
          <h2 id={titleId}>{title}</h2>
          {description && (
            <p className="dialog-description" id={descriptionId}>
              {description}
            </p>
          )}
        </div>
        <IconButton className="dialog-close" icon="close" label="Close" onClick={onClose} />
      </div>
      {onSubmit ? (
        <form className="dialog-form" noValidate onSubmit={submit}>
          {content}
        </form>
      ) : (
        content
      )}
    </dialog>
  )
}
