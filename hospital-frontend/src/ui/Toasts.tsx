import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { newId } from '../lib/id'
import { Icon } from './Icon'
import { ToastContext } from './useToasts'
import type { Toaster } from './useToasts'

type Tone = 'success' | 'error' | 'info'
type ToastItem = { id: string; tone: Tone; message: string; leaving: boolean }

const lifetime: Record<Tone, number> = { success: 4200, info: 5000, error: 8000 }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, leaving: true } : item)))
    const existing = timers.current.get(id)
    if (existing) clearTimeout(existing)
    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id)
        setItems((current) => current.filter((item) => item.id !== id))
      }, 180),
    )
  }, [])

  const show = useCallback(
    (tone: Tone, message: string) => {
      const id = newId()
      setItems((current) => {
        const withoutRepeat = current.filter((item) => item.message !== message)
        return [...withoutRepeat, { id, tone, message, leaving: false }].slice(-4)
      })
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), lifetime[tone]),
      )
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending.values()) clearTimeout(timer)
    }
  }, [])

  const toaster = useMemo<Toaster>(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
      info: (message) => show('info', message),
      clear: () => setItems([]),
    }),
    [show],
  )

  return (
    <ToastContext value={toaster}>
      {children}
      <div className="toasts">
        <ol aria-live="polite" aria-relevant="additions" className="toast-list">
          {items.map((item) => (
            <li
              className={`toast toast-${item.tone}${item.leaving ? ' is-leaving' : ''}`}
              key={item.id}
              role={item.tone === 'error' ? 'alert' : 'status'}
            >
              <span className="toast-mark" aria-hidden="true">
                <Icon name={item.tone === 'error' ? 'alert' : item.tone === 'success' ? 'check' : 'clock'} size={15} />
              </span>
              <span className="toast-message">{item.message}</span>
              <button aria-label="Dismiss" className="toast-close" type="button" onClick={() => dismiss(item.id)}>
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ol>
      </div>
    </ToastContext>
  )
}
