import type { Page } from '@playwright/test'
import { addDays, clinicToday, longDate, shortDate } from './clinic.ts'
import { expect, newPatient, notice, signIn, test, uniqueName } from './fixtures.ts'
import type { Doctor } from './fixtures.ts'
import { admin } from './settings.ts'

async function open(page: Page, screen: string) {
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: screen }).click()
  await expect(page.getByRole('heading', { name: screen, level: 2 })).toBeVisible()
}

async function addTimeOff(page: Page, doctor: Doctor, firstDay: string, lastDay: string, reason: string) {
  const timeOff = page.getByRole('region', { name: 'Time off' })
  await timeOff.getByRole('combobox', { name: 'Doctor' }).selectOption({ label: doctor.name })
  await timeOff.getByLabel('First day', { exact: true }).fill(firstDay)
  await timeOff.getByLabel('Last day', { exact: true }).fill(lastDay)
  await timeOff.getByLabel('Reason', { exact: true }).fill(reason)
  await timeOff.getByRole('button', { name: 'Add Time Off' }).click()
}

test("edits a schedule's break", async ({ page, seed }) => {
  const doctor = await seed.doctor()
  await signIn(page, admin)
  await open(page, 'Schedules')

  const row = page.getByRole('row').filter({ hasText: doctor.name })
  await expect(row).toContainText('12:00-13:00')
  await row.getByRole('button', { name: 'Edit', exact: true }).click()
  await row.getByLabel(`Break for ${doctor.name} starts`).fill('12:30')
  await row.getByLabel(`Break for ${doctor.name} ends`).fill('13:30')
  const save = row.getByRole('button', { name: 'Save', exact: true })
  await expect(save).toBeInViewport()
  await save.click()
  await expect(notice(page, 'Schedule updated')).toBeVisible()
  await expect(row).toContainText('12:30-13:30')
})

test('adds time off, and removes it after asking', async ({ page, seed }) => {
  const doctor = await seed.doctor()
  const firstDay = addDays(clinicToday(), 20)
  const lastDay = addDays(firstDay, 1)
  const days = `${shortDate(firstDay)} - ${shortDate(lastDay)}`
  await signIn(page, admin)
  await open(page, 'Schedules')

  await addTimeOff(page, doctor, firstDay, lastDay, 'Training')
  await expect(notice(page, 'Time off added')).toBeVisible()
  const timeOff = page.getByRole('region', { name: 'Time off' })
  const row = timeOff.getByRole('row').filter({ hasText: doctor.name })
  await expect(row).toContainText(days)
  await expect(row).toContainText('Training')

  await row.getByRole('button', { name: `Remove time off on ${days} for ${doctor.name}` }).click()
  await page.getByRole('dialog', { name: 'Remove time off' }).getByRole('button', { name: 'Remove time off' }).click()
  await expect(notice(page, 'Time off removed')).toBeVisible()
  await expect(row).toHaveCount(0)
})

test('lists the bookings time off would strand, and cancels them only when told to', async ({ page, seed }) => {
  const doctor = await seed.doctor()
  const desk = await seed.frontDesk()
  const day = addDays(clinicToday(), 3)
  await seed.booking(desk, doctor, day, '10:00', newPatient('Elena Dimitrova'))
  await signIn(page, admin)
  await open(page, 'Schedules')
  const timeOff = page.getByRole('region', { name: 'Time off' })

  await addTimeOff(page, doctor, day, day, 'Conference')
  const affected = page.getByRole('dialog', { name: 'Future bookings affected' })
  await expect(affected.getByRole('list', { name: 'Affected bookings' })).toContainText(`${longDate(day)} at 10:00`)
  await expect(affected.getByText('ED', { exact: true })).toBeVisible()
  await affected.getByRole('button', { name: 'Keep everything as it is' }).click()
  await expect(affected).toBeHidden()
  await expect(timeOff.getByRole('row').filter({ hasText: doctor.name })).toHaveCount(0)

  await timeOff.getByRole('button', { name: 'Add Time Off' }).click()
  await affected.getByLabel('Reason for cancelling them').fill('The doctor is at a conference')
  await affected.getByRole('button', { name: 'Cancel the booking and save' }).click()
  await expect(notice(page, 'Time off added')).toBeVisible()
  await expect(affected).toBeHidden()
  await expect(timeOff.getByRole('row').filter({ hasText: doctor.name })).toContainText(shortDate(day))
})

test('makes a new user a doctor in a new department', async ({ page }) => {
  const department = uniqueName('Neurology')
  const name = uniqueName('doctor')
  await signIn(page, admin)

  await open(page, 'Departments')
  await page.getByLabel('New department name').fill(department)
  await page.getByRole('button', { name: 'Add Department' }).click()
  await expect(notice(page, 'Department created')).toBeVisible()

  await open(page, 'Users')
  await page.getByLabel('New username').fill(name)
  await page.getByLabel("New user's password").fill('doctor-password')
  await page.getByRole('button', { name: 'Create User' }).click()
  await expect(notice(page, 'User created')).toBeVisible()
  await page.getByLabel('Search').fill(name)
  await page.getByLabel(`Role of ${name}`).selectOption('Doctor')
  const dialog = page.getByRole('dialog', { name: 'Make a doctor' })
  await dialog.getByLabel('Department').selectOption({ label: department })
  await dialog.getByRole('button', { name: 'Make doctor' }).click()
  await expect(notice(page, 'User role updated')).toBeVisible()
  await expect(page.getByLabel(`Role of ${name}`)).toHaveValue('Doctor')

  await open(page, 'Doctors')
  await expect(page.getByLabel(`Department of ${name}`).locator('option:checked')).toHaveText(department)
})
