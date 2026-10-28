import { expect, signIn, test } from './fixtures.ts'

test('refuses a wrong password, signs in with the right one, and signs out', async ({ page, seed }) => {
  const desk = await seed.frontDesk()

  await page.goto('/')
  await page.getByLabel('Username').fill(desk.name)
  await page.getByLabel('Password').fill('not-the-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Invalid credentials')

  await signIn(page, desk)
  await expect(page.getByRole('heading', { name: 'Reception Dashboard' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible()
  // The session is gone, not just hidden.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible()
})
