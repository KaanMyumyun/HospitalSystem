import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { DepartmentDto } from '../api'
import { DepartmentDialog } from '../components/DepartmentDialog'
import { ConfirmDialog } from '../components/ui'
import type { ConfirmOptions } from '../components/ui'
import { createDialogRequests } from '../lib/dialogRequests'

export function useDialogs() {
  const [dialog, setDialog] = useState<ReactNode>(null)
  const requests = useRef(createDialogRequests())

  const ask = useCallback(
    <T,>(render: (answer: (value: T) => void) => ReactNode, cancelValue: T) => {
      const request = requests.current.ask(cancelValue)
      setDialog(render((value) => {
        if (request.answer(value)) setDialog(null)
      }))
      return request.promise
    },
    [],
  )

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      ask<boolean>((answer) => (
        <ConfirmDialog {...options} onConfirm={() => answer(true)} onCancel={() => answer(false)} />
      ), false),
    [ask],
  )

  const chooseDepartment = useCallback(
    (userName: string, departments: DepartmentDto[]) =>
      ask<number | null>((answer) => (
        <DepartmentDialog userName={userName} departments={departments} onChoose={answer} onCancel={() => answer(null)} />
      ), null),
    [ask],
  )

  const dismiss = useCallback(() => {
    requests.current.dismiss()
    setDialog(null)
  }, [])

  useEffect(() => () => requests.current.dismiss(), [])

  return { dialog, confirm, chooseDepartment, dismiss }
}
