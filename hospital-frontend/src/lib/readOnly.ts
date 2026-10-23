// Demo accounts see every control but can use none that changes data. One
// rule and one message for all of them.
export const readOnlyTitle = 'Demo accounts are read-only.'

export function guarded(readOnly: boolean, disabled = false) {
  return { disabled: disabled || readOnly, title: readOnly ? readOnlyTitle : undefined }
}
