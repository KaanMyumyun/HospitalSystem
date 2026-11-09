import { useState } from 'react'
import type { ControlProps } from '../ui/Field'
import { Icon } from '../ui/Icon'

export function PasswordInput({
  value,
  onChange,
  autoComplete,
  name,
  ...control
}: ControlProps & {
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  name?: string
}) {
  const [shown, setShown] = useState(false)
  return (
    <span className="password-input">
      <input
        {...control}
        autoCapitalize="none"
        autoComplete={autoComplete}
        className="input"
        name={name}
        spellCheck={false}
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        className="password-toggle"
        type="button"
        onClick={() => setShown((current) => !current)}
      >
        <Icon name={shown ? 'eye-off' : 'eye'} size={17} />
      </button>
    </span>
  )
}
