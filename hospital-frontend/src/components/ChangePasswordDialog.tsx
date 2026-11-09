import { useState } from 'react'
import { changeOwnPassword } from '../api/client'
import { useWorkspace } from '../app/workspaceContext'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Field, FormError } from '../ui/Field'
import { PasswordInput } from './PasswordInput'

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { run, busy } = useWorkspace()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [tried, setTried] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tooShort = next.length < 8
  const sameAsCurrent = next.length > 0 && next === current
  const mismatch = repeat !== next

  const submit = async () => {
    setTried(true)
    if (!current || tooShort || sameAsCurrent || mismatch) return
    const outcome = await run(() => changeOwnPassword(current, next), 'Password changed', { quiet: true })
    if (outcome.ok) onClose()
    else if (outcome.error) setError(outcome.error)
  }

  const clear = () => setError(null)

  return (
    <Dialog
      description="Your other signed-in sessions are signed out when it changes."
      dismissOnBackdrop={false}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} type="submit" variant="primary">
            Change password
          </Button>
        </>
      }
      size="sm"
      title="Change your password"
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <Field error={tried && !current ? 'Enter your current password' : null} label="Current password">
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="current-password"
            value={current}
            onChange={(value) => {
              clear()
              setCurrent(value)
            }}
          />
        )}
      </Field>
      <Field
        error={
          tried && tooShort ? 'Use at least 8 characters' : tried && sameAsCurrent ? 'Choose a password you are not using now' : null
        }
        hint="At least 8 characters."
        label="New password"
      >
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="new-password"
            value={next}
            onChange={(value) => {
              clear()
              setNext(value)
            }}
          />
        )}
      </Field>
      <Field error={tried && mismatch ? 'The two new passwords differ' : null} label="Repeat the new password">
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="new-password"
            value={repeat}
            onChange={(value) => {
              clear()
              setRepeat(value)
            }}
          />
        )}
      </Field>
      {error && <FormError>{error}</FormError>}
    </Dialog>
  )
}
