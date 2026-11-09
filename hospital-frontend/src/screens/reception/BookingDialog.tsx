import { useState } from 'react'
import { createAppointment, loadPatients, PossiblePatientMatchError } from '../../api/client'
import type { CreateAppointmentInput, DoctorDto, PatientMatchDto, PatientSummaryDto } from '../../api/client'
import { useDebounced, useNow } from '../../app/hooks'
import { useResource } from '../../app/useResource'
import { useWorkspace } from '../../app/workspaceContext'
import { clinicDate, toClinicIsoString } from '../../lib/clinicTime'
import { addMinutes, ageOn, dateOnlyLabel, mediumDate } from '../../lib/dates'
import { personName } from '../../lib/names'
import { dateAtTime } from '../../lib/schedule'
import { cleanPhone, validateAppointmentInput } from '../../lib/validation'
import type { Slot } from '../../types'
import { Button } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { Field, FormError } from '../../ui/Field'
import { Icon } from '../../ui/Icon'
import { formatPhone } from '../../lib/phone'

type Lookup = 'name' | 'phone'

export function BookingDialog({
  doctor,
  slot,
  slotMinutes,
  onClose,
  onBooked,
}: {
  doctor: DoctorDto
  slot: Slot
  slotMinutes: number
  onClose: () => void
  onBooked: (at: Date) => void
}) {
  const { run, busy, readOnly, departmentOf } = useWorkspace()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [chosen, setChosen] = useState<PatientSummaryDto | null>(null)
  const [lookup, setLookup] = useState<Lookup>('name')
  const [matches, setMatches] = useState<PatientMatchDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tried, setTried] = useState(false)

  const now = useNow(60_000)
  const appointmentTime = dateAtTime(slot.day, slot.time)
  const appointmentDate = clinicDate(appointmentTime)
  const today = clinicDate(now)
  const raw = (lookup === 'phone' ? phone : name).trim()
  const term = useDebounced(raw, 280)
  const searchable = !chosen && !matches && (lookup === 'phone' ? term.replace(/\D/g, '').length >= 3 : term.length >= 2)
  const { data: found, loading: searching } = useResource(searchable ? `book-lookup:${lookup}:${term}` : null, (signal) =>
    loadPatients(term, 1, signal, 5),
  )
  const suggestions = searchable && term === raw ? (found?.items ?? []) : []

  const nameError = tried && !name.trim() ? 'Enter the patient’s name' : null
  const phoneProblem = (() => {
    if (!phone.trim()) return 'Enter a phone number'
    const digits = phone.replace(/\D/g, '').length
    if (digits < 7 || digits > 15) return 'Use 7 to 15 digits'
    return null
  })()
  const dobProblem = (() => {
    if (!dateOfBirth) return 'Enter the date of birth'
    if (dateOfBirth > appointmentDate) return 'The date of birth is after the appointment'
    return null
  })()

  const clearFeedback = () => {
    setError(null)
    setMatches(null)
  }

  const choose = (patient: PatientSummaryDto | PatientMatchDto) => {
    setChosen(patient)
    setName(patient.name)
    setPhone(patient.phoneNumber)
    setDateOfBirth(patient.dateOfBirth)
    clearFeedback()
  }

  const release = () => {
    setChosen(null)
    clearFeedback()
  }

  const submit = async (extra?: Pick<CreateAppointmentInput, 'patientId' | 'createNewPatient'>, bookedName = name.trim()) => {
    setTried(true)
    const problem = validateAppointmentInput(name, phone, dateOfBirth, appointmentTime)
    if (problem) {
      setError(problem)
      return
    }
    const outcome = await run(
      () =>
        createAppointment({
          doctorId: doctor.doctorId,
          patientName: name.trim(),
          phoneNumber: phone.trim(),
          dateOfBirth,
          appointmentTime: toClinicIsoString(appointmentTime),
          ...(chosen ? { patientId: chosen.patientId } : {}),
          ...extra,
        }),
      `Booked ${bookedName} for ${mediumDate(appointmentTime)} at ${slot.time}`,
      { quiet: true },
    )
    if (outcome.ok) {
      onBooked(appointmentTime)
      return
    }
    if (outcome.cause instanceof PossiblePatientMatchError) {
      setMatches(outcome.cause.matches)
      setError(null)
      return
    }
    if (outcome.error) setError(outcome.error)
  }

  const department = departmentOf(doctor.departmentId)

  return (
    <Dialog
      description={`${personName(doctor.name)}${department ? ` · ${department.name}` : ''} · until ${addMinutes(slot.time, slotMinutes)}`}
      dismissOnBackdrop={false}
      eyebrow="New booking"
      footer={
        matches ? (
          <>
            <Button variant="ghost" onClick={() => setMatches(null)}>
              Back to the details
            </Button>
            <Button busy={busy} locked={readOnly} variant="primary" onClick={() => void submit({ createNewPatient: true })}>
              Register as a new patient
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button busy={busy} locked={readOnly} type="submit" variant="primary">
              Book appointment
            </Button>
          </>
        )
      }
      size="md"
      title={`${mediumDate(slot.day)}, ${slot.time}`}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      {matches ? (
        <div className="matches">
          <p className="matches-lede">
            <Icon name="alert" size={17} />
            <span>
              These details partly match {matches.length === 1 ? 'a patient' : 'patients'} already on file. Book for the
              right one, or register a new patient if none of them is this person.
            </span>
          </p>
          <ul className="patient-options">
            {matches.map((match) => (
              <li key={match.patientId}>
                <PatientOption patient={match} today={today} />
                <Button
                  busy={busy}
                  locked={readOnly}
                  size="sm"
                  onClick={() => void submit({ patientId: match.patientId }, match.name)}
                >
                  Book for {match.name.split(' ')[0]}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : chosen ? (
        <div className="chosen">
          <div className="chosen-head">
            <span className="tag tag-accent">
              <Icon name="check" size={13} />
              On file
            </span>
            <button className="link-btn" type="button" onClick={release}>
              Not this patient
            </button>
          </div>
          <p className="chosen-name">{chosen.name}</p>
          <p className="chosen-meta">
            Born {dateOnlyLabel(chosen.dateOfBirth)} · {ageOn(chosen.dateOfBirth, today)} years ·{' '}
            <span className="mono">{formatPhone(chosen.phoneNumber)}</span>
          </p>
        </div>
      ) : (
        <>
          <Field error={nameError} label="Patient name">
            {(control) => (
              <input
                {...control}
                autoComplete="off"
                className="input"
                maxLength={50}
                placeholder="Start typing to find someone on file"
                spellCheck={false}
                value={name}
                onChange={(event) => {
                  clearFeedback()
                  setLookup('name')
                  setName(event.target.value)
                }}
                onFocus={() => setLookup('name')}
              />
            )}
          </Field>
          <div className="form-grid-2">
            <Field error={tried ? phoneProblem : null} label="Phone">
              {(control) => (
                <input
                  {...control}
                  autoComplete="off"
                  className="input mono-input"
                  inputMode="tel"
                  maxLength={20}
                  placeholder="+359 88 123 4567"
                  value={phone}
                  onChange={(event) => {
                    clearFeedback()
                    setLookup('phone')
                    setPhone(cleanPhone(event.target.value))
                  }}
                  onFocus={() => setLookup('phone')}
                />
              )}
            </Field>
            <Field error={tried ? dobProblem : null} label="Date of birth">
              {(control) => (
                <input
                  {...control}
                  className="input"
                  max={appointmentDate}
                  min="1900-01-01"
                  type="date"
                  value={dateOfBirth}
                  onChange={(event) => {
                    clearFeedback()
                    setDateOfBirth(event.target.value)
                  }}
                />
              )}
            </Field>
          </div>
          {(suggestions.length > 0 || (searchable && searching)) && (
            <section aria-label="Patients on file" className="lookup">
              <p className="lookup-title">
                {searching && suggestions.length === 0 ? 'Looking for patients on file…' : 'Already on file?'}
              </p>
              <ul className="patient-options">
                {suggestions.map((patient) => (
                  <li key={patient.patientId}>
                    <PatientOption patient={patient} today={today} />
                    <Button size="sm" onClick={() => choose(patient)}>
                      Use
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {error && <FormError>{error}</FormError>}
    </Dialog>
  )
}

function PatientOption({ patient, today }: { patient: PatientSummaryDto | PatientMatchDto; today: string }) {
  return (
    <span className="patient-option">
      <span className="patient-option-name">{patient.name}</span>
      <span className="patient-option-meta">
        {dateOnlyLabel(patient.dateOfBirth)} · {ageOn(patient.dateOfBirth, today)} yrs ·{' '}
        <span className="mono">{formatPhone(patient.phoneNumber)}</span>
      </span>
    </span>
  )
}
