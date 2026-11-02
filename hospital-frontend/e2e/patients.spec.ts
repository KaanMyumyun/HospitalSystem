import { randomBytes } from 'node:crypto'
import { addPatients } from './database.ts'
import { expect, signIn, test } from './fixtures.ts'

test('pages through a long patient search, fifty at a time', async ({ page, seed }) => {
  const name = `Paging ${Array.from(randomBytes(8), (byte) => String.fromCharCode(97 + (byte % 26))).join('')}`
  await addPatients(name, 55)
  const desk = await seed.frontDesk()
  await signIn(page, desk)
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Patients' }).click()
  await page.getByLabel('Search').fill(name)

  const next = page.getByRole('button', { name: 'Next', exact: true })
  const previous = page.getByRole('button', { name: 'Previous', exact: true })
  await expect(page.getByText('1-50', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: `${name} 050` })).toBeVisible()
  await expect(previous).toBeDisabled()

  await next.click()
  await expect(page.getByText('51-55 of 55', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: `${name} 055` })).toBeVisible()
  await expect(page.getByRole('button', { name: `${name} 050` })).toHaveCount(0)
  await expect(next).toBeDisabled()

  await previous.click()
  await expect(page.getByText('1-50', { exact: true })).toBeVisible()
})
