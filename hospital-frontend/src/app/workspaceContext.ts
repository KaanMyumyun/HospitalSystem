import { createContext, useContext } from 'react'
import type { CancelAffected, DepartmentDto, DoctorDto, ScheduleDto } from '../api/client'
import type { ConfirmOptions } from '../components/ConfirmDialog'
import type { ActionOutcome, HospitalData, Screen, Session } from '../types'
import type { Toaster } from '../ui/useToasts'

export type RunOptions = { quiet?: boolean }
export type RunAction = (
  action: () => Promise<unknown>,
  successMessage: string | null,
  options?: RunOptions,
) => Promise<ActionOutcome>
export type RunBookingChange = (
  change: (cancel?: CancelAffected) => Promise<unknown>,
  successMessage: string,
) => Promise<ActionOutcome>
export type Reload = () => Promise<unknown>
export type RouteParams = Record<string, string | number | null | undefined>

export type Workspace = {
  session: Session
  readOnly: boolean
  data: HospitalData
  dataReady: boolean
  dataError: string | null
  busy: boolean
  refresh: () => Promise<void>
  register: (reload: Reload) => () => void
  run: RunAction
  runBookingChange: RunBookingChange
  confirm: (options: ConfirmOptions) => Promise<boolean>
  toast: Toaster
  go: (screen: Screen, params?: RouteParams) => void
  departmentOf: (departmentId: number | undefined) => DepartmentDto | undefined
  doctorOf: (doctorId: number | undefined) => DoctorDto | undefined
  scheduleOf: (doctorId: number | undefined) => ScheduleDto | undefined
}

export const WorkspaceContext = createContext<Workspace | null>(null)

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext)
  if (!workspace) throw new Error('useWorkspace needs a WorkspaceProvider')
  return workspace
}
