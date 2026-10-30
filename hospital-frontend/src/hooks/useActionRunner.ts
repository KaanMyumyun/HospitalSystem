import { useCallback, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { AffectedBookingsError, getStoredSession, isDemoRole, PossiblePatientMatchError } from '../api'
import type { CancelAffected } from '../api'
import type { ActionOutcome, Session } from '../types'

export type RunAction = (action: () => Promise<unknown>, successMessage: string) => Promise<ActionOutcome>
export type RunBookingChange = (
  change: (cancel?: CancelAffected) => Promise<unknown>,
  successMessage: string,
) => Promise<ActionOutcome>

export type PendingChange = {
  affected: AffectedBookingsError
  confirm: (reason: string) => Promise<ActionOutcome>
  dismiss: () => void
}

type Reporting = {
  reloadAll: () => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (message: string | null) => void
  setNotice: (message: string | null) => void
  onSuccess: (message: string) => void
}

export function useActionRunner(
  session: Session | null,
  sessionEpoch: RefObject<number>,
  { reloadAll, setLoading, setError, setNotice, onSuccess }: Reporting,
) {
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null)
  const actionInFlight = useRef<symbol | null>(null)
  const pendingChangeCancel = useRef<(() => void) | null>(null)

  const runAction = useCallback<RunAction>(async (action, successMessage) => {
    if (!session || getStoredSession()?.id !== session.id) return { ok: false }
    if (isDemoRole(session?.role)) {
      const message = 'Not allowed to do that. Demo accounts are read-only.'
      setError(message)
      setNotice(null)
      return { ok: false, error: message }
    }

    if (actionInFlight.current) return { ok: false }
    const request = Symbol()
    const epoch = sessionEpoch.current
    actionInFlight.current = request
    const isCurrent = () =>
      actionInFlight.current === request && sessionEpoch.current === epoch && getStoredSession()?.id === session.id

    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      await action()
      if (!isCurrent()) return { ok: false }
      await reloadAll()
      if (!isCurrent()) return { ok: false }
      setNotice(successMessage)
      onSuccess(successMessage)
      return { ok: true }
    } catch (actionError) {
      if (!isCurrent()) return { ok: false }
      const message = actionError instanceof Error ? actionError.message : 'Operation failed'
      if (!(actionError instanceof PossiblePatientMatchError || actionError instanceof AffectedBookingsError)) {
        setError(message)
      }
      return { ok: false, error: message, cause: actionError }
    } finally {
      if (actionInFlight.current === request) {
        actionInFlight.current = null
        if (getStoredSession()?.id === session.id) setLoading(false)
      }
    }
  }, [session, sessionEpoch, reloadAll, setLoading, setError, setNotice, onSuccess])

  const runBookingChange = useCallback<RunBookingChange>(async (change, successMessage) => {
    const epoch = sessionEpoch.current
    const outcome = await runAction(() => change(), successMessage)
    if (outcome.ok || !(outcome.cause instanceof AffectedBookingsError)) return outcome
    if (!session || sessionEpoch.current !== epoch || getStoredSession()?.id !== session.id) return { ok: false }

    const affected = outcome.cause
    return new Promise<ActionOutcome>((resolve) => {
      let settled = false
      const finish = (result: ActionOutcome) => {
        if (settled) return
        settled = true
        if (pendingChangeCancel.current === dismiss) {
          pendingChangeCancel.current = null
          setPendingChange(null)
        }
        resolve(result)
      }
      const dismiss = () => finish({ ok: false })
      pendingChangeCancel.current?.()
      pendingChangeCancel.current = dismiss
      setPendingChange({
        affected,
        confirm: async (reason) => {
          const retried = await runAction(
            () => change({ cancelAffectedAppointments: true, cancellationReason: reason }),
            successMessage,
          )
          if (retried.ok) finish(retried)
          else if (!settled && retried.cause instanceof AffectedBookingsError) {
            const latest = retried.cause
            setPendingChange((current) => current && { ...current, affected: latest })
          }
          return retried
        },
        dismiss,
      })
    })
  }, [runAction, session, sessionEpoch])

  const reset = useCallback(() => {
    actionInFlight.current = null
    pendingChangeCancel.current?.()
    setPendingChange(null)
  }, [])

  return { runAction, runBookingChange, pendingChange, reset }
}
