import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import type { AppointmentDto, DepartmentDto, DoctorDto } from '../api'
import { WorkspaceContext } from '../hooks/useWorkspace'
import type { Workspace } from '../hooks/useWorkspace'

// Renders part of a screen inside the workspace App would provide; by
// default an empty one, for a front desk account with nothing loading.
export function renderInWorkspace(ui: ReactElement, workspace: Partial<Workspace> = {}) {
  return render(
    <WorkspaceContext
      value={{
        departments: [],
        doctors: [],
        schedules: [],
        loading: false,
        isReadOnly: false,
        searchQuery: '',
        onError: () => {},
        ...workspace,
      }}
    >
      {ui}
    </WorkspaceContext>,
  )
}

export function department(overrides: Partial<DepartmentDto> = {}): DepartmentDto {
  return { id: 1, name: 'Cardiology', isActive: true, ...overrides }
}

export function doctor(overrides: Partial<DoctorDto> = {}): DoctorDto {
  return { doctorId: 7, departmentId: 1, userId: 70, name: 'Dr. Ada Lovelace', isActive: true, ...overrides }
}

export function appointment(overrides: Partial<AppointmentDto> = {}): AppointmentDto {
  return {
    appointmentId: 42,
    doctorId: 7,
    doctorName: 'Dr. Ada Lovelace',
    patientId: 5,
    patientName: 'Grace Hopper',
    patientPhoneNumber: '0888123456',
    appointmentTime: '2099-03-02T09:00:00Z',
    status: 'Scheduled',
    ...overrides,
  }
}
