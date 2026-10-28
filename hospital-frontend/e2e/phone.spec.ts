import { devices } from '@playwright/test'
import type { Page } from '@playwright/test'
import { addDays, clinicToday, longDate } from './clinic.ts'
import { expect, newPatient, signIn, test } from './fixtures.ts'

test.use({ ...devices['Pixel 7'] })

async function expectNoSidewaysScrolling(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'pixels the page scrolls sideways').toBe(0)
}

test("a doctor's day fits a phone", async ({ page, seed }) => {
  const doctor = await seed.doctor()
  const desk = await seed.frontDesk()
  const tomorrow = addDays(clinicToday(), 1)
  await seed.booking(desk, doctor, tomorrow, '10:00', newPatient('Maria Ivanova'))
  await seed.booking(desk, doctor, tomorrow, '10:30', newPatient('Georgi Petrov'))

  await signIn(page, doctor)
  await page.getByRole('button', { name: 'Next Day' }).click()
  await expect(page.getByRole('heading', { name: longDate(tomorrow) })).toBeVisible()
  await expect(page.getByText('2 appointments')).toBeVisible()
  const first = page.getByRole('listitem').filter({ hasText: 'Maria Ivanova' })
  await expect(first).toContainText('10:00')
  await expect(first).toContainText('Scheduled')
  await expectNoSidewaysScrolling(page)
})

test('reception fits a phone', async ({ page, seed }) => {
  const doctor = await seed.doctor()
  const desk = await seed.frontDesk()

  await signIn(page, desk)
  await page.getByRole('button', { name: doctor.name }).click()
  await expect(page.getByRole('group', { name: 'Weekly appointment schedule' })).toBeVisible()
  await expectNoSidewaysScrolling(page)
})
