import { useCallback, useEffect, useRef, useState } from 'react'
import { loadPatient, loadPatients } from '../api'
import type { PatientDetailsDto, UpdatePatientInput } from '../api'
import { Pager } from '../components/Pager'
import { EmptyState, SkeletonRows, StatusBadge } from '../components/ui'
import { usePagedList } from '../hooks/usePagedList'
import { formatLongDate, formatTime, initials, statusLabel } from '../lib/format'
import { todayInputValue } from '../lib/validation'
import type { ActionOutcome } from '../types'

// The front desk finds a patient by name or phone number, sees their
// appointments, and corrects their details, such as a changed phone number.
export function PatientsScreen({
  searchQuery,
  isReadOnly,
  loading,
  onError,
  onUpdatePatient,
}: {
  searchQuery: string
  isReadOnly: boolean
  loading: boolean
  onError: (message: string) => void
  onUpdatePatient: (input: UpdatePatientInput) => Promise<ActionOutcome>
}) {
  const { result: page, isLoading, setPage, reload: reloadList } = usePagedList(
    true,
    searchQuery,
    loadPatients,
    onError,
    'Failed to load patients',
  )
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const { patient, reload: reloadPatient } = usePatient(selectedPatientId, onError)

  const save = async (input: UpdatePatientInput) => {
    const outcome = await onUpdatePatient(input)
    if (outcome.ok) await Promise.all([reloadList(), reloadPatient()])
    return outcome
  }

  return (
    <section className="screen-grid patients-grid">
      <section className="panel table-panel">
        <div className="panel-heading page-heading">
          <div>
            <p className="eyebrow">Front desk</p>
            <h2>Patients</h2>
          </div>
          <p className="page-hint">Search by name or phone number in the search box above.</p>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Born</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {(page?.items ?? []).map((item) => (
              <tr className={item.patientId === selectedPatientId ? 'selected-row' : ''} key={item.patientId}>
                <td>
                  <button className="link-button" type="button" onClick={() => setSelectedPatientId(item.patientId)}>
                    {item.name}
                  </button>
                </td>
                <td>{item.dateOfBirth}</td>
                <td>{item.phoneNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <SkeletonRows count={6} />}
        {!isLoading && page?.items.length === 0 && <EmptyState text="No patients match." />}
        <Pager page={page} loading={isLoading} noun="patients" onPageChange={setPage} />
      </section>

      <aside className="panel details-panel">
        {patient ? (
          <PatientDetails
            // A fresh form for each patient, and after each save.
            key={`${patient.patientId}-${patient.name}-${patient.phoneNumber}-${patient.dateOfBirth}`}
            patient={patient}
            isReadOnly={isReadOnly}
            loading={loading}
            onSave={save}
          />
        ) : (
          <EmptyState text="Choose a patient to see their details and appointments." />
        )}
      </aside>
    </section>
  )
}

function PatientDetails({
  patient,
  isReadOnly,
  loading,
  onSave,
}: {
  patient: PatientDetailsDto
  isReadOnly: boolean
  loading: boolean
  onSave: (input: UpdatePatientInput) => Promise<ActionOutcome>
}) {
  const [name, setName] = useState(patient.name)
  const [phoneNumber, setPhoneNumber] = useState(patient.phoneNumber)
  const [dateOfBirth, setDateOfBirth] = useState(patient.dateOfBirth)
  const [error, setError] = useState<string | null>(null)
  const changed = name !== patient.name || phoneNumber !== patient.phoneNumber || dateOfBirth !== patient.dateOfBirth

  const submit = async () => {
    const outcome = await onSave({ patientId: patient.patientId, name, phoneNumber, dateOfBirth })
    if (!outcome.ok && outcome.error) setError(outcome.error)
  }

  return (
    <>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Patient</p>
          <h2>{patient.name}</h2>
        </div>
        <span className="patient-avatar">{initials(patient.name)}</span>
      </div>

      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <label>
          Name
          <input disabled={isReadOnly} maxLength={50} value={name} onChange={(event) => { setError(null); setName(event.target.value) }} />
        </label>
        <label>
          Phone number
          <input
            disabled={isReadOnly}
            inputMode="tel"
            maxLength={20}
            value={phoneNumber}
            onChange={(event) => { setError(null); setPhoneNumber(event.target.value.replace(/[^\d\s()+.-]/g, '')) }}
          />
        </label>
        <label>
          Date of birth
          <input
            disabled={isReadOnly}
            max={todayInputValue()}
            type="date"
            value={dateOfBirth}
            onChange={(event) => { setError(null); setDateOfBirth(event.target.value) }}
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        {!isReadOnly && (
          <div className="modal-actions">
            <button className="primary-button" disabled={!changed || !name.trim() || !phoneNumber.trim() || !dateOfBirth || loading} type="submit">
              Save changes
            </button>
          </div>
        )}
      </form>

      <div className="section-label">Appointments</div>
      {patient.appointments.length === 0 ? (
        <EmptyState text="No appointments yet." />
      ) : (
        <ul className="history-list">
          {patient.appointments.map((appointment) => {
            const time = new Date(appointment.appointmentTime)
            return (
              <li key={appointment.appointmentId}>
                <span>
                  <strong>
                    {formatLongDate(time)} at {formatTime(time)}
                  </strong>
                  <small>
                    {appointment.doctorName}
                    {appointment.cancellationReason ? ` · ${appointment.cancellationReason}` : ''}
                  </small>
                </span>
                <StatusBadge tone={appointment.status === 'Scheduled' ? 'blue' : appointment.status === 'Completed' ? 'success' : 'muted'}>
                  {statusLabel(appointment.status)}
                </StatusBadge>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

// The chosen patient with their appointments; onError must keep the same identity.
function usePatient(patientId: number | null, onError: (message: string) => void) {
  const [loaded, setLoaded] = useState<PatientDetailsDto | null>(null)
  const latestRequest = useRef<symbol | null>(null)

  const reload = useCallback(async () => {
    const request = Symbol()
    latestRequest.current = request
    if (patientId === null) return

    return loadPatient(patientId).then(
      (patient) => {
        if (request === latestRequest.current) setLoaded(patient)
      },
      (error: unknown) => {
        if (request === latestRequest.current) {
          onError(error instanceof Error ? error.message : 'Failed to load the patient')
        }
      },
    )
  }, [patientId, onError])

  useEffect(() => {
    void reload()
    return () => { latestRequest.current = null }
  }, [reload])

  return { patient: loaded?.patientId === patientId ? loaded : null, reload }
}
