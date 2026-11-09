import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { vi } from 'vitest'
import type { AppointmentDto, DepartmentDto, DoctorDto, ScheduleDto } from '../api/client'
import { WorkspaceContext } from '../app/workspaceContext'
import type { Workspace } from '../app/workspaceContext'
import { ToastContext } from '../ui/useToasts'
import type { Toaster } from '../ui/useToasts'

export function fakeToaster(): Toaster {
  return { success: vi.fn(), error: vi.fn(), info: vi.fn(), clear: vi.fn() }
}

export function fakeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  const departments = overrides.data?.departments ?? [department()]
  const doctors = overrides.data?.doctors ?? [doctor()]
  const schedules = overrides.data?.schedules ?? [schedule()]
  return {
    session: { id: 'session', role: 'FrontDesk' },
    readOnly: false,
    data: { departments, doctors, schedules },
    dataReady: true,
    dataError: null,
    busy: false,
    refresh: vi.fn(async () => {}),
    register: () => () => {},
    run: vi.fn(async (action: () => Promise<unknown>) => {
      try {
        await action()
        return { ok: true as const }
      } catch (error) {
        return { ok: false as const, error: error instanceof Error ? error.message : 'failed', cause: error }
      }
    }),
    runBookingChange: vi.fn(async () => ({ ok: true as const })),
    confirm: vi.fn(async () => true),
    toast: fakeToaster(),
    go: vi.fn(),
    departmentOf: (id) => departments.find((item) => item.id === id),
    doctorOf: (id) => doctors.find((item) => item.doctorId === id),
    scheduleOf: (id) => schedules.find((item) => item.doctorId === id),
    ...overrides,
  }
}

export function renderInWorkspace(ui: ReactElement, workspace: Partial<Workspace> = {}) {
  const value = fakeWorkspace(workspace)
  return {
    workspace: value,
    ...render(
      <ToastContext value={value.toast}>
        <WorkspaceContext value={value}>{ui}</WorkspaceContext>
      </ToastContext>,
    ),
  }
}

export function department(overrides: Partial<DepartmentDto> = {}): DepartmentDto {
  return { id: 1, name: 'Cardiology', isActive: true, ...overrides }
}

export function doctor(overrides: Partial<DoctorDto> = {}): DoctorDto {
  return { doctorId: 7, departmentId: 1, userId: 70, name: 'ada.lovelace', isActive: true, ...overrides }
}

export function schedule(overrides: Partial<ScheduleDto> = {}): ScheduleDto {
  return {
    scheduleId: 3,
    doctorId: 7,
    startTime: '2000-01-01T09:00:00Z',
    endTime: '2000-01-01T11:00:00Z',
    slotDurationMin: 30,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    breakStartMinute: null,
    breakEndMinute: null,
    timeOff: [],
    ...overrides,
  }
}

export function appointment(overrides: Partial<AppointmentDto> = {}): AppointmentDto {
  return {
    appointmentId: 42,
    doctorId: 7,
    doctorName: 'ada.lovelace',
    patientId: 5,
    patientName: 'Grace Hopper',
    patientPhoneNumber: '0888123456',
    appointmentTime: '2099-03-02T09:00:00Z',
    status: 'Scheduled',
    ...overrides,
  }
}
