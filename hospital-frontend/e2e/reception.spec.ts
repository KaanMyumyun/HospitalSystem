import type { Page } from '@playwright/test'
import { longDate, mediumDate, nextWeek } from './clinic.ts'
import { expect, newPatient, signIn, test, toast, uniqueName } from './fixtures.ts'
import type { Doctor } from './fixtures.ts'

function week() {
  const [monday = '', tuesday = '', wednesday = ''] = nextWeek()
  return { monday, tuesday, wednesday }
}

async function showNextWeek(page: Page, doctor: Doctor) {
  await chooseDoctor(page, doctor)
  await page.getByRole('button', { name: 'Next week', exact: true }).click()
}

async function chooseDoctor(page: Page, doctor: Doctor) {
  await page.getByRole('complementary', { name: 'Doctors' }).getByRole('button', { name: new RegExp(`^${doctor.shownAs}`) }).click()
  await expect(page.getByRole('heading', { name: doctor.shownAs, level: 1 })).toBeVisible()
}

function slot(page: Page, date: string, time: string, shows: string) {
  return page.getByRole('button', { name: `${longDate(date)}, ${time}: ${shows}`, exact: true })
}

function closed(page: Page, date: string, time: string, shows: string) {
  return page.getByRole('img', { name: `${longDate(date)}, ${time}: ${shows}`, exact: true })
}

test('shows the week in clinic time, with the break and a day away', async ({ page, seed }) => {
  const { monday, tuesday, wednesday } = week()
  const doctor = await seed.doctor()
  const desk = await seed.frontDesk()
  await seed.booking(desk, doctor, monday, '10:00', newPatient('Elena Dimitrova'))
  await seed.timeOff(doctor, wednesday, wednesday, 'Conference')

  await signIn(page, desk)
  await showNextWeek(page, doctor)

  await expect(slot(page, monday, '10:00', 'Elena Dimitrova, scheduled')).toBeVisible()
  await expect(closed(page, monday, '12:30', 'break')).toBeVisible()
  await expect(closed(page, wednesday, '10:00', 'away, Conference')).toBeVisible()
  await expect(slot(page, tuesday, '09:00', 'open')).toBeEnabled()
  await expect(page.getByRole('columnheader', { name: longDate(wednesday) })).toContainText('Away')
})

test('books a patient on file from the lookup, then cancels with a reason', async ({ page, seed }) => {
  const { monday, tuesday } = week()
  const doctor = await seed.doctor()
  const desk = await seed.frontDesk()
  const patient = newPatient(uniqueName('Georgi'))
  await seed.booking(desk, doctor, monday, '10:00', patient)

  await signIn(page, desk)
  await showNextWeek(page, doctor)
  await slot(page, tuesday, '09:00', 'open').click()
  const booking = page.getByRole('dialog', { name: `${mediumDate(tuesday)}, 09:00` })
  await booking.getByLabel('Patient name').fill(patient.name)
  const onFile = booking.getByRole('region', { name: 'Patients on file' })
  await expect(onFile).toContainText(patient.name)
  await onFile.getByRole('button', { name: 'Use' }).click()
  await expect(booking.getByText('On file', { exact: true })).toBeVisible()
  await booking.getByRole('button', { name: 'Book appointment' }).click()
  await expect(toast(page, `Booked ${patient.name} for ${mediumDate(tuesday)} at 09:00`)).toBeVisible()
  await expect(booking).toBeHidden()

  const pane = page.getByRole('complementary', { name: 'Appointment' })
  await expect(pane.getByRole('heading', { name: patient.name })).toBeVisible()
  await expect(pane.getByRole('region', { name: 'Booking history' })).toContainText(`Booked by ${desk.name}`)
  await expect(slot(page, tuesday, '09:00', `${patient.name}, scheduled`)).toHaveAttribute('aria-pressed', 'true')

  await pane.getByRole('button', { name: 'Cancel booking' }).click()
  const cancellation = page.getByRole('dialog', { name: patient.name })
  await cancellation.getByRole('button', { name: 'Patient asked to cancel' }).click()
  await cancellation.getByRole('button', { name: 'Cancel booking' }).click()
  await expect(toast(page, `Cancelled ${patient.name}'s booking`)).toBeVisible()
  await expect(pane.getByRole('region', { name: 'Booking history' })).toContainText(`Cancelled by ${desk.name}`)
  await expect(slot(page, tuesday, '09:00', 'open')).toBeVisible()
})

test('moves a booking to another doctor and week in one step', async ({ page, seed }) => {
  const { monday, tuesday } = week()
  const doctor = await seed.doctor()
  const otherDoctor = await seed.doctor()
  const desk = await seed.frontDesk()
  const patient = newPatient('Elena Dimitrova')
  await seed.booking(desk, doctor, monday, '10:00', patient)

  await signIn(page, desk)
  await showNextWeek(page, doctor)
  await slot(page, monday, '10:00', 'Elena Dimitrova, scheduled').click()
  await page.getByRole('complementary', { name: 'Appointment' }).getByRole('button', { name: 'Move' }).click()
  await expect(page.getByRole('status').filter({ hasText: `Moving ${patient.name} from ${mediumDate(monday)}, 10:00` })).toBeVisible()

  await chooseDoctor(page, otherDoctor)
  await slot(page, tuesday, '11:00', 'open, move here').click()
  const confirm = page.getByRole('dialog', { name: "Move Elena's visit?" })
  await expect(confirm).toContainText(`to ${mediumDate(tuesday)} at 11:00 with ${otherDoctor.shownAs}`)
  await confirm.getByRole('button', { name: 'Move booking' }).click()
  await expect(toast(page, `Moved ${patient.name} to ${mediumDate(tuesday)} at 11:00`)).toBeVisible()

  await expect(slot(page, tuesday, '11:00', 'Elena Dimitrova, scheduled')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Booking history' })).toContainText(`Moved by ${desk.name}`)
  await chooseDoctor(page, doctor)
  await expect(slot(page, monday, '10:00', 'open')).toBeVisible()
})

test('moves between slots with the keyboard and books with Enter', async ({ page, seed }) => {
  const { monday, tuesday } = week()
  const doctor = await seed.doctor()
  const desk = await seed.frontDesk()
  await signIn(page, desk)
  await showNextWeek(page, doctor)

  await slot(page, monday, '09:00', 'open').focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await expect(slot(page, tuesday, '09:30', 'open')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: `${mediumDate(tuesday)}, 09:30` })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
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
  await page.waitForTimeout(1_100)

  await page.clock.install()
  await page.clock.fastForward('15:00')
  const renewal = page.waitForResponse((response) => response.url().endsWith('/api/auth/refresh'))
  await page.getByRole('button', { name: 'Next week', exact: true }).click()
  const renewed = await renewal
  expect(renewed.status()).toBe(200)
  const { token } = (await renewed.json()) as { token: string }
  expect(token).not.toBe(before.token)
  await expect.poll(async () => (await stored()).token).toBe(token)
  const after = await stored()
  expect(after.id).toBe(before.id)

  const reload = page.waitForResponse((response) => response.url().endsWith('/api/departments'))
  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'Search screens, doctors and patients' }).fill('Refresh')
  await page.keyboard.press('Enter')
  const response = await reload
  expect(response.status()).toBe(200)
  expect(response.request().headers().authorization).not.toBe(`Bearer ${before.token}`)
  expect((await stored()).id).toBe(before.id)
})
