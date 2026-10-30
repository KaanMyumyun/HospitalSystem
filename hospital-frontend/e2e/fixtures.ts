import { randomBytes, randomInt } from 'node:crypto'
import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import type * as Api from '../src/api-schema.ts'
import { clinicInstant } from './clinic.ts'
import { admin, apiOrigin } from './settings.ts'

export { expect }

export type Account = { name: string; password: string }
export type Doctor = Account & { doctorId: number; scheduleId: number; department: string }
export type Patient = { name: string; phoneNumber: string; dateOfBirth: string }

let testsInWorker = 0
function clientAddress(workerIndex: number) {
  testsInWorker++
  return `10.${workerIndex % 256}.${Math.floor(testsInWorker / 250) % 256}.${(testsInWorker % 250) + 1}`
}

export function uniqueName(prefix: string) {
  return `${prefix}-${randomBytes(3).toString('hex')}`
}

export function newPatient(name: string): Patient {
  return {
    name,
    phoneNumber: `+359 88 ${randomInt(1_000_000, 10_000_000)}`,
    dateOfBirth: `19${randomInt(40, 100)}-0${randomInt(1, 10)}-1${randomInt(0, 10)}`,
  }
}

export class Seed {
  private readonly headers: Record<string, string>
  private adminToken: string | null = null

  constructor(headers: Record<string, string>) {
    this.headers = headers
  }

  async doctor(): Promise<Doctor> {
    const token = await this.admin()
    const department = uniqueName('Cardiology')
    await this.call('POST', '/departments', token, { name: department } satisfies Api.CreateDepartmentDto)
    const departments = await this.call<Api.ViewDepartmentDtoListServiceResult>('GET', '/departments', token)
    const departmentId = departments.data?.find((item) => item.name === department)?.id

    const account = await this.account('doctor')
    const userId = await this.userId(account.name)
    await this.call('PATCH', `/users/${userId}/role`, token, { newRole: 'Doctor', departmentId } satisfies Api.ChangeRoleDto)
    const doctors = await this.call<Api.DoctorDisplayDtoListServiceResult>('GET', '/doctors', token)
    const doctorId = doctors.data?.find((item) => item.userId === userId)?.doctorId
    if (doctorId === undefined) throw new Error(`${account.name} is not listed as a doctor`)

    await this.call('POST', '/schedules', token, {
      doctorId,
      startHour: 9,
      endHour: 17,
      slotDurationMin: 30,
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      breakStartMinute: 12 * 60,
      breakEndMinute: 13 * 60,
    } satisfies Api.CreateSchedule)
    const schedules = await this.call<Api.ViewScheduleListServiceResult>('GET', '/schedules', token)
    const scheduleId = schedules.data?.find((item) => item.doctorId === doctorId)?.scheduleId
    if (scheduleId === undefined) throw new Error(`${account.name} has no schedule`)

    return { ...account, doctorId, scheduleId, department }
  }

  async frontDesk(): Promise<Account> {
    const account = await this.account('desk')
    await this.call('PATCH', `/users/${await this.userId(account.name)}/role`, await this.admin(), {
      newRole: 'FrontDesk',
    } satisfies Api.ChangeRoleDto)
    return account
  }

  async booking(desk: Account, doctor: Doctor, date: string, time: string, patient: Patient) {
    const token = await this.signIn(desk)
    await this.call('POST', '/appointments', token, {
      doctorId: doctor.doctorId,
      patientName: patient.name,
      phoneNumber: patient.phoneNumber,
      dateOfBirth: patient.dateOfBirth,
      appointmentTime: clinicInstant(date, time),
    } satisfies Api.CreateAppointmentDto)
  }

  async timeOff(doctor: Doctor, firstDay: string, lastDay: string, reason: string) {
    await this.call('POST', `/schedules/${doctor.scheduleId}/time-off`, await this.admin(), {
      firstDay,
      lastDay,
      reason,
    } satisfies Api.AddTimeOffDto)
  }

  async account(prefix: string): Promise<Account> {
    const account = { name: uniqueName(prefix), password: `${prefix}-password` }
    await this.call('POST', '/users', await this.admin(), account satisfies Api.CreateUserDto)
    return account
  }

  private async userId(name: string) {
    const query = new URLSearchParams({ search: name, page: '1', pageSize: '10' })
    const users = await this.call<Api.UserDisplayDtoPagedResultServiceResult>('GET', `/users?${query}`, await this.admin())
    const userId = users.data?.items.find((user) => user.userName === name)?.userId
    if (userId === undefined) throw new Error(`No user named ${name}`)
    return userId
  }

  private async admin() {
    this.adminToken ??= await this.signIn(admin)
    return this.adminToken
  }

  private async signIn(account: Account) {
    const result = await this.call<Api.LoginResultDto>('POST', '/auth/login', null, account satisfies Api.LoginDto)
    if (!result.token) throw new Error(`${account.name} could not sign in: ${result.error}`)
    return result.token
  }

  private async call<T = unknown>(method: string, path: string, token: string | null, body?: unknown): Promise<T> {
    const response = await fetch(`${apiOrigin}/api${path}`, {
      method,
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    if (!response.ok) throw new Error(`${method} ${path} answered ${response.status}: ${text}`)
    return (text ? JSON.parse(text) : null) as T
  }
}

export const test = base.extend<{ seed: Seed; browserErrors: void }>({
  extraHTTPHeaders: async ({ extraHTTPHeaders }, use, testInfo) => {
    await use({ ...extraHTTPHeaders, 'X-Forwarded-For': clientAddress(testInfo.workerIndex) })
  },
  seed: async ({ extraHTTPHeaders }, use) => {
    await use(new Seed(extraHTTPHeaders ?? {}))
  },
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
          errors.push(message.text())
        }
      })
      await use()
      expect(errors, 'errors in the browser console').toEqual([])
    },
    { auto: true },
  ],
})

export async function signIn(page: Page, account: Account) {
  await page.goto('/')
  await page.getByLabel('Username').fill(account.name)
  await page.getByLabel('Password').fill(account.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
}

export function notice(page: Page, text: string) {
  return page.getByRole('status').filter({ hasText: text })
}
