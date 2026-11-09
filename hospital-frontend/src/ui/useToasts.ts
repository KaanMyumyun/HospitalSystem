import { createContext, useContext } from 'react'

export type Toaster = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  clear: () => void
}

export const ToastContext = createContext<Toaster | null>(null)

export function useToasts() {
  const toaster = useContext(ToastContext)
  if (!toaster) throw new Error('useToasts needs a ToastProvider')
  return toaster
}
