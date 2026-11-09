import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import {
  AffectedBookingsError,
  getStoredSession,
  isDemoRole,
  loadHospitalData,
  PossiblePatientMatchError,
} from '../api/client'
import { AffectedBookingsDialog } from '../components/AffectedBookingsDialog'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { ConfirmOptions } from '../components/ConfirmDialog'
import { WorkspaceContext } from './workspaceContext'
import type { Reload, RouteParams, RunAction, RunBookingChange, Workspace } from './workspaceContext'
import { createDialogRequests } from '../lib/dialogRequests'
import { hashFor, usesHospitalData } from '../lib/routes'
import type { ActionOutcome, HospitalData, Screen, Session } from '../types'
import { useToasts } from '../ui/useToasts'



const emptyData: HospitalData = { departments: [], doctors: [], schedules: [] }
const demoMessage = 'Demo accounts are read-only, so nothing was changed.'
const refocusGapMs = 15_000

export function WorkspaceProvider({
  session,
  epoch,
  navigate,
  children,
}: {
  session: Session
  epoch: RefObject<number>
  navigate: (hash: string, replace?: boolean) => void
  children: ReactNode
}) {
  const toast = useToasts()
  const readOnly = isDemoRole(session.role)
  const wantsData = usesHospitalData(session.role)
  const [data, setData] = useState<HospitalData>(emptyData)
  const [dataReady, setDataReady] = useState(!wantsData)
  const [dataError, setDataError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null)
  const [dialog, setDialog] = useState<ReactNode>(null)
  const reloaders = useRef(new Set<Reload>())
  const referenceRequest = useRef<AbortController | null>(null)
  const inFlight = useRef<symbol | null>(null)
  const pendingCancel = useRef<(() => void) | null>(null)
  const requests = useRef(createDialogRequests())
  const lastRefresh = useRef(0)
  const loadedOnce = useRef(false)

  const loadReference = useCallback(() => {
    if (!wantsData) return Promise.resolve()
    referenceRequest.current?.abort()
    const request = new AbortController()
    referenceRequest.current = request
    return loadHospitalData(request.signal).then(
      (next) => {
        if (request.signal.aborted) return
        loadedOnce.current = true
        setData(next)
        setDataError(null)
        setDataReady(true)
      },
      (error: unknown) => {
        if (request.signal.aborted) return
        const message = error instanceof Error ? error.message : 'Could not load the hospital data'
        setDataError(message)
        if (loadedOnce.current) toast.error(`Couldn't refresh, so you're seeing what loaded earlier. ${message}`)
      },
    )
  }, [wantsData, toast])

  useEffect(() => {
    void loadReference()
    return () => referenceRequest.current?.abort()
  }, [loadReference])

  const refresh = useCallback(async () => {
    lastRefresh.current = Date.now()
    await Promise.all([loadReference(), ...Array.from(reloaders.current, (reload) => reload())])
  }, [loadReference])

  const register = useCallback((reload: Reload) => {
    reloaders.current.add(reload)
    return () => {
      reloaders.current.delete(reload)
    }
  }, [])

  useEffect(() => {
    const wake = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastRefresh.current < refocusGapMs) return
      void refresh()
    }
    window.addEventListener('focus', wake)
    document.addEventListener('visibilitychange', wake)
    return () => {
      window.removeEventListener('focus', wake)
      document.removeEventListener('visibilitychange', wake)
    }
  }, [refresh])

  const run = useCallback<RunAction>(
    async (action, successMessage, options) => {
      if (getStoredSession()?.id !== session.id) return { ok: false }
      if (readOnly) {
        toast.info(demoMessage)
        return { ok: false, error: demoMessage }
      }
      if (inFlight.current) return { ok: false }
      const request = Symbol()
      const startEpoch = epoch.current
      inFlight.current = request
      const isCurrent = () =>
        inFlight.current === request && epoch.current === startEpoch && getStoredSession()?.id === session.id

      setBusy(true)
      try {
        await action()
        if (!isCurrent()) return { ok: false }
        await refresh()
        if (!isCurrent()) return { ok: false }
        if (successMessage) toast.success(successMessage)
        return { ok: true }
      } catch (error) {
        if (!isCurrent()) return { ok: false }
        const message = error instanceof Error ? error.message : 'Something went wrong'
        const handledByCaller = error instanceof PossiblePatientMatchError || error instanceof AffectedBookingsError
        if (!handledByCaller && !options?.quiet) toast.error(message)
        return { ok: false, error: message, cause: error }
      } finally {
        if (inFlight.current === request) {
          inFlight.current = null
          setBusy(false)
        }
      }
    },
    [session.id, readOnly, epoch, refresh, toast],
  )

  const runBookingChange = useCallback<RunBookingChange>(
    async (change, successMessage) => {
      const startEpoch = epoch.current
      const outcome = await run(() => change(), successMessage)
      if (outcome.ok || !(outcome.cause instanceof AffectedBookingsError)) return outcome
      if (epoch.current !== startEpoch || getStoredSession()?.id !== session.id) return { ok: false }

      const affected = outcome.cause
      return new Promise<ActionOutcome>((resolve) => {
        let settled = false
        const finish = (result: ActionOutcome) => {
          if (settled) return
          settled = true
          if (pendingCancel.current === dismiss) {
            pendingCancel.current = null
            setPendingChange(null)
          }
          resolve(result)
        }
        const dismiss = () => finish({ ok: false })
        pendingCancel.current?.()
        pendingCancel.current = dismiss
        setPendingChange({
          affected,
          confirm: async (reason) => {
            const retried = await run(
              () => change({ cancelAffectedAppointments: true, cancellationReason: reason }),
              successMessage,
              { quiet: true },
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
    },
    [run, session.id, epoch],
  )

  const confirm = useCallback((options: ConfirmOptions) => {
    const request = requests.current.ask(false)
    const answer = (value: boolean) => {
      if (request.answer(value)) setDialog(null)
    }
    setDialog(<ConfirmDialog {...options} onCancel={() => answer(false)} onConfirm={() => answer(true)} />)
    return request.promise
  }, [])

  useEffect(() => {
    const pending = requests.current
    return () => {
      pending.dismiss()
      pendingCancel.current?.()
    }
  }, [])

  const go = useCallback((screen: Screen, params?: RouteParams) => navigate(hashFor(screen, params)), [navigate])

  const workspace = useMemo<Workspace>(() => {
    const departments = new Map(data.departments.map((department) => [department.id, department]))
    const doctors = new Map(data.doctors.map((doctor) => [doctor.doctorId, doctor]))
    const schedules = new Map(data.schedules.map((schedule) => [schedule.doctorId, schedule]))
    return {
      session,
      readOnly,
      data,
      dataReady,
      dataError,
      busy,
      refresh,
      register,
      run,
      runBookingChange,
      confirm,
      toast,
      go,
      departmentOf: (id) => (id === undefined ? undefined : departments.get(id)),
      doctorOf: (id) => (id === undefined ? undefined : doctors.get(id)),
      scheduleOf: (id) => (id === undefined ? undefined : schedules.get(id)),
    }
  }, [session, readOnly, data, dataReady, dataError, busy, refresh, register, run, runBookingChange, confirm, toast, go])

  return (
    <WorkspaceContext value={workspace}>
      {children}
      {pendingChange && (
        <AffectedBookingsDialog
          affected={pendingChange.affected}
          busy={busy}
          onCancelBookings={pendingChange.confirm}
          onClose={pendingChange.dismiss}
        />
      )}
      {dialog}
    </WorkspaceContext>
  )
}

type PendingChange = {
  affected: AffectedBookingsError
  confirm: (reason: string) => Promise<ActionOutcome>
  dismiss: () => void
}
