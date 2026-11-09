import type { Page } from '@playwright/test'
import { addDays, clinicToday, mediumDate } from './clinic.ts'
import { expect, go, newPatient, signIn, test, toast, uniqueName } from './fixtures.ts'
import type { Doctor } from './fixtures.ts'
import { admin } from './settings.ts'

function card(page: Page, doctor: Doctor) {
  return page.getByRole('article').filter({ has: page.getByRole('heading', { name: doctor.shownAs, exact: true }) })
}

async function addTimeOff(page: Page, doctor: Doctor, firstDay: string, lastDay: string, reason: string) {
  await card(page, doctor).getByRole('button', { name: 'Add', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Time off' })
  await dialog.getByLabel('First day').fill(firstDay)
  await dialog.getByLabel('Last day').fill(lastDay)
  await dialog.getByLabel('Reason').fill(reason)
  await dialog.getByRole('button', { name: 'Add time off' }).click()
}

function shortDay(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

test("edits a schedule's break in the side sheet", async ({ page, seed }) => {
  const doctor = await seed.doctor()
  await signIn(page, admin)
  await go(page, 'Schedules')

  await expect(card(page, doctor)).toContainText('12:00–13:00')
  await card(page, doctor).getByRole('button', { name: 'Edit' }).click()
  const sheet = page.getByRole('dialog', { name: doctor.shownAs })
  await sheet.getByLabel('From').fill('12:30')
  await sheet.getByLabel('Until').fill('13:30')
  await expect(sheet).toContainText('14 slots a day')
  await sheet.getByRole('button', { name: 'Save schedule' }).click()
  await expect(toast(page, `${doctor.shownAs}'s schedule saved`)).toBeVisible()
  await expect(card(page, doctor)).toContainText('12:30–13:30')
})

test('checks slot length and days the way the API does', async ({ page, seed }) => {
  const doctor = await seed.doctor()
  await signIn(page, admin)
  await go(page, 'Schedules')
  await card(page, doctor).getByRole('button', { name: 'Edit' }).click()
  const sheet = page.getByRole('dialog', { name: doctor.shownAs })

  await sheet.getByLabel('Ends at').selectOption('16')
  await sheet.getByRole('radio', { name: 'Other' }).click()
  await sheet.getByLabel('Minutes per slot').fill('45')
  await expect(sheet.getByText("45 minutes doesn't divide 7 hours evenly")).toBeVisible()
  for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
    await sheet.getByRole('button', { name: day }).click()
  }
  await sheet.getByRole('button', { name: 'Save schedule' }).click()
  await expect(sheet.getByText('Pick at least one day')).toBeVisible()
  await expect(sheet).toBeVisible()
})

test('adds time off, and removes it after asking', async ({ page, seed }) => {
  const doctor = await seed.doctor()
  const firstDay = addDays(clinicToday(), 20)
  const lastDay = addDays(firstDay, 1)
  await signIn(page, admin)
  await go(page, 'Schedules')

  await addTimeOff(page, doctor, firstDay, lastDay, 'Training')
  await expect(toast(page, `Time off added for ${doctor.shownAs}`)).toBeVisible()
  await expect(card(page, doctor)).toContainText(`${shortDay(firstDay)} – ${shortDay(lastDay)}`)
  await expect(card(page, doctor)).toContainText('Training')

  await card(page, doctor).getByRole('button', { name: `Remove time off from ${firstDay}` }).click()
  await page.getByRole('dialog', { name: 'Take this time off back?' }).getByRole('button', { name: 'Remove time off' }).click()
  await expect(toast(page, `Time off removed for ${doctor.shownAs}`)).toBeVisible()
  await expect(card(page, doctor)).toContainText('Nothing planned.')
})

test('lists the bookings time off would strand, and cancels them only when told to', async ({ page, seed }) => {
  const doctor = await seed.doctor()
  const desk = await seed.frontDesk()
  const day = addDays(clinicToday(), 3)
  await seed.booking(desk, doctor, day, '10:00', newPatient('Elena Dimitrova'))
  await signIn(page, admin)
  await go(page, 'Schedules')

  await addTimeOff(page, doctor, day, day, 'Conference')
  const affected = page.getByRole('dialog', { name: 'This change strands bookings' })
  const list = affected.getByRole('list', { name: 'Affected bookings' })
  await expect(list).toContainText(mediumDate(day))
  await expect(list).toContainText('10:00')
  await expect(list).toContainText('ED')
  await affected.getByRole('button', { name: 'Keep everything as it is' }).click()
  await expect(affected).toBeHidden()
  const form = page.getByRole('dialog', { name: 'Time off' })
  await expect(form).toBeVisible()
  await expect(card(page, doctor)).toContainText('Nothing planned.')

  await form.getByRole('button', { name: 'Add time off' }).click()
  await affected.getByRole('button', { name: 'Doctor unavailable' }).click()
  await affected.getByRole('button', { name: 'Cancel the booking and save' }).click()
  await expect(toast(page, `Time off added for ${doctor.shownAs}`)).toBeVisible()
  await expect(affected).toBeHidden()
  await expect(form).toBeHidden()
  await expect(card(page, doctor)).toContainText(shortDay(day))
})

test('makes a new user a doctor in a new department', async ({ page }) => {
  const department = uniqueName('Neurology')
  const name = uniqueName('doctor')
  await signIn(page, admin)

  await go(page, 'Departments')
  await page.getByRole('button', { name: 'New department' }).click()
  const create = page.getByRole('dialog', { name: 'New department' })
  await create.getByLabel('Name').fill(department)
  await create.getByRole('button', { name: 'Create department' }).click()
  await expect(toast(page, `${department} created`)).toBeVisible()

  await go(page, 'Users')
  await page.getByRole('button', { name: 'New user' }).click()
  const newUser = page.getByRole('dialog', { name: 'New user' })
  await newUser.getByLabel('Username').fill(name)
  await newUser.getByLabel('First password', { exact: true }).fill('doctor-password')
  await newUser.getByRole('button', { name: 'Create account' }).click()
  await expect(toast(page, `${name} created`)).toBeVisible()

  await page.getByRole('searchbox', { name: 'Find a user' }).fill(name)
  const row = page.getByRole('row').filter({ hasText: name })
  await expect(row).toContainText('Needs a role')
  await row.getByRole('combobox', { name: `Role of ${name}` }).selectOption('Doctor')
  const choice = page.getByRole('dialog', { name: `Make ${name} a doctor` })
  await choice.getByRole('radio', { name: department }).check()
  await choice.getByRole('button', { name: 'Make doctor' }).click()
  await expect(toast(page, `${name} is now a doctor`)).toBeVisible()
  await expect(row.getByRole('combobox', { name: `Role of ${name}` })).toHaveValue('Doctor')

  await go(page, 'Doctors')
  await page.getByRole('searchbox', { name: 'Find a doctor' }).fill(name)
  const doctorRow = page.getByRole('row').filter({ hasText: name })
  await expect(doctorRow.getByRole('combobox').locator('option:checked')).toHaveText(department)
  await expect(doctorRow.getByRole('button', { name: 'Set working hours' })).toBeVisible()
})

test('closes a department for bookings after asking', async ({ page, seed }) => {
  const doctor = await seed.doctor()
  await signIn(page, admin)
  await go(page, 'Departments')

  const department = page.getByRole('listitem').filter({ hasText: doctor.department })
  await department.getByRole('switch', { name: `${doctor.department} takes bookings` }).click()
  await page.getByRole('dialog', { name: 'Stop bookings here?' }).getByRole('button', { name: 'Stop bookings' }).click()
  await expect(toast(page, `${doctor.department} no longer takes bookings`)).toBeVisible()
  await expect(department.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  await expect(department).toContainText('Closed')
})
