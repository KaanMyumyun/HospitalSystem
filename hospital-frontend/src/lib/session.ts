import type { Session } from '../types'

// A successful password change stores its new token before App's action
// completes. Adopt it only while the same account and action are still active.
export function sessionAfterTokenRotation(
  original: Session,
  stored: Session | null,
  returnedToken: string | null | undefined,
  isCurrentAction: boolean,
): Session | null {
  if (!isCurrentAction || !returnedToken || stored?.token !== returnedToken || stored.role !== original.role) {
    return null
  }
  return stored
}
