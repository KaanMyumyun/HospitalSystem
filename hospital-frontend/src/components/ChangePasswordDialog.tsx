import { useState } from 'react'
import type { ActionOutcome } from '../types'
import { Modal } from './ui'

export function ChangePasswordDialog({
  loading,
  onChangePassword,
  onClose,
}: {
  loading: boolean
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<ActionOutcome>
  onClose: () => void
}) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mismatch = repeatPassword.length > 0 && repeatPassword !== newPassword
  const canSubmit = currentPassword.length > 0 && newPassword.length >= 8 && newPassword === repeatPassword && !loading

  const submit = async () => {
    const outcome = await onChangePassword(currentPassword, newPassword)
    if (outcome.ok) onClose()
    else if (outcome.error) setError(outcome.error)
  }

  return (
    <Modal title="Change password" onClose={onClose}>
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault()
          if (canSubmit) void submit()
        }}
      >
        <label>
          Current password
          <input
            autoComplete="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => {
              setError(null)
              setCurrentPassword(event.target.value)
            }}
          />
        </label>
        <label>
          New password
          <input
            autoComplete="new-password"
            minLength={8}
            type="password"
            value={newPassword}
            onChange={(event) => {
              setError(null)
              setNewPassword(event.target.value)
            }}
          />
        </label>
        <label>
          Repeat the new password
          <input
            autoComplete="new-password"
            type="password"
            value={repeatPassword}
            onChange={(event) => {
              setError(null)
              setRepeatPassword(event.target.value)
            }}
          />
        </label>
        {newPassword.length > 0 && newPassword.length < 8 && <small>Use at least 8 characters.</small>}
        {mismatch && <small>The two new passwords do not match.</small>}
        {error && <div className="form-error">{error}</div>}
        <p className="subtle">Your other signed-in sessions will be signed out.</p>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
          <button className="primary-button" disabled={!canSubmit} type="submit">
            Change password
          </button>
        </div>
      </form>
    </Modal>
  )
}
