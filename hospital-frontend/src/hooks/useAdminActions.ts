import { useMemo } from 'react'
import * as api from '../api'
import type {
  CancelAffected,
  ChangeScheduleInput,
  CreateScheduleInput,
  DepartmentDto,
  DoctorDto,
  UserDto,
  UserRole,
} from '../api'
import type { ConfirmOptions } from '../components/ui'
import type { ActionOutcome } from '../types'

export type AdminActions = {
  assignDoctor: (doctor: DoctorDto, departmentId: number) => Promise<ActionOutcome>
  changeDepartmentStatus: (department: DepartmentDto, isActive: boolean) => Promise<ActionOutcome>
  changeDoctorStatus: (doctor: DoctorDto, isActive: boolean) => Promise<ActionOutcome>
  changeSchedule: (scheduleId: number, input: ChangeScheduleInput) => Promise<ActionOutcome>
  changeUserRole: (user: UserDto, role: UserRole) => Promise<ActionOutcome>
  createDepartment: (name: string) => Promise<ActionOutcome>
  createSchedule: (input: CreateScheduleInput) => Promise<ActionOutcome>
  createUser: (name: string, password: string) => Promise<ActionOutcome>
  resetPassword: (user: UserDto, password: string) => Promise<ActionOutcome>
}

type Dialogs = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  chooseDepartment: (userName: string, departments: DepartmentDto[]) => Promise<number | null>
}

// What the admin screens can change. Each asks first where a change is hard
// to take back, and runs through App's runAction, or runBookingChange when
// it can strand future bookings. The same object comes back until one of the
// inputs changes, so the tabs do not get new callbacks on every render.
export function useAdminActions(
  departments: DepartmentDto[],
  runAction: (action: () => Promise<unknown>, successMessage: string) => Promise<ActionOutcome>,
  runBookingChange: (change: (cancel?: CancelAffected) => Promise<unknown>, successMessage: string) => Promise<ActionOutcome>,
  { confirm, chooseDepartment }: Dialogs,
): AdminActions {
  return useMemo<AdminActions>(
    () => ({
      assignDoctor: async (doctor, departmentId) => {
        const department = departments.find((candidate) => candidate.id === departmentId)
        const confirmed = await confirm({
          title: 'Move doctor',
          message: `Move ${doctor.name} to ${department?.name ?? 'this department'}?`,
          confirmLabel: 'Move doctor',
        })
        if (!confirmed) return { ok: false }
        return runAction(() => api.changeDoctorDepartment(doctor.doctorId, departmentId), 'Doctor department updated')
      },
      changeDepartmentStatus: async (department, isActive) => {
        const confirmed = await confirm({
          title: isActive ? 'Activate department' : 'Deactivate department',
          message: isActive
            ? `Activate ${department.name}? Its doctors can be booked again.`
            : `Deactivate ${department.name}? Its doctors can no longer be booked.`,
          confirmLabel: isActive ? 'Activate' : 'Deactivate',
          tone: isActive ? undefined : 'danger',
        })
        if (!confirmed) return { ok: false }
        return runBookingChange(
          (cancel) => api.changeDepartmentStatus(department.id, isActive, cancel),
          'Department status updated',
        )
      },
      changeDoctorStatus: async (doctor, isActive) => {
        const confirmed = await confirm({
          title: isActive ? 'Activate doctor' : 'Deactivate doctor',
          message: isActive
            ? `Activate ${doctor.name}? They can be booked again.`
            : `Deactivate ${doctor.name}? They can no longer be booked or sign in.`,
          confirmLabel: isActive ? 'Activate' : 'Deactivate',
          tone: isActive ? undefined : 'danger',
        })
        if (!confirmed) return { ok: false }
        return runBookingChange((cancel) => api.changeDoctorStatus(doctor, isActive, cancel), 'Doctor status updated')
      },
      changeSchedule: (scheduleId, input) =>
        runBookingChange((cancel) => api.changeSchedule(scheduleId, input, cancel), 'Schedule updated'),
      changeUserRole: async (user, role) => {
        // A new doctor needs a department; choosing one is the confirmation.
        let departmentId: number | undefined
        if (role === 'Doctor') {
          const chosen = await chooseDepartment(user.userName, departments)
          if (chosen === null) return { ok: false }
          departmentId = chosen
        } else {
          const confirmed = await confirm({
            title: 'Change role',
            message: `Change ${user.userName}'s role from ${user.role} to ${role}? They are signed out everywhere.`,
            confirmLabel: 'Change role',
          })
          if (!confirmed) return { ok: false }
        }
        return runBookingChange(
          (cancel) => api.changeUserRole(user.userId, role, departmentId, cancel),
          'User role updated',
        )
      },
      createDepartment: (name) => runAction(() => api.createDepartment(name), 'Department created'),
      createSchedule: (input) => runAction(() => api.createSchedule(input), 'Schedule created'),
      createUser: (name, password) => runAction(() => api.createUser(name, password), 'User created'),
      resetPassword: async (user, password) => {
        const confirmed = await confirm({
          title: 'Reset password',
          message: `Set a new password for ${user.userName}? They are signed out everywhere, and a sign-in lock is lifted.`,
          confirmLabel: 'Reset password',
        })
        if (!confirmed) return { ok: false }
        return runAction(() => api.resetPassword(user.userId, password), 'Password reset')
      },
    }),
    [departments, runAction, runBookingChange, confirm, chooseDepartment],
  )
}
