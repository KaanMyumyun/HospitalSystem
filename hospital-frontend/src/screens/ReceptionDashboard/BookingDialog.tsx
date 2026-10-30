import { useState } from 'react'
import { PossiblePatientMatchError } from '../../api'
import type { CreateAppointmentInput, DoctorDto, PatientMatchDto } from '../../api'
import { GuardedButton, Modal } from '../../components/ui'
import { useWorkspace } from '../../hooks/useWorkspace'
import { clinicDate, toClinicIsoString } from '../../lib/clinicTime'
import { formatLongDate } from '../../lib/format'
import { dateAtTime } from '../../lib/schedule'
import { validateAppointmentInput } from '../../lib/validation'
import type { ActionOutcome, Slot } from '../../types'

// Booking an open slot. When the details partly match patients on file, the
// API lists them, and the desk books for one of them or registers a new
// patient. The form starts empty each time the dialog opens.
export function BookingDialog({
  doctor,
  slot,
  onClose,
  onCreateAppointment,
}: {
  doctor: DoctorDto
  slot: Slot
  onClose: () => void
  onCreateAppointment: (input: CreateAppointmentInput) => Promise<ActionOutcome>
}) {
  const { isReadOnly, loading } = useWorkspace()
  const [patientName, setPatientName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [bookingError, setBookingError] = useState<string | null>(null)
  // Patients on file who share some of the entered details, as the API listed them.
  const [possibleMatches, setPossibleMatches] = useState<PatientMatchDto[] | null>(null)

  // An edit makes an error or the listed matches out of date.
  const clearFeedback = () => {
    setBookingError(null)
    setPossibleMatches(null)
  }
  // patient is set when booking again after the API listed possible matches.
  const submit = async (patient?: Pick<CreateAppointmentInput, 'patientId' | 'createNewPatient'>) => {
    const appointmentTime = dateAtTime(slot.day, slot.time)
    const validationError = validateAppointmentInput(patientName, phoneNumber, dateOfBirth, appointmentTime)
    if (validationError) {
      setBookingError(validationError)
      return
    }

    const outcome = await onCreateAppointment({
      doctorId: doctor.doctorId,
      patientName: patientName.trim(),
      phoneNumber: phoneNumber.trim(),
      dateOfBirth,
      appointmentTime: toClinicIsoString(appointmentTime),
      ...patient,
    })
    if (!outcome.ok) {
      if (outcome.cause instanceof PossiblePatientMatchError) {
        setPossibleMatches(outcome.cause.matches)
      } else if (outcome.error) {
        setPossibleMatches(null)
        setBookingError(outcome.error)
      }
      return
    }
    onClose()
  }

  return (
    <Modal title="Book appointment" onClose={onClose}>
      <div className="summary-box">
        <strong>{doctor.name}</strong>
        <span>
          {formatLongDate(slot.day)} at {slot.time}
        </span>
      </div>
      <div className="form-grid">
        <label>
          Patient Name
          <input
            maxLength={50}
            value={patientName}
            onChange={(event) => {
              clearFeedback()
              setPatientName(event.target.value)
            }}
          />
        </label>
        <label>
          Phone Number
          <input
            inputMode="tel"
            maxLength={20}
            pattern="^\+?[0-9\s().-]+$"
            value={phoneNumber}
            onChange={(event) => {
              clearFeedback()
              setPhoneNumber(event.target.value.replace(/[^\d\s()+.-]/g, ''))
            }}
          />
        </label>
        <label>
          Date of Birth
          <input
            max={clinicDate(slot.day)}
            type="date"
            value={dateOfBirth}
            onChange={(event) => {
              clearFeedback()
              setDateOfBirth(event.target.value)
            }}
          />
        </label>
      </div>
      {bookingError && <div className="form-error">{bookingError}</div>}
      {possibleMatches && (
        <div className="match-box">
          <p>These details partly match a patient on file. Book for the right patient, or register a new one.</p>
          <ul className="match-list" aria-label="Patients on file">
            {possibleMatches.map((match) => (
              <li key={match.patientId}>
                <span>
                  <strong>{match.name}</strong>
                  <small>
                    Born {match.dateOfBirth} · {match.phoneNumber}
                  </small>
                </span>
                <button
                  aria-label={`Book for ${match.name}`}
                  className="secondary-button"
                  disabled={isReadOnly || loading}
                  type="button"
                  onClick={() => void submit({ patientId: match.patientId })}
                >
                  Book for this patient
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="modal-actions">
        <button className="secondary-button" type="button" onClick={onClose}>
          Close
        </button>
        {possibleMatches ? (
          <button
            className="primary-button"
            disabled={isReadOnly || loading}
            type="button"
            onClick={() => void submit({ createNewPatient: true })}
          >
            Register as new patient
          </button>
        ) : (
          <GuardedButton
            className="primary-button"
            readOnly={isReadOnly}
            disabled={!patientName || !phoneNumber || !dateOfBirth || loading}
            onClick={() => void submit()}
          >
            Confirm Booking
          </GuardedButton>
        )}
      </div>
    </Modal>
  )
}
