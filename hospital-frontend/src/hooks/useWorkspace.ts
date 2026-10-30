import { createContext, useContext } from 'react'
import type { DepartmentDto, DoctorDto, ScheduleDto } from '../api'

export type Workspace = {
  departments: DepartmentDto[]
  doctors: DoctorDto[]
  schedules: ScheduleDto[]
  loading: boolean
  isReadOnly: boolean
  searchQuery: string
  onError: (message: string) => void
}

export const WorkspaceContext = createContext<Workspace | null>(null)

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext)
  if (!workspace) throw new Error('useWorkspace needs the WorkspaceContext that App provides')
  return workspace
}
