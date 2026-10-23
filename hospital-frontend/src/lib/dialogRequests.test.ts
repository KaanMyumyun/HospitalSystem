import { describe, expect, it } from 'vitest'
import { createDialogRequests } from './dialogRequests'

describe('dialog requests', () => {
  it('settles a dismissed confirmation as cancelled, even after a late click', async () => {
    const requests = createDialogRequests()
    const confirm = requests.ask(false)

    requests.dismiss()

    expect(await confirm.promise).toBe(false)
    expect(confirm.answer(true)).toBe(false)
  })

  it('settles a department choice as null when dismissed', async () => {
    const requests = createDialogRequests()
    const choice = requests.ask<number | null>(null)

    requests.dismiss()

    expect(await choice.promise).toBeNull()
  })

  it('replaces an open request without letting its old answer close the new one', async () => {
    const requests = createDialogRequests()
    const first = requests.ask(false)
    const second = requests.ask<number | null>(null)

    expect(await first.promise).toBe(false)
    expect(first.answer(true)).toBe(false)
    expect(second.answer(7)).toBe(true)
    requests.dismiss()
    expect(await second.promise).toBe(7)
  })
})
