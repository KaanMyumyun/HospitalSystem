import type { ReactNode } from 'react'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

export type ConfirmOptions = {
  title: string
  message: ReactNode
  confirmLabel: string
  eyebrow?: string
  tone?: 'danger'
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  eyebrow,
  tone,
  onConfirm,
  onCancel,
}: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  return (
    <Dialog
      eyebrow={eyebrow}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Not now
          </Button>
          <Button data-autofocus variant={tone === 'danger' ? 'danger-solid' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
      size="sm"
      title={title}
      tone={tone}
      onClose={onCancel}
    >
      <div className="dialog-message">{message}</div>
    </Dialog>
  )
}
