// A dialog request has one answer. Closing it, replacing it, or unmounting
// the owner gives the caller its cancel value; a late click cannot answer twice.
export function createDialogRequests() {
  let pendingDismiss: (() => void) | null = null

  return {
    ask<T>(cancelValue: T) {
      pendingDismiss?.()

      let resolve!: (value: T) => void
      const promise = new Promise<T>((complete) => { resolve = complete })
      let settled = false
      const dismiss = () => { answer(cancelValue) }
      const answer = (value: T) => {
        if (settled) return false
        settled = true
        if (pendingDismiss === dismiss) pendingDismiss = null
        resolve(value)
        return true
      }

      pendingDismiss = dismiss
      return { promise, answer }
    },
    dismiss() {
      pendingDismiss?.()
    },
  }
}
