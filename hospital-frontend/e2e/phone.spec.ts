import type { Page } from '@playwright/test'
import { expect, signIn, test } from './fixtures.ts'

test.use({ viewport: { width: 390, height: 844 } })

async function fitsTheScreen(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

test("shows a doctor's day without sideways scrolling", async ({ page, seed }) => {
  const doctor = await seed.doctor()
  await signIn(page, doctor)
  await expect(page.getByRole('navigation', { name: 'Days this week' })).toBeVisible()
  await fitsTheScreen(page)
})

test('shows reception one day at a time, with the menu in a drawer', async ({ page, seed }) => {
  const doctor = await seed.doctor()
  const desk = await seed.frontDesk()
  await signIn(page, desk)

  await page.getByRole('heading', { level: 1 }).getByRole('button').click()
  await page.getByRole('dialog', { name: 'Choose a doctor' }).getByRole('button', { name: new RegExp(`^${doctor.shownAs}`) }).click()
  await expect(page.getByRole('heading', { name: doctor.shownAs, level: 1 })).toBeVisible()
  await expect(page.getByRole('radiogroup', { name: 'Day' })).toBeVisible()
  await fitsTheScreen(page)

  await page.getByRole('button', { name: 'Open menu' }).click()
  const menu = page.getByRole('dialog', { name: 'Menu' })
  await expect(menu.getByRole('link', { name: 'Reception' })).toHaveAttribute('aria-current', 'page')
  await menu.getByRole('link', { name: 'Patients' }).click()
  await expect(menu).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Patients', level: 1 })).toBeVisible()
  await fitsTheScreen(page)
})
