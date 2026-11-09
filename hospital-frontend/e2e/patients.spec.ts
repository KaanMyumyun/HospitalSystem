import { addPatients } from './database.ts'
import { nextWeek } from './clinic.ts'
import { expect, newPatient, signIn, test, toast, uniqueName } from './fixtures.ts'

test('pages through a long search', async ({ page, seed }) => {
  const desk = await seed.frontDesk()
  const prefix = uniqueName('Paging')
  await addPatients(prefix, 55)
  await signIn(page, desk)
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Patients' }).click()

  await page.getByRole('searchbox', { name: 'Search patients' }).fill(prefix)
  const list = page.getByRole('region', { name: 'Patient list' })
  await expect(list.getByRole('button', { name: new RegExp(prefix) })).toHaveCount(50)
  await expect(list.getByText('1–50', { exact: true })).toBeVisible()
  await list.getByRole('button', { name: 'Next' }).click()
  await expect(list.getByText('51–55 of 55', { exact: true })).toBeVisible()
  await expect(list.getByRole('button', { name: new RegExp(prefix) })).toHaveCount(5)
})

test('opens a record, corrects the phone number, and finds it from the palette', async ({ page, seed }) => {
  const doctor = await seed.doctor()
  const desk = await seed.frontDesk()
  const patient = newPatient(uniqueName('Maria'))
  const [monday = ''] = nextWeek()
  await seed.booking(desk, doctor, monday, '09:30', patient)
  await signIn(page, desk)

  await page.keyboard.press('Control+k')
  await page.getByRole('combobox', { name: 'Search screens, doctors and patients' }).fill(patient.name)
  await expect(page.getByRole('option', { name: new RegExp(patient.name) })).toBeVisible()
  await page.keyboard.press('Enter')

  const record = page.getByRole('region', { name: 'Patient record' })
  await expect(record.getByRole('heading', { name: patient.name })).toBeVisible()
  await expect(record).toContainText(doctor.shownAs)
  await record.getByRole('button', { name: 'Edit details' }).click()
  await record.getByLabel('Phone').fill('0888 765 432')
  await record.getByRole('button', { name: 'Save changes' }).click()
  await expect(toast(page, 'Patient details saved')).toBeVisible()
  await expect(record).toContainText('0888 765 432')

  await record.getByRole('button', { name: 'Open in reception' }).click()
  await expect(page.getByRole('heading', { name: doctor.shownAs, level: 1 })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Appointment' }).getByRole('heading', { name: patient.name })).toBeVisible()
})
