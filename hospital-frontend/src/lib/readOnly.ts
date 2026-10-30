export const readOnlyTitle = 'Demo accounts are read-only.'

export function guarded(readOnly: boolean, disabled = false) {
  return { disabled: disabled || readOnly, title: readOnly ? readOnlyTitle : undefined }
}
