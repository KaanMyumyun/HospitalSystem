import type { Page } from '@playwright/test'
import { longDate, nextWeek } from './clinic.ts'
import { expect, newPatient, notice, signIn, test } from './fixtures.ts'
import type { Doctor } from './fixtures.ts'

// The browser runs in Tokyo (playwright.config.ts), so each slot found by its
// date and time also shows the grid keeps to the clinic's clock.
const [monday = '', tuesday = '', wednesday = ''] = nextWeek()

async function showNextWeek(page: Page, doctor: Doctor) {
  await page.getByRole('button', { name: doctor.name }).click()
  await expect(page.getByRole('heading', { name: doctor.name })).toBeVisible()
  await page.getByRole('button', { name: 'Next Week' }).click()
}

function slot(page: Page, date: string, time: string, shows: string) {
  return page.getByRole('button', { name: `${longDate(date)} at ${time}: ${shows}`, exact: true })
}

test('shows the week in clinic time, with the break and a day away', async ({ page, seed }) => {
  const doctor = await seed.doctor()
  const desk = await seed.frontDesk()
  await seed.booking(desk, doctor, monday, '10:00', newPatient('Elena Dimitrova'))
  await seed.timeOff(doctor, wednesday, wednesday, 'Conference')

  await signIn(page, desk)
  await showNextWeek(page, doctor)

  await expect(slot(page, monday, '10:00', 'ED')).toBeVisible()
  await expect(slot(page, monday, '12:30', 'Break')).toBeDisabled()
  await expect(slot(page, wednesday, '10:00', 'Away')).toBeDisabled()
  await expect(slot(page, tuesday, '09:00', 'Available')).toBeEnabled()
})

test('books an open slot, shows who booked it, and cancels it', async ({ page, seed }) => {
  const doctor = await seed.doctor()
  const desk = await seed.frontDesk()
  const patient = newPatient('Georgi Petrov')

  await signIn(page, desk)
  await showNextWeek(page, doctor)
  await slot(page, tuesday, '09:00', 'Available').click()
  const booking = page.getByRole('dialog', { name: 'Book appointment' })
  await expect(booking).toContainText(`${longDate(tuesday)} at 09:00`)
  await booking.getByLabel('Patient Name').fill(patient.name)
  await booking.getByLabel('Phone Number').fill(patient.phoneNumber)
  await booking.getByLabel('Date of Birth').fill(patient.dateOfBirth)
  await booking.getByRole('button', { name: 'Confirm Booking' }).click()
  await expect(notice(page, 'Appointment booked')).toBeVisible()
  await expect(booking).toBeHidden()

  await slot(page, tuesday, '09:00', 'GP').click()
  const history = page.getByRole('region', { name: 'Booking history' })
  await expect(history).toContainText(`Booked by ${desk.name}`)

  await page.getByRole('button', { name: 'Cancel Appointment' }).click()
  const cancellation = page.getByRole('dialog', { name: 'Cancel appointment' })
  await cancellation.getByLabel('Cancellation Reason').fill('The patient called to cancel')
  await cancellation.getByRole('button', { name: 'Confirm Cancellation' }).click()
  await expect(notice(page, 'Appointment cancelled')).toBeVisible()
  await expect(history).toContainText(`Cancelled by ${desk.name}`)
})

test('moves a booking to another doctor and time in one step', async ({ page, seed }) => {
  const doctor = await seed.doctor()
  const otherDoctor = await seed.doctor()
  const desk = await seed.frontDesk()
  await seed.booking(desk, doctor, monday, '10:00', newPatient('Elena Dimitrova'))

  await signIn(page, desk)
  await showNextWeek(page, doctor)
  await slot(page, monday, '10:00', 'ED').click()
  await page.getByRole('button', { name: 'Move Appointment' }).click()
  await expect(notice(page, `Moving Elena Dimitrova from ${longDate(monday)} at 10:00`)).toBeVisible()

  await page.getByRole('button', { name: otherDoctor.name }).click()
  await slot(page, tuesday, '11:00', 'Move here').click()
  const confirm = page.getByRole('dialog', { name: 'Move appointment' })
  await expect(confirm).toContainText(`to ${longDate(tuesday)} at 11:00 with ${otherDoctor.name}?`)
  await confirm.getByRole('button', { name: 'Move appointment' }).click()
  await expect(notice(page, 'Appointment moved')).toBeVisible()

  await expect(slot(page, tuesday, '11:00', 'ED')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Booking history' })).toContainText(`Moved by ${desk.name}`)
  await page.getByRole('button', { name: doctor.name }).click()
  await expect(slot(page, monday, '10:00', 'Available')).toBeVisible()
})

test('renews the session once its token is ten minutes old', async ({ page, seed }) => {
  const desk = await seed.frontDesk()
  await signIn(page, desk)
  const stored = () =>
    page.evaluate(() => ({
      id: sessionStorage.getItem('hospital-frontend-session'),
      token: sessionStorage.getItem('hospital-frontend-token'),
    }))
  const before = await stored()
  // A token's times are whole seconds, so one renewed within the second it
  // was issued would be the same token.
  await page.waitForTimeout(1_100)

  await page.clock.install()
  await page.clock.fastForward('15:00')
  const renewal = page.waitForResponse((response) => response.url().endsWith('/api/auth/refresh'))
  await page.getByRole('button', { name: 'Next Week' }).click()
  const renewed = await renewal
  expect(renewed.status()).toBe(200)
  const { token } = (await renewed.json()) as { token: string }
  expect(token).not.toBe(before.token)
  await expect.poll(async () => (await stored()).token).toBe(token)
  const after = await stored()
  expect(after.id).toBe(before.id)

  // The API takes the new token.
  const reload = page.waitForResponse((response) => response.url().endsWith('/api/departments'))
  await page.getByRole('button', { name: 'Refresh' }).click()
  const response = await reload
  expect(response.status()).toBe(200)
  expect(response.request().headers().authorization).toBe(`Bearer ${after.token}`)
})
