import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { loadPatients } from '../api/client'
import { useDebounced, useNow } from '../app/hooks'
import { useResource } from '../app/useResource'
import { useWorkspace } from '../app/workspaceContext'
import { ageOn, dateOnlyLabel } from '../lib/dates'
import { clinicDate } from '../lib/clinicTime'
import { personName } from '../lib/names'
import { canUseAdmin, canUseReception, screensFor, screenTitles } from '../lib/routes'
import { Kbd } from '../ui/bits'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/Icon'
import { formatPhone } from '../lib/phone'

export type Command = {
  id: string
  group: string
  label: string
  detail?: string
  keywords?: string
  icon: IconName
  run: () => void
}

const groupOrder = ['Go to', 'Doctors', 'Patients', 'Actions']

function matches(command: Command, words: string[]) {
  const haystack = `${command.label} ${command.detail ?? ''} ${command.keywords ?? ''}`.toLowerCase()
  return words.every((word) => haystack.includes(word))
}

export function CommandPalette({ actions, onClose }: { actions: Command[]; onClose: () => void }) {
  const { session, data, go, departmentOf } = useWorkspace()
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const now = useNow(60_000)
  const listId = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const term = useDebounced(query.trim(), 260)
  const desk = canUseReception(session.role)
  const patientKey = desk && term.length >= 2 ? `palette:${term}` : null
  const { data: patients, loading: patientsLoading } = useResource(patientKey, (signal) =>
    loadPatients(term, 1, signal, 6),
  )

  const commands = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const screens: Command[] = screensFor(session.role).map((screen) => ({
      id: `screen:${screen}`,
      group: 'Go to',
      label: screenTitles[screen],
      icon: 'arrow-right',
      run: () => go(screen),
    }))
    const doctors: Command[] =
      desk || canUseAdmin(session.role)
        ? data.doctors
            .filter((doctor) => doctor.isActive && departmentOf(doctor.departmentId)?.isActive)
            .map((doctor) => ({
              id: `doctor:${doctor.doctorId}`,
              group: 'Doctors',
              label: personName(doctor.name),
              detail: departmentOf(doctor.departmentId)?.name,
              keywords: doctor.name,
              icon: 'calendar' as const,
              run: () =>
                desk ? go('reception', { doctor: doctor.doctorId }) : go('schedules', { doctor: doctor.doctorId }),
            }))
        : []
    const today = clinicDate(now)
    const found: Command[] = term.length >= 2 && term === query.trim()
      ? (patients?.items ?? []).map((patient) => ({
          id: `patient:${patient.patientId}`,
          group: 'Patients',
          label: patient.name,
          detail: `${dateOnlyLabel(patient.dateOfBirth)} · ${ageOn(patient.dateOfBirth, today)} yrs · ${formatPhone(patient.phoneNumber)}`,
          icon: 'user' as const,
          run: () => go('patients', { patient: patient.patientId }),
        }))
      : []

    const filtered = [
      ...screens.filter((command) => matches(command, words)),
      ...(words.length > 0 ? doctors.filter((command) => matches(command, words)).slice(0, 6) : []),
      ...found,
      ...actions.filter((command) => matches(command, words)),
    ]
    return filtered.sort((left, right) => groupOrder.indexOf(left.group) - groupOrder.indexOf(right.group))
  }, [query, term, session.role, desk, data.doctors, departmentOf, go, patients, actions, now])

  const activeIndex = Math.min(active, Math.max(commands.length - 1, 0))
  const activeCommand = commands[activeIndex]
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!element.open) element.showModal()
    input.current?.focus()
    const backdrop = (event: MouseEvent) => {
      if (event.target === element) onCloseRef.current()
    }
    element.addEventListener('click', backdrop)
    return () => {
      element.removeEventListener('click', backdrop)
      if (element.open) element.close()
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  useEffect(() => {
    list.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const runCommand = (command: Command | undefined) => {
    if (!command) return
    onClose()
    command.run()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((activeIndex + step + commands.length) % Math.max(commands.length, 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      runCommand(activeCommand)
    }
  }

  return (
    <dialog
      aria-label="Search and commands"
      className="palette"
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className="palette-search">
        <Icon name="search" size={19} />
        <input
          aria-activedescendant={activeCommand ? `${listId}-${activeCommand.id}` : undefined}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded="true"
          aria-label="Search screens, doctors and patients"
          autoComplete="off"
          className="palette-input"
          placeholder={desk ? 'Find a patient, doctor or screen…' : 'Find a screen, doctor or action…'}
          ref={input}
          role="combobox"
          spellCheck={false}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
        />
        {patientsLoading && term.length >= 2 && <span className="spinner" aria-hidden="true" />}
      </div>
      <div aria-label="Results" className="palette-list" id={listId} ref={list} role="listbox">
        {commands.flatMap((command, index) => {
          const option = (
            <div
              aria-selected={index === activeIndex}
              className="palette-item"
              data-index={index}
              id={`${listId}-${command.id}`}
              key={command.id}
              role="option"
              tabIndex={-1}
              onClick={() => runCommand(command)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') runCommand(command)
              }}
              onMouseMove={() => {
                if (index !== activeIndex) setActive(index)
              }}
            >
              <Icon name={command.icon} size={16} />
              <span className="palette-label">{command.label}</span>
              {command.detail && <span className="palette-detail">{command.detail}</span>}
            </div>
          )
          if (commands[index - 1]?.group === command.group) return [option]
          return [
            <div className="palette-group" key={`group:${command.group}`} role="presentation">
              {command.group}
            </div>,
            option,
          ]
        })}
        {commands.length === 0 && (
          <div className="palette-empty" role="presentation">
            {desk && query.trim().length >= 2 && (patientsLoading || term !== query.trim())
              ? 'Searching patients…'
              : 'Nothing matches that.'}
          </div>
        )}
      </div>
      <div className="palette-foot" aria-hidden="true">
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> move
        </span>
        <span>
          <Kbd>↵</Kbd> open
        </span>
        <span>
          <Kbd>esc</Kbd> close
        </span>
      </div>
    </dialog>
  )
}
