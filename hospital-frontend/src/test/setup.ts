import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom has no modal dialogs. Modal needs only showModal and close, and the
// tests only that the dialog is open while it is shown.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false
  }
}

afterEach(cleanup)
