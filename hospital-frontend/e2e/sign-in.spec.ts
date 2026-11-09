import { expect, signIn, test } from './fixtures.ts'

test('says what is missing, refuses a wrong password, then signs in and out', async ({ page, seed }) => {
  const desk = await seed.frontDesk()
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText('Enter your username')).toBeVisible()
  await expect(page.getByText('Enter your password')).toBeVisible()

  await page.getByLabel('Username').fill(desk.name)
  await page.getByLabel('Password', { exact: true }).fill('not-the-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()

  await page.getByLabel('Password', { exact: true }).fill(desk.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const navigation = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(navigation.getByRole('link', { name: 'Reception' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText(desk.name, { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('opens the screens a role may use, and only those', async ({ page, seed }) => {
  const desk = await seed.frontDesk()
  await signIn(page, desk)
  await page.goto('/#/admin/users')
  await expect(page).toHaveURL(/#\/reception$/)
  const links = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link')
  await expect(links).toHaveText(['Reception', 'Patients'])
})
