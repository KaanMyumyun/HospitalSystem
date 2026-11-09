import type { ControlProps } from '../ui/Field'

export function ReasonPicker({
  value,
  suggestions,
  onChange,
  control,
  placeholder,
}: {
  value: string
  suggestions: string[]
  onChange: (value: string) => void
  control: ControlProps
  placeholder?: string
}) {
  return (
    <div className="reason-picker">
      <div aria-label="Common reasons" className="chips" role="group">
        {suggestions.map((suggestion) => (
          <button
            aria-pressed={value.trim() === suggestion}
            className="chip"
            key={suggestion}
            type="button"
            onClick={() => onChange(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
      <textarea
        {...control}
        className="input"
        maxLength={500}
        placeholder={placeholder}
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
