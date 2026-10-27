import { createContext, useContext } from 'react'
import type { DepartmentDto, DoctorDto, ScheduleDto } from '../api'

// What every screen of a session shares, provided by App: the departments,
// doctors and schedules, whether something is loading or running, whether
// the account is read-only, the top bar's search, and where errors go.
export type Workspace = {
  departments: DepartmentDto[]
  doctors: DoctorDto[]
  schedules: ScheduleDto[]
  loading: boolean
  isReadOnly: boolean
  searchQuery: string
  // Keeps the same identity, so screens can load with it in an effect.
  onError: (message: string) => void
}

export const WorkspaceContext = createContext<Workspace | null>(null)

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext)
  if (!workspace) throw new Error('useWorkspace needs the WorkspaceContext that App provides')
  return workspace
}
